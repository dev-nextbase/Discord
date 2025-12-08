const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const CHANNELS_FILE = path.join(__dirname, 'channels.json');

/**
 * Loads channel mappings from JSON file
 * @returns {Object} Channel mappings
 */
function loadChannels() {
    try {
        if (!fs.existsSync(CHANNELS_FILE)) {
            // Create default file if it doesn't exist
            const defaultConfig = {
                teamChannels: {},
                personChannels: {},
                privateChannels: [],
                teamLogChannels: {},
            };
            fs.writeFileSync(CHANNELS_FILE, JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }

        const data = fs.readFileSync(CHANNELS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error('Failed to load channels.json', error);
        return { teamChannels: {}, personChannels: {} };
    }
}

/**
 * Saves channel mappings to JSON file
 * @param {Object} channels - Channel mappings object
 */
function saveChannels(channels) {
    try {
        fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2));
        logger.success('Channel mappings saved successfully');
    } catch (error) {
        logger.error('Failed to save channels.json', error);
        throw error;
    }
}

/**
 * Updates .env file with new channel mapping
 * @param {string} key - Environment variable key
 * @param {string} value - Channel ID value
 */
function updateEnvFile(key, value) {
    const envPath = path.join(__dirname, '..', '.env');

    try {
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Check if key already exists
        const lines = envContent.split('\n');
        let keyFound = false;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith(`${key}=`)) {
                lines[i] = `${key}=${value}`;
                keyFound = true;
                break;
            }
        }

        // If key doesn't exist, add it
        if (!keyFound) {
            lines.push(`${key}=${value}`);
        }

        fs.writeFileSync(envPath, lines.join('\n'));
        logger.success(`Updated .env: ${key}=${value}`);
    } catch (error) {
        logger.error('Failed to update .env file', error);
    }
}

/**
 * Sets a team channel mapping
 * @param {string} teamName - Name of the team
 * @param {string} channelId - Discord channel ID
 */
function setTeamChannel(teamName, channelId) {
    const channels = loadChannels();
    const normalizedTeamName = teamName.toUpperCase().replace(/\s+/g, '_');

    channels.teamChannels[normalizedTeamName] = channelId;
    saveChannels(channels);

    // Also update .env file
    const envKey = `TEAM_CHANNEL_${normalizedTeamName}`;
    updateEnvFile(envKey, channelId);

    logger.success(`Set team channel: ${normalizedTeamName} -> ${channelId}`);
    return normalizedTeamName;
}

/**
 * Sets a person channel mapping
 * @param {string} userId - Discord user ID
 * @param {string} channelId - Discord channel ID
 */
function setPersonChannel(userId, channelId) {
    const channels = loadChannels();

    channels.personChannels[userId] = channelId;
    saveChannels(channels);

    // Also update .env file
    const envKey = `PERSON_CHANNEL_${userId}`;
    updateEnvFile(envKey, channelId);

    logger.success(`Set person channel: ${userId} -> ${channelId}`);
}

/**
 * Gets a team channel ID
 * @param {string} teamName - Name of the team
 * @returns {string|null} Channel ID or null
 */
function getTeamChannel(teamName) {
    const channels = loadChannels();
    const normalizedTeamName = teamName.toUpperCase().replace(/\s+/g, '_');
    return channels.teamChannels[normalizedTeamName] || null;
}

/**
 * Gets a person channel ID
 * @param {string} userId - Discord user ID
 * @returns {string|null} Channel ID or null
 */
function getPersonChannel(userId) {
    const channels = loadChannels();
    return channels.personChannels[userId] || null;
}

/**
 * Lists all configured team channels
 * @returns {Object} Team channel mappings
 */
function listTeamChannels() {
    const channels = loadChannels();
    return channels.teamChannels;
}

/**
 * Lists all configured person channels
 * @returns {Object} Person channel mappings
 */
