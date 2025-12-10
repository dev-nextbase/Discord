const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getTaskReportByUser } = require('../services/notionService');
const logger = require('../utils/logger');

// Store pagination state
const paginationState = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Get your task report for a specific time period')
        .addStringOption(option =>
            option
                .setName('period')
                .setDescription('Time period for the report')
                .setRequired(true)
                .addChoices(
                    { name: 'Last Day', value: 'day' },
                    { name: 'Last Week', value: 'week' },
                    { name: 'Last Month', value: 'month' },
                    { name: 'Custom Date Range', value: 'custom' }
                )
        )
        .addStringOption(option =>
            option
                .setName('start_date')
                .setDescription('Start date (YYYY-MM-DD) - Required for custom period')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('end_date')
                .setDescription('End date (YYYY-MM-DD) - Required for custom period')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const period = interaction.options.getString('period');
            const startDateStr = interaction.options.getString('start_date');
            const endDateStr = interaction.options.getString('end_date');
            const userId = interaction.user.id;
            const userTag = interaction.user.tag;

            let startDate, endDate;
            const now = new Date();

            // Calculate date range based on period
            if (period === 'custom') {
                if (!startDateStr || !endDateStr) {
                    await interaction.editReply({
                        content: '❌ Custom period requires both start_date and end_date (YYYY-MM-DD format)',
                    });
                    return;
                }

                // Validate and parse dates
                startDate = new Date(startDateStr);
                endDate = new Date(endDateStr);

                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    await interaction.editReply({
                        content: '❌ Invalid date format. Please use YYYY-MM-DD (e.g., 2024-01-15)',
                    });
                    return;
                }

                if (startDate > endDate) {
                    await interaction.editReply({
                        content: '❌ Start date must be before end date',
                    });
                    return;
                }
            } else if (period === 'day') {
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 1);
                endDate = now;
            } else if (period === 'week') {
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                endDate = now;
            } else if (period === 'month') {
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                endDate = now;
            }

            logger.info(`Generating report for ${userTag} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

            // Get task statistics from Notion
            const report = await getTaskReportByUser(userId, startDate, endDate);

            // Create embed with report
            const periodLabel = period === 'custom'
                ? `${startDateStr} to ${endDateStr}`
                : period === 'day' ? 'Last 24 Hours'
                    : period === 'week' ? 'Last 7 Days'
                        : 'Last 30 Days';

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`📊 Task Report - ${periodLabel}`)
                .setDescription(`Report for ${userTag}`)
                .addFields(
                    {
                        name: '✅ Tasks Completed',
                        value: `${report.completedTasks} task${report.completedTasks !== 1 ? 's' : ''}`,
                        inline: true
                    },
                    {
                        name: '📤 Tasks Assigned to Others',
                        value: `${report.assignedTasks} task${report.assignedTasks !== 1 ? 's' : ''}`,
                        inline: true
                    },
                    {
                        name: '⏳ Remaining Tasks',
                        value: `${report.remainingTasks} task${report.remainingTasks !== 1 ? 's' : ''}`,
                        inline: true
                    },
                    {
                        name: '📈 Total Tasks Received',
                        value: `${report.totalReceived} task${report.totalReceived !== 1 ? 's' : ''}`,
                        inline: true
                    },
                    {
                        name: '⚙️ In Progress',
                        value: `${report.workingTasks} task${report.workingTasks !== 1 ? 's' : ''}`,
                        inline: true
                    },
                    {
                        name: '⏸️ On Hold',
                        value: `${report.onHoldTasks} task${report.onHoldTasks !== 1 ? 's' : ''}`,
                        inline: true
                    }
                )
                .setFooter({ text: `Report generated on ${now.toLocaleDateString()}` })
                .setTimestamp();

            // Create buttons for viewing task lists
            const buttons = new ActionRowBuilder();

            if (report.doneTasks.length > 0) {
                buttons.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`report_done_${userId}`)
                        .setLabel(`View Done Tasks (${report.doneTasks.length})`)
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅')
                );
            }

            if (report.remainingTasksList.length > 0) {
                buttons.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`report_remaining_${userId}`)
                        .setLabel(`View Remaining Tasks (${report.remainingTasksList.length})`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⏳')
                );
            }

            if (report.assignedTasksList.length > 0) {
                buttons.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`report_assigned_${userId}`)
                        .setLabel(`View Assigned Tasks (${report.assignedTasksList.length})`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📤')
                );
            }

            // Store report data for pagination
            paginationState.set(userId, {
                doneTasks: report.doneTasks,
                remainingTasksList: report.remainingTasksList,
                assignedTasksList: report.assignedTasksList,
                periodLabel,
                userTag,
            });

            const response = { embeds: [embed] };
            if (buttons.components.length > 0) {
                response.components = [buttons];
            }

            await interaction.editReply(response);
            logger.success(`Generated report for ${userTag}`);

        } catch (error) {
            logger.error('Error generating report', error);
            await interaction.editReply({
                content: `❌ Failed to generate report: ${error.message}`,
            });
        }
    },

    async handleButton(interaction) {
        try {
            const [action, type, userId] = interaction.customId.split('_');

            if (action !== 'report') return false;

            // Check if user is authorized to view this report
            if (interaction.user.id !== userId) {
                await interaction.reply({
                    content: '❌ You can only view your own reports.',
                    flags: MessageFlags.Ephemeral,
                });
                return true;
            }

            const reportData = paginationState.get(userId);
            if (!reportData) {
                await interaction.reply({
                    content: '❌ Report data expired. Please run /report again.',
                    flags: MessageFlags.Ephemeral,
                });
                return true;
            }

            let taskList, title, emoji;
            if (type === 'done') {
                taskList = reportData.doneTasks;
                title = '✅ Done Tasks';
                emoji = '✅';
            } else if (type === 'remaining') {
                taskList = reportData.remainingTasksList;
                title = '⏳ Remaining Tasks';
                emoji = '⏳';
            } else if (type === 'assigned') {
                taskList = reportData.assignedTasksList;
                title = '📤 Tasks Assigned to Others';
                emoji = '📤';
            }

            // Show first page
            await showTaskListPage(interaction, taskList, title, emoji, 0, userId, type, reportData);
            return true;

        } catch (error) {
            logger.error('Error handling report button', error);
            await interaction.reply({
                content: '❌ An error occurred while displaying tasks.',
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }
    },

    async handlePagination(interaction) {
        try {
            const [action, type, userId, pageStr] = interaction.customId.split('_');

            if (action !== 'reportpage') return false;

            const page = parseInt(pageStr);
            const reportData = paginationState.get(userId);

            if (!reportData) {
                await interaction.update({
                    content: '❌ Report data expired. Please run /report again.',
                    components: [],
                    embeds: [],
                });
                return true;
            }

            let taskList, title, emoji;
            if (type === 'done') {
                taskList = reportData.doneTasks;
                title = '✅ Done Tasks';
                emoji = '✅';
            } else if (type === 'remaining') {
                taskList = reportData.remainingTasksList;
                title = '⏳ Remaining Tasks';
                emoji = '⏳';
            } else if (type === 'assigned') {
                taskList = reportData.assignedTasksList;
                title = '📤 Tasks Assigned to Others';
                emoji = '📤';
            }

            await showTaskListPage(interaction, taskList, title, emoji, page, userId, type, reportData, true);
            return true;

        } catch (error) {
            logger.error('Error handling pagination', error);
            return false;
        }
    },
};

async function showTaskListPage(interaction, taskList, title, emoji, page, userId, type, reportData, isUpdate = false) {
    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(taskList.length / ITEMS_PER_PAGE);
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageTasks = taskList.slice(start, end);

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`${title} - ${reportData.periodLabel}`)
        .setDescription(`Report for ${reportData.userTag}\nPage ${page + 1} of ${totalPages}`)
        .setFooter({ text: `Showing ${start + 1}-${Math.min(end, taskList.length)} of ${taskList.length} tasks` })
        .setTimestamp();

    // Add tasks to embed
    pageTasks.forEach((task, index) => {
        const priorityEmoji = getPriorityEmoji(task.priority);
        let fieldValue = `${priorityEmoji} Priority: ${task.priority}`;

        if (task.status) {
            fieldValue += `\nStatus: ${task.status}`;
        }

        if (task.assignedTo) {
            fieldValue += `\nAssigned to: ${task.assignedTo}`;
        }

        if (task.discordUrl) {
            fieldValue += `\n[🔗 Go to Thread](${task.discordUrl})`;
        } else {
            fieldValue += `\n⚠️ No thread link available`;
        }

        embed.addFields({
            name: `${start + index + 1}. ${task.name}`,
            value: fieldValue,
            inline: false
        });
    });

    // Create pagination buttons
    const buttons = new ActionRowBuilder();

    if (page > 0) {
        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId(`reportpage_${type}_${userId}_${page - 1}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('◀️')
        );
    }

    buttons.addComponents(
        new ButtonBuilder()
            .setCustomId(`report_back_${userId}`)
            .setLabel('Back to Summary')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊')
    );

    if (page < totalPages - 1) {
        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId(`reportpage_${type}_${userId}_${page + 1}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('▶️')
        );
    }

    const response = {
        embeds: [embed],
        components: [buttons],
    };

    if (isUpdate) {
        await interaction.update(response);
    } else {
        await interaction.reply({
            ...response,
            flags: MessageFlags.Ephemeral,
        });
    }
}

function getPriorityEmoji(priority) {
    const priorityNum = parseInt(priority);
    if (priorityNum >= 9) return '🔴';
    if (priorityNum >= 7) return '🟠';
    if (priorityNum >= 5) return '🟡';
    if (priorityNum >= 3) return '🟢';
    return '🔵';
}
