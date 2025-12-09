const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function testTimeTracking() {
    try {
        console.log('Testing time tracking functionality...\n');

        // Get a recent task
        const response = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID,
            page_size: 5,
            sorts: [{ timestamp: 'created_time', direction: 'descending' }]
        });

        if (response.results.length === 0) {
            console.log('❌ No tasks found in database');
            return;
        }

        console.log('Recent tasks with time tracking data:\n');
        console.log('-----------------------------------');

        for (const task of response.results) {
            const title = task.properties['Task']?.title[0]?.text?.content || 'Untitled';
            const status = task.properties['Status']?.select?.name || 'Unknown';
            const startedWorkingOn = task.properties['Started Working On']?.date?.start || 'Not started';
            const doneWorkingOn = task.properties['Done Working On']?.date?.start || 'Not done';
            const timeSpent = task.properties['Time Spent (Seconds)']?.number || 0;

            console.log(`📋 Task: ${title}`);
            console.log(`   Status: ${status}`);
            console.log(`   Started Working On: ${startedWorkingOn}`);
            console.log(`   Done Working On: ${doneWorkingOn}`);
            console.log(`   Time Spent: ${timeSpent} seconds (${Math.floor(timeSpent / 60)} minutes)`);
            console.log('');
        }

        console.log('-----------------------------------');
        console.log('\n💡 How time tracking works:');
        console.log('1. Click "Start Working" → Sets "Started Working On" timestamp');
        console.log('2. Click "On Hold" or "Done" → Calculates time since "Started Working On"');
        console.log('3. Adds calculated time to "Time Spent (Seconds)"');
        console.log('4. If you click "Start Working" again, it starts a new session');
        console.log('\n✅ Time tracking is cumulative across multiple work sessions');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testTimeTracking();
