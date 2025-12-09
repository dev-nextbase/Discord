# Notion Database Structure

This document describes the complete Notion database structure for your Discord bot configuration.

## Overview

Instead of using JSON files, all configuration is now stored in **4 Notion databases**:

1. **Team Roles** - Maps team names to Discord role IDs
2. **User Roles** - Stores admins and team leads
3. **Channels** - Stores all channel mappings
4. **User Teams** - Maps users to their teams

---

## Database 1: 🎭 Team Roles

**Purpose:** Maps team names to their corresponding Discord role IDs

### Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| Team Name | Title | Name of the team | `ui`, `web`, `ai` |
| Role ID | Text | Discord role ID | `1442499198825271486` |

### Sample Data

| Team Name | Role ID |
|-----------|---------|
| ui | 1442499198825271486 |
| web | 1442499198825271483 |
| ai | 1442499198825271481 |
| marketing | 1445366439304233041 |
| seo | 1442499198825271484 |
| QA | 1442499198825271480 |
| app | 1442499198825271482 |

### Usage in Code

```javascript
const teamRoleManager = require('./services/teamRoleManagerNotion');

// Get role ID for a team
const roleId = await teamRoleManager.getTeamRole('ui');

// Assign a role to a team
await teamRoleManager.assignRoleToTeam('ui', '1442499198825271486');

// Get team by role ID
const team = await teamRoleManager.getTeamByRole('1442499198825271486');
```

---

## Database 2: 👥 User Roles

**Purpose:** Stores admin and team lead assignments

### Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| User ID | Text | Discord user ID | `1362738436405989446` |
| Role Type | Select | Type of role | `Admin` or `Team Lead` |
| Team | Select | Team name (for Team Leads only) | `ui`, `web`, `ai` |

### Select Options

**Role Type:**
- Admin (Red)
- Team Lead (Blue)

**Team:**
- ui (Purple)
- web (Blue)
- ai (Green)
- marketing (Orange)
- seo (Yellow)
- QA (Pink)
- app (Gray)

### Sample Data

| User ID | Role Type | Team |
|---------|-----------|------|
| 1362738436405989446 | Admin | - |
| 742297123306995742 | Team Lead | web |
| 1272231636653576306 | Team Lead | ai |
| 695235338565844998 | Team Lead | seo |

### Usage in Code

```javascript
const roleManager = require('./services/roleManagerNotion');

// Check if user is admin
const isAdmin = await roleManager.isAdmin('1362738436405989446');

// Add admin
await roleManager.addAdmin('1362738436405989446');

// Add team lead
await roleManager.addTeamLead('742297123306995742', 'web');

// Check if user is team lead
const isLead = await roleManager.isTeamLead('742297123306995742', 'web');

// Get teams a user leads
const teams = await roleManager.getLedTeams('742297123306995742');
```

---

## Database 3: 📺 Channels

**Purpose:** Stores all channel mappings (team channels, person channels, log channels, private channels)

### Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| Channel Type | Select | Type of channel | `Team Channel`, `Person Channel`, etc. |
| Team/User | Text | Team name or user ID | `UI`, `1362738436405989446` |
| Channel ID | Text | Discord channel ID | `1445358146519302265` |

### Select Options

**Channel Type:**
- Team Channel (Blue)
- Person Channel (Green)
- Team Log Channel (Orange)
- Private Channel (Red)

### Sample Data

| Channel Type | Team/User | Channel ID |
|--------------|-----------|------------|
| Team Channel | UI | 1445358146519302265 |
| Team Channel | WEB | 1445363030048374937 |
| Person Channel | 1362738436405989446 | 1447540596997623878 |
| Person Channel | 742297123306995742 | 1447518928136835183 |
| Team Log Channel | UI | 1445358146519302266 |
| Private Channel | | 1444927140620664842 |

### Usage in Code

```javascript
const channelManager = require('./services/channelManagerNotion');

// Get team channel
const channelId = await channelManager.getTeamChannel('ui');

// Set person channel
await channelManager.setPersonChannel('1362738436405989446', '1447540596997623878');

// Get person channel
const personChannel = await channelManager.getPersonChannel('1362738436405989446');

// Add private channel
await channelManager.addPrivateChannel('1444927140620664842');

// Check if channel is private
const isPrivate = await channelManager.isPrivateChannel('1444927140620664842');

// Set team log channel
await channelManager.setTeamLogChannel('ui', '1445358146519302266');
```

