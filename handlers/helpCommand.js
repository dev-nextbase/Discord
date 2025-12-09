const { EmbedBuilder } = require('discord.js');
const roleManager = require('../services/roleManagerNotion');

module.exports = {
    name: 'help',
    description: 'Show help commands',
    async execute(message, args) {
        const subcommand = args[0]?.toLowerCase();
        const userId = message.author.id;

        if (subcommand === 'admin') {
            // Check if user is admin
            if (!await roleManager.isAdmin(userId) && message.guild.ownerId !== userId) {
                return message.reply('❌ You do not have permission to view Admin help.');
            }
            await sendAdminHelp(message);
        } else if (subcommand === 'team') {
            // Check if user is team lead or admin
            const isLead = await roleManager.isTeamLead(userId);
            const isAdmin = await roleManager.isAdmin(userId);

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
        .setTitle('🤖 Task Management Bot - Help Guide')
        .setDescription('Welcome! Here\'s everything you need to know about using this bot.')
        .addFields(
            {
                name: '📝 Task Commands',
                value:
                    '`/create` - Create a new task and assign it to someone\n' +
                    '`/tasks` - View all your active tasks (Working & On Hold)\n' +
                    '`/tasks filter:1-10` - Filter your tasks by priority level\n' +
                    '`/assigned-onhold` - View tasks you assigned to others that are on hold\n' +
                    '`/report` - Get your task statistics for a time period',
                inline: false
            },
            {
                name: '🎨 Priority System',
                value:
                    '**Priority levels range from 1 (minimal) to 10 (critical):**\n' +
                    '🔴 **10-9**: Critical/Urgent - Needs immediate attention\n' +
                    '🟠 **8-7**: High Priority - Important tasks\n' +
                    '🟡 **6-5**: Medium Priority - Standard tasks\n' +
                    '🟢 **4-3**: Low Priority - Can wait\n' +
                    '🔵 **2-1**: Very Low/Minimal - Nice to have',
                inline: false
            },
            {
                name: '🔔 Notifications & Updates',
                value:
                    '• **Personal Channel Notifications**: Tasks assigned to you appear in your personal channel\n' +
                    '• **Completion Alerts**: Get notified in your channel when someone completes your task\n' +
                    '• **Task Threads**: Each task gets its own Discord thread for discussion\n' +
                    '• **Status Buttons**: Use buttons in your team channel to update task status (Working/Done)',
                inline: false
            },
            {
                name: '📊 Task Status',
                value:
                    '⏸️ **On Hold** - Task is waiting to be started\n' +
                    '⚙️ **Working** - Task is actively being worked on\n' +
                    '✅ **Done** - Task has been completed',
                inline: false
            },
            {
                name: '💡 Quick Tips',
                value:
                    '• Click **"Go to Task"** buttons to jump directly to task threads\n' +
                    '• Use `/report` to track your productivity over time\n' +
                    '• Higher priority tasks (🔴) should be completed first\n' +
                    '• Update task status using the Working/Done buttons in your team channel',
                inline: false
            }
        )
        .setFooter({ text: 'For advanced commands, use ?help team (Team Leads) or ?help admin (Admins)' })
        .setTimestamp();

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
                    '`?team tasks 10` - View priority 10 (critical) team tasks\n' +
                    '`?team tasks 5` - View priority 5 (medium) team tasks\n' +
                    '`?team tasks 1` - View priority 1 (minimal) team tasks'
            },
            {
                name: '� Task Reassignment', value:
                    '**Reassign Button** - Click the 🔄 Reassign button on any task\n' +
                    '• Select a team member from the dropdown\n' +
                    '• Task is reassigned and old assignee is notified\n' +
                    '• New assignee receives the task in their channel'
            },
            {
                name: '�🔍 User Inspection', value:
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
