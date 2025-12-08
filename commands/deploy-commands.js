const { REST, Routes } = require('discord.js');
const { config } = require('../config/config');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname);
const commandFiles = fs.readdirSync(commandsPath).filter(file =>
    file.endsWith('.js') && file !== 'deploy-commands.js'
);

// Load all command files
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️  Skipping ${file}: missing 'data' or 'execute' property`);
    }
}

// Deploy commands to Discord
const rest = new REST({ version: '10' }).setToken(config.discord.token);

(async () => {
    try {
        console.log(`\n🚀 Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
            { body: commands }
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.\n`);

        data.forEach(cmd => {
            console.log(`   - /${cmd.name}: ${cmd.description}`);
        });

        console.log('\n✨ Commands are now available in your Discord server!');
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
})();
