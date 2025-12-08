const { PermissionFlagsBits } = require('discord.js');
const { assignUserToTeam, listUserTeams, removeUserTeam } = require('../services/userTeamManager');
const logger = require('../utils/logger');

/**
 * Handles ?assign command to assign user to team
 * Format: ?assign @mention teamname
 */
async function handleAssignCommand(message, args) {
    try {
        // Check if user has permission
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('❌ You need Administrator permissions to use this command.');
            return;
        }

        // Validate arguments
        if (message.mentions.users.size === 0 || args.length < 2) {
            await message.reply(
                '❌ **Usage:** `?assign @user teamname`\n' +
                '**Example:** `?assign @john Development`\n\n' +
                'Assigns a user to a team. When tasks are assigned to this user, they\'ll go to the team channel.'
            );
            return;
        }

        const mentionedUser = message.mentions.users.first();
        const userId = mentionedUser.id;
        const userName = mentionedUser.tag;

        // Get team name (everything after the mention)
        const teamName = args.slice(1).join(' ');

        // Assign user to team
        assignUserToTeam(userId, teamName);

        await message.reply(
            `✅ **User assigned to team!**\n\n` +
            `👤 User: **${userName}**\n` +
            `🏢 Team: **${teamName}**\n` +
            `🔑 User ID: \`${userId}\`\n\n` +
            `Tasks assigned to <@${userId}> will now be routed to the **${teamName}** team channel.`
        );

        logger.info(`User assigned: ${userName} (${userId}) -> ${teamName}`);
    } catch (error) {
        logger.error('Error handling ?assign command', error);
        await message.reply('❌ Failed to assign user to team. Check bot logs for details.');
    }
}

module.exports = {
    handleAssignCommand,
};
