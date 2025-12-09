/**
 * Script to add all missing fields to the Notion Task Database
 * This will add:
 * - Personal Message URL (URL field)
 * - Last Paused Time (Date field)
 * - Last Started Time (Date field) - if missing
 */

const { Client } = require('@notionhq/client');
const { config } = require('../config/config');

const notion = new Client({ auth: config.notion.token });

async function addMissingFields() {
    try {
        console.log('🔍 Checking Notion database for missing fields...');
        console.log(`Database ID: ${config.notion.databaseId}`);

        // First, get current database schema
        const db = await notion.databases.retrieve({
            database_id: config.notion.databaseId
        });

        const existingProps = Object.keys(db.properties);
        console.log('\n📋 Current properties:', existingProps.join(', '));

        // Define all required properties
        const requiredProperties = {
            'Personal Message URL': { url: {} },
            'Last Paused Time': { date: {} },
            'Last Started Time': { date: {} },
            'Started Working On': { date: {} },
            'Time Spent (Seconds)': { number: {} }
        };

        // Check which properties are missing
        const missingProperties = {};
        for (const [propName, propConfig] of Object.entries(requiredProperties)) {
            if (!existingProps.includes(propName)) {
                missingProperties[propName] = propConfig;
            }
        }

        if (Object.keys(missingProperties).length === 0) {
            console.log('\n✅ All required fields already exist!');
            return;
        }

        console.log('\n📦 Adding missing properties:');
        Object.keys(missingProperties).forEach(prop => {
            console.log(`   - ${prop}`);
        });

        // Add missing properties
        await notion.databases.update({
            database_id: config.notion.databaseId,
            properties: missingProperties
        });

        console.log('\n✅ Successfully added all missing fields!');
        console.log('\n📝 Field descriptions:');
        console.log('   - Personal Message URL: Stores Discord message URL (backlog or personal channel)');
        console.log('   - Last Paused Time: Timestamp when task was last paused');
        console.log('   - Last Started Time: Timestamp when task was last started');
        console.log('   - Started Working On: Initial timestamp when work began');
        console.log('   - Time Spent (Seconds): Total time spent on the task');

    } catch (error) {
        console.error('\n❌ Error adding fields:', error.message);
        if (error.body) {
            console.error('Error details:', JSON.stringify(error.body, null, 2));
        }

        console.log('\n💡 Manual fix:');
        console.log('1. Go to your Notion database');
        console.log('2. Add these properties manually:');
        console.log('   - "Personal Message URL" (type: URL)');
        console.log('   - "Last Paused Time" (type: Date)');
        console.log('   - "Last Started Time" (type: Date)');
    }
}

addMissingFields();
