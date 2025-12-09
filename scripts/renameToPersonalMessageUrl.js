/**
 * Script to rename field to Personal Message URL
 * This field stores the Discord message URL for the task's current location:
 * - Backlog channel message URL when in backlog
 * - Personal channel message URL when assigned to someone
 */

const { Client } = require('@notionhq/client');
const { config } = require('../config/config');

const notion = new Client({ auth: config.notion.token });

async function renameField() {
    try {
        console.log('Renaming field to Personal Message URL...');

        await notion.databases.update({
            database_id: config.notion.databaseId,
            properties: {
                'Backlog Message URL': {
                    name: 'Personal Message URL'
                }
            }
        });

        console.log('✅ Successfully renamed to Personal Message URL!');
        console.log('This field will store:');
        console.log('  - Backlog channel message URL when task is in backlog');
        console.log('  - Personal channel message URL when task is assigned');
    } catch (error) {
        console.error('❌ Error renaming field:', error);
        console.log('You can manually rename "Backlog Message URL" to "Personal Message URL" in Notion');
    }
}

renameField();