function listPersonChannels() {
    const channels = loadChannels();
    return channels.personChannels;
}

/**
 * Removes a team channel mapping
 * @param {string} teamName - Name of the team
 */
function removeTeamChannel(teamName) {
    const channels = loadChannels();
    const normalizedTeamName = teamName.toUpperCase().replace(/\s+/g, '_');

    delete channels.teamChannels[normalizedTeamName];
    saveChannels(channels);

    logger.success(`Removed team channel: ${normalizedTeamName}`);
}

/**
 * Removes a person channel mapping
 * @param {string} userId - Discord user ID
 */
function removePersonChannel(userId) {
    const channels = loadChannels();

    delete channels.personChannels[userId];
    saveChannels(channels);

    logger.success(`Removed person channel: ${userId}`);
}

/**
 * Adds a private channel mapping
 * @param {string} channelId - Discord channel ID
 */
function addPrivateChannel(channelId) {
    const channels = loadChannels();
    if (!channels.privateChannels) {
        channels.privateChannels = [];
    }

    if (!channels.privateChannels.includes(channelId)) {
        channels.privateChannels.push(channelId);
        saveChannels(channels);
        logger.success(`Added private channel: ${channelId}`);
    }
}

/**
 * Removes a private channel mapping
 * @param {string} channelId - Discord channel ID
 */
function removePrivateChannel(channelId) {
    const channels = loadChannels();
    if (channels.privateChannels) {
        channels.privateChannels = channels.privateChannels.filter(id => id !== channelId);
        saveChannels(channels);
        logger.success(`Removed private channel: ${channelId}`);
    }
}

/**
 * Checks if a channel is private
 * @param {string} channelId - Discord channel ID
 * @returns {boolean}
 */
function isPrivateChannel(channelId) {
    const channels = loadChannels();
    return channels.privateChannels && channels.privateChannels.includes(channelId);
}

/**
 * Lists all private channels
 * @returns {string[]} Array of channel IDs
 */
function listPrivateChannels() {
    const channels = loadChannels();
    return channels.privateChannels || [];
}

/**
 * Sets a team log channel mapping
 * @param {string} teamName - Name of the team
 * @param {string} channelId - Discord channel ID
 */
function setTeamLogChannel(teamName, channelId) {
    const channels = loadChannels();
    const normalizedTeamName = teamName.toUpperCase().replace(/\s+/g, '_');

    if (!channels.teamLogChannels) {
        channels.teamLogChannels = {};
    }

    channels.teamLogChannels[normalizedTeamName] = channelId;
    saveChannels(channels);

    // Also update .env file
    const envKey = `TEAM_LOG_CHANNEL_${normalizedTeamName}`;
    updateEnvFile(envKey, channelId);

    logger.success(`Set team log channel: ${normalizedTeamName} -> ${channelId}`);
    return normalizedTeamName;
}

/**
 * Gets a team log channel ID
 * @param {string} teamName - Name of the team
 * @returns {string|null} Channel ID or null
 */
function getTeamLogChannel(teamName) {
    const channels = loadChannels();
    const normalizedTeamName = teamName.toUpperCase().replace(/\s+/g, '_');

    if (channels.teamLogChannels && channels.teamLogChannels[normalizedTeamName]) {
        return channels.teamLogChannels[normalizedTeamName];
    }

    // Fallback to env
    const envKey = `TEAM_LOG_CHANNEL_${normalizedTeamName}`;
    return process.env[envKey] || null;
}

/**
 * Removes a team log channel mapping
 * @param {string} teamName - Name of the team
 */
function removeTeamLogChannel(teamName) {
    const channels = loadChannels();
    const normalizedTeamName = teamName.toUpperCase().replace(/\s+/g, '_');

    if (channels.teamLogChannels) {
        delete channels.teamLogChannels[normalizedTeamName];
        saveChannels(channels);
        logger.success(`Removed team log channel: ${normalizedTeamName}`);
    }
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
};
