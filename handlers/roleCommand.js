const roleManager = require('../services/roleManager');
const logger = require('../utils/logger');

module.exports = {
    name: 'role',
    description: 'Manage bot roles (Admin only)',
    async execute(message, args) {
        // Check if user has the specific Admin Role or is Owner
        const ADMIN_ROLE_ID = '1442499198825271485';
        const hasAdminRole = message.member.roles.cache.has(ADMIN_ROLE_ID);
        const isOwner = message.guild.ownerId === message.author.id;

        if (!hasAdminRole && !isOwner) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand) {
            return message.reply(
                '**Role Management**\n' +
                '`?role add admin @user`\n' +
                '`?role remove admin @user`\n' +
                '`?role add lead @user TeamName`\n' +
                '`?role remove lead @user TeamName`'
            );
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser && (subcommand === 'add' || subcommand === 'remove')) {
            return message.reply('❌ Please mention a user.');
        }

        if (subcommand === 'add') {
            const roleType = args[1]?.toLowerCase();
            if (roleType === 'admin') {
                if (roleManager.addAdmin(targetUser.id)) {
                    message.reply(`✅ Added ${targetUser.tag} as Admin.`);
                } else {
                    message.reply(`ℹ️ ${targetUser.tag} is already an Admin.`);
                }
            } else if (roleType === 'lead') {
                const teamName = args[3];
                if (!teamName) return message.reply('❌ Please specify a team name.');

                if (roleManager.addTeamLead(targetUser.id, teamName)) {
                    message.reply(`✅ Added ${targetUser.tag} as Team Lead for **${teamName}**.`);
                } else {
                    message.reply(`ℹ️ ${targetUser.tag} is already a Team Lead for ${teamName}.`);
                }
            } else {
                message.reply('❌ Invalid role type. Use `admin` or `lead`.');
            }
        } else if (subcommand === 'remove') {
            const roleType = args[1]?.toLowerCase();
            if (roleType === 'admin') {
                if (roleManager.removeAdmin(targetUser.id)) {
                    message.reply(`✅ Removed ${targetUser.tag} from Admins.`);
                } else {
                    message.reply(`ℹ️ ${targetUser.tag} is not an Admin.`);
                }
            } else if (roleType === 'lead') {
                const teamName = args[3];
                if (!teamName) return message.reply('❌ Please specify a team name.');

                if (roleManager.removeTeamLead(targetUser.id, teamName)) {
                    message.reply(`✅ Removed ${targetUser.tag} from Team Leads for **${teamName}**.`);
                } else {
                    message.reply(`ℹ️ ${targetUser.tag} is not a Team Lead for ${teamName}.`);
                }
            } else {
                message.reply('❌ Invalid role type. Use `admin` or `lead`.');
            }
        }
    },
};
