const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Creates initial button for new tasks (only "Start Working")
 * @param {string} taskId - The task ID
 * @param {boolean} backlogMode - If true, only show Reassign button (for backlog tasks)
 */
function createTaskButtons(taskId, backlogMode = false) {
    const row = new ActionRowBuilder();

    // If in backlog mode, only show Reassign button
    if (backlogMode) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`reassign_${taskId}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄')
        );
    } else {
        // Normal mode: Show Start Working, Reassign, and Move to Backlog
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`working_${taskId}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('▶️'),
            new ButtonBuilder()
                .setCustomId(`reassign_${taskId}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄'),
            new ButtonBuilder()
                .setCustomId(`backlog_${taskId}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋')
        );
    }

    return row;
}

/**
 * Creates updated buttons based on current status
 */
function createUpdatedButtons(taskId, currentStatus) {
    const row = new ActionRowBuilder();

    // If Working, show On Hold, Done, Reassign, and Move to Backlog
    if (currentStatus === 'Working') {
        const onHoldButton = new ButtonBuilder()
            .setCustomId(`onhold_${taskId}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏸️');

        const doneButton = new ButtonBuilder()
            .setCustomId(`done_${taskId}`)
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        const reassignButton = new ButtonBuilder()
            .setCustomId(`reassign_${taskId}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄');

        const backlogButton = new ButtonBuilder()
            .setCustomId(`backlog_${taskId}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋');

        row.addComponents(onHoldButton, doneButton, reassignButton, backlogButton);
    }
    // If On Hold or Done, show all buttons
    else {
        const onHoldButton = new ButtonBuilder()
            .setCustomId(`onhold_${taskId}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏸️')
            .setDisabled(currentStatus === 'On Hold');

        const workingButton = new ButtonBuilder()
            .setCustomId(`working_${taskId}`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⚙️')
            .setDisabled(currentStatus === 'Working');

        const doneButton = new ButtonBuilder()
            .setCustomId(`done_${taskId}`)
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
            .setDisabled(currentStatus === 'Done');

        const reassignButton = new ButtonBuilder()
            .setCustomId(`reassign_${taskId}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄');

        const backlogButton = new ButtonBuilder()
            .setCustomId(`backlog_${taskId}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋');

        row.addComponents(onHoldButton, workingButton, doneButton, reassignButton, backlogButton);
    }

    return row;
}

module.exports = {
    createTaskButtons,
    createUpdatedButtons,
};
