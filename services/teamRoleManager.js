const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const TEAM_ROLES_FILE = path.join(__dirname, 'teamRoles.json');

/**
 * Loads team-role mappings from JSON file
 * @returns {Object} Team-role mappings
 */
function loadTeamRoles() {
    try {
        if (!fs.existsSync(TEAM_ROLES_FILE)) {
            const defaultConfig = { teamRoles: {} };
            fs.writeFileSync(TEAM_ROLES_FILE, JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }

        const data = fs.readFileSync(TEAM_ROLES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error('Failed to load teamRoles.json', error);
        return { teamRoles: {} };
    }
}

/**
 * Saves team-role mappings to JSON file
 * @param {Object} teamRoles - Team-role mappings object
 */
function saveTeamRoles(teamRoles) {
    try {
        fs.writeFileSync(TEAM_ROLES_FILE, JSON.stringify(teamRoles, null, 2));
        logger.success('Team-role mappings saved successfully');
    } catch (error) {
        logger.error('Failed to save teamRoles.json', error);
        throw error;
    }
}

/**
 * Assigns a role to a team
 * @param {string} teamName - Team name
 * @param {string} roleId - Discord role ID
 */
function assignRoleToTeam(teamName, roleId) {
    const data = loadTeamRoles();
    data.teamRoles[teamName] = roleId;
    saveTeamRoles(data);
    logger.success(`Assigned role ${roleId} to team: ${teamName}`);
}

/**
 * Gets a team's role ID
 * @param {string} teamName - Team name
 * @returns {string|null} Role ID or null
 */
function getTeamRole(teamName) {
    const data = loadTeamRoles();
    return data.teamRoles[teamName] || null;
}

/**
 * Gets team name by role ID
 * @param {string} roleId - Discord role ID
 * @returns {string|null} Team name or null
 */
function getTeamByRole(roleId) {
    const data = loadTeamRoles();
    for (const [team, role] of Object.entries(data.teamRoles)) {
        if (role === roleId) return team;
    }
    return null;
}

/**
 * Gets user's team based on their roles
 * @param {Array} userRoles - Array of role IDs user has
 * @returns {string|null} Team name or null
 */
function getUserTeamByRoles(userRoles) {
    const data = loadTeamRoles();
    for (const roleId of userRoles) {
        const team = getTeamByRole(roleId);
        if (team) return team;
    }
    return null;
}

/**
 * Lists all team-role assignments
 * @returns {Object} Team-role mappings
 */
function listTeamRoles() {
    const data = loadTeamRoles();
    return data.teamRoles;
}

/**
 * Removes a team's role assignment
 * @param {string} teamName - Team name
 */
function removeTeamRole(teamName) {
    const data = loadTeamRoles();
    delete data.teamRoles[teamName];
    saveTeamRoles(data);
    logger.success(`Removed role assignment for team: ${teamName}`);
}

module.exports = {
    assignRoleToTeam,
    getTeamRole,
    getTeamByRole,
    getUserTeamByRoles,
    listTeamRoles,
    removeTeamRole,
};
