require('dotenv').config();

const token = process.env.NOTION_TOKEN;

console.log('=== Token Analysis ===\n');
console.log('Token exists:', !!token);
console.log('Token length:', token ? token.length : 0);
console.log('Token starts with "secret_":', token ? token.startsWith('secret_') : false);
console.log('Token starts with "ntn_":', token ? token.startsWith('ntn_') : false);
console.log('First 20 chars:', token ? token.substring(0, 20) : 'N/A');
console.log('Last 10 chars:', token ? token.substring(token.length - 10) : 'N/A');

// Check for whitespace issues
if (token) {
    const trimmed = token.trim();
    if (trimmed !== token) {
        console.log('\n⚠️  WARNING: Token has leading/trailing whitespace!');
        console.log('Original length:', token.length);
        console.log('Trimmed length:', trimmed.length);
    }

    // Check for newlines or other weird characters
    if (token.includes('\n') || token.includes('\r') || token.includes('\t')) {
        console.log('\n⚠️  WARNING: Token contains newline or tab characters!');
    }

    // Check if it looks like a valid Notion token
    const validPrefixes = ['secret_', 'ntn_'];
    const hasValidPrefix = validPrefixes.some(prefix => token.startsWith(prefix));

    if (!hasValidPrefix) {
        console.log('\n❌ Token does not start with "secret_" or "ntn_"');
        console.log('   This is likely not a valid Notion integration token.');
    }
}

console.log('\n=== What to do ===');
console.log('1. Go to: https://www.notion.so/my-integrations');
console.log('2. Find your Discord bot integration');
console.log('3. Copy the "Internal Integration Token"');
console.log('4. It should start with "secret_" and be around 50+ characters');
console.log('5. Replace the NOTION_TOKEN value in your .env file');
console.log('6. Make sure there are NO spaces before or after the token');
