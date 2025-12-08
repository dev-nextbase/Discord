const { SlashCommandBuilder } = require('discord.js');
const { getTasksByUser } = require('../services/notionService');
const roleManager = require('../services/roleManager');
const { getUserTeam } = require('../services/userTeamManager');
const { getPriorityEmoji } = require('../utils/priorityHelper');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tasks')
        .setDescription('Get a list of active tasks')
        .addStringOption(option =>
            option
                .setName('filter')
                .setDescription('Filter by priority')
                .setRequired(false)
                .addChoices(
                    { name: 'All', value: 'all' },
                    { name: '🔴 10 - Critical', value: '10' },
                    { name: '🔴 9 - Urgent', value: '9' },
                    { name: '🟠 8 - High', value: '8' },
                    { name: '🟠 7 - High', value: '7' },
                    { name: '🟡 6 - Medium', value: '6' },
                    { name: '🟡 5 - Medium', value: '5' },
                    { name: '🟢 4 - Low', value: '4' },
                    { name: '🟢 3 - Low', value: '3' },
                    { name: '🔵 2 - Very Low', value: '2' },
                    { name: '🔵 1 - Minimal', value: '1' }
                )
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Check tasks for another user (Admin/Team Lead only)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const filter = interaction.options.getString('filter') || 'all';
            const targetUser = interaction.options.getUser('user');

            let userIdToCheck = interaction.user.id;
            let userTagToCheck = interaction.user.tag;

            // Permission check if checking another user
            if (targetUser) {
                const requesterId = interaction.user.id;
                const isAdmin = roleManager.isAdmin(requesterId);

                if (!isAdmin) {
                    // Check if Team Lead
                    const targetUserTeam = getUserTeam(targetUser.id);
                    const isLead = roleManager.isTeamLead(requesterId, targetUserTeam);

                    if (!isLead) {
                        return interaction.editReply({
                            content: '❌ You do not have permission to view this user\'s tasks.',
                        });
                    }
                }

                userIdToCheck = targetUser.id;
                userTagToCheck = targetUser.tag;
            }

            logger.info(`Fetching tasks for user: ${userTagToCheck} (Filter: ${filter})`);

            // Get active tasks from Notion
            const tasks = await getTasksByUser(userIdToCheck, filter);

            if (tasks.length === 0) {
                await interaction.editReply({
                    content: `✨ ${targetUser ? userTagToCheck : 'You'} have no active ${filter !== 'all' ? filter + ' priority ' : ''}tasks!`,
                });
                return;
            }

            // Group by status
            const workingTasks = tasks.filter(t => t.status === 'Working');
            const onHoldTasks = tasks.filter(t => t.status === 'On Hold');

            let message = `📋 **Active Tasks for ${userTagToCheck}**\n`;
            if (filter !== 'all') message += `Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}\n`;
            message += '\n';

            if (workingTasks.length > 0) {
                message += '**▶️ Working**\n';
                workingTasks.forEach((task, idx) => {
                    const priorityEmoji = getPriorityEmoji(task.priority);
                    const url = task.discordUrl || task.url;
                    message += `${idx + 1}. ${priorityEmoji} [${task.title}](${url})\n`;
                });
                message += '\n';
            }

            if (onHoldTasks.length > 0) {
                message += '**⏸️ On Hold**\n';
                onHoldTasks.forEach((task, idx) => {
                    const priorityEmoji = getPriorityEmoji(task.priority);
                    const url = task.discordUrl || task.url;
                    message += `${idx + 1}. ${priorityEmoji} [${task.title}](${url})\n`;
                });
            }

            await interaction.editReply({
                content: message,
            });

            logger.success(`Sent ${tasks.length} tasks to ${interaction.user.tag}`);
        } catch (error) {
            logger.error('Error fetching tasks', error);

            await interaction.editReply({
                content: '❌ Failed to fetch tasks',
            });
        }
    },
};
