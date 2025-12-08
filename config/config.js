require('dotenv').config();

const config = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
  },
  notion: {
    token: process.env.NOTION_TOKEN,
    databaseId: process.env.NOTION_DATABASE_ID,
  },
  channels: {
    // Get team channel from JSON
    getTeamChannel: (teamName) => {
      const channelManager = require('../services/channelManager');
      return channelManager.getTeamChannel(teamName);
    },
    // Get person channel from JSON
    getPersonChannel: (userId) => {
      const channelManager = require('../services/channelManager');
      return channelManager.getPersonChannel(userId);
    },
    // Set person channel
    setPersonChannel: (userId, channelId) => {
      const channelManager = require('../services/channelManager');
      return channelManager.setPersonChannel(userId, channelId);
    },
    // List all person channels
    listPersonChannels: () => {
      const channelManager = require('../services/channelManager');
      return channelManager.listPersonChannels();
    },
  },
};

// Validate required configuration
function validateConfig() {
  const required = [
    'DISCORD_TOKEN',
    'CLIENT_ID',
    'GUILD_ID',
    'NOTION_TOKEN',
    'NOTION_DATABASE_ID',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file');
    return false;
  }

  return true;
}

module.exports = { config, validateConfig };
