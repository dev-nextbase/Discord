const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { config } = require('../config/config');
const { createTaskButtons } = require('../components/taskButtons');
const { getFormattedPriority, getPriorityEmoji } = require('../utils/priorityHelper');
const logger = require('../utils/logger');

function createTaskEmbed(taskData, notionTaskId) {
    const priorityEmoji = getPriorityEmoji(taskData.priority);
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`${priorityEmoji} ${taskData.task}`);

    if (taskData.description && taskData.description.trim()) {
        const truncatedDesc = taskData.description.length > 500
            ? taskData.description.substring(0, 497) + '...'
            : taskData.description;
        embed.setDescription(truncatedDesc);
    }

    embed.setFooter({
        text: `${getFormattedPriority(taskData.priority)} • ${taskData.assignedTo}`
    });

    return embed;
}

async function sendToTeamChannel(client, taskData, notionTaskId) {
    try {
        const channelId = config.channels.getTeamChannel(taskData.team);
        logger.info(`Routing task for team '${taskData.team}' to channel ID: ${channelId}`);

        if (!channelId) {
            logger.warn(`No channel configured for team: ${taskData.team}`);
            return null;
        }

        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.error(`Channel not found: ${channelId}`);
            return null;
        }
        logger.info(`Fetched channel: ${channel.name} (${channel.id})`);

        const embed = createTaskEmbed(taskData, notionTaskId);
        const buttons = createTaskButtons(notionTaskId);

        const messagePayload = {
            embeds: [embed],
            components: [buttons],
        };

        if (taskData.attachments && taskData.attachments.length > 0) {
            messagePayload.files = taskData.attachments.map(att => att.url);
        }

        const message = await channel.send(messagePayload);
        let returnUrl = message.url;

        // Create thread for discussion
        try {
            const threadName = taskData.task.length > 100
                ? taskData.task.substring(0, 97) + '...'
                : taskData.task;

            const thread = await message.startThread({
                name: threadName,
                autoArchiveDuration: 10080,
            });

            logger.success(`Created thread for task`);
            // Keep message URL so users see the message in channel (with thread attached)
            // returnUrl stays as message.url
        } catch (threadError) {
            logger.warn('Failed to create thread', threadError);
        }

        logger.success(`Sent task to team channel: ${taskData.team}`);
        return returnUrl;
    } catch (error) {
        logger.error(`Failed to send to team channel: ${taskData.team}`, error);
        return null;
    }
}

async function sendToPersonChannel(client, userId, taskData, notionTaskId, teamMessageUrl) {
    try {
        const channelId = config.channels.getPersonChannel(userId);
        if (!channelId) {
            logger.warn(`No personal channel configured for user: ${userId}`);
            return;
        }

        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.error(`Channel not found: ${channelId}`);
            return;
        }

        const embed = createTaskEmbed(taskData, notionTaskId);
        const messagePayload = { embeds: [embed] };

        // Add redirect button if team message URL exists
        if (teamMessageUrl) {
            const redirectButton = new ButtonBuilder()
                .setLabel('Go to Thread')
                .setStyle(ButtonStyle.Link)
                .setURL(teamMessageUrl)
                .setEmoji('↗️');

            const row = new ActionRowBuilder().addComponents(redirectButton);
            messagePayload.components = [row];
        }

        if (taskData.attachments && taskData.attachments.length > 0) {
            messagePayload.files = taskData.attachments.map(att => att.url);
        }

        await channel.send(messagePayload);
        logger.success(`Sent task to personal channel for user: ${userId}`);
    } catch (error) {
        logger.error(`Failed to send to person channel for user: ${userId}`, error);
    }
}

async function routeTaskMessages(client, assignedToUserId, assignedByUserId, taskData, notionTaskId) {
    // Send to team channel first to get message URL
    const teamMessageUrl = await sendToTeamChannel(client, taskData, notionTaskId);

    // Send to personal channel with redirect button (no DM on creation)
    await sendToPersonChannel(client, assignedToUserId, taskData, notionTaskId, teamMessageUrl);

    return teamMessageUrl;
}

module.exports = {
    routeTaskMessages,
    createTaskEmbed,
    sendToPersonChannel,
};
