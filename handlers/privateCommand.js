const { PermissionFlagsBits } = require('discord.js');
const channelManager = require('../services/channelManager');
const logger = require('../utils/logger');

/**
 * Handles ?private command for private channel management
 */
async function handlePrivateCommand(message, args) {
    // Check administrator permission
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply('❌ Only administrators can manage private channels.');
        return;
    }

    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'add') {
        // ?private add #channel
        const channel = message.mentions.channels.first() || message.channel;

        channelManager.addPrivateChannel(channel.id);
        await message.reply(`✅ Channel ${channel} marked as **Private**. Tasks created here will stay here.`);
    } else if (subcommand === 'remove') {
        // ?private remove #channel
        const channel = message.mentions.channels.first() || message.channel;

        channelManager.removePrivateChannel(channel.id);
        await message.reply(`✅ Channel ${channel} is no longer private.`);
    } else if (subcommand === 'list') {
        // ?private list
        const privateChannels = channelManager.listPrivateChannels();

        if (privateChannels.length === 0) {
            await message.reply('📋 No private channels configured.');
            return;
        }

        let response = '**🔒 Private Channels:**\n';
        for (const channelId of privateChannels) {
            const channel = message.guild.channels.cache.get(channelId);
            response += `\n• ${channel ? channel.toString() : `\`${channelId}\` (channel not found)`}`;
        }

        await message.reply(response);
    } else {
        await message.reply(
            '**Private Channel Management**\n\n' +
            '`?private add [#channel]` - Mark channel as private (defaults to current)\n' +
            '`?private remove [#channel]` - Unmark channel as private\n' +
            '`?private list` - List all private channels'
        );
    }
}

module.exports = {
    handlePrivateCommand,
};
