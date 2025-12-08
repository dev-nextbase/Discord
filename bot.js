const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { config, validateConfig } = require('./config/config');
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

if (!validateConfig()) {
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file =>
    file.endsWith('.js') && file !== 'deploy-commands.js'
);

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.info(`Loaded command: ${command.data.name}`);
    } else {
        logger.warn(`Skipping ${file}: missing 'data' or 'execute' property`);
    }
}

client.once('ready', () => {
    logger.success(`Bot is online as ${client.user.tag}!`);
    logger.info(`Serving ${client.guilds.cache.size} guild(s)`);
});

// Prefix commands
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('?')) return;

    const args = message.content.slice(1).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    try {
        if (command === 'team') {
            const { handleTeamCommand } = require('./handlers/teamCommand');
            await handleTeamCommand(message, args);
        } else if (command === 'assign') {
            const { handleAssignCommand } = require('./handlers/assignCommand');
            await handleAssignCommand(message, args);
        } else if (command === 'user') {
            const { handleUserCommand } = require('./handlers/userCommand');
            await handleUserCommand(message, args);
        } else if (command === 'private') {
            const { handlePrivateCommand } = require('./handlers/privateCommand');
            await handlePrivateCommand(message, args);
        } else if (command === 'role') {
            const roleCommand = require('./handlers/roleCommand');
            await roleCommand.execute(message, args);
        } else if (command === 'help') {
            const helpCommand = require('./handlers/helpCommand');
            await helpCommand.execute(message, args);
        }
    } catch (error) {
        logger.error(`Error processing command: ?${command}`, error);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            logger.error(`Command not found: ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            logger.error(`Error executing command: ${interaction.commandName}`, error);

            const errorMessage = {
                content: '❌ There was an error executing this command!',
                ephemeral: true,
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }

    if (interaction.isButton()) {
        const { handleButtonInteraction } = require('./handlers/buttonHandler');
        await handleButtonInteraction(interaction);
    }

    if (interaction.isStringSelectMenu()) {
        const { handleSelectMenuInteraction } = require('./handlers/selectMenuHandler');
        await handleSelectMenuInteraction(interaction);
    }
});

client.on('error', error => {
    logger.error('Discord client error', error);
});

process.on('unhandledRejection', error => {
    logger.error('Unhandled promise rejection', error);
});

client.login(config.discord.token)
    .then(() => {
        logger.success('Successfully logged in to Discord');
    })
    .catch(error => {
        logger.error('Failed to login to Discord', error);
        process.exit(1);
    });
