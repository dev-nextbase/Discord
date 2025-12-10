const { reassignTask, getTaskById } = require('../services/notionService');
const { createTaskButtons } = require('../components/taskButtons');
const { MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const { Client } = require('@notionhq/client');
const { config } = require('../config/config');
const notion = new Client({ auth: config.notion.token });

async function handleSelectMenuInteraction(interaction) {
    try {
        const [action, type, taskId] = interaction.customId.split('_');

        if (action === 'reassign' && type === 'select') {
            await handleReassignSelect(interaction, taskId);
        }
    } catch (error) {
        logger.error('Error handling select menu interaction', error);
        try {
            await interaction.reply({
                content: '❌ Failed to process selection',
                flags: MessageFlags.Ephemeral
            });
        } catch (replyError) {
            logger.error('Failed to send error reply', replyError);
        }
    }
}

async function handleReassignSelect(interaction, taskId) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const selectedValue = interaction.values[0];

        // Check if moving to backlog
        if (selectedValue === 'BACKLOG') {
            await handleMoveToBacklog(interaction, taskId);
            return;
        }

        const newAssigneeId = selectedValue;
        const newAssignee = await interaction.guild.members.fetch(newAssigneeId);
        const newAssigneeName = newAssignee.user.username;

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

        const taskTitle = taskDetails.properties['Task']?.title[0]?.text?.content;
        const oldAssigneeId = taskDetails.properties['Assigned To ID']?.rich_text[0]?.text?.content;
        const oldAssigneeName = taskDetails.properties['Assigned To']?.rich_text[0]?.text?.content;
        const assignedById = taskDetails.properties['Assigned By ID']?.rich_text[0]?.text?.content;
        const assignedByName = taskDetails.properties['Assigned By']?.rich_text[0]?.text?.content;
        const priority = taskDetails.properties['Priority']?.select?.name || '5';
        const description = taskDetails.properties['Description']?.rich_text[0]?.text?.content || '';
        const teamName = taskDetails.properties['Team']?.select?.name;
        const discordUrl = taskDetails.properties['Discord Thread']?.url || null;
        const currentStatus = taskDetails.properties['Status']?.select?.name; // Get current status

        // Reassign task in Notion
        await reassignTask(taskId, newAssigneeName, newAssigneeId);

        // Update the original task message in team channel (if Discord URL exists)
        if (discordUrl) {
            try {
                // Parse Discord URL to get channel and message IDs
                const urlParts = discordUrl.split('/');
                const messageId = urlParts[urlParts.length - 1];
                const channelId = urlParts[urlParts.length - 2];

                const channel = await interaction.client.channels.fetch(channelId);
                if (channel) {
                    const message = await channel.messages.fetch(messageId);
                    if (message && message.embeds.length > 0) {
                        const { EmbedBuilder } = require('discord.js');
                        const { getPriorityEmoji } = require('../utils/priorityHelper');

                        const originalEmbed = message.embeds[0];
                        const priorityEmoji = getPriorityEmoji(priority);

                        // Update embed with new assignee in field only
                        const updatedEmbed = EmbedBuilder.from(originalEmbed);

                        // Update Assigned To field
                        const fields = originalEmbed.fields || [];
                        const assignedToFieldIndex = fields.findIndex(f => f.name === 'Assigned To');

                        if (assignedToFieldIndex !== -1) {
                            fields[assignedToFieldIndex] = { name: 'Assigned To', value: newAssigneeName, inline: true };
                            updatedEmbed.setFields(fields);
                        } else {
                            updatedEmbed.addFields({ name: 'Assigned To', value: newAssigneeName, inline: true });
                        }

                        // Keep footer with original assigner - DO NOT CHANGE
                        // Footer should always be: priority • assigned by [original creator]
                        updatedEmbed.setFooter({ text: `${priorityEmoji} ${priority} • assigned by ${assignedByName}` });

                        const updatedButtons = createTaskButtons(taskId);
                        await message.edit({
                            embeds: [updatedEmbed],
                            components: [updatedButtons]
                        });
                        logger.success('✅ Updated team channel message with new assignee');
                    }
                }
            } catch (error) {
                logger.warn('Failed to update team channel message', error);
                // Don't fail the whole operation if this fails
            }
        }

        // Remove task from old location (personal channel or backlog channel) using saved URL
        const oldMessageUrl = taskDetails.properties['Backlog Message URL']?.url;
        if (oldMessageUrl) {
            try {
                logger.info(`Attempting to delete old message from: ${oldMessageUrl}`);
                // Parse URL to get channel and message IDs
                const urlParts = oldMessageUrl.split('/');
                const messageId = urlParts[urlParts.length - 1];
                const channelId = urlParts[urlParts.length - 2];
                logger.info(`Parsed - Channel ID: ${channelId}, Message ID: ${messageId}`);

                const oldChannel = await interaction.client.channels.fetch(channelId);
                if (oldChannel) {
                    logger.info(`Old channel found: ${oldChannel.name}`);
                    const oldMessage = await oldChannel.messages.fetch(messageId);
                    if (oldMessage) {
                        await oldMessage.delete();
                        logger.success(`✅ Removed task from old location (personal/backlog channel)`);
                    } else {
                        logger.warn(`Old message not found in channel ${oldChannel.name}`);
                    }
                } else {
                    logger.warn(`Old channel ${channelId} not found`);
                }
            } catch (error) {
                logger.error('❌ Failed to remove task from old location', error);
                logger.error(`Error details: ${error.message}`);
                // Don't fail the whole operation if this fails
            }
        } else {
            logger.info('No old message URL found - skipping deletion');
        }

        // Send task to new assignee's personal channel (if configured)

        const channelManager = require('../services/channelManagerNotion');
        const newPersonalChannelId = await channelManager.getPersonChannel(newAssigneeId);

        if (newPersonalChannelId) {
            try {
                const newPersonalChannel = await interaction.client.channels.fetch(newPersonalChannelId);
                if (newPersonalChannel) {
                    const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                    const { getPriorityEmoji } = require('../utils/priorityHelper');

                    const priorityEmoji = getPriorityEmoji(priority);

                    const fields = [
                        { name: 'Assigned To', value: newAssigneeName, inline: true },
                        { name: 'Team', value: teamName || 'Unknown', inline: true },
                        { name: 'Priority', value: `${priorityEmoji} ${priority}`, inline: true },
                        { name: 'Status', value: '⏸️ On Hold', inline: true }
                    ];

                    const footerText = assignedByName
                        ? `${priorityEmoji} ${priority} • assigned by ${assignedByName}`
                        : `Reassigned by ${interaction.user.username}`;

                    const embed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle(`${priorityEmoji} ${taskTitle}`)
                        .setDescription(description || 'No description provided')
                        .addFields(...fields)
                        .setFooter({ text: footerText })
                        .setTimestamp();

                    // Add "Go to Thread" button if Discord URL exists
                    const components = [];
                    if (discordUrl) {
                        const goToThreadButton = new ButtonBuilder()
                            .setLabel('Go to Thread')
                            .setStyle(ButtonStyle.Link)
                            .setURL(discordUrl)
                            .setEmoji('↗️');

                        const linkRow = new ActionRowBuilder().addComponents(goToThreadButton);
                        components.push(linkRow);
                    }

                    // Create content message based on whether it's from backlog or another person
                    const fromText = oldAssigneeId
                        ? `(Reassigned from <@${oldAssigneeId}>)`
                        : '(Reassigned from backlog)';

                    const personalMessage = await newPersonalChannel.send({
                        content: `📋 **New Task Assigned** ${fromText}`,
                        embeds: [embed],
                        components: components
                    });

                    // Save personal channel message URL to Notion
                    await notion.pages.update({
                        page_id: taskId,
                        properties: {
                            'Backlog Message URL': {
                                url: personalMessage.url
                            }
                        }
                    });

                    logger.success(`Sent reassigned task to new assignee's channel and saved URL`);
                } else {
                    logger.warn(`Personal channel ${newPersonalChannelId} not found for user ${newAssigneeId}`);
                }
            } catch (error) {
                logger.error('Failed to send task to new assignee channel', error);
                // Don't fail the whole operation if this fails
            }
        } else {
            logger.info(`No personal channel configured for user ${newAssigneeId}, skipping notification`);
        }

        // Notify task creator (assigner) - always notify
        logger.info(`Checking if should notify task creator. assignedById: ${assignedById}`);
        if (assignedById) {
            try {
                logger.info(`Attempting to notify task creator (assigner): ${assignedById}`);
                const creator = await interaction.client.users.fetch(assignedById);
                const fromText = oldAssigneeName ? ` from ${oldAssigneeName}` : ' from backlog';
                const creatorMessagePayload = {
                    content: `🔄 Task **${taskTitle}** has been reassigned${fromText} to ${newAssigneeName} by ${interaction.user.username}`
                };

                // Add Go to Thread button if Discord URL exists
                if (discordUrl) {
                    const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                    const goToThreadButton = new ButtonBuilder()
                        .setLabel('Go to Thread')
                        .setStyle(ButtonStyle.Link)
                        .setURL(discordUrl)
                        .setEmoji('↗️');
                    const row = new ActionRowBuilder().addComponents(goToThreadButton);
                    creatorMessagePayload.components = [row];
                }

                await creator.send(creatorMessagePayload);
                logger.success('✅ Notified task creator (assigner) about reassignment');
            } catch (error) {
                logger.error('❌ Failed to notify task creator', error);
                logger.error(`Error details: ${error.message}`);
            }
        }

        await interaction.editReply({
            content: `✅ Task **${taskTitle}** has been reassigned to ${newAssigneeName}`,
        });

        logger.success(`Task ${taskId} reassigned from ${oldAssigneeName} to ${newAssigneeName}`);
    } catch (error) {
        logger.error('Error handling reassign select', error);
        try {
            await interaction.editReply({ content: '❌ Failed to reassign task' });
        } catch (replyError) {
            logger.error('Failed to send error reply', replyError);
        }
    }
}

