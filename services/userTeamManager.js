const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const USER_TEAMS_FILE = path.join(__dirname, 'userTeams.json');

/**
 * Loads user-team mappings from JSON file
 * @returns {Object} User-team mappings
 */
function loadUserTeams() {
    try {
        if (!fs.existsSync(USER_TEAMS_FILE)) {
            const defaultConfig = { userTeams: {} };
            fs.writeFileSync(USER_TEAMS_FILE, JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }

        const data = fs.readFileSync(USER_TEAMS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error('Failed to load userTeams.json', error);
        return { userTeams: {} };
    }
}

/**
 * Saves user-team mappings to JSON file
 * @param {Object} userTeams - User-team mappings object
 */
function saveUserTeams(userTeams) {
    try {
        fs.writeFileSync(USER_TEAMS_FILE, JSON.stringify(userTeams, null, 2));
        logger.success('User-team mappings saved successfully');
    } catch (error) {
        logger.error('Failed to save userTeams.json', error);
        throw error;
    }
}

/**
 * Assigns a user to a team
 * @param {string} userId - Discord user ID
 * @param {string} teamName - Team name
 */
function assignUserToTeam(userId, teamName) {
    const data = loadUserTeams();
    data.userTeams[userId] = teamName;
    saveUserTeams(data);
    logger.success(`Assigned user ${userId} to team: ${teamName}`);
}

/**
 * Gets a user's team
 * @param {string} userId - Discord user ID
 * @returns {string|null} Team name or null
 */
function getUserTeam(userId) {
    const data = loadUserTeams();
    return data.userTeams[userId] || null;
}

/**
 * Lists all user-team assignments
 * @returns {Object} User-team mappings
 */
function listUserTeams() {
    const data = loadUserTeams();
    return data.userTeams;
}

/**
 * Removes a user's team assignment
 * @param {string} userId - Discord user ID
 */
function removeUserTeam(userId) {
    const data = loadUserTeams();
    delete data.userTeams[userId];
    saveUserTeams(data);
    logger.success(`Removed team assignment for user: ${userId}`);
}

module.exports = {
    assignUserToTeam,
    getUserTeam,
    listUserTeams,
    removeUserTeam,
};
