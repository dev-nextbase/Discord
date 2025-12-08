const { PermissionFlagsBits } = require('discord.js');
const { config } = require('../config/config');
const logger = require('../utils/logger');

/**
 * Handles ?user command for personal channel mapping
 */
async function handleUserCommand(message, args) {
    // Check administrator permission
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply('❌ Only administrators can manage user channels.');
        return;
    }

    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'add') {
        // ?user add USER_ID CHANNEL_ID
        const userId = args[1]?.replace(/[<@!>]/g, '');
        const channelId = args[2]?.replace(/[<#>]/g, '');

        if (!userId || !channelId) {
            await message.reply('❌ Usage: `?user add USER_ID CHANNEL_ID`');
            return;
        }

        // Validate user and channel exist
        try {
            const user = await message.client.users.fetch(userId).catch(() => null);
            const channel = message.guild.channels.cache.get(channelId);

            if (!user) {
                await message.reply(`❌ User with ID \`${userId}\` not found`);
                return;
            }

            if (!channel) {
                await message.reply(`❌ Channel with ID \`${channelId}\` not found`);
                return;
            }

            config.channels.setPersonChannel(userId, channelId);
            await message.reply(`✅ Personal channel for ${user.tag} set to ${channel}`);
        } catch (error) {
            logger.error('Error in ?user add command', error);
            await message.reply('❌ Failed to set personal channel');
        }
    } else if (subcommand === 'list') {
        // ?user list
        const personChannels = config.channels.listPersonChannels();

        if (Object.keys(personChannels).length === 0) {
            await message.reply('📋 No personal channels configured yet.');
            return;
        }

        let response = '**📋 Personal Channels:**\n';
        for (const [userId, channelId] of Object.entries(personChannels)) {
            const user = await message.client.users.fetch(userId).catch(() => null);
            const channel = message.guild.channels.cache.get(channelId);
            response += `\n• ${user ? user.tag : `\`${userId}\``}: ${channel ? channel.toString() : `\`${channelId}\` (channel not found)`}`;
        }

        await message.reply(response);
    } else {
        await message.reply(
            '**Personal Channel Management**\n\n' +
            '`?user add USER_ID CHANNEL_ID` - Set user\'s personal channel\n' +
            '`?user list` - Show all personal channel mappings'
        );
    }
}

module.exports = {
    handleUserCommand,
};
