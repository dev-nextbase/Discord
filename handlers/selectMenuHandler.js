const { reassignTask, getTaskById } = require('../services/notionService');
const { createTaskButtons } = require('../components/taskButtons');
const logger = require('../utils/logger');

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
                ephemeral: true
            });
        } catch (replyError) {
            logger.error('Failed to send error reply', replyError);
        }
    }
}

async function handleReassignSelect(interaction, taskId) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const newAssigneeId = interaction.values[0];
        const newAssignee = await interaction.guild.members.fetch(newAssigneeId);
        const newAssigneeName = newAssignee.user.username;

        // Get task details
        const taskDetails = await getTaskById(taskId);
        const taskTitle = taskDetails.properties['Task']?.title[0]?.text?.content;
        const oldAssigneeId = taskDetails.properties['Assigned To ID']?.rich_text[0]?.text?.content;
        const oldAssigneeName = taskDetails.properties['Assigned To']?.rich_text[0]?.text?.content;
        const assignedById = taskDetails.properties['Assigned By ID']?.rich_text[0]?.text?.content;
        const priority = taskDetails.properties['Priority']?.select?.name || '5';
        const description = taskDetails.properties['Description']?.rich_text[0]?.text?.content || '';
        const teamName = taskDetails.properties['Team']?.select?.name;
        const discordUrl = taskDetails.properties['Discord URL']?.url || null;

        // Reassign task in Notion
        await reassignTask(taskId, newAssigneeName, newAssigneeId);

        // Update the original task message buttons
        const originalMessage = interaction.message;
        if (originalMessage) {
            const updatedButtons = createTaskButtons(taskId);
            await originalMessage.edit({ components: [updatedButtons] });
        }

        // Remove task from old assignee's personal channel
        if (oldAssigneeId) {
            try {
                const { config } = require('../config/config');
                const oldPersonalChannelId = config.channels.getPersonChannel(oldAssigneeId);

                if (oldPersonalChannelId) {
                    const oldPersonalChannel = await interaction.client.channels.fetch(oldPersonalChannelId);
                    if (oldPersonalChannel) {
                        const messages = await oldPersonalChannel.messages.fetch({ limit: 50 });
                        const taskMessage = messages.find(msg => {
                            if (msg.embeds.length === 0) return false;
                            const embed = msg.embeds[0];
                            return embed.title && embed.title.includes(taskTitle);
                        });

                        if (taskMessage) {
                            await taskMessage.delete();
                            logger.success(`Removed task from old assignee's channel`);
                        }
                    }
                }
            } catch (error) {
                logger.warn('Failed to remove task from old assignee channel', error);
            }
        }

        // Send task to new assignee's personal channel
        const { config } = require('../config/config');
        const newPersonalChannelId = config.channels.getPersonChannel(newAssigneeId);

        if (newPersonalChannelId) {
            try {
                const newPersonalChannel = await interaction.client.channels.fetch(newPersonalChannelId);
                if (newPersonalChannel) {
                    const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                    const { getPriorityEmoji } = require('../utils/priorityHelper');

                    const priorityEmoji = getPriorityEmoji(priority);

                    const embed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle(`${priorityEmoji} ${taskTitle}`)
                        .setDescription(description || 'No description provided')
                        .addFields(
                            { name: 'Team', value: teamName || 'Unknown', inline: true },
                            { name: 'Priority', value: `${priorityEmoji} ${priority}`, inline: true },
                            { name: 'Status', value: '⏸️ On Hold', inline: true }
                        )
                        .setFooter({ text: `Reassigned by ${interaction.user.username}` })
                        .setTimestamp();

                    const taskButtons = createTaskButtons(taskId);
                    const components = [taskButtons];

                    // Add "Go to Task" button if Discord URL exists
                    if (discordUrl) {
                        const goToTaskButton = new ButtonBuilder()
                            .setLabel('Go to Task')
                            .setStyle(ButtonStyle.Link)
                            .setURL(discordUrl)
                            .setEmoji('🔗');

                        const linkRow = new ActionRowBuilder().addComponents(goToTaskButton);
                        components.push(linkRow);
                    }

                    await newPersonalChannel.send({
                        content: `📋 **New Task Assigned** (Reassigned from <@${oldAssigneeId}>)`,
                        embeds: [embed],
                        components: components
                    });

                    logger.success(`Sent reassigned task to new assignee's channel`);
                }
            } catch (error) {
                logger.error('Failed to send task to new assignee channel', error);
            }
        }

        // Notify old assignee
        if (oldAssigneeId) {
            try {
                const oldUser = await interaction.client.users.fetch(oldAssigneeId);
                await oldUser.send({
                    content: `ℹ️ Task **${taskTitle}** has been reassigned to ${newAssigneeName} by ${interaction.user.username}`
                });
            } catch (error) {
                logger.warn('Failed to notify old assignee', error);
            }
        }

        // Notify task creator
        if (assignedById && assignedById !== interaction.user.id) {
            try {
                const creator = await interaction.client.users.fetch(assignedById);
                await creator.send({
                    content: `🔄 Task **${taskTitle}** has been reassigned from ${oldAssigneeName} to ${newAssigneeName} by ${interaction.user.username}`
                });
            } catch (error) {
                logger.warn('Failed to notify task creator', error);
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

module.exports = {
    handleSelectMenuInteraction,
};
