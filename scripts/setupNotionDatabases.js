/**
 * Notion Database Setup Helper
 * 
 * This script creates a single combined Notion database for all bot configuration.
 * All configuration types (team roles, user roles, channels, user teams) are stored
 * in one database with a "Type" field to distinguish them.
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');
const logger = require('../utils/logger');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * Create the combined configuration database
 */
async function createConfigDatabase(parentPageId) {
    try {
        const response = await notion.databases.create({
            parent: {
                type: 'page_id',
                page_id: parentPageId,
            },
            title: [
                {
                    type: 'text',
                    text: {
                        content: '⚙️ Discord Bot Configuration',
                    },
                },
            ],
            properties: {
                'Key': {
                    title: {},
                },
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
            },
        });

        logger.success('Created Configuration database');
        return response.id;
    } catch (error) {
        logger.error('Failed to create Configuration database', error);
        throw error;
    }
}

/**
 * Main setup function
 */
async function setupDatabase() {
    console.log('\n🚀 Notion Database Setup\n');
    console.log('This script will create ONE combined database for all bot configuration.\n');
    console.log('All data types (team roles, user roles, channels, user teams) will be');
    console.log('stored in this single database with a "Type" field to distinguish them.\n');

    // Get parent page ID from user
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    readline.question('Enter the Notion Page ID where you want to create the database: ', async (parentPageId) => {
        readline.close();

        if (!parentPageId || parentPageId.length !== 32) {
            console.error('\n❌ Invalid page ID. Page ID should be 32 characters long.');
            console.log('\nHow to get your page ID:');
            console.log('1. Open the Notion page where you want to create the database');
            console.log('2. Click "Share" → "Copy link"');
            console.log('3. Extract the ID from the URL: https://notion.so/workspace/PAGE_ID');
            process.exit(1);
        }

        try {
            console.log('\n📦 Creating database...\n');

            const configDbId = await createConfigDatabase(parentPageId);

            console.log('\n✨ Database created successfully!\n');
            console.log('📋 Add this to your .env file:\n');
            console.log(`NOTION_CONFIG_DB_ID=${configDbId}`);
            console.log('\n📝 Next steps:');
            console.log('1. Copy the above line to your .env file');
            console.log('2. Run the migration script: node scripts/migrateToNotion.js');
            console.log('3. Update your code to use the new Notion managers');
            console.log('\n✅ Setup complete!');
            console.log('\n💡 Tip: Open the database in Notion to see the structure.');
            console.log('   All your configuration will be organized by "Type" field.');

        } catch (error) {
            console.error('\n❌ Setup failed:', error.message);
            console.log('\nTroubleshooting:');
            console.log('1. Make sure your Notion integration has access to the parent page');
            console.log('2. Verify your NOTION_TOKEN in .env is correct');
            console.log('3. Check that the page ID is valid');
            process.exit(1);
        }
    });
}

// Run setup
setupDatabase();
