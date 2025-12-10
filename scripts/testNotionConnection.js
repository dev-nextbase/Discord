require('dotenv').config();
const { Client } = require('@notionhq/client');

async function testConnection() {
    console.log('=== Detailed Notion Connection Test ===\n');

    const token = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_DATABASE_ID;
    const configDbId = process.env.NOTION_CONFIG_DB_ID;

    console.log(`Token exists: ${!!token}`);
    console.log(`Token starts with: ${token ? token.substring(0, 10) : 'N/A'}`);
    console.log(`Token length: ${token ? token.length : 0}`);
    console.log(`Database ID: ${databaseId ? databaseId.substring(0, 15) + '...' : 'NOT SET'}`);
    console.log(`Config DB ID: ${configDbId ? configDbId.substring(0, 15) + '...' : 'NOT SET'}\n`);

    if (!token) {
        console.log('❌ NOTION_TOKEN is not set!');
        return;
    }

    const notion = new Client({ auth: token });

    // Test 1: Check if we can authenticate
    console.log('Test 1: Authentication...');
    try {
        const user = await notion.users.me();
        console.log('✅ Authentication successful!');
        console.log(`   Bot name: ${user.bot?.owner?.user?.name || user.name || 'Unknown'}`);
        console.log(`   Bot ID: ${user.id}\n`);
    } catch (error) {
        console.log('❌ Authentication failed!');
        console.log(`   Error code: ${error.code}`);
        console.log(`   Error message: ${error.message}`);
        console.log(`   Full error:`, error);
        return;
    }

    // Test 2: Check database access
    if (databaseId) {
        console.log('Test 2: Main Database Access...');
        try {
            const db = await notion.databases.retrieve({ database_id: databaseId });
            console.log('✅ Can access main database!');
            console.log(`   Database title: ${db.title?.[0]?.plain_text || 'Untitled'}\n`);
        } catch (error) {
            console.log('❌ Cannot access main database!');
            console.log(`   Error: ${error.message}`);
            console.log(`   This might mean the integration doesn't have access to this database.\n`);
        }
    }

    // Test 3: Check config database access
    if (configDbId) {
        console.log('Test 3: Config Database Access...');
        try {
            const db = await notion.databases.retrieve({ database_id: configDbId });
            console.log('✅ Can access config database!');
            console.log(`   Database title: ${db.title?.[0]?.plain_text || 'Untitled'}\n`);
        } catch (error) {
            console.log('❌ Cannot access config database!');
            console.log(`   Error: ${error.message}`);
            console.log(`   This might mean the integration doesn't have access to this database.\n`);
        }
    }

    // Test 4: Try to create a test task
    if (databaseId) {
        console.log('Test 4: Creating Test Task...');
        try {
            const response = await notion.pages.create({
                parent: { database_id: databaseId },
                properties: {
                    'Task': {
                        title: [{ text: { content: 'TEST - Delete Me' } }],
                    },
                    'Assigned By': {
                        rich_text: [{ text: { content: 'System Test' } }],
                    },
                    'Assigned To': {
                        rich_text: [{ text: { content: 'Test User' } }],
                    },
                    'Team': {
                        select: { name: 'Test' },
                    },
                    'Priority': {
                        select: { name: '5' },
                    },
                    'Status': {
                        select: { name: 'On Hold' },
                    },
                },
            });
            console.log('✅ Successfully created test task!');
            console.log(`   Task ID: ${response.id}`);
            console.log(`   You can delete this test task from Notion.\n`);
        } catch (error) {
            console.log('❌ Failed to create test task!');
            console.log(`   Error code: ${error.code}`);
            console.log(`   Error message: ${error.message}`);
            if (error.body) {
                console.log(`   Error body:`, JSON.stringify(error.body, null, 2));
            }
        }
    }
}

testConnection().catch(console.error);
