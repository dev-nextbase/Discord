# Migration Guide: JSON to Notion Databases

This guide will help you migrate your Discord bot configuration from JSON files to Notion databases.

## Overview

Your bot currently stores configuration data in these JSON files:
- `teamRoles.json` - Maps team names to Discord role IDs
- `roles.json` - Stores admins and team leads
- `channels.json` - Stores team channels, person channels, team log channels, and private channels
- `userTeams.json` - Maps user IDs to their teams

After migration, all this data will be stored in **4 separate Notion databases**.

## Benefits of Using Notion

✅ **Centralized Management** - View and edit all configuration in one place
✅ **Better Organization** - Separate databases for different data types
✅ **Easy Collaboration** - Multiple admins can manage configuration
✅ **Audit Trail** - Track changes and history
✅ **Visual Interface** - No need to edit JSON files manually
✅ **Backup & Recovery** - Notion's built-in backup features

## Step 1: Create Notion Databases

You need to create 4 databases in Notion with specific properties:

### Database 1: Team Roles
**Properties:**
- `Team Name` (Title) - e.g., "ui", "web", "ai"
- `Role ID` (Text) - Discord role ID

### Database 2: User Roles
**Properties:**
- `User ID` (Text) - Discord user ID
- `Role Type` (Select) - Options: "Admin", "Team Lead"
- `Team` (Select) - Team name (only for Team Leads)

### Database 3: Channels
**Properties:**
- `Channel Type` (Select) - Options: "Team Channel", "Person Channel", "Team Log Channel", "Private Channel"
- `Team/User` (Text) - Team name or user ID (leave empty for Private Channels)
- `Channel ID` (Text) - Discord channel ID

### Database 4: User Teams
**Properties:**
- `User ID` (Title) - Discord user ID
- `Team` (Select) - Team name

## Step 2: Get Database IDs

For each database you created:

1. Open the database in Notion
2. Click "Share" → "Copy link"
3. The link will look like: `https://www.notion.so/workspace/DATABASE_ID?v=...`
4. Extract the `DATABASE_ID` (32 characters, alphanumeric)

## Step 3: Update .env File

Add these new environment variables to your `.env` file:

```env
# Existing variables
DISCORD_TOKEN=your_discord_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
NOTION_TOKEN=your_notion_token
NOTION_DATABASE_ID=your_tasks_database_id

# NEW: Add these database IDs
NOTION_TEAM_ROLES_DB_ID=your_team_roles_database_id
NOTION_USER_ROLES_DB_ID=your_user_roles_database_id
NOTION_CHANNELS_DB_ID=your_channels_database_id
NOTION_USER_TEAMS_DB_ID=your_user_teams_database_id
```

## Step 4: Run Migration Script

The migration script will:
1. Backup all your JSON files to `backups/` directory
2. Read data from JSON files
3. Create entries in Notion databases

Run the migration:

```bash
node scripts/migrateToNotion.js
```

## Step 5: Update Service Imports

You need to update your code to use the new Notion-based services instead of JSON-based ones.

### Find and Replace

Search your codebase for these imports and update them:

**Old:**
```javascript
const channelManager = require('./services/channelManager');
const roleManager = require('./services/roleManager');
const teamRoleManager = require('./services/teamRoleManager');
const userTeamManager = require('./services/userTeamManager');
```

**New:**
```javascript
const channelManager = require('./services/channelManagerNotion');
const roleManager = require('./services/roleManagerNotion');
const teamRoleManager = require('./services/teamRoleManagerNotion');
const userTeamManager = require('./services/userTeamManagerNotion');
```

### Important: Async/Await Changes

⚠️ **CRITICAL:** All manager functions are now asynchronous!

You must update all function calls to use `await`:

**Old (JSON-based):**
```javascript
const teamChannel = channelManager.getTeamChannel('ui');
const isAdmin = roleManager.isAdmin(userId);
const userTeam = userTeamManager.getUserTeam(userId);
```

**New (Notion-based):**
```javascript
const teamChannel = await channelManager.getTeamChannel('ui');
const isAdmin = await roleManager.isAdmin(userId);
const userTeam = await userTeamManager.getUserTeam(userId);
```

Make sure the calling functions are also marked as `async`.

## Step 6: Test Your Bot

1. Start your bot: `node index.js`
2. Verify configuration is loaded correctly
3. Test commands that use configuration data
4. Check Notion databases to see data

## Step 7: Verify Data in Notion

Open each Notion database and verify:
- ✅ All team roles are present
- ✅ All admins and team leads are listed
- ✅ All channels are mapped correctly
- ✅ All user teams are assigned

## Rollback (If Needed)

If something goes wrong, you can rollback:

1. Stop your bot
2. Restore JSON files from `backups/` directory
3. Revert code changes to use old managers
4. Restart your bot

Your original JSON files are safely backed up with timestamps.

## Caching

The new Notion-based managers use caching to reduce API calls:
- Cache duration: 5 minutes
- Automatic refresh when cache expires
- Manual refresh available via `refreshCache()` function

## Troubleshooting

### Error: "Missing required environment variables"
- Make sure all 4 new database IDs are in your `.env` file
- Restart your bot after updating `.env`

### Error: "Failed to create/update in Notion"
- Check that database properties match exactly (names and types)
- Verify your Notion integration has access to all databases
- Check Notion API token permissions

### Data not appearing in Notion
- Verify database IDs are correct
- Check that migration script completed successfully
- Look for error messages in console

### Bot crashes with "is not a function"
- Make sure you're using `await` for all manager function calls
- Verify you've updated all imports to use Notion managers

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify all database properties are correct
3. Ensure Notion integration has proper permissions
4. Check that all environment variables are set

## Next Steps

After successful migration:
1. You can delete the old JSON files (keep backups!)
2. Manage configuration directly in Notion
3. Share Notion databases with team admins
4. Set up Notion automations if needed

---

**Note:** The old JSON-based managers are still available as fallback. You can switch back anytime by reverting the imports.
