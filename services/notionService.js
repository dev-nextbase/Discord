const { Client } = require('@notionhq/client');
const { config } = require('../config/config');
const logger = require('../utils/logger');

const notion = new Client({ auth: config.notion.token });

/**
 * Normalizes a Notion page ID to UUID format with hyphens
 * Handles both formats: 2c45757ae609807889e9f75f302e4f78 and 2c45757a-e609-8078-89e9-f75f302e4f78
 */
function normalizePageId(pageId) {
    // Remove any existing hyphens
    const clean = pageId.replace(/-/g, '');

    // Add hyphens in UUID format: 8-4-4-4-12
    if (clean.length === 32) {
        return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
    }

    // Already in correct format or invalid
    return pageId;
}

async function createTask(taskData) {
    try {
        const response = await notion.pages.create({
            parent: { database_id: config.notion.databaseId },
            properties: {
                'Task': {
                    title: [{ text: { content: taskData.task } }],
                },
                'Assigned By': {
                    rich_text: [{ text: { content: taskData.assignedBy } }],
                },
                'Assigned To': {
                    rich_text: [{ text: { content: taskData.assignedTo } }],
                },
                'Assigned By ID': {
                    rich_text: [{ text: { content: taskData.assignedById || '' } }],
                },
                'Assigned To ID': {
                    rich_text: [{ text: { content: taskData.assignedToId || '' } }],
                },
                'Description': {
                    rich_text: [{ text: { content: taskData.description || '' } }],
                },
                'Team': {
                    select: { name: taskData.team },
                },
                'Priority': {
                    select: { name: taskData.priority.replace(/[🔴🟠🟡🟢🔵]\s*/g, '') },
                },
                'Status': {
                    select: { name: 'On Hold' },
                },
            },
        });

        logger.success(`Created task in Notion: ${response.id}`);
        return response;
    } catch (error) {
        logger.error('Failed to create task in Notion', error);
        throw error;
    }
}

async function updateTaskStatus(pageId, status) {
    try {
        const normalizedId = normalizePageId(pageId);
        const response = await notion.pages.update({
            page_id: normalizedId,
            properties: {
                'Status': {
                    select: { name: status },
                },
            },
        });

        logger.success(`Updated task ${pageId} status to: ${status}`);
        return response;
    } catch (error) {
        logger.error(`Failed to update task status: ${pageId}`, error);
        throw error;
    }
}

async function updateWorkingTimestamp(pageId) {
    try {
        const now = new Date().toISOString();
        const normalizedId = normalizePageId(pageId);
        const response = await notion.pages.update({
            page_id: normalizedId,
            properties: {
                'Started Working On': {
                    date: { start: now },
                },
                'Last Started Time': {
                    date: { start: now },
                },
            },
        });

        logger.success(`Updated working timestamp for task: ${pageId}`);
        return response;
    } catch (error) {
        logger.error(`Failed to update working timestamp: ${pageId}`, error);
        throw error;
    }
}

async function updateDoneTimestamp(pageId, doneBy, doneById) {
    try {
        const now = new Date().toISOString();
        const normalizedId = normalizePageId(pageId);
        const properties = {
            'Done Working On': {
                date: { start: now },
            },
        };

        if (doneBy) {
            properties['Done By'] = {
                rich_text: [{ text: { content: doneBy } }]
            };
        }

        if (doneById) {
            properties['Done By ID'] = {
                rich_text: [{ text: { content: doneById } }]
            };
        }

        const response = await notion.pages.update({
            page_id: normalizedId,
            properties: properties,
        });

        logger.success(`Updated done timestamp and user for task: ${pageId}`);
        return response;
    } catch (error) {
        logger.error(`Failed to update done timestamp: ${pageId}`, error);
        // Don't throw error if just the new properties fail (e.g. if they don't exist in Notion yet)
        // But we should probably try to update at least the timestamp
        if (error.code === 'validation_error') {
            logger.warn('Validation error updating Done By fields. Ensure properties exist in Notion.');
        }
        throw error;
    }
}

async function getTaskById(pageId) {
    try {
        const normalizedId = normalizePageId(pageId);
        const response = await notion.pages.retrieve({ page_id: normalizedId });
        return response;
    } catch (error) {
        logger.error(`Failed to retrieve task: ${pageId}`, error);
        throw error;
    }
}

