const {
    updateTaskStatus,
    updateWorkingTimestamp,
    updateDoneTimestamp,
    getTaskById,
    accumulateTimeSpent
} = require('../services/notionService');
const { MessageFlags } = require('discord.js');
const { createUpdatedButtons } = require('../components/taskButtons');
const logger = require('../utils/logger');

async function handleButtonInteraction(interaction) {
    try {
        const [action, taskId] = interaction.customId.split('_');
        logger.info(`Button clicked: ${action} for task ${taskId}`);

        // Handle reassign button separately
        if (action === 'reassign') {
            await handleReassignButton(interaction, taskId);
            return;
        }

        // Handle backlog button separately
        if (action === 'backlog') {
            await handleBacklogButton(interaction, taskId);
            return;
        }

        // CRITICAL: Defer reply immediately - if this fails, the interaction has timed out
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        } catch (deferError) {
            logger.error('Failed to defer button interaction - interaction may have timed out', deferError);
            return; // Can't proceed if we can't defer
        }

        const statusMap = {
            'onhold': 'On Hold',
            'working': 'Working',
            'done': 'Done',
        };

        const newStatus = statusMap[action];

        if (!newStatus) {
            await interaction.editReply({ content: '❌ Unknown action' });
            return;
        }

        // Get task details to check permissions
        let taskDetails;
        try {
            taskDetails = await getTaskById(taskId);
        } catch (error) {
            if (error.code === 'object_not_found') {
                logger.warn(`Task ${taskId} not found in Notion - may have been deleted`);
                await interaction.editReply({
                    content: '❌ This task is from an old database or has been deleted. Please create a new task using `/create`.'
                });
                return;
            }
            throw error; // Re-throw other errors
        }

        const assignedToId = taskDetails.properties['Assigned To ID']?.rich_text[0]?.text?.content;
        const taskTeam = taskDetails.properties['Team']?.select?.name;

        if (!assignedToId) {
            await interaction.editReply({ content: '❌ Task data incomplete' });
            return;
        }

        // Check permissions
        const roleManager = require('../services/roleManagerNotion');
        const isAssignedPerson = interaction.user.id === assignedToId;
        const isTeamLead = taskTeam && await roleManager.isTeamLead(interaction.user.id, taskTeam);

        // Only assigned person and their team lead can change status
        if (!isAssignedPerson && !isTeamLead) {
            await interaction.editReply({
                content: '❌ Only the assigned person or their team lead can change task status',
            });
            return;
        }

        // For "Done" action, only the assigned person can mark it as done
        if (action === 'done' && interaction.user.id !== assignedToId) {
            await interaction.editReply({
                content: '❌ Only the assigned person can mark this task as done',
            });
            return;
        }

        // Update UI immediately for fast feedback
        if (action === 'done') {
            const originalEmbed = interaction.message.embeds[0];
            if (originalEmbed) {
                const { EmbedBuilder } = require('discord.js');
                const updatedEmbed = EmbedBuilder.from(originalEmbed)
                    .setFooter({ text: `✅ Done • ${taskDetails.properties['Assigned To']?.rich_text[0]?.text?.content || 'Unknown'}` })
                    .setColor('#57F287');

                await interaction.message.edit({
                    embeds: [updatedEmbed],
                    components: []
                });
            } else {
                await interaction.message.edit({ components: [] });
            }
        } else {
            const updatedButtons = createUpdatedButtons(taskId, newStatus);
            await interaction.message.edit({ components: [updatedButtons] });
        }

        // Reply immediately
        const statusEmoji = {
            'onhold': '⏸️',
            'working': '▶️',
            'done': '✅'
        };
        await interaction.editReply({
            content: `${statusEmoji[action]} Status updated`,
        });

        // Update Notion in background (don't block)
        updateTaskStatus(taskId, newStatus).catch(err => logger.error('Notion update failed', err));

        if (action === 'working') {
            updateWorkingTimestamp(taskId).catch(err => logger.error('Timestamp update failed', err));
        } else if (action === 'onhold') {
            // Accumulate time when going from Working to On Hold
            const currentStatus = taskDetails.properties['Status']?.select?.name;
            if (currentStatus === 'Working') {
                accumulateTimeSpent(taskId).catch(err => logger.error('Time accumulation failed', err));
            }
        } else if (action === 'done') {
            // Accumulate time when marking as Done (if it was Working)
            const currentStatus = taskDetails.properties['Status']?.select?.name;
            if (currentStatus === 'Working') {
                accumulateTimeSpent(taskId).catch(err => logger.error('Time accumulation failed', err));
            }
            updateDoneTimestamp(taskId, interaction.user.tag, interaction.user.id).catch(err => logger.error('Done timestamp failed', err));

            // 1. Notify Assigner
            const assignedById = taskDetails.properties['Assigned By ID']?.rich_text[0]?.text?.content;
            const assignedTo = taskDetails.properties['Assigned To']?.rich_text[0]?.text?.content;
            const taskTitle = taskDetails.properties['Task']?.title[0]?.text?.content;
            const teamName = taskDetails.properties['Team']?.select?.name;

            if (assignedById) {
                try {
                    const assigner = await interaction.client.users.fetch(assignedById);
                    const taskMessageUrl = interaction.message.url;

                    const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                    const goToTaskButton = new ButtonBuilder()
                        .setLabel('Go to Thread')
                        .setStyle(ButtonStyle.Link)
                        .setURL(taskMessageUrl)
                        .setEmoji('↗️');

                    const buttonRow = new ActionRowBuilder().addComponents(goToTaskButton);

                    await assigner.send({
                        content: `✅ ${assignedTo} completed: **${taskTitle}**`,
                        components: [buttonRow]
                    });
                    logger.success(`Sent completion notification to assigner`);
                } catch (error) {
                    logger.error('Failed to send DM to assigner', error);
                }
            }

            // 2. Remove from Personal Channel
            if (assignedToId) {
                try {
                    const channelManager = require('../services/channelManagerNotion');
                    const personalChannelId = await channelManager.getPersonChannel(assignedToId);

                    if (personalChannelId) {
                        const personalChannel = await interaction.client.channels.fetch(personalChannelId);
                        if (personalChannel) {
                            // Fetch recent messages to find the one for this task
                            const messages = await personalChannel.messages.fetch({ limit: 50 });

                            // Find message with matching task ID in embed footer or title
                            // Or look for the redirect link if we can match it
                            const taskMessage = messages.find(msg => {
                                if (msg.embeds.length === 0) return false;
                                const embed = msg.embeds[0];
                                return embed.title && embed.title.includes(taskTitle);
                            });

                            if (taskMessage) {
                                await taskMessage.delete();
                                logger.success(`Deleted task notification from personal channel: ${personalChannelId}`);
                            }
                        }
                    }
                } catch (error) {
                    logger.warn('Failed to cleanup personal channel message', error);
                }
            }


        }

        // Update status board if it exists
        updateStatusBoard(interaction.client).catch(err => logger.error('Status board update failed', err));



        logger.success(`Task ${taskId} updated to: ${newStatus}`);
    } catch (error) {
        logger.error('Error handling button interaction', error);

        try {
            await interaction.editReply({ content: '❌ Failed to update status' });
        } catch (replyError) {
            logger.error('Failed to send error reply', replyError);
        }
    }
}

