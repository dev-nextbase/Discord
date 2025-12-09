/**
 * CLONE DATABASE SCHEMA SCRIPT
 * 
 * 1. Reads schema from OLD Database
 * 2. Applies schema to NEW Database
 * 
 * OLD DB: 2b50f280d6d5804fb172e8b5dca3f105
 * NEW DB: 2c45757ae609807889e9f75f302e4f78
 */

const { Client } = require('@notionhq/client');

// Configuration
const SOURCE = {
    auth: 'ntn_K40685298778l12Mp97MiTFJJe1yVAWwhMg3i3O0LCMfTH', // User provided key
    databaseId: '2b50f280d6d5804fb172e8b5dca3f105'
};

const TARGET = {
    auth: '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',
    databaseId: '2c45757ae609807889e9f75f302e4f78'
};

const sourceClient = new Client({ auth: SOURCE.auth });
const targetClient = new Client({ auth: TARGET.auth });

async function cloneSchema() {
    console.log('🧬 Cloning Database Schema...');
    console.log(`From: ${SOURCE.databaseId}`);
    console.log(`To:   ${TARGET.databaseId}\n`);

    try {
        // 1. Get Source Schema
        console.log('📥 Reading schema from Old DB...');
        const sourceDb = await sourceClient.databases.retrieve({ database_id: SOURCE.databaseId });
        const sourceProps = sourceDb.properties;

        // 2. Get Target Schema
        console.log('📥 Reading schema from New DB...');
        const targetDb = await targetClient.databases.retrieve({ database_id: TARGET.databaseId });
        const targetProps = targetDb.properties;

        // 3. Prepare Update Object
        const propertiesToUpdate = {};

        let titlePropNameSource = '';

        // Find title property name in source
        for (const [name, prop] of Object.entries(sourceProps)) {
            if (prop.type === 'title') {
                titlePropNameSource = name;
                break;
            }
        }

        let titlePropNameTarget = '';
        // Find title property name in target
        for (const [name, prop] of Object.entries(targetProps)) {
            if (prop.type === 'title') {
                titlePropNameTarget = name;
                break;
            }
        }

        console.log(`Title Property: "${titlePropNameSource}" (Source) vs "${titlePropNameTarget}" (Target)`);

        // If title names match, good. If not, we rename target's title property
        if (titlePropNameSource !== titlePropNameTarget) {
            propertiesToUpdate[titlePropNameTarget] = { name: titlePropNameSource };
            console.log(`   👉 Will rename "${titlePropNameTarget}" to "${titlePropNameSource}"`);
        }

        // Loop through source properties and add them to target
        for (const [name, prop] of Object.entries(sourceProps)) {
            if (prop.type === 'title') continue; // Skip title, handled above

            if (targetProps[name]) {
                console.log(`   ⚠️  Property "${name}" already exists in target. Skipping.`);
                continue;
            }

            console.log(`   ➕ Adding property: "${name}" (${prop.type})`);

            // Construct property config based on type
            // Note: We can't copy "formulas" or "relations" easily without more logic, 
            // but for basic types (text, select, status, url) it works.

            if (prop.type === 'select') {
                propertiesToUpdate[name] = {
                    select: {
                        options: prop.select.options.map(o => ({ name: o.name, color: o.color }))
                    }
                };
            } else if (prop.type === 'multi_select') {
                propertiesToUpdate[name] = {
                    multi_select: {
                        options: prop.multi_select.options.map(o => ({ name: o.name, color: o.color }))
                    }
                };
            } else if (prop.type === 'status') {
                // Status creation is tricky via API, try simplest form
                propertiesToUpdate[name] = { status: {} };
            } else if (prop.type === 'rich_text') {
                propertiesToUpdate[name] = { rich_text: {} };
            } else if (prop.type === 'number') {
                propertiesToUpdate[name] = { number: { format: prop.number.format } };
            } else if (prop.type === 'url') {
                propertiesToUpdate[name] = { url: {} };
            } else if (prop.type === 'date') {
                propertiesToUpdate[name] = { date: {} };
            } else if (prop.type === 'checkbox') {
                propertiesToUpdate[name] = { checkbox: {} };
            } else if (prop.type === 'email') {
                propertiesToUpdate[name] = { email: {} };
            } else if (prop.type === 'phone_number') {
                propertiesToUpdate[name] = { phone_number: {} };
            } else if (prop.type === 'people') {
                propertiesToUpdate[name] = { people: {} };
            } else if (prop.type === 'files') {
                propertiesToUpdate[name] = { files: {} };
            } else {
                console.log(`   ❓ Skipping complex/unsupported type: ${name} (${prop.type})`);
            }
        }

        if (Object.keys(propertiesToUpdate).length === 0) {
            console.log('\n✅ No properties to update. Target database structure matches source!');
            return;
        }

        console.log(`\n📦 Applying ${Object.keys(propertiesToUpdate).length} schema changes...`);

        await targetClient.databases.update({
            database_id: TARGET.databaseId,
            properties: propertiesToUpdate
        });

        console.log('\n✨ Database schema cloned successfully!');

    } catch (error) {
        console.error('\n❌ Error cloning schema:', error.body || error.message);
    }
}

cloneSchema();
