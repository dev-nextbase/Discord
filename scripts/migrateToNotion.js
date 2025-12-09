/**
 * Migration script to move data from JSON files to a single Notion database
 * 
 * This script will:
 * 1. Read all existing JSON configuration files
 * 2. Create entries in the combined Notion configuration database
 * 3. Backup the JSON files before migration
 * 
 * Run this script once to migrate your data to Notion
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const notionConfigService = require('../services/notionConfigService');
const logger = require('../utils/logger');

// Paths to JSON files
const SERVICES_DIR = path.join(__dirname, '../services');
const BACKUP_DIR = path.join(__dirname, '../backups');

const JSON_FILES = {
    teamRoles: path.join(SERVICES_DIR, 'teamRoles.json'),
    roles: path.join(SERVICES_DIR, 'roles.json'),
    channels: path.join(SERVICES_DIR, 'channels.json'),
    userTeams: path.join(SERVICES_DIR, 'userTeams.json'),
};

/**
 * Create backup directory if it doesn't exist
 */
async function ensureBackupDir() {
    try {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
        logger.info('Backup directory ready');
    } catch (error) {
        logger.error('Failed to create backup directory', error);
        throw error;
    }
}

/**
 * Backup a JSON file
 */
async function backupFile(filePath) {
    try {
        const fileName = path.basename(filePath);
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const backupPath = path.join(BACKUP_DIR, `${fileName}.${timestamp}.backup`);

        const content = await fs.readFile(filePath, 'utf8');
        await fs.writeFile(backupPath, content);

        logger.success(`Backed up ${fileName} to ${backupPath}`);
    } catch (error) {
        logger.error(`Failed to backup ${filePath}`, error);
        throw error;
    }
}

/**
 * Read and parse a JSON file
 */
async function readJsonFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        logger.error(`Failed to read ${filePath}`, error);
        throw error;
    }
}

/**
 * Migrate team roles to Notion
 */
async function migrateTeamRoles() {
    logger.info('📋 Migrating Team Roles...');

    const data = await readJsonFile(JSON_FILES.teamRoles);
    const teamRoles = data.teamRoles || {};

    let count = 0;
    for (const [teamName, roleId] of Object.entries(teamRoles)) {
        await notionConfigService.setTeamRole(teamName, roleId);
        count++;
    }

    logger.success(`✅ Migrated ${count} team roles`);
}

/**
 * Migrate user roles (admins and team leads) to Notion
 */
async function migrateUserRoles() {
    logger.info('📋 Migrating User Roles...');

    const data = await readJsonFile(JSON_FILES.roles);

    // Migrate admins
    const admins = data.admins || [];
    for (const userId of admins) {
        await notionConfigService.addAdmin(userId);
    }
    logger.success(`✅ Migrated ${admins.length} admins`);

    // Migrate team leads
    const teamLeads = data.teamLeads || {};
    let teamLeadCount = 0;
    for (const [team, userIds] of Object.entries(teamLeads)) {
        for (const userId of userIds) {
            await notionConfigService.addTeamLead(userId, team);
            teamLeadCount++;
        }
    }
    logger.success(`✅ Migrated ${teamLeadCount} team leads`);
}

/**
 * Migrate channels to Notion
 */
async function migrateChannels() {
    logger.info('📋 Migrating Channels...');

    const data = await readJsonFile(JSON_FILES.channels);

    // Migrate team channels
    const teamChannels = data.teamChannels || {};
    for (const [teamName, channelId] of Object.entries(teamChannels)) {
        await notionConfigService.setChannel('Team Channel', teamName, channelId);
    }
    logger.success(`✅ Migrated ${Object.keys(teamChannels).length} team channels`);

    // Migrate person channels
    const personChannels = data.personChannels || {};
    for (const [userId, channelId] of Object.entries(personChannels)) {
        await notionConfigService.setChannel('Person Channel', userId, channelId);
    }
    logger.success(`✅ Migrated ${Object.keys(personChannels).length} person channels`);

    // Migrate team log channels
    const teamLogChannels = data.teamLogChannels || {};
    for (const [teamName, channelId] of Object.entries(teamLogChannels)) {
        await notionConfigService.setChannel('Team Log Channel', teamName, channelId);
    }
    logger.success(`✅ Migrated ${Object.keys(teamLogChannels).length} team log channels`);

    // Migrate private channels
    const privateChannels = data.privateChannels || [];
    for (const channelId of privateChannels) {
        await notionConfigService.addPrivateChannel(channelId);
    }
    logger.success(`✅ Migrated ${privateChannels.length} private channels`);
}

/**
 * Migrate user teams to Notion
 */
async function migrateUserTeams() {
    logger.info('📋 Migrating User Teams...');

    const data = await readJsonFile(JSON_FILES.userTeams);
    const userTeams = data.userTeams || {};

    let count = 0;
    for (const [userId, team] of Object.entries(userTeams)) {
        await notionConfigService.setUserTeam(userId, team);
        count++;
    }

    logger.success(`✅ Migrated ${count} user teams`);
}

/**
 * Main migration function
 */
async function migrate() {
    console.log('\n🚀 Starting migration from JSON to Notion...\n');
    console.log('📦 All data will be stored in ONE combined Notion database\n');

    try {
        // Ensure backup directory exists
        await ensureBackupDir();

        // Backup all JSON files
        console.log('📦 Creating backups...');
        for (const filePath of Object.values(JSON_FILES)) {
            await backupFile(filePath);
        }
        console.log('');

        // Migrate data
        await migrateTeamRoles();
        await migrateUserRoles();
        await migrateChannels();
        await migrateUserTeams();

        console.log('\n✨ Migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Open your Notion database to verify the data');
        console.log('2. All data types are organized by the "Type" field');
        console.log('3. Update your code to use the Notion managers');
        console.log('4. Restart your Discord bot');
        console.log('\n💾 Your original JSON files have been backed up to:', BACKUP_DIR);
        console.log('\n💡 Tip: You can filter the Notion database by "Type" to see specific data');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\n💾 Your original JSON files are safe in:', BACKUP_DIR);
        process.exit(1);
    }
}

// Run migration
migrate();
