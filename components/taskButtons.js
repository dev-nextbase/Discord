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
                .setEmoji('▶️')
        );

    return row;
}

/**
 * Creates updated buttons based on current status
 */
function createUpdatedButtons(taskId, currentStatus) {
    const row = new ActionRowBuilder();

    // If Working, show On Hold and Done
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

        row.addComponents(onHoldButton, doneButton);
    }
    // If On Hold or Done, show all three
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

        row.addComponents(onHoldButton, workingButton, doneButton);
    }

    return row;
}

module.exports = {
    createTaskButtons,
    createUpdatedButtons,
};
