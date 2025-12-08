# Setup Guide - Discord Task Bot with Notion

This guide will walk you through setting up the Discord bot and Notion integration step-by-step.

## Part 1: Discord Bot Setup

### Step 1: Create Discord Application

1. Visit [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Enter a name (e.g., "Task Management Bot")
4. Click **"Create"**

### Step 2: Configure Bot

1. In your application, click **"Bot"** in the left sidebar
2. Click **"Add Bot"** → **"Yes, do it!"**
3. Under **Token**, click **"Reset Token"** and copy it
   - ⚠️ Save this token securely - you'll need it for `.env`
4. Scroll down to **Privileged Gateway Intents**
5. Enable:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
6. Click **"Save Changes"**

### Step 3: Get Application IDs

1. Go to **"General Information"** in the left sidebar
2. Copy **Application ID** (this is your CLIENT_ID)
   - Already have: `1417368821400076328`

### Step 4: Invite Bot to Server

1. Go to **"OAuth2"** → **"URL Generator"**
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select bot permissions:
   - ✅ Send Messages
   - ✅ Send Messages in Threads
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ Use Slash Commands
   - ✅ Manage Messages
4. Copy the generated URL at the bottom
5. Open the URL in browser and select your server
6. Click **"Authorize"**

### Step 5: Get Server ID

1. Open Discord desktop/web app
2. Go to **User Settings** → **Advanced**
3. Enable **"Developer Mode"**
4. Right-click your server icon → **"Copy ID"**
   - Already have: `1442450705985048669`

---

## Part 2: Notion Setup

### Step 1: Create Notion Integration

1. Visit [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Fill in details:
   - Name: `Discord Task Bot`
   - Associated workspace: Select your workspace
   - Type: Internal
4. Click **"Submit"**
5. Copy the **Internal Integration Token**
   - ⚠️ Save this - you'll need it for `.env`

### Step 2: Create Task Database

1. Open Notion and create a new page
2. Type `/database` and select **"Table - Inline"**
3. Name it: **"Discord Tasks"**
4. Add these properties (click **"+"** to add properties):

   | Property Name | Type | Options (if applicable) |
   |--------------|------|------------------------|
   | Task | Title | - |
   | Assigned By | Text | - |
   | Assigned To | Text | - |
   | Team | Select | Add your teams (e.g., Development, Design, Marketing) |
   | Priority | Select | Add: Low, Medium, High |
   | Status | Select | Add: On Hold, Working, Done |
   | Started Working On | Date | - |
   | Done Working On | Date | - |

### Step 3: Share Database with Integration

1. Click the **"..."** menu in the top-right of your database
2. Select **"Add connections"**
3. Search for **"Discord Task Bot"** (or your integration name)
4. Click to connect

### Step 4: Get Database ID

1. Click **"Share"** on your database page
2. Click **"Copy link"**
3. The URL looks like:
   ```
   https://www.notion.so/workspace/<DATABASE_ID>?v=...
   ```
4. Copy the `<DATABASE_ID>` portion (32 characters, letters and numbers)
   - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

---

## Part 3: Channel Configuration

### Step 1: Create Team Channels

For each team, create or identify a channel where team tasks should be posted.

Example:
- `#dev-tasks` for Development team
- `#design-tasks` for Design team
- `#marketing-tasks` for Marketing team

### Step 2: Create Personal Channels (Optional)

For each team member, create a personal channel:
- `#dev-john` for John's personal tasks
- `#dev-sarah` for Sarah's personal tasks

### Step 3: Get Channel IDs

1. Right-click each channel
2. Click **"Copy ID"**
3. Note the channel ID and what it's for

### Step 4: Get User IDs

1. Right-click a user's avatar in Discord
2. Click **"Copy ID"**
3. Note the user ID and their name

---

## Part 4: Configure Environment Variables

Edit `.env` file:

```env
# Discord Configuration
DISCORD_TOKEN=<paste your bot token>
CLIENT_ID=1417368821400076328
GUILD_ID=1442450705985048669

# Notion Configuration
NOTION_TOKEN=<paste your notion integration token>
NOTION_DATABASE_ID=<paste your database ID>

# Team Channels (TEAM_CHANNEL_TEAMNAME=CHANNEL_ID)
TEAM_CHANNEL_DEVELOPMENT=<development channel ID>
TEAM_CHANNEL_DESIGN=<design channel ID>
TEAM_CHANNEL_MARKETING=<marketing channel ID>

# Person Channels (PERSON_CHANNEL_USERID=CHANNEL_ID)
PERSON_CHANNEL_<user1_id>=<user1_channel_id>
PERSON_CHANNEL_<user2_id>=<user2_channel_id>
```

**Important Notes:**
- Team names in env vars should be UPPERCASE
- Remove spaces from team names and replace with underscores
- Example: "Product Development" → `TEAM_CHANNEL_PRODUCT_DEVELOPMENT`

---

## Part 5: Install and Run

### Step 1: Install Dependencies

```powershell
cd "c:\Script\discord bot"
npm install
```

### Step 2: Deploy Slash Commands

```powershell
npm run deploy-commands
```

Expected output:
```
✅ Loaded command: create
🚀 Started refreshing 1 application (/) commands.
✅ Successfully reloaded 1 application (/) commands.
```

### Step 3: Start the Bot

```powershell
npm start
```

Expected output:
```
[timestamp] ℹ️  INFO: Loaded command: create
[timestamp] ✅ SUCCESS: Bot is online as TaskBot#1234!
[timestamp] ✅ SUCCESS: Successfully logged in to Discord
```

---

## Part 6: Testing

### Test 1: Create a Task

1. In Discord, type `/create`
2. Fill in all fields:
   - task: "Test task setup"
   - assigned_by: @YourUsername
   - assigned_to: @SomeUser
   - team: "Development" (must match your Select option in Notion)
   - priority: High
3. Press Enter

**Expected Results:**
- ✅ Confirmation message from bot
- ✅ Task appears in Notion database
- ✅ Message in team channel with buttons
- ✅ DM sent to assigned user
- ✅ Message in personal channel (if configured)

### Test 2: Button Interactions

1. Find a task message
2. Click **"Working"** button

**Expected Results:**
- ✅ Button updates to show current status
- ✅ Status in Notion changes to "Working"
- ✅ "Started Working On" timestamp recorded
- ✅ Confirmation message from bot

3. Click **"Done"** button

**Expected Results:**
- ✅ Status changes to "Done"
- ✅ "Done Working On" timestamp recorded
- ✅ Notification about task completion

---

## Troubleshooting

### "Missing required environment variables"
- Check `.env` file exists and has all required values
- Ensure no extra spaces around `=` signs
- Verify tokens are copied completely

### "Unknown interaction"
- Run `npm run deploy-commands` again
- Wait a few minutes for Discord to sync
- Try in a private/incognito window

### "DiscordAPIError: Missing Access"
- Verify bot permissions in Discord
- Re-invite bot with correct OAuth2 URL
- Check bot role in server settings

### "Notion API Error"
- Verify database is shared with integration
- Check all property names match exactly (case-sensitive)
- Ensure token has access to workspace

### Channel errors
- Verify channel IDs are correct (18-19 digits)
- Check bot can see and send to channels
- Review channel permissions

---

## Next Steps

After successful setup:
1. Add more team and person channel mappings
2. Customize button text/emojis in `components/taskButtons.js`
3. Add more Notion properties as needed
4. Configure additional slash commands

Enjoy your new task management bot! 🎉
