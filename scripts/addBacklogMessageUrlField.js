/**
 * Script to add Backlog Message URL field to Notion database
 * This field stores the Discord message URL when a task is in the backlog channel
 */

const { Client } = require('@notionhq/client');
const { config } = require('../config/config');

const notion = new Client({ auth: config.notion.token });

async function addBacklogMessageUrlField() {
    try {
        console.log('Adding Backlog Message URL field to Notion database...');

        await notion.databases.update({
            database_id: config.notion.databaseId,
            properties: {
                'Backlog Message URL': {
                    url: {}
                }
            }
        });

        console.log('✅ Successfully added Backlog Message URL field!');
        console.log('This field will store the Discord message URL when a task is in backlog.');
    } catch (error) {
        console.error('❌ Error adding field:', error);
    }
}

addBacklogMessageUrlField();
