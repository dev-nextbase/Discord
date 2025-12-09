/**
 * CLEANUP SCRIPT
 * 
 * This script deletes the old JSON configuration files and old manager services.
 * Make sure the migration to Notion is complete and all code is updated before running this!
 */

const fs = require('fs');
const path = require('path');

const filesToDelete = [
    // Configuration JSONs
    'services/teamRoles.json',
    'services/roles.json',
    'services/channels.json',
    'services/userTeams.json',

    // Old Managers
    'services/channelManager.js',
    'services/roleManager.js',
    'services/teamRoleManager.js',
    'services/userTeamManager.js',

    // Unused Scripts (optional)
    // 'scripts/updateExistingDatabase.js', // Keep for future reference
    // 'scripts/migrateToNotion.js' // Keep for future reference
];

console.log('🧹 Starting cleanup of old files...\n');

let deletedCount = 0;

filesToDelete.forEach(file => {
    const filePath = path.join(__dirname, '..', file);

    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted: ${file}`);
            deletedCount++;
        } catch (error) {
            console.error(`❌ Failed to delete ${file}:`, error.message);
        }
    } else {
        console.log(`⏭️  Skipped: ${file} (not found)`);
    }
});

console.log(`\n✨ Cleanup complete! Deleted ${deletedCount} files.`);
console.log('🚀 Your bot is now pure Notion-powered!');
