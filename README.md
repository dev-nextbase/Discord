# Discord Task Management Bot with Notion Integration

A powerful Discord bot that seamlessly integrates with Notion for comprehensive task management. Create tasks via slash commands, manage status with interactive buttons, and automatically route notifications across multiple channels.

## Features

- ✅ **Slash Command Task Creation** - `/create` command with rich options
- 📎 **Attachment Support** - Upload files (stored locally, not in Notion)
- 🔔 **Multi-Channel Routing** - Automatic messages to team channels, DMs, and personal channels
- 🔘 **Interactive Buttons** - Real-time status updates (On Hold, Working, Done)
- ⏱️ **Timestamp Tracking** - Automatic tracking of start and completion times
- 📊 **Notion Sync** - All task data synchronized with Notion database
- 🎯 **Priority Management** - Low, Medium, High priority levels
- 👥 **Team Organization** - Route tasks by team assignments

## Prerequisites

- Node.js (v16.9.0 or higher)
- A Discord account and server
- A Notion account with integration access
- Basic knowledge of Discord bot setup

## Installation

### 1. Clone or Download the Project

```powershell
cd "c:\Script\discord bot"
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Set Up Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to the **Bot** section
4. Click **Add Bot**
5. Enable the following **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent
6. Copy your **Bot Token**
7. Go to **OAuth2 > URL Generator**
8. Select scopes: `bot`, `applications.commands`
9. Select permissions: `Send Messages`, `Read Messages`, `Use Slash Commands`, `Manage Messages`
10. Use the generated URL to invite the bot to your server

### 4. Set Up Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **New Integration**
3. Give it a name (e.g., "Discord Task Bot")
4. Copy the **Internal Integration Token**
5. Create a new database in Notion with these properties:
   - **Task** (Title)
   - **Assigned By** (Text)
   - **Assigned To** (Text)
   - **Team** (Select)
   - **Priority** (Select: Low, Medium, High)
   - **Status** (Select: On Hold, Working, Done)
   - **Started Working On** (Date)
   - **Done Working On** (Date)
6. Share your database with your integration
7. Copy the **Database ID** from the database URL:
   - URL format: `https://notion.so/workspace/{database_id}?v=...`

### 5. Configure Environment Variables

Edit the `.env` file with your credentials:

```env
# Discord Configuration (Already filled)
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=1417368821400076328
GUILD_ID=1442450705985048669

# Notion Configuration
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id

# Channel Mappings
TEAM_CHANNEL_DEVELOPMENT=123456789
TEAM_CHANNEL_DESIGN=987654321
TEAM_CHANNEL_MARKETING=555666777

# Person Channels (User ID = Channel ID)
PERSON_CHANNEL_111222333=444555666
PERSON_CHANNEL_777888999=000111222
```

**How to get Channel IDs:**
1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click any channel and select "Copy ID"

### 6. Deploy Slash Commands

```powershell
npm run deploy-commands
```

### 7. Start the Bot

```powershell
npm start
```

You should see:
```
✅ SUCCESS: Bot is online as YourBot#1234!
```

## Usage

### Creating a Task

Use the `/create` command in any channel:

```
/create
  task: Implement user authentication
  assigned_by: @Manager
  assigned_to: @Developer
  team: Development
  priority: High
  attachment1: [optional file]
```

**What happens:**
1. Task is created in Notion
2. Attachments are saved locally (if any)
3. Message sent to the Development team channel
4. DM sent to @Developer
5. Message sent to @Developer's personal channel

### Managing Task Status

Each task message includes three interactive buttons:

- **⏸️ On Hold** - Pause the task
- **⚙️ Working** - Start working (records start time)
- **✅ Done** - Complete task (records completion time, notifies assigner)

Click any button to instantly update the status in both Discord and Notion!

## Project Structure

```
discord bot/
├── bot.js                      # Main bot entry point
├── package.json                # Dependencies
├── .env                        # Environment variables
├── commands/
│   ├── create.js              # /create slash command
│   └── deploy-commands.js     # Command registration script
├── config/
│   └── config.js              # Configuration loader
├── services/
│   ├── notionService.js       # Notion API integration
│   └── messageRouter.js       # Multi-channel message routing
├── handlers/
│   └── buttonHandler.js       # Button interaction handler
├── components/
│   └── taskButtons.js         # Interactive button components
├── utils/
│   ├── logger.js              # Logging utility
│   └── attachmentHandler.js   # File download/storage
└── attachments/               # Local attachment storage
```

## Dynamic Configuration

### Team & Role Management
- `?team add TeamName @Role` - Link a Notion team to a Discord role (for permissions)
- `?team list` - View all team-role mappings
- `?team remove TeamName` - Remove a mapping
- `?team clear` - Clear all mappings

### Channel Routing
- `?assign @User TeamName` - Assign a user to a team for channel routing (legacy)
- `?user add USER_ID CHANNEL_ID` - Set a user's personal channel
- `?user list` - View personal channel mappings

### Configuration Guide

### Channel not found errors
- Verify channel IDs in `.env` are correct
- Ensure bot has access to those channels
- Check that team/user names match your mappings

### DM fails
- User may have DMs disabled
- Bot will log a warning but continue with other notifications

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit `.env` to version control
- Keep your `DISCORD_TOKEN` and `NOTION_TOKEN` secret
- Regularly rotate tokens if compromised

## Support

For issues or questions:
1. Check bot logs for detailed error messages
2. Verify all configuration in `.env`
3. Ensure Discord and Notion permissions are correct

## License

ISC
