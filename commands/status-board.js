const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status-board')
        .setDescription('Create a live status board showing what everyone is working on')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Create initial status board
            const embed = await createStatusBoardEmbed(interaction.client);

            const message = await interaction.channel.send({ embeds: [embed] });

            // Save the status board message ID and channel ID
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(__dirname, '../config/statusBoard.json');

            const config = {
                channelId: interaction.channelId,
                messageId: message.id,
                guildId: interaction.guildId
            };

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            await interaction.editReply({
                content: '✅ Status board created! It will auto-update when tasks change.',
                ephemeral: true
            });

            logger.success(`Status board created in channel ${interaction.channelId}`);
        } catch (error) {
            logger.error('Error creating status board', error);
            await interaction.editReply({
                content: '❌ Failed to create status board',
                ephemeral: true
            });
        }
    },
};

async function createStatusBoardEmbed(client) {
    const { getActiveTasksByUser } = require('../services/notionService');
    const channelManager = require('../services/channelManager');

    const embed = new EmbedBuilder()
        .setTitle('📊 Team Status Board')
        .setColor('#5865F2')
        .setTimestamp();

    try {
        // Get all users with personal channels
        const personalChannels = channelManager.listPersonChannels();

        if (Object.keys(personalChannels).length === 0) {
            embed.setDescription('No team members configured yet.');
            return embed;
        }

        const tasks = await getActiveTasksByUser();
        let statusText = '';

        for (const [userId, channelId] of Object.entries(personalChannels)) {
            try {
                const user = await client.users.fetch(userId);
                const userTasks = tasks.filter(t => t.assignedToId === userId && t.status === 'Working');

                if (userTasks.length > 0) {
                    const taskList = userTasks.map(t => `• [${t.title}](${t.discordUrl || t.url})`).join('\n');
                    statusText += `**${user.tag}** 🔵 Working\n${taskList}\n\n`;
                } else {
                    statusText += `**${user.tag}** ⚪ Idle\n\n`;
                }
            } catch (error) {
                logger.warn(`Failed to fetch user ${userId}`, error);
            }
        }

        embed.setDescription(statusText || 'No activity to display.');
    } catch (error) {
        logger.error('Error building status board', error);
        embed.setDescription('⚠️ Error loading status data');
    }

    return embed;
}

module.exports.createStatusBoardEmbed = createStatusBoardEmbed;
