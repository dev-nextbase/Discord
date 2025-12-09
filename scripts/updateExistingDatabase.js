/**
 * Update Existing Notion Database
 * 
 * This script updates your existing Notion database to add the properties
 * needed for storing all bot configuration (team roles, user roles, channels, user teams).
 * 
 * It will add these properties if they don't exist:
 * - Type (Select)
 * - Key (Title or Text)
 * - Value (Text)
 * - Team (Select)
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');
const logger = require('../utils/logger');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * Update the existing database with new properties
 */
async function updateDatabase(databaseId) {
    try {
        // First, get the current database schema
        const database = await notion.databases.retrieve({ database_id: databaseId });

        console.log('\n📋 Current database properties:');
        Object.keys(database.properties).forEach(prop => {
            console.log(`   - ${prop} (${database.properties[prop].type})`);
        });

        // Prepare the properties to add/update
        const newProperties = {
            'Type': {
                select: {
                    options: [
                        { name: 'Team Role', color: 'purple' },
                        { name: 'Admin', color: 'red' },
                        { name: 'Team Lead', color: 'blue' },
                        { name: 'Team Channel', color: 'green' },
                        { name: 'Person Channel', color: 'yellow' },
                        { name: 'Team Log Channel', color: 'orange' },
                        { name: 'Private Channel', color: 'pink' },
                        { name: 'User Team', color: 'gray' },
                    ],
                },
            },
            'Key': {
                rich_text: {},
            },
            'Value': {
                rich_text: {},
            },
            'Team': {
                select: {
                    options: [
                        { name: 'ui', color: 'purple' },
                        { name: 'web', color: 'blue' },
                        { name: 'ai', color: 'green' },
                        { name: 'marketing', color: 'orange' },
                        { name: 'seo', color: 'yellow' },
                        { name: 'QA', color: 'pink' },
                        { name: 'app', color: 'gray' },
                    ],
                },
            },
        };

        console.log('\n📦 Adding new properties to database...\n');

        // Update the database with new properties
        const response = await notion.databases.update({
            database_id: databaseId,
            properties: newProperties,
        });

        console.log('✅ Database updated successfully!\n');
        console.log('📋 New properties added:');
        console.log('   - Type (Select) - 8 configuration types');
        console.log('   - Key (Text) - Identifier for each record');
        console.log('   - Value (Text) - The actual value');
        console.log('   - Team (Select) - Team name when applicable');

        return response.id;
    } catch (error) {
        logger.error('Failed to update database', error);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    console.log('\n🔧 Update Existing Notion Database\n');
    console.log('This script will add the necessary properties to your existing database.\n');

    // Get database ID from user
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    readline.question('Enter your existing Notion Database ID: ', async (databaseId) => {
        readline.close();

        if (!databaseId || databaseId.length !== 32) {
            console.error('\n❌ Invalid database ID. Database ID should be 32 characters long.');
            console.log('\nHow to get your database ID:');
            console.log('1. Open your Notion database');
            console.log('2. Click "..." → "Copy link"');
            console.log('3. Extract the ID from the URL: https://notion.so/workspace/DATABASE_ID?v=...');
            console.log('   The database ID is the 32-character string before the "?v="');
            process.exit(1);
        }

        try {
            await updateDatabase(databaseId);

            console.log('\n✨ Setup complete!\n');
            console.log('📝 Next steps:');
            console.log('1. Add this to your .env file:');
            console.log(`   NOTION_CONFIG_DB_ID=${databaseId}`);
            console.log('2. Run the migration script: node scripts/migrateToNotion.js');
            console.log('3. Update your code to use the Notion managers');
            console.log('\n💡 Tip: Your existing data in the database is preserved!');
            console.log('   The new configuration will be added alongside it.');

        } catch (error) {
            console.error('\n❌ Update failed:', error.message);
            console.log('\nTroubleshooting:');
            console.log('1. Make sure your Notion integration has EDIT access to the database');
            console.log('2. Verify your NOTION_TOKEN in .env is correct');
            console.log('3. Check that the database ID is valid');
            console.log('4. Ensure the database is shared with your integration');
            process.exit(1);
        }
    });
}

// Run main function
main();