---

## Database 4: 👨‍💼 User Teams

**Purpose:** Maps users to their assigned teams

### Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| User ID | Title | Discord user ID | `1362738436405989446` |
| Team | Select | Team name | `ui`, `web`, `ai` |

### Select Options

**Team:**
- ui (Purple)
- web (Blue)
- ai (Green)
- marketing (Orange)
- seo (Yellow)
- QA (Pink)
- app (Gray)

### Sample Data

| User ID | Team |
|---------|------|
| 1362738436405989446 | ui |
| 1348869769654177822 | ui |
| 742297123306995742 | web |
| 1422839322834370691 | web |
| 1272231636653576306 | ai |
| 1226058394713063465 | marketing |

### Usage in Code

```javascript
const userTeamManager = require('./services/userTeamManagerNotion');

// Get user's team
const team = await userTeamManager.getUserTeam('1362738436405989446');

// Assign user to team
await userTeamManager.assignUserToTeam('1362738436405989446', 'ui');

// Get all users in a team
const users = await userTeamManager.getAllUsersInTeam('ui');

// Remove user from team
await userTeamManager.removeUserTeam('1362738436405989446');
```

---

## Complete Database Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Discord Bot Configuration                │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│  Team Roles  │      │  User Roles  │     │   Channels   │
├──────────────┤      ├──────────────┤     ├──────────────┤
│ Team Name    │      │ User ID      │     │ Channel Type │
│ Role ID      │      │ Role Type    │     │ Team/User    │
└──────────────┘      │ Team         │     │ Channel ID   │
                      └──────────────┘     └──────────────┘
                              │
                              │
                              ▼
                      ┌──────────────┐
                      │  User Teams  │
                      ├──────────────┤
                      │ User ID      │
                      │ Team         │
                      └──────────────┘
```

---

## Benefits of This Structure

✅ **Separation of Concerns** - Each database has a specific purpose
✅ **Easy to Manage** - Visual interface for all configuration
✅ **Scalable** - Easy to add new teams, users, or channels
✅ **Flexible** - Can add custom properties as needed
✅ **Collaborative** - Multiple admins can manage configuration
✅ **Searchable** - Notion's powerful search and filter features
✅ **Exportable** - Can export to CSV, JSON, or other formats

---

## Caching Strategy

All Notion managers implement caching to reduce API calls:

- **Cache Duration:** 5 minutes
- **Auto-refresh:** Cache refreshes automatically when stale
- **Manual Refresh:** Call `refreshCache()` to force refresh

```javascript
// Force cache refresh
await channelManager.refreshCache();
await roleManager.refreshCache();
await teamRoleManager.refreshCache();
await userTeamManager.refreshCache();
```

---

## Migration from JSON

Your existing JSON data structure:

```json
// teamRoles.json
{
  "teamRoles": {
    "ui": "1442499198825271486",
    "web": "1442499198825271483"
  }
}

// roles.json
{
  "admins": ["1362738436405989446"],
  "teamLeads": {
    "ui": ["1362738436405989446"],
    "web": ["742297123306995742"]
  }
}

// channels.json
{
  "teamChannels": {
    "UI": "1445358146519302265"
  },
  "personChannels": {
    "1362738436405989446": "1447540596997623878"
  },
  "teamLogChannels": {},
  "privateChannels": ["1444927140620664842"]
}

// userTeams.json
{
  "userTeams": {
    "1362738436405989446": "ui",
    "742297123306995742": "web"
  }
}
```

All of this data will be migrated to the 4 Notion databases automatically using the migration script.

---

## Quick Start

1. **Setup Databases:**
   ```bash
   node scripts/setupNotionDatabases.js
   ```

2. **Add Database IDs to .env:**
   ```env
   NOTION_TEAM_ROLES_DB_ID=...
   NOTION_USER_ROLES_DB_ID=...
   NOTION_CHANNELS_DB_ID=...
   NOTION_USER_TEAMS_DB_ID=...
   ```

3. **Migrate Data:**
   ```bash
   node scripts/migrateToNotion.js
   ```

4. **Update Code:**
   Replace manager imports with Notion versions and add `await` to all calls.

5. **Start Bot:**
   ```bash
   node index.js
   ```

---

For detailed migration instructions, see [NOTION_MIGRATION_GUIDE.md](./NOTION_MIGRATION_GUIDE.md)
