const { getTasksByUser } = require('../services/notionService');
const logger = require('../utils/logger');

/**
 * Handles ?task command to list user's active tasks
 */
async function handleTaskCommand(message) {
    try {
        const userId = message.author.id;
        const userTag = message.author.tag;

        logger.info(`Fetching tasks for user: ${userTag}`);

        // Get active tasks from Notion
        const tasks = await getTasksByUser(userId);

        if (tasks.length === 0) {
            await message.reply('✨ You have no active tasks!');
            return;
        }

        // Group by status
        const workingTasks = tasks.filter(t => t.status === 'Working');
        const onHoldTasks = tasks.filter(t => t.status === 'On Hold');

        let msg = '📋 **Your Active Tasks**\n\n';

        if (workingTasks.length > 0) {
            msg += '**▶️ Working**\n';
            workingTasks.forEach((task, idx) => {
                msg += `${idx + 1}. ${task.title}\n`;
            });
            msg += '\n';
        }

        if (onHoldTasks.length > 0) {
            msg += '**⏸️ On Hold**\n';
            onHoldTasks.forEach((task, idx) => {
                msg += `${idx + 1}. ${task.title}\n`;
            });
        }

        // Try to send DM, fallback to reply
        try {
            await message.author.send(msg);
            await message.reply('✅ Task list sent to your DMs');
        } catch (error) {
            await message.reply(msg);
        }

        logger.success(`Sent ${tasks.length} tasks to ${userTag}`);
    } catch (error) {
        logger.error('Error fetching tasks', error);
        await message.reply('❌ Failed to fetch tasks');
    }
}

module.exports = {
    handleTaskCommand,
};
