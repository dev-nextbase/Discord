const { Client } = require('@notionhq/client');
const { config } = require('../config/config');
const logger = require('../utils/logger');

const notion = new Client({ auth: config.notion.token });

// Cache for all configuration data
let configCache = {
    teamRoles: null,
    admins: null,
    teamLeads: null,
    teamChannels: null,
    personChannels: null,
    teamLogChannels: null,
    privateChannels: null,
    userTeams: null,
    lastUpdated: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Refreshes the entire configuration cache from Notion
 */
async function refreshCache() {
    try {
        const response = await notion.databases.query({
            database_id: config.notion.configDatabaseId,
        });

        // Initialize data structures
        const teamRoles = {};
        const admins = [];
        const teamLeads = {};
        const teamChannels = {};
        const personChannels = {};
        const teamLogChannels = {};
        const teamBacklogChannels = {};
        const privateChannels = [];
        const userTeams = {};

        // Process all records
        response.results.forEach(page => {
            const type = page.properties['Type']?.select?.name;

            switch (type) {
                case 'Team Role':
                    const teamName = page.properties['Key']?.rich_text[0]?.text?.content;
                    const roleId = page.properties['Value']?.rich_text[0]?.text?.content;
                    if (teamName && roleId) {
                        teamRoles[teamName.toLowerCase()] = roleId;
                    }
                    break;

                case 'Admin':
                    const adminId = page.properties['Key']?.rich_text[0]?.text?.content;
                    if (adminId) {
                        admins.push(adminId);
                    }
                    break;

                case 'Team Lead':
                    const leadId = page.properties['Key']?.rich_text[0]?.text?.content;
                    const team = page.properties['Team']?.select?.name;
                    if (leadId && team) {
                        const teamLower = team.toLowerCase();
                        if (!teamLeads[teamLower]) {
                            teamLeads[teamLower] = [];
                        }
                        teamLeads[teamLower].push(leadId);
                    }
                    break;

                case 'Team Channel':
                    const teamCh = page.properties['Key']?.rich_text[0]?.text?.content;
                    const teamChId = page.properties['Value']?.rich_text[0]?.text?.content;
                    if (teamCh && teamChId) {
                        teamChannels[teamCh.toUpperCase()] = teamChId;
                    }
                    break;

                case 'Person Channel':
                    const userId = page.properties['Key']?.rich_text[0]?.text?.content;
                    const personChId = page.properties['Value']?.rich_text[0]?.text?.content;
                    if (userId && personChId) {
                        personChannels[userId] = personChId;
                    }
                    break;

                case 'Team Log Channel':
                    const logTeam = page.properties['Key']?.rich_text[0]?.text?.content;
                    const logChId = page.properties['Value']?.rich_text[0]?.text?.content;
                    if (logTeam && logChId) {
                        teamLogChannels[logTeam] = logChId;
                    }
                    break;

                case 'Team Backlog Channel':
                    const backlogTeam = page.properties['Key']?.rich_text[0]?.text?.content;
                    const backlogChId = page.properties['Value']?.rich_text[0]?.text?.content;
                    if (backlogTeam && backlogChId) {
                        teamBacklogChannels[backlogTeam] = backlogChId;
                    }
                    break;

                case 'Private Channel':
                    const privateChId = page.properties['Value']?.rich_text[0]?.text?.content;
                    if (privateChId) {
                        privateChannels.push(privateChId);
                    }
                    break;

                case 'User Team':
                    const userTeamId = page.properties['Key']?.rich_text[0]?.text?.content;
                    const userTeam = page.properties['Team']?.select?.name;
                    if (userTeamId && userTeam) {
                        userTeams[userTeamId] = userTeam.toLowerCase();
                    }
                    break;
            }
        });

        configCache = {
            teamRoles,
            admins,
            teamLeads,
            teamChannels,
            personChannels,
            teamLogChannels,
            teamBacklogChannels,
            privateChannels,
            userTeams,
            lastUpdated: Date.now(),
        };

        logger.success('Configuration cache refreshed from Notion');
    } catch (error) {
        logger.error('Failed to refresh configuration cache', error);
        throw error;
    }
}

/**
 * Gets cached data or refreshes if stale
 */
async function getCachedData() {
    if (!configCache.lastUpdated || Date.now() - configCache.lastUpdated > CACHE_DURATION) {
        await refreshCache();
    }
    return configCache;
}

/**
 * Helper function to find a record by type and key
 */
async function findRecord(type, key) {
    const filter = {
        and: [
            { property: 'Type', select: { equals: type } },
        ],
    };

    if (key) {
        filter.and.push({ property: 'Key', rich_text: { equals: key } });
    }

    const response = await notion.databases.query({
        database_id: config.notion.configDatabaseId,
        filter,
    });

    return response.results[0] || null;
}

/**
 * Helper function to create or update a record
 */
async function upsertRecord(type, key, value, team = null) {
    try {
        const existing = await findRecord(type, key);

        const properties = {
            'Type': { select: { name: type } },
            'Key': { rich_text: [{ text: { content: key || '' } }] },
        };

        if (value) {
            properties['Value'] = { rich_text: [{ text: { content: value } }] };
        }

        if (team) {
            properties['Team'] = { select: { name: team } };
        }

        if (existing) {
            await notion.pages.update({
                page_id: existing.id,
                properties,
            });
        } else {
            await notion.pages.create({
                parent: { database_id: config.notion.configDatabaseId },
                properties,
            });
        }

        await refreshCache();
    } catch (error) {
        logger.error(`Failed to upsert record: ${type} - ${key}`, error);
        throw error;
    }
}

// ==================== TEAM ROLES ====================

async function getTeamRoles() {
    const cache = await getCachedData();
    return cache.teamRoles;
}

async function setTeamRole(teamName, roleId) {
    await upsertRecord('Team Role', teamName, roleId);
    logger.success(`Set team role: ${teamName} -> ${roleId}`);
}

// ==================== USER ROLES ====================

async function getAdmins() {
    const cache = await getCachedData();
    return cache.admins;
}

async function getTeamLeads() {
    const cache = await getCachedData();
    return cache.teamLeads;
}

async function addAdmin(userId) {
    await upsertRecord('Admin', userId, userId);
    logger.success(`Added admin: ${userId}`);
}

async function addTeamLead(userId, team) {
    await upsertRecord('Team Lead', userId, userId, team);
    logger.success(`Added team lead: ${userId} for team ${team}`);
}

async function removeUserRole(userId) {
    try {
        // Find all records for this user
        const response = await notion.databases.query({
            database_id: config.notion.configDatabaseId,
            filter: {
                and: [
                    { property: 'Key', rich_text: { equals: userId } },
                    {
                        or: [
                            { property: 'Type', select: { equals: 'Admin' } },
                            { property: 'Type', select: { equals: 'Team Lead' } },
                        ],
                    },
                ],
            },
        });

        for (const page of response.results) {
            await notion.pages.update({
                page_id: page.id,
                archived: true,
            });
        }

        await refreshCache();
        logger.success(`Removed user role: ${userId}`);
    } catch (error) {
        logger.error(`Failed to remove user role: ${userId}`, error);
        throw error;
    }
}

// ==================== CHANNELS ====================

async function getTeamChannels() {
    const cache = await getCachedData();
    return cache.teamChannels;
}

async function getPersonChannels() {
    const cache = await getCachedData();
    return cache.personChannels;
}

async function getTeamLogChannels() {
    const cache = await getCachedData();
    return cache.teamLogChannels;
}

async function getTeamBacklogChannels() {
    const cache = await getCachedData();
    return cache.teamBacklogChannels;
}

async function getPrivateChannels() {
    const cache = await getCachedData();
    return cache.privateChannels;
}

async function setChannel(channelType, teamOrUser, channelId) {
    await upsertRecord(channelType, teamOrUser, channelId);
    logger.success(`Set ${channelType}: ${teamOrUser} -> ${channelId}`);
}

async function addPrivateChannel(channelId) {
    await upsertRecord('Private Channel', `private_${channelId}`, channelId);
    logger.success(`Added private channel: ${channelId}`);
}

// ==================== USER TEAMS ====================

async function getUserTeams() {
    const cache = await getCachedData();
    return cache.userTeams;
}

async function setUserTeam(userId, team) {
    await upsertRecord('User Team', userId, userId, team);
    logger.success(`Set user team: ${userId} -> ${team}`);
}

async function removeUserTeam(userId) {
    try {
        const existing = await findRecord('User Team', userId);
        if (existing) {
            await notion.pages.update({
                page_id: existing.id,
                archived: true,
            });
        }
        await refreshCache();
        logger.success(`Removed user team: ${userId}`);
    } catch (error) {
        logger.error(`Failed to remove user team: ${userId}`, error);
        throw error;
    }
}

module.exports = {
    // Team Roles
    getTeamRoles,
    setTeamRole,

    // User Roles
    getAdmins,
    getTeamLeads,
    addAdmin,
    addTeamLead,
    removeUserRole,

    // Channels
    getTeamChannels,
    getPersonChannels,
    getTeamLogChannels,
    getTeamBacklogChannels,
    getPrivateChannels,
    setChannel,
    addPrivateChannel,

    // User Teams
    getUserTeams,
    setUserTeam,
    removeUserTeam,

    // Cache management
    refreshCache,
};
