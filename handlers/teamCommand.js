const { PermissionFlagsBits } = require('discord.js');
const { assignRoleToTeam, listTeamRoles, removeTeamRole } = require('../services/teamRoleManagerNotion');
const { getPriorityEmoji } = require('../utils/priorityHelper');
const logger = require('../utils/logger');
const roleManager = require('../services/roleManagerNotion');

/**
 * Handles ?team command to map teams to Discord roles
 */
async function handleTeamCommand(message, args) {
    const subcommand = args[0]?.toLowerCase();

    // Permission check for admin-only commands
    const adminCommands = ['add', 'channel', 'log', 'remove', 'clear'];
    if (adminCommands.includes(subcommand)) {
        const isAdmin = await roleManager.isAdmin(message.author.id);
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !isAdmin) {
            await message.reply('❌ Only administrators can manage team configuration.');
            return;
        }
    }

    if (subcommand === 'add') {
        // ?team add TeamName @role
        const teamName = args[1];
        const roleMention = message.mentions.roles.first();

        if (!teamName || !roleMention) {
            await message.reply('❌ Usage: `?team add TeamName @RoleName`');
            return;
        }

        await assignRoleToTeam(teamName, roleMention.id);
        await message.reply(`✅ Team **${teamName}** linked to role ${roleMention}`);

    } else if (subcommand === 'list') {
        // ?team list
        const teams = await listTeamRoles();

        if (Object.keys(teams).length === 0) {
            await message.reply('📋 No team roles configured yet.');
            return;
        }

        const { getAllUsersInTeam } = require('../services/userTeamManagerNotion');

        let response = '**📋 Team Roles & Members:**\n';
        for (const [team, roleId] of Object.entries(teams)) {
            const role = message.guild.roles.cache.get(roleId);

            if (role) {
                // Fetch members assigned to this team in Notion
                const userIds = await getAllUsersInTeam(team);
                const memberTags = [];

                for (const userId of userIds) {
                    try {
                        const member = await message.guild.members.fetch(userId);
                        memberTags.push(member.user.tag);
                    } catch (error) {
                        logger.warn(`Could not fetch member ${userId}`);
                    }
                }

                const membersDisplay = memberTags.join(', ') || 'None';
                response += `\n• **${team}**: ${role.toString()}\n  Members: ${membersDisplay}`;
            } else {
                response += `\n• **${team}**: \`${roleId}\` (role not found)`;
            }
        }

        await message.reply(response);

    } else if (subcommand === 'channel') {
        // ?team channel TeamName #channel
        const teamName = args[1];
        const channel = message.mentions.channels.first();

        if (!teamName || !channel) {
            await message.reply('❌ Usage: `?team channel TeamName #channel`');
            return;
        }

        const channelManager = require('../services/channelManagerNotion');
        await channelManager.setTeamChannel(teamName, channel.id);
        await message.reply(`✅ Team **${teamName}** channel set to ${channel}`);

    } else if (subcommand === 'backlog') {
        // ?team backlog TeamName #channel
        const teamName = args[1];
        const channel = message.mentions.channels.first();

        if (!teamName || !channel) {
            await message.reply('❌ Usage: `?team backlog TeamName #channel`');
            return;
        }

        const channelManager = require('../services/channelManagerNotion');
        await channelManager.setTeamBacklogChannel(teamName, channel.id);
        await message.reply(`✅ Team **${teamName}** backlog channel set to ${channel}`);


    } else if (subcommand === 'remove') {
        // ?team remove TeamName
        const teamName = args[1];

        if (!teamName) {
            await message.reply('❌ Usage: `?team remove TeamName`');
            return;
        }

        await removeTeamRole(teamName);
        await message.reply(`✅ Removed role assignment for team **${teamName}**`);

    } else if (subcommand === 'clear') {
        // ?team clear - remove all teams
        // Not implemented for Notion yet to avoid accidental mass deletion
        await message.reply('❌ The `clear` command is temporarily disabled for safety with Notion database.');
        /*
        fs.writeFileSync(TEAM_ROLES_FILE, JSON.stringify({ teamRoles: {} }, null, 2));
        await message.reply('✅ **All team role assignments cleared**');
        logger.success('All team roles cleared');
        */

    } else if (subcommand === 'tasks') {
        // ?team tasks [filter] [teamName]
        const filter = args[1]?.toLowerCase() || 'all';
        const validFilters = ['all', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

        if (!validFilters.includes(filter)) {
            return message.reply('❌ Invalid filter. Use: `all`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`');
        }

        const requesterId = message.author.id;
        const isAdmin = await roleManager.isAdmin(requesterId);
        const ledTeams = await roleManager.getLedTeams(requesterId);

        if (!isAdmin && ledTeams.length === 0) {
            return message.reply('❌ You must be a Team Lead or Admin to use this command.');
        }

        let teamToShow = ledTeams[0]; // Default to first led team

        // If admin, check for team argument
        if (isAdmin && args[2]) {
            teamToShow = args[2];
        } else if (isAdmin && !teamToShow) {
            // If admin didn't specify team and doesn't lead any, ask for it
            return message.reply('❌ Admin: Please specify team. `?team tasks <filter> <teamName>`');
        }

        if (!teamToShow) {
            return message.reply('❌ Could not determine team.');
        }

        // Verify user leads this team if not admin
        if (!isAdmin && !ledTeams.includes(teamToShow)) {
            return message.reply(`❌ You are not a lead for team **${teamToShow}**.`);
        }

        try {
            const { getTasksByTeam } = require('../services/notionService');
            const tasks = await getTasksByTeam(teamToShow, filter);

            if (tasks.length === 0) {
                return message.reply(`✨ No active tasks found for team **${teamToShow}** (Filter: ${filter})`);
            }

            // Group by status
            const workingTasks = tasks.filter(t => t.status === 'Working');
            const onHoldTasks = tasks.filter(t => t.status === 'On Hold');

            let response = `📋 **Active Tasks for Team: ${teamToShow}**\n`;
            if (filter !== 'all') response += `Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}\n`;
            response += '\n';

            if (workingTasks.length > 0) {
                response += '**▶️ Working**\n';
                workingTasks.forEach((task, idx) => {
                    const priorityEmoji = getPriorityEmoji(task.priority);
                    const url = task.discordUrl || task.url;
                    response += `${idx + 1}. ${priorityEmoji} [${task.title}](${url}) - ${task.assignedTo}\n`;
                });
                response += '\n';
            }

            if (onHoldTasks.length > 0) {
                response += '**⏸️ On Hold**\n';
                onHoldTasks.forEach((task, idx) => {
                    const priorityEmoji = getPriorityEmoji(task.priority);
                    const url = task.discordUrl || task.url;
                    response += `${idx + 1}. ${priorityEmoji} [${task.title}](${url}) - ${task.assignedTo}\n`;
                });
            }

            // Split message if too long
            if (response.length > 2000) {
                const chunks = response.match(/[\s\S]{1,1900}/g);
                for (const chunk of chunks) {
                    await message.channel.send(chunk);
                }
            } else {
                await message.channel.send(response);
            }

        } catch (error) {
            logger.error('Error fetching team tasks', error);
            message.reply('❌ Failed to fetch team tasks.');
        }

    } else {
        await message.reply(
            '**Team Management**\n\n' +
            '`?team tasks [filter]` - View team tasks (Leads/Admins)\n' +
            '`?team add TeamName @Role` - Link a team to a Discord role\n' +
            '`?team channel TeamName #channel` - Set channel for team tasks\n' +
            '`?team log TeamName #channel` - Set channel for completion logs\n' +
            '`?team list` - Show teams, roles, and members\n' +
            '`?team remove TeamName` - Remove a team role assignment\n'
            // '`?team clear` - Remove ALL team role assignments' // Disabled
        );
    }
}

module.exports = {
    handleTeamCommand,
};