async function getTasksByUser(userId, priorityFilter = 'all') {
    try {
        const filters = [
            {
                property: 'Assigned To ID',
                rich_text: { equals: userId },
            },
            {
                or: [
                    { property: 'Status', select: { equals: 'Working' } },
                    { property: 'Status', select: { equals: 'On Hold' } },
                ],
            },
        ];

        if (priorityFilter !== 'all') {
            // Priority is now numeric (1-10)
            filters.push({
                property: 'Priority',
                select: { equals: priorityFilter },
            });
        }

        const response = await notion.databases.query({
            database_id: config.notion.databaseId,
            filter: {
                and: filters,
            },
            sorts: [
                { property: 'Status', direction: 'ascending' },
            ],
        });

        return mapNotionResponseToTasks(response);
    } catch (error) {
        logger.error('Error fetching tasks by user', error);
        throw error;
    }
}

async function getTasksByTeam(teamName, priorityFilter = 'all') {
    try {
        const filters = [
            {
                property: 'Team',
                select: { equals: teamName },
            },
            {
                or: [
                    { property: 'Status', select: { equals: 'Working' } },
                    { property: 'Status', select: { equals: 'On Hold' } },
                ],
            },
        ];

        if (priorityFilter !== 'all') {
            // Priority is now numeric (1-10)
            filters.push({
                property: 'Priority',
                select: { equals: priorityFilter },
            });
        }

        const response = await notion.databases.query({
            database_id: config.notion.databaseId,
            filter: {
                and: filters,
            },
            sorts: [
                { property: 'Status', direction: 'ascending' },
            ],
        });

        return mapNotionResponseToTasks(response);
    } catch (error) {
        logger.error(`Error fetching tasks for team ${teamName}`, error);
        throw error;
    }
}

async function updateTaskDiscordUrl(pageId, discordUrl) {
    try {
        const response = await notion.pages.update({
            page_id: pageId,
            properties: {
                'Discord Thread': {
                    url: discordUrl,
                },
            },
        });

        logger.success(`Updated Discord URL for task: ${pageId}`);
        return response;
    } catch (error) {
        logger.error(`Failed to update Discord URL for task ${pageId}. Ensure 'Discord Thread' property exists in Notion!`, error.body || error);
        return null;
    }
}

function mapNotionResponseToTasks(response) {
    return response.results.map(page => ({
        id: page.id,
        title: page.properties.Task?.title[0]?.text?.content || 'Untitled',
        status: page.properties.Status?.select?.name || 'Unknown',
        priority: page.properties.Priority?.select?.name || 'Medium',
        assignedTo: page.properties['Assigned To']?.rich_text[0]?.text?.content || 'Unknown',
        url: page.url,
        discordUrl: page.properties['Discord Thread']?.url || null
    }));
}

async function getActiveTasksByUser() {
    try {
        const response = await notion.databases.query({
            database_id: config.notion.databaseId,
            filter: {
                or: [
                    { property: 'Status', select: { equals: 'Working' } },
                    { property: 'Status', select: { equals: 'On Hold' } },
                ],
            },
        });

        return response.results.map(page => ({
            id: page.id,
            title: page.properties.Task?.title[0]?.text?.content || 'Untitled',
            status: page.properties.Status?.select?.name || 'Unknown',
            priority: page.properties.Priority?.select?.name || 'Medium',
            assignedTo: page.properties['Assigned To']?.rich_text[0]?.text?.content || 'Unknown',
            assignedToId: page.properties['Assigned To ID']?.rich_text[0]?.text?.content || null,
            url: page.url,
            discordUrl: page.properties['Discord Thread']?.url || null
        }));
    } catch (error) {
        logger.error('Error fetching active tasks by user', error);
        throw error;
    }
}

