require('dotenv').config();
const { Client } = require('@notionhq/client');

async function test() {
    const token = process.env.NOTION_TOKEN;

    console.log('Token length:', token ? token.length : 0);
    console.log('Token prefix:', token ? token.substring(0, 15) : 'N/A');

    if (!token) {
        console.log('ERROR: No token found!');
        return;
    }

    const notion = new Client({ auth: token });

    try {
        console.log('\nTesting authentication...');
        const user = await notion.users.me();
        console.log('SUCCESS! Token is valid.');
        console.log('Bot workspace:', user.bot?.owner?.workspace || 'Unknown');
    } catch (error) {
        console.log('FAILED! Token is invalid.');
        console.log('Error:', error.message);
        console.log('Error code:', error.code);
    }
}

test();
