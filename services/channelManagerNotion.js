const notionConfigService = require('./notionConfigService');
const logger = require('../utils/logger');

// Cache for channel data to reduce Notion API calls
let channelCache = {
    teamChannels: null,
    personChannels: null,
    teamLogChannels: null,
    privateChannels: null,
    lastUpdated: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Refreshes the channel cache from Notion
 */
async function refreshCache() {
    try {
        const [teamChannels, personChannels, teamLogChannels, teamBacklogChannels, privateChannels] = await Promise.all([
            notionConfigService.getTeamChannels(),
            notionConfigService.getPersonChannels(),
            notionConfigService.getTeamLogChannels(),
            notionConfigService.getTeamBacklogChannels(), // Fetch backlog channels
            notionConfigService.getPrivateChannels(),
        ]);

        channelCache = {
            teamChannels,
            personChannels,
            teamLogChannels,
            teamBacklogChannels, // Store backlog channels
            privateChannels,
            lastUpdated: Date.now(),
        };

        logger.success('Channel cache refreshed from Notion');
    } catch (error) {
        logger.error('Failed to refresh channel cache', error);
        throw error;
    }
}

/**
 * Gets cached data or refreshes if stale
 */
async function getCachedData() {
    if (!channelCache.lastUpdated || Date.now() - channelCache.lastUpdated > CACHE_DURATION) {
        await refreshCache();
    }
    return channelCache;
}

/**
 * Sets a team channel mapping
 * ello
 * @param {string} teamName - Name of the team
 * @param {string} channelId - Discord channel ID
 */
async function setTeamChannel(teamName, channelId) {
    const normalizedTeamName = teamName.toUpperCase();
    await notionConfigService.setChannel('Team Channel', normalizedTeamName, channelId);
    await refreshCache(); // Refresh cache after update
    logger.success(`Set team channel: ${normalizedTeamName} -> ${channelId}`);
    return normalizedTeamName;
}

/**
 * Sets a person channel mapping
 * @param {string} userId - Discord user ID
 * @param {string} channelId - Discord channel ID
 */
async function setPersonChannel(userId, channelId) {
    await notionConfigService.setChannel('Person Channel', userId, channelId);
    await refreshCache(); // Refresh cache after update
    logger.success(`Set person channel: ${userId} -> ${channelId}`);
}

/**
 * Gets a team channel ID
 * @param {string} teamName - Name of the team
 * @returns {string|null} Channel ID or null
 */
async function getTeamChannel(teamName) {
    const cache = await getCachedData();
    const normalizedTeamName = teamName.toUpperCase();
    return cache.teamChannels[normalizedTeamName] || null;
}

/**
 * Gets a person channel ID
 * @param {string} userId - Discord user ID
 * @returns {string|null} Channel ID or null
 */
async function getPersonChannel(userId) {
    const cache = await getCachedData();
    return cache.personChannels[userId] || null;
}

/**
 * Lists all configured team channels
 * @returns {Object} Team channel mappings
 */
async function listTeamChannels() {
    const cache = await getCachedData();
    return cache.teamChannels;
}

/**
 * Lists all configured person channels
 * @returns {Object} Person channel mappings
 */
async function listPersonChannels() {
    const cache = await getCachedData();
    return cache.personChannels;
}

/**
 * Removes a team channel mapping
 * @param {string} teamName - Name of the team
 */
async function removeTeamChannel(teamName) {
    // Note: This would require implementing an archive/delete function in notionConfigService
    // For now, we'll just log a warning
    logger.warn('Remove team channel not yet implemented for Notion');
    // TODO: Implement archive functionality in notionConfigService
}

/**
 * Removes a person channel mapping
 * @param {string} userId - Discord user ID
 */
async function removePersonChannel(userId) {
    // Note: This would require implementing an archive/delete function in notionConfigService
    // For now, we'll just log a warning
    logger.warn('Remove person channel not yet implemented for Notion');
    // TODO: Implement archive functionality in notionConfigService
}

/**
 * Adds a private channel mapping
 * @param {string} channelId - Discord channel ID
 */
async function addPrivateChannel(channelId) {
    await notionConfigService.addPrivateChannel(channelId);
    await refreshCache(); // Refresh cache after update
    logger.success(`Added private channel: ${channelId}`);
}

/**
 * Removes a private channel mapping
 * @param {string} channelId - Discord channel ID
 */
async function removePrivateChannel(channelId) {
    // Note: This would require implementing an archive/delete function in notionConfigService
    // For now, we'll just log a warning
    logger.warn('Remove private channel not yet implemented for Notion');
    // TODO: Implement archive functionality in notionConfigService
}

/**
 * Checks if a channel is private
 * @param {string} channelId - Discord channel ID
 * @returns {boolean}
 */
async function isPrivateChannel(channelId) {
    const cache = await getCachedData();
    return cache.privateChannels && cache.privateChannels.includes(channelId);
}

/**
 * Lists all private channels
 * @returns {string[]} Array of channel IDs
 */
async function listPrivateChannels() {
    const cache = await getCachedData();
    return cache.privateChannels || [];
}

/**
 * Sets a team log channel mapping
 * @param {string} teamName - Name of the team
 * @param {string} channelId - Discord channel ID
 */
async function setTeamLogChannel(teamName, channelId) {
    const normalizedTeamName = teamName.toUpperCase();
    await notionConfigService.setChannel('Team Log Channel', normalizedTeamName, channelId);
    await refreshCache(); // Refresh cache after update
    logger.success(`Set team log channel: ${normalizedTeamName} -> ${channelId}`);
    return normalizedTeamName;
}

/**
 * Gets a team log channel ID
 * @param {string} teamName - Name of the team
 * @returns {string|null} Channel ID or null
 */
async function getTeamLogChannel(teamName) {
    const cache = await getCachedData();
    const normalizedTeamName = teamName.toUpperCase();

    if (cache.teamLogChannels && cache.teamLogChannels[normalizedTeamName]) {
        return cache.teamLogChannels[normalizedTeamName];
    }

    return null;
}

/**
 * Removes a team log channel mapping
 * @param {string} teamName - Name of the team
 */
async function removeTeamLogChannel(teamName) {
    // Note: This would require implementing an archive/delete function in notionConfigService
    // For now, we'll just log a warning
    logger.warn('Remove team log channel not yet implemented for Notion');
    // TODO: Implement archive functionality in notionConfigService
}

/**
 * Sets a team backlog channel mapping
 * @param {string} teamName - Name of the team
 * @param {string} channelId - Discord channel ID
 */
async function setTeamBacklogChannel(teamName, channelId) {
    const normalizedTeamName = teamName.toUpperCase();
    await notionConfigService.setChannel('Team Backlog Channel', normalizedTeamName, channelId);
    await refreshCache(); // Refresh cache after update
    logger.success(`Set team backlog channel: ${normalizedTeamName} -> ${channelId}`);
    return normalizedTeamName;
}

/**
 * Gets a team backlog channel ID
 * @param {string} teamName - Name of the team
 * @returns {string|null} Channel ID or null
 */
async function getTeamBacklogChannel(teamName) {
    const cache = await getCachedData();
    const normalizedTeamName = teamName.toUpperCase();

    if (cache.teamBacklogChannels && cache.teamBacklogChannels[normalizedTeamName]) {
        return cache.teamBacklogChannels[normalizedTeamName];
    }

    return null;
}

module.exports = {
    setTeamChannel,
    setPersonChannel,
    getTeamChannel,
    getPersonChannel,
    listTeamChannels,
    listPersonChannels,
    removeTeamChannel,
    removePersonChannel,
    addPrivateChannel,
    removePrivateChannel,
    isPrivateChannel,
    listPrivateChannels,
    setTeamLogChannel,
    getTeamLogChannel,
    removeTeamLogChannel,
    setTeamBacklogChannel,
    getTeamBacklogChannel,
    refreshCache, // Export for manual cache refresh if needed
};
