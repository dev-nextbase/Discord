/**
 * Notion to Notion Task Migration Script
 * 
 * Migrates tasks from an Old Notion Database to a New Notion Database.
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');

// Configuration
const SOURCE = {
    auth: process.env.NOTION_API_KEY_OLD || process.env.NOTION_API_KEY,
    databaseId: process.env.NOTION_DATABASE_ID_OLD || '2b50f280d6d5804fb172e8b5dca3f105'
};

const TARGET = {
    auth: process.env.NOTION_API_KEY,
    databaseId: process.env.NOTION_DATABASE_ID
};

const sourceClient = new Client({ auth: SOURCE.auth });
const targetClient = new Client({ auth: TARGET.auth });

async function migrateTasks() {
    console.log('🚀 Starting Task Migration...\n');
    console.log(`From Old DB: ${SOURCE.databaseId}`);
    console.log(`To New DB:   ${TARGET.databaseId}\n`);

    try {
        // 1. Fetch all tasks from Source
        console.log('📦 Fetching tasks from old database...');
        const allTasks = [];
        let cursor = undefined;

        while (true) {
            const response = await sourceClient.databases.query({
                database_id: SOURCE.databaseId,
                start_cursor: cursor,
            });

            allTasks.push(...response.results);

            if (!response.has_more) break;
            cursor = response.next_cursor;
        }

        console.log(`📋 Found ${allTasks.length} tasks to migrate.\n`);

        // 2. Fetch Target Schema to know types
        const targetDb = await targetClient.databases.retrieve({ database_id: TARGET.databaseId });
        const targetProps = targetDb.properties;

        // 3. Migrate each task
        let successCount = 0;
        let failCount = 0;

        for (const task of allTasks) {
            const props = task.properties;
            const taskTitle = props['Task']?.title[0]?.plain_text || 'Untitled';

            console.log(`Migrating: "${taskTitle}"...`);

            try {
                const newProperties = {};

                // Iterate over all properties in the source task
                for (const [propName, propValue] of Object.entries(props)) {
                    // Skip if property doesn't exist in target
                    const targetProp = targetProps[propName];
                    if (!targetProp) {
                        // Check for title mismatch (Task vs Name)
                        if (propValue.type === 'title' && targetProps['Task']) {
                            // Map to Task
                        } else {
                            continue;
                        }
                    }

                    if (propValue.type === 'title') {
                        if (propValue.title.length > 0) {
                            newProperties['Task'] = {
                                title: [{ text: { content: propValue.title[0].plain_text } }]
                            };
                        }
                    }
                    else if (propValue.type === 'rich_text' && propValue.rich_text.length > 0) {
                        newProperties[propName] = {
                            rich_text: [{ text: { content: propValue.rich_text[0].plain_text } }]
                        };
                    }
                    else if (propValue.type === 'select' && propValue.select) {
                        newProperties[propName] = {
                            select: { name: propValue.select.name }
                        };
                    }
                    else if (propValue.type === 'status' && propValue.status) {
                        // If target is status, map to status. If target is select, map to select.
                        if (targetProp?.type === 'select') {
                            newProperties[propName] = { select: { name: propValue.status.name } };
                        } else {
                            newProperties[propName] = { status: { name: propValue.status.name } };
                        }
                    }
                    else if (propValue.type === 'url' && propValue.url) {
                        newProperties[propName] = { url: propValue.url };
                    }
                    else if (propValue.type === 'date' && propValue.date) {
                        newProperties[propName] = { date: propValue.date };
                    }
                    else if (propValue.type === 'number' && propValue.number !== null) {
                        newProperties[propName] = { number: propValue.number };
                    }
                    // Add other types as needed
                }

                // 3. Create Page in Target
                await targetClient.pages.create({
                    parent: { database_id: TARGET.databaseId },
                    properties: newProperties,
                    icon: task.icon,
                });

                console.log(`   ✅ Success`);
                successCount++;

            } catch (error) {
                console.error(`   ❌ Failed: ${error.message}`);
                failCount++;
            }
        }

        console.log('\n==========================================');
        console.log('🎉 Migration Complete!');
        console.log(`✅ Successfully migrated: ${successCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log('==========================================');

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    }
}

migrateTasks();