async function getTaskReportByUser(userId, startDate, endDate) {
    try {
        logger.info(`Fetching task report for user ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const response = await notion.databases.query({
            database_id: config.notion.databaseId,
            filter: {
                or: [
                    {
                        property: 'Assigned To ID',
                        rich_text: {
                            equals: userId,
                        },
                    },
                    {
                        property: 'Assigned By ID',
                        rich_text: {
                            equals: userId,
                        },
                    },
                ],
            },
        });

        const tasks = response.results;

        // Filter tasks by date range and calculate statistics
        let completedTasks = 0;
        let assignedTasks = 0;
        let remainingTasks = 0;
        let totalReceived = 0;
        let workingTasks = 0;
        let onHoldTasks = 0;

        tasks.forEach(task => {
            const assignedToId = task.properties['Assigned To ID']?.rich_text[0]?.text?.content;
            const assignedById = task.properties['Assigned By ID']?.rich_text[0]?.text?.content;
            const status = task.properties['Status']?.select?.name;
            const doneDate = task.properties['Done Working On']?.date?.start;
            const createdDate = new Date(task.created_time);

            // Check if task was created in the date range
            const isInDateRange = createdDate >= startDate && createdDate <= endDate;

            // Tasks assigned TO this user
            if (assignedToId === userId) {
                totalReceived++;

                if (status === 'Done') {
                    // Check if completed in date range
                    if (doneDate) {
                        const completedDate = new Date(doneDate);
                        if (completedDate >= startDate && completedDate <= endDate) {
                            completedTasks++;
                        }
                    }
                } else {
                    // Remaining tasks (not done)
                    remainingTasks++;

                    if (status === 'Working') {
                        workingTasks++;
                    } else if (status === 'On Hold') {
                        onHoldTasks++;
                    }
                }
            }

            // Tasks assigned BY this user (to others)
            if (assignedById === userId && assignedToId !== userId && isInDateRange) {
                assignedTasks++;
            }
        });

        return {
            completedTasks,
            assignedTasks,
            remainingTasks,
            totalReceived,
            workingTasks,
            onHoldTasks,
        };
    } catch (error) {
        logger.error('Error fetching task report', error);
        throw error;
    }
}

async function reassignTask(pageId, newAssignedTo, newAssignedToId) {
    try {
        const normalizedId = normalizePageId(pageId);

        // Determine status: Backlog if no assignee, On Hold if reassigned
        const status = (newAssignedTo === '' || !newAssignedTo) ? 'Backlog' : 'On Hold';

        const response = await notion.pages.update({
            page_id: normalizedId,
            properties: {
                'Assigned To': {
                    rich_text: newAssignedTo ? [{ text: { content: newAssignedTo } }] : [],
                },
                'Assigned To ID': {
                    rich_text: newAssignedToId ? [{ text: { content: newAssignedToId } }] : [],
                },
                'Status': {
                    select: { name: status },
                },
            },
        });

        logger.success(`Reassigned task ${pageId} to: ${newAssignedTo}`);
        return response;
    } catch (error) {
        logger.error(`Failed to reassign task: ${pageId}`, error);
        throw error;
    }
}

module.exports = {
    createTask,
    updateTaskStatus,
    updateWorkingTimestamp,
    updateDoneTimestamp,
    updateTaskDiscordUrl,
    getTaskById,
    getTasksByUser,
    getTasksByTeam,
    getActiveTasksByUser,
    getTaskReportByUser,
    reassignTask,
    accumulateTimeSpent,
};

async function accumulateTimeSpent(pageId) {
    try {
        const page = await getTaskById(pageId);
        const startTimeStr = page.properties['Started Working On']?.date?.start;
        const currentTotal = page.properties['Time Spent (Seconds)']?.number || 0;

        if (!startTimeStr) {
            // It's possible the task was never started properly or start time was cleared
            logger.warn(`No start time found for task ${pageId}, skipping time accumulation`);
            return;
        }

        const startTime = new Date(startTimeStr);
        const now = new Date();
        const durationSeconds = Math.round((now - startTime) / 1000);

        if (durationSeconds < 1) {
            logger.info(`Duration too short (${durationSeconds}s), skipping accumulation`);
            return; // Ignore negligible duration
        }

        const newTotal = currentTotal + durationSeconds;

        await notion.pages.update({
            page_id: pageId,
            properties: {
                'Time Spent (Seconds)': {
                    number: newTotal
                },
                'Last Paused Time': {
                    date: { start: now.toISOString() },
                },
            }
        });

        logger.success(`Accumulated ${durationSeconds}s to task ${pageId}. Total: ${newTotal}s`);
    } catch (error) {
        logger.error(`Failed to accumulate time for task ${pageId}`, error);
    }
}
