const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Creates initial button for new tasks (only "Start Working")
 */
function createTaskButtons(taskId) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`working_${taskId}`)
                .setLabel('Start Working')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('▶️'),
            new ButtonBuilder()
                .setCustomId(`reassign_${taskId}`)
                .setLabel('Reassign')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄')
        );

    return row;
}

/**
 * Creates updated buttons based on current status
 */
function createUpdatedButtons(taskId, currentStatus) {
    const row = new ActionRowBuilder();

    // If Working, show On Hold, Done, and Reassign
    if (currentStatus === 'Working') {
        const onHoldButton = new ButtonBuilder()
            .setCustomId(`onhold_${taskId}`)
            .setLabel('On Hold')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏸️');

        const doneButton = new ButtonBuilder()
            .setCustomId(`done_${taskId}`)
            .setLabel('Done')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        const reassignButton = new ButtonBuilder()
            .setCustomId(`reassign_${taskId}`)
            .setLabel('Reassign')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄');

        row.addComponents(onHoldButton, doneButton, reassignButton);
    }
    // If On Hold or Done, show all buttons
    else {
        const onHoldButton = new ButtonBuilder()
            .setCustomId(`onhold_${taskId}`)
            .setLabel('On Hold')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏸️')
            .setDisabled(currentStatus === 'On Hold');

        const workingButton = new ButtonBuilder()
            .setCustomId(`working_${taskId}`)
            .setLabel('Working')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⚙️')
            .setDisabled(currentStatus === 'Working');

        const doneButton = new ButtonBuilder()
            .setCustomId(`done_${taskId}`)
            .setLabel('Done')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
            .setDisabled(currentStatus === 'Done');

        const reassignButton = new ButtonBuilder()
            .setCustomId(`reassign_${taskId}`)
            .setLabel('Reassign')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄');

        row.addComponents(onHoldButton, workingButton, doneButton, reassignButton);
    }

    return row;
}

module.exports = {
    createTaskButtons,
    createUpdatedButtons,
};
