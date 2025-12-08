const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const ROLES_FILE = path.join(__dirname, 'roles.json');

// Initialize roles file if it doesn't exist
if (!fs.existsSync(ROLES_FILE)) {
    fs.writeFileSync(ROLES_FILE, JSON.stringify({ admins: [], teamLeads: {} }, null, 4));
}

function loadRoles() {
    try {
        const data = fs.readFileSync(ROLES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error('Error loading roles', error);
        return { admins: [], teamLeads: {} };
    }
}

function saveRoles(roles) {
    try {
        fs.writeFileSync(ROLES_FILE, JSON.stringify(roles, null, 4));
        return true;
    } catch (error) {
        logger.error('Error saving roles', error);
        return false;
    }
}

function addAdmin(userId) {
    const roles = loadRoles();
    if (!roles.admins.includes(userId)) {
        roles.admins.push(userId);
        saveRoles(roles);
        return true;
    }
    return false;
}

function removeAdmin(userId) {
    const roles = loadRoles();
    const index = roles.admins.indexOf(userId);
    if (index > -1) {
        roles.admins.splice(index, 1);
        saveRoles(roles);
        return true;
    }
    return false;
}

function isAdmin(userId) {
    const roles = loadRoles();
    return roles.admins.includes(userId);
}

function addTeamLead(userId, teamName) {
    const roles = loadRoles();
    if (!roles.teamLeads[teamName]) {
        roles.teamLeads[teamName] = [];
    }
    if (!roles.teamLeads[teamName].includes(userId)) {
        roles.teamLeads[teamName].push(userId);
        saveRoles(roles);
        return true;
    }
    return false;
}

function removeTeamLead(userId, teamName) {
    const roles = loadRoles();
    if (roles.teamLeads[teamName]) {
        const index = roles.teamLeads[teamName].indexOf(userId);
        if (index > -1) {
            roles.teamLeads[teamName].splice(index, 1);
            saveRoles(roles);
            return true;
        }
    }
    return false;
}

function isTeamLead(userId, teamName) {
    const roles = loadRoles();
    // If teamName is provided, check specific team
    if (teamName) {
        return roles.teamLeads[teamName]?.includes(userId) || false;
    }
    // Otherwise check if they lead ANY team
    return Object.values(roles.teamLeads).some(leads => leads.includes(userId));
}

function getLedTeams(userId) {
    const roles = loadRoles();
    const teams = [];
    for (const [team, leads] of Object.entries(roles.teamLeads)) {
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
    getLedTeams
};
