const { Client } = require('@notionhq/client');
const { config } = require('../config/config');

const notion = new Client({ auth: config.notion.token });

async function addTimeTrackingFields() {
    try {
        console.log('Adding time tracking fields to Notion database...');

        const response = await notion.databases.update({
            database_id: config.notion.databaseId,
            properties: {
                'Last Started Time': {
                    date: {}
                },
                'Last Paused Time': {
                    date: {}
                }
            }
        });

        console.log('✅ Successfully added time tracking fields:');
        console.log('   - Last Started Time (Date)');
        console.log('   - Last Paused Time (Date)');
        console.log('\nThese fields will work with the existing:');
        console.log('   - Started Working On (Date)');
        console.log('   - Time Spent (Seconds) (Number)');
        console.log('\nTime tracking is now fully configured!');
    } catch (error) {
        console.error('❌ Error adding fields:', error.message);
        if (error.code === 'validation_error') {
            console.log('\nNote: Fields may already exist. This is okay!');
        }
    }
}

addTimeTrackingFields();
