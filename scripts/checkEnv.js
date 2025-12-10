require('dotenv').config();

console.log('=== Environment Variable Check ===\n');

const vars = [
    'DISCORD_TOKEN',
    'CLIENT_ID',
    'GUILD_ID',
    'NOTION_TOKEN',
    'NOTION_API_KEY',
    'NOTION_DATABASE_ID',
    'NOTION_CONFIG_DB_ID'
];

vars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        // Show first 10 and last 4 characters for security
        const masked = value.length > 14
            ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
            : '***';
        console.log(`✅ ${varName}: ${masked}`);
    } else {
        console.log(`❌ ${varName}: NOT SET`);
    }
});

console.log('\n=== Checking Notion Connection ===\n');

const { Client } = require('@notionhq/client');

// Try with NOTION_TOKEN
if (process.env.NOTION_TOKEN) {
    console.log('Testing with NOTION_TOKEN...');
    const notion = new Client({ auth: process.env.NOTION_TOKEN });

    notion.users.me()
        .then(user => {
            console.log('✅ NOTION_TOKEN is VALID!');
            console.log(`   Connected as: ${user.name || user.bot.owner.user.name}`);
        })
        .catch(error => {
            console.log('❌ NOTION_TOKEN is INVALID!');
            console.log(`   Error: ${error.message}`);
        });
}

// Try with NOTION_API_KEY
if (process.env.NOTION_API_KEY) {
    console.log('\nTesting with NOTION_API_KEY...');
    const notion = new Client({ auth: process.env.NOTION_API_KEY });

    notion.users.me()
        .then(user => {
            console.log('✅ NOTION_API_KEY is VALID!');
            console.log(`   Connected as: ${user.name || user.bot.owner.user.name}`);
        })
        .catch(error => {
            console.log('❌ NOTION_API_KEY is INVALID!');
            console.log(`   Error: ${error.message}`);
        });
}

if (!process.env.NOTION_TOKEN && !process.env.NOTION_API_KEY) {
    console.log('❌ Neither NOTION_TOKEN nor NOTION_API_KEY is set!');
}
