const notionConfigService = require('./notionConfigService');
const logger = require('../utils/logger');

// Cache for role data
let roleCache = {
    admins: null,
    teamLeads: null,
    lastUpdated: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Refreshes the role cache from Notion
 */
async function refreshCache() {
    try {
        const [admins, teamLeads] = await Promise.all([
            notionConfigService.getAdmins(),
            notionConfigService.getTeamLeads(),
        ]);

        roleCache = {
            admins,
            teamLeads,
            lastUpdated: Date.now(),
        };

        logger.success('Role cache refreshed from Notion');
    } catch (error) {
        logger.error('Failed to refresh role cache', error);
        throw error;
    }
}

/**
 * Gets cached data or refreshes if stale
 */
async function getCachedData() {
    if (!roleCache.lastUpdated || Date.now() - roleCache.lastUpdated > CACHE_DURATION) {
        await refreshCache();
    }
    return roleCache;
}

async function addAdmin(userId) {
    await notionConfigService.addAdmin(userId);
    await refreshCache();
    return true;
}

async function removeAdmin(userId) {
    await notionConfigService.removeUserRole(userId);
    await refreshCache();
    return true;
}

async function isAdmin(userId) {
    const cache = await getCachedData();
    return cache.admins.includes(userId);
}

async function addTeamLead(userId, teamName) {
    await notionConfigService.addTeamLead(userId, teamName);
    await refreshCache();
    return true;
}

async function removeTeamLead(userId, teamName) {
    await notionConfigService.removeUserRole(userId);
    await refreshCache();
    return true;
}

async function isTeamLead(userId, teamName) {
    const cache = await getCachedData();

    // If teamName is provided, check specific team
    if (teamName) {
        return cache.teamLeads[teamName]?.includes(userId) || false;
    }

    // Otherwise check if they lead ANY team
    return Object.values(cache.teamLeads).some(leads => leads.includes(userId));
}

async function getLedTeams(userId) {
    const cache = await getCachedData();
    const teams = [];

    for (const [team, leads] of Object.entries(cache.teamLeads)) {
        if (leads.includes(userId)) {
            teams.push(team);
        }
    }

    return teams;
}

module.exports = {
    addAdmin,
    removeAdmin,
    isAdmin,
    addTeamLead,
    removeTeamLead,
    isTeamLead,
    getLedTeams,
    refreshCache,
};