async function updateStatusBoard(client) {
    try {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '../config/statusBoard.json');

        if (!fs.existsSync(configPath)) {
            return; // No status board configured
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const { channelId, messageId, guildId } = config;

        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const message = await channel.messages.fetch(messageId);
        if (!message) return;

        const { createStatusBoardEmbed } = require('../commands/status-board');
        const embed = await createStatusBoardEmbed(client);

        await message.edit({ embeds: [embed] });
        logger.success('Status board updated');
    } catch (error) {
        logger.warn('Failed to update status board', error);
    }
}

async function handleReassignButton(interaction, taskId) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const roleManager = require('../services/roleManagerNotion');
        const { getTaskById } = require('../services/notionService');
        const { getUserTeamByRoles, getTeamRole } = require('../services/teamRoleManagerNotion');

        // Get task details
        let taskDetails;
        try {
            taskDetails = await getTaskById(taskId);
        } catch (error) {
            if (error.code === 'object_not_found') {
                logger.warn(`Task ${taskId} not found in Notion - may have been deleted`);
                await interaction.editReply({
                    content: '❌ This task is from an old database or has been deleted. Please create a new task using `/create`.'
                });
                return;
            }
            throw error; // Re-throw other errors
        }

        const assignedToId = taskDetails.properties['Assigned To ID']?.rich_text[0]?.text?.content;
        const taskTitle = taskDetails.properties['Task']?.title[0]?.text?.content;
        const taskTeam = taskDetails.properties['Team']?.select?.name;

        // Note: assignedToId can be empty for backlog tasks, which is valid

        if (!taskTeam) {
            await interaction.editReply({ content: '❌ Could not determine task team' });
            return;
        }

        // Check if user is team lead or admin
        const isTeamLead = await roleManager.isTeamLead(interaction.user.id, taskTeam);
        const isAdmin = await roleManager.isAdmin(interaction.user.id);
        const isOwner = interaction.guild.ownerId === interaction.user.id;

        if (!isTeamLead && !isAdmin && !isOwner) {
            await interaction.editReply({
                content: '❌ Only team leads can reassign tasks',
            });
            return;
        }

        // Get all members assigned to this team from userTeams.json
        const { getUserTeam, getAllUsersInTeam } = require('../services/userTeamManagerNotion');

        // Get all user IDs in this team
        const teamUserIds = await getAllUsersInTeam(taskTeam);

        if (!teamUserIds || teamUserIds.length === 0) {
            await interaction.editReply({ content: '❌ No team members found' });
            return;
        }

        // Fetch Discord members for these user IDs
        const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
        const options = [];

        for (const userId of teamUserIds) {
            // Skip current assignee and bots
            if (userId === assignedToId) continue;

            try {
                const member = await interaction.guild.members.fetch(userId);
                if (!member.user.bot) {
                    options.push({
                        label: member.user.username,
                        description: `Reassign to ${member.user.username}`,
                        value: member.id
                    });
                }
            } catch (error) {
                // Skip if user not found in guild
                logger.warn(`Could not fetch member ${userId}`, error);
            }
        }

        if (options.length === 0) { // No team members available
            await interaction.editReply({ content: '❌ No other team members available for reassignment' });
            return;
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`reassign_select_${taskId}`)
            .setPlaceholder('Select a team member')
            .addOptions(options.slice(0, 25)); // Discord limit is 25 options

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            content: `🔄 **Reassign Task:** ${taskTitle}\n\nSelect a team member to reassign this task to:`,
            components: [row]
        });

        logger.success(`Showed reassignment menu for task ${taskId}`);
    } catch (error) {
        logger.error('Error handling reassign button', error);
        try {
            await interaction.editReply({ content: '❌ Failed to show reassignment options' });
        } catch (replyError) {
            logger.error('Failed to send error reply', replyError);
        }
    }
}

async function handleBacklogButton(interaction, taskId) {
    try {
        // Defer the interaction first
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Import and call the backlog handler directly
        const selectMenuHandler = require('./selectMenuHandler');

        // Check if the module exports handleMoveToBacklog
        if (selectMenuHandler.handleMoveToBacklog) {
            await selectMenuHandler.handleMoveToBacklog(interaction, taskId);
        } else {
            // If not exported, we need to handle it here
            logger.error('handleMoveToBacklog not exported from selectMenuHandler');
            await interaction.editReply({
                content: '❌ Failed to move task to backlog - handler not found'
            });
        }

    } catch (error) {
        logger.error('Error handling backlog button', error);
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: '❌ Failed to move task to backlog'
                });
            } else {
                await interaction.reply({
                    content: '❌ Failed to move task to backlog',
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (replyError) {
            logger.error('Failed to send error reply', replyError);
        }
    }
}

module.exports = {
    handleButtonInteraction,
};
