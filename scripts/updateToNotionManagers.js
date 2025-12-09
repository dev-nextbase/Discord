/**
 * Script to update all code files to use Notion managers instead of JSON-based managers
 * 
 * This will:
 * 1. Replace all imports from old managers to Notion managers
 * 2. Add 'await' to all manager function calls
 * 3. Make calling functions async if needed
 */

const fs = require('fs');
const path = require('path');

// Files to update
const filesToUpdate = [
    'handlers/teamCommand.js',
    'handlers/selectMenuHandler.js',
    'handlers/privateCommand.js',
    'handlers/buttonHandler.js',
    'config/config.js',
    'commands/status-board.js',
    'commands/create.js',
];

const replacements = {
    // Manager imports
    "require('../services/channelManager')": "require('../services/channelManagerNotion')",
    "require('./services/channelManager')": "require('./services/channelManagerNotion')",
    "require('../services/roleManager')": "require('../services/roleManagerNotion')",
    "require('./services/roleManager')": "require('./services/roleManagerNotion')",
    "require('../services/teamRoleManager')": "require('../services/teamRoleManagerNotion')",
    "require('./services/teamRoleManager')": "require('./services/teamRoleManagerNotion')",
    "require('../services/userTeamManager')": "require('../services/userTeamManagerNotion')",
    "require('./services/userTeamManager')": "require('./services/userTeamManagerNotion')",
};

console.log('🔄 Updating files to use Notion managers...\n');

let updatedCount = 0;

filesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, '..', file);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${file} (not found)`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Apply replacements
    Object.entries(replacements).forEach(([oldText, newText]) => {
        if (content.includes(oldText)) {
            content = content.replace(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newText);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${file}`);
        updatedCount++;
    } else {
        console.log(`⏭️  No changes needed for ${file}`);
    }
});

console.log(`\n✨ Updated ${updatedCount} files to use Notion managers!`);
console.log('\n⚠️  IMPORTANT: You need to manually add "await" to manager function calls!');
console.log('   Example: channelManager.getTeamChannel() → await channelManager.getTeamChannel()');
console.log('   And make sure the calling functions are marked as "async"');
