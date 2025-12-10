/**
 * Setup New Task Database Structure
 * 
 * Adds necessary properties (columns) to the new Notion database
 * to match the structure of the old database.
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');

// Target Configuration
const TARGET = {
    auth: process.env.NOTION_API_KEY,
    databaseId: process.env.NOTION_DATABASE_ID
};

const notion = new Client({ auth: TARGET.auth });

async function setupDatabase() {
    console.log('🏗️ Setting up New Task Database structure...');
    console.log(`Target DB: ${TARGET.databaseId}`);

    try {
        // 1. Get current schema (to check what's already there)
        const db = await notion.databases.retrieve({ database_id: TARGET.databaseId });
        const existingProps = Object.keys(db.properties);
        console.log('Current properties:', existingProps.join(', '));

        /**
         * We need to figure out what the Title property is called.
         * In a new DB, it's usually "Name", but we want it to be "Task".
         */
        let titlePropName = 'Name';
        for (const [name, prop] of Object.entries(db.properties)) {
            if (prop.type === 'title') {
                titlePropName = name;
                break;
            }
        }
        console.log(`Title property is currently: "${titlePropName}"`);


        // 2. Define properties to add/update
        const propertiesToUpdate = {};

        // Rename Title property to "Task" if needed
        if (titlePropName !== 'Task') {
            propertiesToUpdate[titlePropName] = { name: 'Task' };
        }

        // Add other properties
        const newProperties = {
            'Description': { rich_text: {} },
            'Status': {
                status: {
                    options: [
                        { name: 'To Do', color: 'gray' },
                        { name: 'Working', color: 'blue' },
                        { name: 'On Hold', color: 'yellow' },
                        { name: 'Done', color: 'green' }
                    ]
                }
            },
            'Priority': {
                select: {
                    options: [
                        { name: '1', color: 'gray' },
                        { name: '5', color: 'yellow' },
                        { name: '10', color: 'red' }
                    ]
                }
            },
            'Team': {
                select: {
                    options: [
                        { name: 'ui', color: 'purple' },
                        { name: 'web', color: 'blue' },
                        { name: 'ai', color: 'green' },
                        { name: 'marketing', color: 'orange' },
                        { name: 'seo', color: 'pink' },
                        { name: 'app', color: 'gray' }
                    ]
                }
            },
            'Assigned To': { rich_text: {} },
            'Assigned To ID': { rich_text: {} },
            'Assigned By': { rich_text: {} },
            'Assigned By ID': { rich_text: {} },
            'Discord URL': { url: {} }
        };

        // Let's add properties that don't exist
        for (const [key, config] of Object.entries(newProperties)) {
            if (!existingProps.includes(key)) {
                propertiesToUpdate[key] = config;
            }
        }

        if (Object.keys(propertiesToUpdate).length === 0) {
            console.log('✅ Database already has all properties.');
            return;
        }

        console.log('📦 Adding properties:', Object.keys(propertiesToUpdate));

        await notion.databases.update({
            database_id: TARGET.databaseId,
            properties: propertiesToUpdate
        });

        console.log('✅ Database structure updated successfully!');

    } catch (error) {
        console.error('❌ Failed to update database structure:', error.body || error.message);
    }
}

setupDatabase();
