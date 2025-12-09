const { SlashCommandBuilder, MessageFlags } = require('discord.js');
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
        // CRITICAL: Defer reply IMMEDIATELY to prevent timeout
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        } catch (deferError) {
            logger.error('Failed to defer reply', deferError);
            return; // Can't proceed if we can't defer
        }

        try {
            const taskTitle = interaction.options.getString('title');
            const assignedTo = interaction.options.getUser('assigned_to');
            const priority = interaction.options.getString('priority');
            const assignedBy = interaction.user;

            // Get team from user assignment (for channel routing)
            const { getUserTeam } = require('../services/userTeamManagerNotion');
            const team = await getUserTeam(assignedTo.id);

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
            const channelManager = require('../services/channelManagerNotion');
            const isPrivate = await channelManager.isPrivateChannel(interaction.channelId);
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
                    const channelManager = require('../services/channelManagerNotion');
                    const personalChannelId = await channelManager.getPersonChannel(assignedTo.id);

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

                // Send DM to task creator (assigner)
                try {
                    const creatorMessagePayload = {
                        content: `✅ **Task Created!**\nTask: **${taskTitle}**\nAssigned to: ${assignedTo.tag}\nTeam: **${team}**`
                    };

                    // Add Go to Thread button if team message URL exists
                    if (teamMessageUrl) {
                        const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                        const goToThreadButton = new ButtonBuilder()
                            .setLabel('Go to Thread')
                            .setStyle(ButtonStyle.Link)
                            .setURL(teamMessageUrl)
                            .setEmoji('↗️');
                        const row = new ActionRowBuilder().addComponents(goToThreadButton);
                        creatorMessagePayload.components = [row];
                    }

                    await assignedBy.send(creatorMessagePayload);
                    logger.success('Sent task creation notification to creator via DM');
                } catch (dmError) {
                    logger.warn('Failed to send DM to task creator', dmError);
                }

                // Send ephemeral reply with button
                const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                const replyButton = new ButtonBuilder()
                    .setLabel('Go to Task')
                    .setStyle(ButtonStyle.Link)
                    .setURL(teamMessageUrl || notionResponse.url)
                    .setEmoji('📋');

                const replyButtonRow = new ActionRowBuilder().addComponents(replyButton);

                // Use followUp instead of editReply to avoid interaction conflicts
                await interaction.followUp({
                    content: `✅ **Task Created!**\\nAssigned to ${assignedTo.tag} in **${team}** team.`,
                    components: [replyButtonRow],
                    flags: MessageFlags.Ephemeral
                });
            }

            logger.success('Task created');
        } catch (error) {
            console.error('CRITICAL ERROR IN CREATE COMMAND:', error);
            logger.error('Error creating task', error);

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({
                        content: `❌ Failed to create task: ${error.message}`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: `❌ Failed to create task: ${error.message}`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (replyError) {
                logger.error('Failed to send error response to user', replyError);
            }
        }
    },
};
