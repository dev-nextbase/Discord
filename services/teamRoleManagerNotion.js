const notionConfigService = require('./notionConfigService');
const logger = require('../utils/logger');

// Cache for team role data
let teamRoleCache = {
    teamRoles: null,
    lastUpdated: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Refreshes the team role cache from Notion
 */
async function refreshCache() {
    try {
        const teamRoles = await notionConfigService.getTeamRoles();

        teamRoleCache = {
            teamRoles,
            lastUpdated: Date.now(),
        };

        logger.success('Team role cache refreshed from Notion');
    } catch (error) {
        logger.error('Failed to refresh team role cache', error);
        throw error;
    }
}

/**
 * Gets cached data or refreshes if stale
 */
async function getCachedData() {
    if (!teamRoleCache.lastUpdated || Date.now() - teamRoleCache.lastUpdated > CACHE_DURATION) {
        await refreshCache();
    }
    return teamRoleCache;
}

/**
 * Assigns a role to a team
 * @param {string} teamName - Team name
 * @param {string} roleId - Discord role ID
 */
async function assignRoleToTeam(teamName, roleId) {
    await notionConfigService.setTeamRole(teamName, roleId);
    await refreshCache();
    logger.success(`Assigned role ${roleId} to team: ${teamName}`);
}

/**
 * Gets a team's role ID
 * @param {string} teamName - Team name
 * @returns {string|null} Role ID or null
 */
async function getTeamRole(teamName) {
    const cache = await getCachedData();
    return cache.teamRoles[teamName.toLowerCase()] || null;
}

/**
 * Gets team name by role ID
 * @param {string} roleId - Discord role ID
 * @returns {string|null} Team name or null
 */
async function getTeamByRole(roleId) {
    const cache = await getCachedData();

    for (const [team, role] of Object.entries(cache.teamRoles)) {
        if (role === roleId) return team;
    }

    return null;
}

/**
 * Gets user's team based on their roles
 * @param {Array} userRoles - Array of role IDs user has
 * @returns {string|null} Team name or null
 */
async function getUserTeamByRoles(userRoles) {
    for (const roleId of userRoles) {
        const team = await getTeamByRole(roleId);
        if (team) return team;
    }
    return null;
}

/**
 * Lists all team-role assignments
 * @returns {Object} Team-role mappings
 */
async function listTeamRoles() {
    const cache = await getCachedData();
    return cache.teamRoles;
}

/**
 * Removes a team's role assignment
 * @param {string} teamName - Team name
 */
async function removeTeamRole(teamName) {
    // Note: This would require implementing an archive/delete function in notionConfigService
    logger.warn('Remove team role not yet implemented for Notion');
    // TODO: Implement archive functionality in notionConfigService
}

module.exports = {
    assignRoleToTeam,
    getTeamRole,
    getTeamByRole,
    getUserTeamByRoles,
    listTeamRoles,
    removeTeamRole,
    refreshCache,
};
