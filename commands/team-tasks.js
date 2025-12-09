const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Client } = require('@notionhq/client');
const logger = require('../utils/logger');
const { getPriorityEmoji } = require('../utils/priorityHelper');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('team-tasks')
        .setDescription('View all active tasks (Working/On Hold) for your entire team'),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const roleManager = require('../services/roleManagerNotion');
            const { getUserTeamByRoles } = require('../services/teamRoleManagerNotion');

            // Get user's team
            const userTeam = await getUserTeamByRoles(interaction.member);

            if (!userTeam) {
                await interaction.editReply({
                    content: '❌ You are not assigned to any team. Please contact an admin.'
                });
                return;
            }

            // Check if user is team lead
            const isTeamLead = await roleManager.isTeamLead(interaction.user.id, userTeam);
            const isAdmin = await roleManager.isAdmin(interaction.user.id);
            const isOwner = interaction.guild.ownerId === interaction.user.id;

            if (!isTeamLead && !isAdmin && !isOwner) {
                await interaction.editReply({
                    content: '❌ Only team leads can view all team tasks.'
                });
                return;
            }

            // Query Notion for active tasks in this team
            const response = await notion.databases.query({
                database_id: process.env.NOTION_DATABASE_ID,
                filter: {
                    and: [
                        {
                            property: 'Team',
                            select: {
                                equals: userTeam
                            }
                        },
                        {
                            or: [
                                {
                                    property: 'Status',
                                    select: {
                                        equals: 'Working'
                                    }
                                },
                                {
                                    property: 'Status',
                                    select: {
                                        equals: 'On Hold'
                                    }
                                }
                            ]
                        }
                    ]
                },
                sorts: [
                    {
                        property: 'Priority',
                        direction: 'ascending'
                    }
                ]
            });

            if (response.results.length === 0) {
                await interaction.editReply({
                    content: `✅ No active tasks found for **${userTeam}** team.\nAll tasks are either in backlog or completed!`
                });
                return;
            }

            // Group tasks by status
            const workingTasks = [];
            const onHoldTasks = [];

            for (const task of response.results) {
                const taskTitle = task.properties['Task']?.title[0]?.text?.content || 'Untitled';
                const assignedTo = task.properties['Assigned To']?.rich_text[0]?.text?.content || 'Unassigned';
                const priority = task.properties['Priority']?.select?.name || '5';
                const status = task.properties['Status']?.select?.name;
                const discordUrl = task.properties['Discord Thread']?.url;
                const priorityEmoji = getPriorityEmoji(priority);

                const taskInfo = {
                    title: taskTitle,
                    assignedTo,
                    priority,
                    priorityEmoji,
                    discordUrl
                };

                if (status === 'Working') {
                    workingTasks.push(taskInfo);
                } else if (status === 'On Hold') {
                    onHoldTasks.push(taskInfo);
                }
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`📋 Active Tasks - ${userTeam} Team`)
                .setDescription(`Total: **${response.results.length}** active tasks`)
                .setTimestamp();

            // Add Working tasks
            if (workingTasks.length > 0) {
                const workingText = workingTasks.map(task => {
                    const link = task.discordUrl ? `[${task.title}](${task.discordUrl})` : task.title;
                    return `${task.priorityEmoji} **${link}**\n└ Assigned to: ${task.assignedTo}`;
                }).join('\n\n');

                embed.addFields({
                    name: `⚙️ Working (${workingTasks.length})`,
                    value: workingText.length > 1024 ? workingText.substring(0, 1021) + '...' : workingText,
                    inline: false
                });
            }

            // Add On Hold tasks
            if (onHoldTasks.length > 0) {
                const onHoldText = onHoldTasks.map(task => {
                    const link = task.discordUrl ? `[${task.title}](${task.discordUrl})` : task.title;
                    return `${task.priorityEmoji} **${link}**\n└ Assigned to: ${task.assignedTo}`;
                }).join('\n\n');

                embed.addFields({
                    name: `⏸️ On Hold (${onHoldTasks.length})`,
                    value: onHoldText.length > 1024 ? onHoldText.substring(0, 1021) + '...' : onHoldText,
                    inline: false
                });
            }

            await interaction.editReply({
                embeds: [embed]
            });

            logger.success(`Showed ${response.results.length} active tasks for ${userTeam} team to ${interaction.user.username}`);

        } catch (error) {
            logger.error('Error executing team-tasks command', error);
            await interaction.editReply({
                content: '❌ Failed to fetch team tasks. Please try again later.'
            });
        }
    },
};
