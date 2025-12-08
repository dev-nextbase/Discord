const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTaskReportByUser } = require('../services/notionService');
const logger = require('../utils/logger');

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
            await interaction.deferReply({ ephemeral: true });

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

            await interaction.editReply({ embeds: [embed] });
            logger.success(`Generated report for ${userTag}`);

        } catch (error) {
            logger.error('Error generating report', error);
            await interaction.editReply({
                content: `❌ Failed to generate report: ${error.message}`,
            });
        }
    },
};
