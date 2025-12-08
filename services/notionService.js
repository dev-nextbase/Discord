const { Client } = require('@notionhq/client');
const { config } = require('../config/config');
const logger = require('../utils/logger');

const notion = new Client({ auth: config.notion.token });

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
                    select: { name: taskData.priority.replace(/[🔴🟡🟢]\s*/g, '') },
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
        const response = await notion.pages.update({
            page_id: pageId,
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
        const response = await notion.pages.update({
            page_id: pageId,
            properties: {
                'Started Working On': {
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
            page_id: pageId,
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
        const response = await notion.pages.retrieve({ page_id: pageId });
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
            // Capitalize first letter for Notion (High, Medium, Low)
            const formattedPriority = priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1);
            filters.push({
                property: 'Priority',
                select: { equals: formattedPriority },
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
            const formattedPriority = priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1);
            filters.push({
                property: 'Priority',
                select: { equals: formattedPriority },
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
};
