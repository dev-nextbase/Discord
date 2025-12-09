/**
 * Helper script to verify your Notion database ID
 * Run this to check if your database ID is correct and accessible
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function checkDatabase() {
    console.log('\n🔍 Checking your Notion configuration...\n');

    // Check if NOTION_TOKEN exists
    if (!process.env.NOTION_TOKEN) {
        console.error('❌ NOTION_TOKEN not found in .env file');
        process.exit(1);
    }
    console.log('✅ NOTION_TOKEN found');

    // Check if NOTION_DATABASE_ID exists (your tasks database)
    if (process.env.NOTION_DATABASE_ID) {
        console.log('✅ NOTION_DATABASE_ID found:', process.env.NOTION_DATABASE_ID);

        try {
            const db = await notion.databases.retrieve({
                database_id: process.env.NOTION_DATABASE_ID
            });
            console.log('✅ Tasks database is accessible');
            console.log('   Title:', db.title[0]?.plain_text || 'Untitled');
        } catch (error) {
            console.error('❌ Cannot access tasks database:', error.message);
        }
    }

    // Check if NOTION_CONFIG_DB_ID exists
    if (process.env.NOTION_CONFIG_DB_ID) {
        console.log('\n✅ NOTION_CONFIG_DB_ID found:', process.env.NOTION_CONFIG_DB_ID);

        try {
            const db = await notion.databases.retrieve({
                database_id: process.env.NOTION_CONFIG_DB_ID
            });
            console.log('✅ Config database is accessible');
            console.log('   Title:', db.title[0]?.plain_text || 'Untitled');

            console.log('\n📋 Database properties:');
            Object.keys(db.properties).forEach(prop => {
                console.log(`   - ${prop} (${db.properties[prop].type})`);
            });

            console.log('\n✅ Everything looks good! You can run the migration now:');
            console.log('   node scripts/migrateToNotion.js');
        } catch (error) {
            console.error('\n❌ Cannot access config database:', error.message);
            console.log('\n💡 Make sure:');
            console.log('   1. The database ID is correct (32 characters)');
            console.log('   2. The database is shared with your Notion integration');
            console.log('   3. Your integration has edit permissions');
        }
    } else {
        console.log('\n❌ NOTION_CONFIG_DB_ID not found in .env file');
        console.log('\n📝 To fix this:');
        console.log('   1. Get your Notion database ID from the URL');
        console.log('   2. Add this line to your .env file:');
        console.log('      NOTION_CONFIG_DB_ID=your_database_id_here');
        console.log('\n💡 Your database URL looks like:');
        console.log('   https://www.notion.so/Tasks-DATABASE_ID?v=...');
        console.log('   Copy the 32-character DATABASE_ID');
    }
}

checkDatabase().catch(console.error);
