const {
    updateTaskStatus,
    updateWorkingTimestamp,
    updateDoneTimestamp,
    getTaskById
} = require('../services/notionService');
const { createUpdatedButtons } = require('../components/taskButtons');
const logger = require('../utils/logger');

async function handleButtonInteraction(interaction) {
    try {
        const [action, taskId] = interaction.customId.split('_');
        logger.info(`Button clicked: ${action} for task ${taskId}`);

        await interaction.deferReply({ ephemeral: true });

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

        // Get task details to check team permission
        const taskDetails = await getTaskById(taskId);
        const assignedToId = taskDetails.properties['Assigned To ID']?.rich_text[0]?.text?.content;

        if (!assignedToId) {
            await interaction.editReply({ content: '❌ Task data incomplete' });
            return;
        }

        // Check if clicking user has role for task's team
        const { getUserTeamByRoles } = require('../services/teamRoleManager');

        // Get task's team
        const assignedMember = await interaction.guild.members.fetch(assignedToId);
        const assignedUserRoles = assignedMember.roles.cache.map(role => role.id);
        const taskTeam = getUserTeamByRoles(assignedUserRoles);

        // Get clicking user's team
        const clickingUserRoles = interaction.member.roles.cache.map(role => role.id);
        const clickingUserTeam = getUserTeamByRoles(clickingUserRoles);

        if (!clickingUserTeam || clickingUserTeam !== taskTeam) {
            await interaction.editReply({
                content: '❌ You need the team role to interact with this task',
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
        } else if (action === 'done') {
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
                    const { config } = require('../config/config');
                    const personalChannelId = config.channels.getPersonChannel(assignedToId);

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

            // 3. Log to Team Log Channel
            if (teamName) {
                try {
                    const { config } = require('../config/config');
                    const channelManager = require('../services/channelManager');

                    // Try to get log channel, fallback to main team channel if needed (or just don't log)
                    const logChannelId = channelManager.getTeamLogChannel(teamName);

                    if (logChannelId) {
                        const logChannel = await interaction.client.channels.fetch(logChannelId);
                        if (logChannel) {
                            const teamMessageUrl = interaction.message.url;
                            const channelMention = `<#${interaction.channelId}>`;

                            const logEmbed = {
                                color: 0x57F287, // Green
                                title: '✅ Task Completed',
                                fields: [
                                    { name: 'Task', value: taskTitle, inline: true },
                                    { name: 'Completed By', value: `<@${assignedToId}>`, inline: true },
                                    { name: 'Team', value: teamName, inline: true },
                                    { name: 'Channel', value: channelMention, inline: true }
                                ],
                            };

                            const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                            const linkButton = new ButtonBuilder()
                                .setLabel('View Thread')
                                .setStyle(ButtonStyle.Link)
                                .setURL(teamMessageUrl);

                            const row = new ActionRowBuilder().addComponents(linkButton);

                            await logChannel.send({ embeds: [logEmbed], components: [row] });
                            logger.success(`Logged completion to team log channel: ${teamName}`);
                        }
                    }
                } catch (error) {
                    logger.error('Failed to log to team log channel', error);
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

module.exports = {
    handleButtonInteraction,
};
