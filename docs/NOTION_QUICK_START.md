# Notion Configuration Migration - Quick Reference

## 📋 What's New?

Your Discord bot configuration is now stored in **ONE Notion database** instead of JSON files!

All configuration types are in a single database, organized by a **"Type"** field:

| Type | Purpose | Replaces |
|------|---------|----------|
| Team Role | Team → Role ID mappings | `teamRoles.json` |
| Admin | Admin users | `roles.json` |
| Team Lead | Team lead users | `roles.json` |
| Team Channel | Team channels | `channels.json` |
| Person Channel | Personal channels | `channels.json` |
| Team Log Channel | Log channels | `channels.json` |
| Private Channel | Private channels | `channels.json` |
| User Team | User → Team assignments | `userTeams.json` |

## 🚀 Quick Setup (3 Steps)

### Step 1: Create Database
```bash
node scripts/setupNotionDatabases.js
```
This creates **ONE** combined database for all configuration.

### Step 2: Update .env
Add just **ONE** database ID to your `.env` file:
```env
NOTION_CONFIG_DB_ID=your_database_id_here
```

### Step 3: Migrate Data
```bash
node scripts/migrateToNotion.js
```
This backs up your JSON files and migrates everything to Notion.

## 📊 Database Structure

The single database has these properties:

| Property | Type | Description |
|----------|------|-------------|
| **Key** | Title | Team name, User ID, or Channel identifier |
| **Type** | Select | Type of configuration (see table above) |
| **Value** | Text | Role ID, Channel ID, or User ID |
| **Team** | Select | Team name (for Team Leads and User Teams) |

### Example Records

| Key | Type | Value | Team |
|-----|------|-------|------|
| ui | Team Role | 1442499198825271486 | - |
| 1362738436405989446 | Admin | 1362738436405989446 | - |
| 742297123306995742 | Team Lead | 742297123306995742 | web |
| UI | Team Channel | 1445358146519302265 | - |
| 1362738436405989446 | Person Channel | 1447540596997623878 | - |
| 1362738436405989446 | User Team | 1362738436405989446 | ui |

## 📝 Code Changes Required

### Update Imports

**Before:**
```javascript
const channelManager = require('./services/channelManager');
const roleManager = require('./services/roleManager');
const teamRoleManager = require('./services/teamRoleManager');
const userTeamManager = require('./services/userTeamManager');
```

**After:**
```javascript
const channelManager = require('./services/channelManagerNotion');
const roleManager = require('./services/roleManagerNotion');
const teamRoleManager = require('./services/teamRoleManagerNotion');
const userTeamManager = require('./services/userTeamManagerNotion');
```

### Add `await` to All Calls

⚠️ **IMPORTANT:** All functions are now async!

**Before:**
```javascript
const channel = channelManager.getTeamChannel('ui');
const isAdmin = roleManager.isAdmin(userId);
```

**After:**
```javascript
const channel = await channelManager.getTeamChannel('ui');
const isAdmin = await roleManager.isAdmin(userId);
```

## 🔄 Rollback

If you need to rollback:
1. Stop your bot
2. Restore JSON files from `backups/` directory
3. Revert code changes
4. Restart bot

## ✅ Benefits

- ✨ **Single Database** - All config in one place
- 🔍 **Easy Filtering** - Filter by "Type" to see specific data
- 📊 **Better Organization** - Visual interface in Notion
- 👥 **Collaboration** - Multiple admins can manage config
- 💾 **Automatic Backups** - Notion handles backups
- 🔄 **Real-time Sync** - Changes reflect immediately (with 5-min cache)

## 💡 Notion Tips

### View Specific Data Types
In Notion, create filtered views:
- **Team Roles View:** Filter where Type = "Team Role"
- **Admins View:** Filter where Type = "Admin"
- **Channels View:** Filter where Type contains "Channel"

### Organize by Team
Create a view grouped by "Team" to see all team-related config together.

## 🆘 Need Help?

Check the full documentation:
- [NOTION_MIGRATION_GUIDE.md](./NOTION_MIGRATION_GUIDE.md)
- [NOTION_DATABASE_STRUCTURE.md](./NOTION_DATABASE_STRUCTURE.md)

## 📦 Files Created

### Services (Notion-based)
- `services/notionConfigService.js` - Core Notion API functions
- `services/channelManagerNotion.js` - Channel management
- `services/roleManagerNotion.js` - Role management
- `services/teamRoleManagerNotion.js` - Team role management
- `services/userTeamManagerNotion.js` - User team management

### Scripts
- `scripts/setupNotionDatabases.js` - Auto-create database
- `scripts/migrateToNotion.js` - Migrate JSON → Notion

### Documentation
- `docs/NOTION_MIGRATION_GUIDE.md` - Migration guide
- `docs/NOTION_DATABASE_STRUCTURE.md` - Database reference
- `docs/NOTION_QUICK_START.md` - This file

---

**Ready to migrate?** Run `node scripts/setupNotionDatabases.js` to get started! 🚀

**Simpler than before:** Just ONE database instead of 4! 🎉