/**
 * Handles moving a task to backlog
 */
async function handleMoveToBacklog(interaction, taskId) {
    try {
        const { getTaskById, reassignTask } = require('../services/notionService');

        // Get task details
        const taskDetails = await getTaskById(taskId);
        const taskTitle = taskDetails.properties['Task']?.title[0]?.text?.content;
        const oldAssigneeId = taskDetails.properties['Assigned To ID']?.rich_text[0]?.text?.content;
        const assignedByName = taskDetails.properties['Assigned By']?.rich_text[0]?.text?.content;
        const priority = taskDetails.properties['Priority']?.select?.name || '5';
        const description = taskDetails.properties['Description']?.rich_text[0]?.text?.content || '';
        const teamName = taskDetails.properties['Team']?.select?.name;
        const discordUrl = taskDetails.properties['Discord Thread']?.url || null;

        if (!teamName) {
            await interaction.editReply({ content: '❌ Could not determine task team' });
            return;
        }

        // Check if user is team lead or admin (same permission as reassignment)
        const roleManager = require('../services/roleManagerNotion');
        const isTeamLead = await roleManager.isTeamLead(interaction.user.id, teamName);
        const isAdmin = await roleManager.isAdmin(interaction.user.id);
        const isOwner = interaction.guild.ownerId === interaction.user.id;

        if (!isTeamLead && !isAdmin && !isOwner) {
            await interaction.editReply({
                content: '❌ Only team leads can move tasks to backlog',
            });
            return;
        }

        // Clear assignee in Notion (move to backlog)
        await reassignTask(taskId, '', ''); // Empty assignee = backlog

        // Get backlog channel for this team
        const channelManager = require('../services/channelManagerNotion');
        const backlogChannelId = await channelManager.getTeamBacklogChannel(teamName);

        if (!backlogChannelId) {
            await interaction.editReply({
                content: `❌ No backlog channel configured for team **${teamName}**. Use \`?team backlog ${teamName} #channel\``
            });
            return;
        }

        // Get priority emoji early so it's available for all message updates
        const { getPriorityEmoji } = require('../utils/priorityHelper');
        const priorityEmoji = getPriorityEmoji(priority);

        // Send to backlog channel
        const backlogChannel = await interaction.client.channels.fetch(backlogChannelId);
        if (backlogChannel) {
            const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

            const backlogEmbed = new EmbedBuilder()
                .setColor('#FFA500') // Orange for backlog
                .setTitle(`${priorityEmoji} ${taskTitle}`)
                .setDescription(description || 'No description provided')
                .addFields(
                    { name: 'Team', value: teamName, inline: true },
                    { name: 'Priority', value: `${priorityEmoji} ${priority}`, inline: true },
                    { name: 'Assigned By', value: assignedByName || 'Unknown', inline: true },
                    { name: 'Status', value: '📋 Backlog', inline: true }
                )
                .setFooter({ text: `Moved to backlog by ${interaction.user.username}` })
                .setTimestamp();

            // Add "Go to Thread" button if Discord URL exists
            const components = [];
            if (discordUrl) {
                const goToThreadButton = new ButtonBuilder()
                    .setLabel('Go to Thread')
                    .setStyle(ButtonStyle.Link)
                    .setURL(discordUrl)
                    .setEmoji('↗️');

                const linkRow = new ActionRowBuilder().addComponents(goToThreadButton);
                components.push(linkRow);
            }

            const backlogMessage = await backlogChannel.send({
                embeds: [backlogEmbed],
                components: components
            });

            // Save backlog message URL to Notion
            const backlogMessageUrl = backlogMessage.url;
            await notion.pages.update({
                page_id: taskId,
                properties: {
                    'Backlog Message URL': {
                        url: backlogMessageUrl
                    }
                }
            });
            logger.success(`Saved backlog message URL: ${backlogMessageUrl}`);
        }

        // Update team channel message to remove Start Working button
        if (discordUrl) {
            try {
                logger.info(`Attempting to update team channel message. Discord URL: ${discordUrl}`);
                const urlParts = discordUrl.split('/');
                const messageId = urlParts[urlParts.length - 1];
                const channelId = urlParts[urlParts.length - 2];
                logger.info(`Parsed - Channel ID: ${channelId}, Message ID: ${messageId}`);

                const teamChannel = await interaction.client.channels.fetch(channelId);
                if (teamChannel) {
                    logger.info(`Team channel found: ${teamChannel.name}`);
                    const teamMessage = await teamChannel.messages.fetch(messageId);
                    if (teamMessage && teamMessage.embeds.length > 0) {
                        logger.info(`Team message found with ${teamMessage.embeds.length} embeds`);
                        const { EmbedBuilder } = require('discord.js');
                        const { createTaskButtons } = require('../components/taskButtons');

                        const originalEmbed = teamMessage.embeds[0];

                        // Get assignee and assigner info from task details
                        const assignedToName = taskDetails.properties['Assigned To']?.rich_text[0]?.text?.content || 'Unassigned';
                        const assignedByName = taskDetails.properties['Assigned By']?.rich_text[0]?.text?.content || 'Unknown';

                        // Update embed to show Backlog status
                        const updatedEmbed = EmbedBuilder.from(originalEmbed);

                        // Update or add Assigned To field to show "Backlog"
                        const fields = originalEmbed.fields || [];
                        const assignedToFieldIndex = fields.findIndex(f => f.name === 'Assigned To');

                        if (assignedToFieldIndex !== -1) {
                            // Update existing field
                            fields[assignedToFieldIndex] = { name: 'Assigned To', value: '📋 Backlog', inline: true };
                            updatedEmbed.setFields(fields);
                        } else {
                            // Add new field
                            updatedEmbed.addFields({ name: 'Assigned To', value: '📋 Backlog', inline: true });
                        }

                        // Update footer to show original assignee and assigner
                        updatedEmbed.setFooter({
                            text: `${priorityEmoji} ${priority} • was: ${assignedToName} • assigned by ${assignedByName}`
                        });

                        // Only show Reassign button (no Start Working)
                        const reassignButton = createTaskButtons(taskId, true); // true = backlog mode

                        await teamMessage.edit({
                            embeds: [updatedEmbed],
                            components: [reassignButton]
                        });
                        logger.success('✅ Updated team channel message for backlog');
                    } else {
                        logger.warn(`Team message not found or has no embeds`);
                    }
                } else {
                    logger.warn(`Team channel ${channelId} not found`);
                }
            } catch (error) {
                logger.error('❌ Failed to update team channel message', error);
                logger.error(`Error details: ${error.message}`);
                if (error.stack) {
                    logger.error(`Stack trace: ${error.stack}`);
                }
            }
        } else {
            logger.warn('No Discord URL found for task - cannot update team channel message');
        }

        // Remove from old assignee's personal channel using saved URL
        const personalMessageUrl = taskDetails.properties['Backlog Message URL']?.url;
        if (oldAssigneeId && personalMessageUrl) {
            try {
                // Parse URL to get channel and message IDs
                const urlParts = personalMessageUrl.split('/');
                const messageId = urlParts[urlParts.length - 1];
                const channelId = urlParts[urlParts.length - 2];

                const personalChannel = await interaction.client.channels.fetch(channelId);
                if (personalChannel) {
                    const personalMessage = await personalChannel.messages.fetch(messageId);
                    if (personalMessage) {
                        await personalMessage.delete();
                        logger.success(`Removed task from personal channel using saved URL`);
                    }
                }
            } catch (error) {
                logger.warn('Failed to remove task from personal channel', error);
            }
        }

        // Notify task creator (assigner) - always notify
        const assignedById = taskDetails.properties['Assigned By ID']?.rich_text[0]?.text?.content;
        if (assignedById) {
            try {
                const creator = await interaction.client.users.fetch(assignedById);
                const fromText = oldAssigneeId ? ` from ${taskDetails.properties['Assigned To']?.rich_text[0]?.text?.content || 'assignee'}` : '';
                const creatorMessagePayload = {
                    content: `📋 Task **${taskTitle}** has been moved to backlog${fromText} by ${interaction.user.username}`
                };

                // Add Go to Thread button if Discord URL exists
                if (discordUrl) {
                    const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                    const goToThreadButton = new ButtonBuilder()
                        .setLabel('Go to Thread')
                        .setStyle(ButtonStyle.Link)
                        .setURL(discordUrl)
                        .setEmoji('↗️');
                    const row = new ActionRowBuilder().addComponents(goToThreadButton);
                    creatorMessagePayload.components = [row];
                }

                await creator.send(creatorMessagePayload);
                logger.success('✅ Notified task creator about backlog move');
            } catch (error) {
                logger.error('❌ Failed to notify task creator', error);
            }
        }

        await interaction.editReply({
            content: `✅ Task **${taskTitle}** has been moved to backlog`
        });

        logger.success(`Task ${taskId} moved to backlog`);
    } catch (error) {
        logger.error('Error moving task to backlog', error);
        await interaction.editReply({ content: '❌ Failed to move task to backlog' });
    }
}

module.exports = {
    handleSelectMenuInteraction,
    handleMoveToBacklog,
};
