const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function checkTimeProperty() {
    try {
        console.log('Checking Notion database properties...\n');

        const database = await notion.databases.retrieve({
            database_id: process.env.NOTION_DATABASE_ID
        });

        console.log('Current database properties:');
        console.log('----------------------------');

        const properties = database.properties;
        const hasTimeSpent = 'Time Spent (Seconds)' in properties;

        for (const [name, prop] of Object.entries(properties)) {
            console.log(`- ${name}: ${prop.type}`);
        }

        console.log('\n----------------------------');

        if (hasTimeSpent) {
            console.log('✅ "Time Spent (Seconds)" property EXISTS');
            console.log(`   Type: ${properties['Time Spent (Seconds)'].type}`);
        } else {
            console.log('❌ "Time Spent (Seconds)" property DOES NOT EXIST');
            console.log('\n📝 To add this property:');
            console.log('1. Open your Notion database');
            console.log('2. Click the "+" button to add a new property');
            console.log('3. Name it exactly: Time Spent (Seconds)');
            console.log('4. Set the type to: Number');
            console.log('5. Save the property');
        }

        // Check for other time-related properties
        console.log('\n📊 Time-related properties:');
        const timeProps = ['Started Working On', 'Done Working On', 'Time Spent (Seconds)'];
        for (const prop of timeProps) {
            if (prop in properties) {
                console.log(`✅ ${prop}: ${properties[prop].type}`);
            } else {
                console.log(`❌ ${prop}: MISSING`);
            }
        }

    } catch (error) {
        console.error('Error checking database:', error.message);
    }
}

checkTimeProperty();
