const { EmbedBuilder } = require('discord.js');
const roleManager = require('../services/roleManager');

module.exports = {
    name: 'help',
    description: 'Show help commands',
    async execute(message, args) {
        const subcommand = args[0]?.toLowerCase();
        const userId = message.author.id;

        if (subcommand === 'admin') {
            // Check if user is admin
            if (!roleManager.isAdmin(userId) && message.guild.ownerId !== userId) {
                return message.reply('❌ You do not have permission to view Admin help.');
            }
            await sendAdminHelp(message);
        } else if (subcommand === 'team') {
            // Check if user is team lead or admin
            const isLead = roleManager.isTeamLead(userId);
            const isAdmin = roleManager.isAdmin(userId);

            if (!isLead && !isAdmin && message.guild.ownerId !== userId) {
                return message.reply('❌ You do not have permission to view Team Lead help.');
            }
            await sendTeamHelp(message);
        } else {
            // General help
            await sendGeneralHelp(message);
        }
    },
};

async function sendGeneralHelp(message) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🤖 Bot Help - General Commands')
        .setDescription('Here are the commands available to everyone:')
        .addFields(
            {
                name: '📝 Task Management', value:
                    '`/create` - Create a new task\n' +
                    '`/tasks` - View your active tasks\n' +
                    '`/tasks filter:high|medium|low` - View tasks by priority'
            },
            {
                name: '🔒 Private Channels', value:
                    '`?private add` - Mark current channel as private\n' +
                    '`?private remove` - Unmark current channel\n' +
                    '`?private list` - List your private channels'
            },
            {
                name: '👥 User Setup', value:
                    '`?assign @user TeamName` - Assign a user to a team (Self-assign if allowed)'
            }
        )
        .setFooter({ text: 'Use ?help team or ?help admin for more commands' });

    await message.channel.send({ embeds: [embed] });
}

async function sendTeamHelp(message) {
    const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('👑 Bot Help - Team Lead Commands')
        .setDescription('Commands for Team Leads to manage their team:')
        .addFields(
            {
                name: '📋 Team Tasks', value:
                    '`?team tasks` - View all active tasks for your team\n' +
                    '`?team tasks high` - View high priority team tasks\n' +
                    '`?team tasks medium` - View medium priority team tasks\n' +
                    '`?team tasks low` - View low priority team tasks'
            },
            {
                name: '🔍 User Inspection', value:
                    '`/tasks user:@user` - View active tasks for a specific user in your team'
            }
        );

    await message.channel.send({ embeds: [embed] });
}

async function sendAdminHelp(message) {
    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🛡️ Bot Help - Admin Commands')
        .setDescription('Full control commands for Admins:')
        .addFields(
            {
                name: '👥 Role Management', value:
                    '`?role add admin @user` - Add a new Admin\n' +
                    '`?role remove admin @user` - Remove an Admin\n' +
                    '`?role add lead @user TeamName` - Assign a Team Lead\n' +
                    '`?role remove lead @user TeamName` - Remove a Team Lead'
            },
            {
                name: '⚙️ Team Configuration', value:
                    '`?team add TeamName @Role` - Link Discord role to Team\n' +
                    '`?team channel TeamName #channel` - Set main team channel\n' +
                    '`?team log TeamName #channel` - Set completion log channel\n' +
                    '`?team list` - List all teams and configs\n' +
                    '`?team clear` - Reset all team configs'
            },
            {
                name: '🔍 Global Inspection', value:
                    '`?team tasks [filter] [TeamName]` - View tasks for ANY team\n' +
                    '`/tasks user:@user` - View tasks for ANY user'
            }
        );

    await message.channel.send({ embeds: [embed] });
}
