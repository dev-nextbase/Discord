# Notion Migration Summary

## What I've Created for You

I've set up a complete system to migrate your Discord bot configuration from JSON files to Notion databases. Here's everything that's been created:

---

## 🗄️ New Notion Database Structure

Instead of 4 separate JSON files, you'll now have **4 Notion databases**:

### 1. Team Roles Database
- **Purpose:** Maps team names to Discord role IDs
- **Properties:** Team Name (Title), Role ID (Text)
- **Replaces:** `teamRoles.json`

### 2. User Roles Database
- **Purpose:** Stores admins and team leads
- **Properties:** User ID (Text), Role Type (Select: Admin/Team Lead), Team (Select)
- **Replaces:** `roles.json`

### 3. Channels Database
- **Purpose:** Stores all channel mappings
- **Properties:** Channel Type (Select), Team/User (Text), Channel ID (Text)
- **Types:** Team Channel, Person Channel, Team Log Channel, Private Channel
- **Replaces:** `channels.json`

### 4. User Teams Database
- **Purpose:** Maps users to their teams
- **Properties:** User ID (Title), Team (Select)
- **Replaces:** `userTeams.json`

---

## 📁 Files Created

### Core Services
1. **`services/notionConfigService.js`** (NEW)
   - Core Notion API functions for all 4 databases
   - Functions to get/set team roles, user roles, channels, and user teams
   - Handles all Notion database operations

2. **`services/channelManagerNotion.js`** (NEW)
   - Notion-based channel manager
   - Replaces `channelManager.js`
   - Includes 5-minute caching to reduce API calls

3. **`services/roleManagerNotion.js`** (NEW)
   - Notion-based role manager (admins & team leads)
   - Replaces `roleManager.js`
   - Includes caching

4. **`services/teamRoleManagerNotion.js`** (NEW)
   - Notion-based team role manager
   - Replaces `teamRoleManager.js`
   - Includes caching

5. **`services/userTeamManagerNotion.js`** (NEW)
   - Notion-based user team manager
   - Replaces `userTeamManager.js`
   - Includes caching

### Migration & Setup Scripts
6. **`scripts/setupNotionDatabases.js`** (NEW)
   - Interactive script to create all 4 Notion databases
   - Automatically sets up correct properties
   - Outputs database IDs for .env file

7. **`scripts/migrateToNotion.js`** (NEW)
   - Migrates all data from JSON files to Notion
   - Automatically backs up JSON files before migration
   - Handles all 4 databases

### Documentation
8. **`docs/NOTION_MIGRATION_GUIDE.md`** (NEW)
   - Complete step-by-step migration guide
   - Troubleshooting section
   - Rollback instructions

9. **`docs/NOTION_DATABASE_STRUCTURE.md`** (NEW)
   - Detailed database schemas
   - Code usage examples
   - Sample data
   - Relationship diagrams

10. **`docs/NOTION_QUICK_START.md`** (NEW)
    - Quick reference guide
    - 3-step setup process
    - Essential code changes

### Updated Files
11. **`config/config.js`** (UPDATED)
    - Added 4 new Notion database ID configurations
    - Updated validation to check for new environment variables

---

## 🚀 How to Use

### Step 1: Create Notion Databases
```bash
node scripts/setupNotionDatabases.js
```
- Enter your Notion parent page ID when prompted
- Script will create all 4 databases
- Copy the database IDs it outputs

### Step 2: Update .env File
Add these new lines to your `.env`:
```env
NOTION_TEAM_ROLES_DB_ID=<from_step_1>
NOTION_USER_ROLES_DB_ID=<from_step_1>
NOTION_CHANNELS_DB_ID=<from_step_1>
NOTION_USER_TEAMS_DB_ID=<from_step_1>
```

### Step 3: Migrate Your Data
```bash
node scripts/migrateToNotion.js
```
- Backs up all JSON files to `backups/` directory
- Migrates all data to Notion databases
- Preserves all existing configuration

### Step 4: Update Your Code

**Find all files that import the old managers:**
```javascript
// OLD
const channelManager = require('./services/channelManager');
const roleManager = require('./services/roleManager');
const teamRoleManager = require('./services/teamRoleManager');
const userTeamManager = require('./services/userTeamManager');
```

**Replace with:**
```javascript
// NEW
const channelManager = require('./services/channelManagerNotion');
const roleManager = require('./services/roleManagerNotion');
const teamRoleManager = require('./services/teamRoleManagerNotion');
const userTeamManager = require('./services/userTeamManagerNotion');
```

**⚠️ CRITICAL: Add `await` to all manager function calls!**

All functions are now async, so you must use `await`:

```javascript
// OLD (synchronous)
const channel = channelManager.getTeamChannel('ui');
const isAdmin = roleManager.isAdmin(userId);

// NEW (asynchronous)
const channel = await channelManager.getTeamChannel('ui');
const isAdmin = await roleManager.isAdmin(userId);
```

### Step 5: Test Your Bot
```bash
node index.js
```

---

## ✨ Key Features

### Caching System
- **5-minute cache** for all data
- Reduces Notion API calls
- Auto-refreshes when stale
- Manual refresh available: `await manager.refreshCache()`

### Backup & Safety
- Migration script backs up all JSON files
- Backups stored in `backups/` with timestamps
- Easy rollback if needed
- Original files preserved

### Notion Benefits
- ✅ Visual interface for configuration
- ✅ Real-time collaboration
- ✅ Better organization with separate databases
- ✅ Searchable and filterable
- ✅ Built-in version history
- ✅ Export capabilities

---

## 📊 Data Migration Example

Your current JSON data:

**teamRoles.json:**
```json
{
  "teamRoles": {
    "ui": "1442499198825271486",
    "web": "1442499198825271483"
  }
}
```

Will become a Notion database:

| Team Name | Role ID |
|-----------|---------|
| ui | 1442499198825271486 |
| web | 1442499198825271483 |

Same for all other JSON files → Notion databases!

---

## 🔄 Rollback Process

If you need to go back to JSON:

1. Stop your bot
2. Copy JSON files from `backups/` back to `services/`
3. Revert code changes (use old manager imports)
4. Remove `await` from function calls
5. Restart bot

Your backups are safe in the `backups/` directory!

---

## 📚 Documentation Reference

- **Quick Start:** `docs/NOTION_QUICK_START.md`
- **Full Migration Guide:** `docs/NOTION_MIGRATION_GUIDE.md`
- **Database Reference:** `docs/NOTION_DATABASE_STRUCTURE.md`

---

## 🎯 Next Steps

1. **Read** `docs/NOTION_QUICK_START.md`
2. **Run** `node scripts/setupNotionDatabases.js`
3. **Update** your `.env` file
4. **Migrate** with `node scripts/migrateToNotion.js`
5. **Update** your code imports and add `await`
6. **Test** your bot

---

## ⚠️ Important Notes

1. **All functions are now async** - You MUST use `await`
2. **Update all imports** - Use the new Notion managers
3. **Environment variables** - Add 4 new database IDs to .env
4. **Notion integration** - Must have access to all databases
5. **Backups** - Always created before migration

---

## 🆘 Support

If you encounter issues:

1. Check console for error messages
2. Verify database IDs in .env
3. Ensure Notion integration has access
4. Review the migration guide
5. Check that all functions use `await`

---

**You're all set!** 🚀

Start with `node scripts/setupNotionDatabases.js` and follow the prompts!
