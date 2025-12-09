# Using Your Existing Notion Database

## 🎯 Quick Setup

Since you already have a Notion database, you just need to:

1. **Add properties to your existing database**
2. **Add the database ID to .env**
3. **Migrate your JSON data**

---

## Step 1: Update Your Database

Run this script to add the necessary properties to your existing database:

```bash
node scripts/updateExistingDatabase.js
```

When prompted, enter your **database ID** (the 32-character ID from your database URL).

### How to Get Your Database ID

1. Open your Notion database
2. Click the "..." menu → "Copy link"
3. The URL looks like: `https://notion.so/workspace/DATABASE_ID?v=...`
4. Copy the 32-character `DATABASE_ID` (before the `?v=`)

Example: `2c45757ae60980a8b438cecb11f2dd9c`

---

## Step 2: Add to .env

Add this line to your `.env` file:

```env
NOTION_CONFIG_DB_ID=your_database_id_here
```

Replace `your_database_id_here` with your actual database ID.

---

## Step 3: Migrate Your Data

Run the migration script to move all JSON data to Notion:

```bash
node scripts/migrateToNotion.js
```

This will:
- ✅ Backup all your JSON files
- ✅ Add all configuration to your Notion database
- ✅ Preserve any existing data in the database

---

## 📊 What Gets Added to Your Database

The script adds these **4 new properties** to your database:

| Property | Type | Purpose |
|----------|------|---------|
| **Type** | Select | Configuration type (Team Role, Admin, etc.) |
| **Key** | Text | Identifier (team name, user ID, etc.) |
| **Value** | Text | The actual value (role ID, channel ID, etc.) |
| **Team** | Select | Team name (when applicable) |

### Type Options

The **Type** field will have these 8 options:

1. Team Role
2. Admin
3. Team Lead
4. Team Channel
5. Person Channel
6. Team Log Channel
7. Private Channel
8. User Team

---

## 🔒 Your Existing Data is Safe

**Important:** The script only **adds** properties to your database. It does NOT:
- ❌ Delete any existing properties
- ❌ Modify any existing data
- ❌ Remove any existing records

Your current database content (like tasks) will remain untouched!

---

## 💡 Organizing Your Database

After migration, you'll have two types of data in one database:

1. **Your existing data** (e.g., tasks)
2. **New configuration data** (team roles, channels, etc.)

### Recommended: Create Views

In Notion, create separate views to organize the data:

**View 1: Tasks** (your existing data)
- Filter: Type is empty OR Type = "Task" (if you have a Type field)
- This shows your original data

**View 2: Configuration**
- Filter: Type is one of [Team Role, Admin, Team Lead, etc.]
- This shows all bot configuration

**View 3: Team Roles**
- Filter: Type = "Team Role"
- Shows only team role mappings

**View 4: Channels**
- Filter: Type contains "Channel"
- Shows all channel configurations

---

## 🚀 Complete Setup Example

```bash
# 1. Update your existing database
node scripts/updateExistingDatabase.js
# Enter: 2c45757ae60980a8b438cecb11f2dd9c

# 2. Edit .env file
# Add: NOTION_CONFIG_DB_ID=2c45757ae60980a8b438cecb11f2dd9c

# 3. Migrate data
node scripts/migrateToNotion.js

# 4. Start your bot
node index.js
```

---

## ✅ Verification

After migration, check your Notion database:

1. Open the database in Notion
2. You should see new records with Type = "Team Role", "Admin", etc.
3. Your existing records (tasks) should still be there
4. Filter by Type to see different data types

---

## 🆘 Troubleshooting

### Error: "Could not find database"
- Make sure the database is **shared with your integration**
- In Notion, click "..." → "Connections" → Add your integration

### Error: "Insufficient permissions"
- Your integration needs **Edit** access to the database
- Share the database with your integration and grant edit permissions

### Properties not showing up
- Refresh the Notion page
- Check that the script completed without errors
- Verify the database ID is correct

---

## 📝 Next Steps

After successful setup:

1. ✅ Update your code imports to use Notion managers
2. ✅ Add `await` to all manager function calls
3. ✅ Test your bot
4. ✅ Create filtered views in Notion for easy access

---

**Ready?** Run `node scripts/updateExistingDatabase.js` now! 🚀
