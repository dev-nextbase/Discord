const notionConfigService = require('./notionConfigService');
const logger = require('../utils/logger');

// Cache for user team data
let userTeamCache = {
    userTeams: null,
    lastUpdated: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Refreshes the user team cache from Notion
 */
async function refreshCache() {
    try {
        const userTeams = await notionConfigService.getUserTeams();

        userTeamCache = {
            userTeams,
            lastUpdated: Date.now(),
        };

        logger.success('User team cache refreshed from Notion');
    } catch (error) {
        logger.error('Failed to refresh user team cache', error);
        throw error;
    }
}

/**
 * Gets cached data or refreshes if stale
 */
async function getCachedData() {
    if (!userTeamCache.lastUpdated || Date.now() - userTeamCache.lastUpdated > CACHE_DURATION) {
        await refreshCache();
    }
    return userTeamCache;
}

/**
 * Assigns a user to a team
 * @param {string} userId - Discord user ID
 * @param {string} teamName - Team name
 */
async function assignUserToTeam(userId, teamName) {
    await notionConfigService.setUserTeam(userId, teamName);
    await refreshCache();
    logger.success(`Assigned user ${userId} to team: ${teamName}`);
}

/**
 * Gets a user's team
 * @param {string} userId - Discord user ID
 * @returns {string|null} Team name or null
 */
async function getUserTeam(userId) {
    const cache = await getCachedData();
    return cache.userTeams[userId] || null;
}

/**
 * Lists all user-team assignments
 * @returns {Object} User-team mappings
 */
async function listUserTeams() {
    const cache = await getCachedData();
    return cache.userTeams;
}

/**
 * Removes a user's team assignment
 * @param {string} userId - Discord user ID
 */
async function removeUserTeam(userId) {
    await notionConfigService.removeUserTeam(userId);
    await refreshCache();
    logger.success(`Removed team assignment for user: ${userId}`);
}

/**
 * Gets all users assigned to a specific team
 * @param {string} teamName - Team name
 * @returns {Array} Array of user IDs in the team
 */
async function getAllUsersInTeam(teamName) {
    const cache = await getCachedData();
    const userIds = [];
    const teamLower = teamName.toLowerCase();

    for (const [userId, team] of Object.entries(cache.userTeams)) {
        if (team === teamLower) {
            userIds.push(userId);
        }
    }

    logger.info(`Found ${userIds.length} users in team "${teamName}"`);
    return userIds;
}

module.exports = {
    assignUserToTeam,
    getUserTeam,
    listUserTeams,
    removeUserTeam,
    getAllUsersInTeam,
    refreshCache,
};
