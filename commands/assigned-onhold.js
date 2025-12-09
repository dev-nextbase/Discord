const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { Client } = require('@notionhq/client');
const { config } = require('../config/config');
const logger = require('../utils/logger');
const { getPriorityEmoji } = require('../utils/priorityHelper');

const notion = new Client({ auth: config.notion.token });

const TASKS_PER_PAGE = 10;

/**
 * Create embed for a specific page of tasks
 */
function createTaskEmbed(tasksToOthers, page, userTag) {
    const totalPages = Math.ceil(tasksToOthers.length / TASKS_PER_PAGE);
    const startIdx = page * TASKS_PER_PAGE;
    const endIdx = Math.min(startIdx + TASKS_PER_PAGE, tasksToOthers.length);
    const pageTasks = tasksToOthers.slice(startIdx, endIdx);

    const embed = new EmbedBuilder()
        .setColor('#FFA500') // Orange color for "on hold"
        .setTitle('⏸️ Tasks Assigned to Others - On Hold')
        .setDescription(`You have **${tasksToOthers.length}** task${tasksToOthers.length !== 1 ? 's' : ''} assigned to others that are currently on hold.`)
        .setFooter({ text: `Requested by ${userTag} • Page ${page + 1} of ${totalPages}` })
        .setTimestamp();

    // Add fields for tasks on this page
    for (let i = 0; i < pageTasks.length; i++) {
        const task = pageTasks[i];
        const globalIdx = startIdx + i;

        const title = task.properties['Task']?.title[0]?.text?.content || 'Untitled Task';
        const assignedTo = task.properties['Assigned To']?.rich_text[0]?.text?.content || 'Unknown';
        const priority = task.properties['Priority']?.select?.name || '5';
        const discordUrl = task.properties['Discord URL']?.url || null;
        const createdDate = new Date(task.created_time);
        const daysOnHold = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));

        // Get priority emoji using helper function
        const priorityEmoji = getPriorityEmoji(priority);

        const taskInfo = [
            `👤 **Assigned to:** ${assignedTo}`,
            `${priorityEmoji} **Priority:** ${priority}`,
            `📅 **On hold for:** ${daysOnHold} day${daysOnHold !== 1 ? 's' : ''}`,
            discordUrl ? `🔗 [Go to Task](${discordUrl})` : ''
        ].filter(Boolean).join('\n');

        embed.addFields({
            name: `${globalIdx + 1}. ${title}`,
            value: taskInfo,
            inline: false
        });
    }

    return embed;
}

/**
 * Create navigation buttons
 */
function createNavigationButtons(currentPage, totalPages) {
    const row = new ActionRowBuilder();

    // Previous button
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 0)
    );

    // Page indicator
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('page_info')
            .setLabel(`Page ${currentPage + 1}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );

    // Next button
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages - 1)
    );

    return row;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assigned-onhold')
        .setDescription('View tasks you assigned to others that are still on hold'),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const userId = interaction.user.id;
            const userTag = interaction.user.tag;

            logger.info(`Fetching on-hold tasks assigned by ${userTag} (${userId})`);

            // Query Notion database for tasks assigned BY this user that are on hold
            const response = await notion.databases.query({
                database_id: config.notion.databaseId,
                filter: {
                    and: [
                        {
                            property: 'Assigned By ID',
                            rich_text: {
                                equals: userId,
                            },
                        },
                        {
                            property: 'Status',
                            select: {
                                equals: 'On Hold',
                            },
                        },
                    ],
                },
            });

            const tasks = response.results;

            // Filter out tasks assigned to self
            const tasksToOthers = tasks.filter(task => {
                const assignedToId = task.properties['Assigned To ID']?.rich_text[0]?.text?.content;
                return assignedToId !== userId;
            });

            if (tasksToOthers.length === 0) {
                await interaction.editReply({
                    content: '✅ Great! You have no tasks assigned to others that are on hold.',
                });
                return;
            }

            // Initial page
            let currentPage = 0;
            const totalPages = Math.ceil(tasksToOthers.length / TASKS_PER_PAGE);

            // Create initial embed and buttons
            const embed = createTaskEmbed(tasksToOthers, currentPage, userTag);
            const components = totalPages > 1 ? [createNavigationButtons(currentPage, totalPages)] : [];

            const message = await interaction.editReply({
                embeds: [embed],
                components: components
            });

            // If only one page, no need for button collector
            if (totalPages <= 1) {
                logger.success(`Displayed ${tasksToOthers.length} on-hold tasks for ${userTag}`);
                return;
            }

            // Create button collector for pagination
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === userId,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async i => {
                if (i.customId === 'prev_page') {
                    currentPage = Math.max(0, currentPage - 1);
                } else if (i.customId === 'next_page') {
                    currentPage = Math.min(totalPages - 1, currentPage + 1);
                }

                const newEmbed = createTaskEmbed(tasksToOthers, currentPage, userTag);
                const newButtons = createNavigationButtons(currentPage, totalPages);

                await i.update({
                    embeds: [newEmbed],
                    components: [newButtons]
                });
            });

            collector.on('end', async () => {
                try {
                    // Disable buttons after timeout
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev_page')
                                .setLabel('◀ Previous')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('page_info')
                                .setLabel(`Page ${currentPage + 1}/${totalPages}`)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('next_page')
                                .setLabel('Next ▶')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true)
                        );

                    await interaction.editReply({ components: [disabledRow] });
                } catch (error) {
                    // Ignore errors when editing after timeout
                }
            });

            logger.success(`Displayed ${tasksToOthers.length} on-hold tasks for ${userTag} with pagination`);

        } catch (error) {
            logger.error('Error fetching on-hold tasks', error);
            await interaction.editReply({
                content: `❌ Failed to fetch on-hold tasks: ${error.message}`,
            });
        }
    },
};
