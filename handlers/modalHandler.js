const { createTask } = require('../services/notionService');
const { routeTaskMessages } = require('../services/messageRouter');
const { getUserTeam } = require('../services/userTeamManager');
const logger = require('../utils/logger');

/**
 * Handles modal submit for task creation
 */
async function handleTaskCreationModal(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        // Parse custom ID
        const parts = interaction.customId.split('_');
        const assignedToId = parts[2];
        const priority = parts[3];
        const timestamp = parts[parts.length - 1];
        const titleParts = parts.slice(4, parts.length - 1);
        const encodedTitle = titleParts.join('_');
        const taskTitle = encodedTitle.replace(/--/g, '_');

        // Get description from modal
        const taskDescription = interaction.fields.getTextInputValue('taskDescription') || '';

        // Get users and team
        const assignedTo = await interaction.client.users.fetch(assignedToId);
        const assignedBy = interaction.user;
        const team = getUserTeam(assignedToId);

        if (!team) {
            await interaction.editReply({
                content: `❌ User <@${assignedToId}> is not assigned to a team.`,
            });
            return;
        }

        logger.info(`Creating task: ${taskTitle} (Team: ${team})`);

        const taskData = {
            task: taskTitle,
            description: taskDescription,
            assignedBy: assignedBy.tag,
            assignedById: assignedBy.id,
            assignedTo: assignedTo.tag,
            assignedToId: assignedTo.id,
            team: team,
            priority: priority,
            attachments: [],
        };

        const notionResponse = await createTask(taskData);
        const notionTaskId = notionResponse.id;

        await routeTaskMessages(
            interaction.client,
            assignedTo.id,
            assignedBy.id,
            taskData,
            notionTaskId
        );

        await interaction.editReply({
            content: `✅ **${taskTitle}** created and assigned to ${assignedTo.tag}`,
        });

        logger.success('Task creation completed');
    } catch (error) {
        logger.error('Error handling task creation modal', error);

        try {
            await interaction.editReply({
                content: '❌ Failed to create task. Please check the bot logs.',
            });
        } catch (replyError) {
            logger.error('Failed to send error reply', replyError);
        }
    }
}

module.exports = {
    handleTaskCreationModal,
};
