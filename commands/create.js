const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { getPriorityChoices } = require('../utils/priorityHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create')
        .setDescription('Create a new task in Notion')
        .addStringOption(option =>
            option
                .setName('title')
                .setDescription('Task title (short summary)')
                .setRequired(true)
                .setMaxLength(100)
        )
        .addUserOption(option =>
            option
                .setName('assigned_to')
                .setDescription('Person assigned to complete the task')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('priority')
                .setDescription('Task priority (1=Minimal, 10=Critical)')
                .setRequired(true)
                .addChoices(...getPriorityChoices())
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const taskTitle = interaction.options.getString('title');
            const assignedTo = interaction.options.getUser('assigned_to');
            const priority = interaction.options.getString('priority');
            const assignedBy = interaction.user;

            // Get team from user assignment (for channel routing)
            const { getUserTeam } = require('../services/userTeamManager');
            const team = getUserTeam(assignedTo.id);

            if (!team) {
                await interaction.editReply({
                    content: `❌ <@${assignedTo.id}> not assigned to a team.\nUse: \`?assign @${assignedTo.tag} TeamName\``,
                });
                return;
            }

            logger.info(`Creating task: "${taskTitle}" for ${assignedTo.tag} (Team: ${team})`);

            const taskData = {
                task: taskTitle,
                description: '',
                assignedBy: assignedBy.tag,
                assignedById: assignedBy.id,
                assignedTo: assignedTo.tag,
                assignedToId: assignedTo.id,
                team: team,
                priority: priority,
                attachments: [],
            };

            // Check if current channel is private
            const channelManager = require('../services/channelManager');
            const isPrivate = channelManager.isPrivateChannel(interaction.channelId);
            logger.info(`Channel ${interaction.channelId} is private: ${isPrivate}`);

            const { createTask } = require('../services/notionService');
            logger.info('Calling Notion API to create task...');
            const notionResponse = await createTask(taskData);
            logger.success(`Notion task created: ${notionResponse.id}`);

            const notionTaskId = notionResponse.id;
            const notionTask = { id: notionTaskId, url: notionResponse.url };

            if (isPrivate) {
                logger.info('Executing Private Channel Flow');
                // PRIVATE CHANNEL FLOW
                const { EmbedBuilder } = require('discord.js');
                const { createTaskButtons } = require('../components/taskButtons');
                const { createTaskEmbed } = require('../services/messageRouter');

                const embed = createTaskEmbed(taskData, notionTaskId);
                embed.setTitle(`🔒 ${taskTitle}`).setColor('#FF9900');

                const row = createTaskButtons(notionTaskId);

                const messagePayload = {
                    embeds: [embed],
                    components: [row]
                };

                try {
                    const message = await interaction.channel.send(messagePayload);
                    logger.success(`Sent private task message to channel ${interaction.channelId}`);

                    let privateTaskUrl = message.url;

                    // Create thread for private task
                    try {
                        const threadName = taskTitle.length > 100
                            ? taskTitle.substring(0, 97) + '...'
                            : taskTitle;

                        const thread = await message.startThread({
                            name: threadName,
                            autoArchiveDuration: 10080,
                        });

                        logger.success(`Created thread for private task`);
                        // Keep message URL so users see the message in channel (with thread attached)
                        privateTaskUrl = message.url;

                        // Update Notion with Message URL
                        const { updateTaskDiscordUrl } = require('../services/notionService');
                        await updateTaskDiscordUrl(notionTaskId, message.url);

                    } catch (threadError) {
                        logger.warn('Failed to create thread for private task', threadError);
                        // Fallback to message URL
                        const { updateTaskDiscordUrl } = require('../services/notionService');
                        await updateTaskDiscordUrl(notionTaskId, message.url);
                    }

                    // Send to personal channel with redirect button
                    const channelManager = require('../services/channelManager');
                    const personalChannelId = channelManager.getPersonChannel(assignedTo.id);

                    if (personalChannelId) {
                        try {
                            const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                            const personalChannel = await interaction.client.channels.fetch(personalChannelId);

                            if (personalChannel) {
                                const redirectButton = new ButtonBuilder()
                                    .setLabel('Go to Thread')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(privateTaskUrl)
                                    .setEmoji('↗️');

                                const buttonRow = new ActionRowBuilder().addComponents(redirectButton);

                                await personalChannel.send({
                                    embeds: [embed],
                                    components: [buttonRow]
                                });

                                logger.success(`Sent private task notification to personal channel`);
                            }
                        } catch (personalError) {
                            logger.warn('Failed to send to personal channel', personalError);
                        }
                    }
                } catch (sendError) {
                    console.error('Failed to send message to channel:', sendError);
                    logger.error('Failed to send private task message', sendError);
                }

                await interaction.editReply({
                    content: `✅ **Private Task Created!**`,
                    ephemeral: true
                });

                logger.success(`Created private task "${taskTitle}" in channel ${interaction.channelId}`);
            } else {
                logger.info('Executing Standard Flow');
                // STANDARD FLOW
                const { routeTaskMessages } = require('../services/messageRouter');
                const teamMessageUrl = await routeTaskMessages(
                    interaction.client,
                    assignedTo.id,
                    assignedBy.id,
                    taskData,
                    notionTaskId
                );

                // Update Notion with Team Message URL
                if (teamMessageUrl) {
                    const { updateTaskDiscordUrl } = require('../services/notionService');
                    await updateTaskDiscordUrl(notionTaskId, teamMessageUrl);
                }

                // Log task creation to team log channel
                try {
                    const logChannelId = channelManager.getTeamLogChannel(team);

                    if (logChannelId) {
                        const logChannel = await interaction.client.channels.fetch(logChannelId);
                        if (logChannel) {
                            const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                            const goToTaskButton = new ButtonBuilder()
                                .setLabel('Go to Task')
                                .setStyle(ButtonStyle.Link)
                                .setURL(teamMessageUrl || notionResponse.url)
                                .setEmoji('📋');

                            const buttonRow = new ActionRowBuilder().addComponents(goToTaskButton);

                            await logChannel.send({
                                content: `✅ **Task Created!**\nAssigned to ${assignedTo.tag} in **${team}** team.`,
                                components: [buttonRow]
                            });
                            logger.success(`Logged task creation to team log channel: ${team}`);
                        }
                    }
                } catch (logError) {
                    logger.warn('Failed to log task creation to team log channel', logError);
                }

                // Send ephemeral reply with button
                const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                const replyButton = new ButtonBuilder()
                    .setLabel('Go to Task')
                    .setStyle(ButtonStyle.Link)
                    .setURL(teamMessageUrl || notionResponse.url)
                    .setEmoji('📋');

                const replyButtonRow = new ActionRowBuilder().addComponents(replyButton);

                await interaction.editReply({
                    content: `✅ **Task Created!**\nAssigned to ${assignedTo.tag} in **${team}** team.`,
                    components: [replyButtonRow]
                });
            }

            logger.success('Task created');
        } catch (error) {
            console.error('CRITICAL ERROR IN CREATE COMMAND:', error);
            logger.error('Error creating task', error);

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: `❌ Failed to create task: ${error.message}`,
                });
            } else {
                await interaction.reply({
                    content: `❌ Failed to create task: ${error.message}`,
                    ephemeral: true
                });
            }
        }
    },
};
