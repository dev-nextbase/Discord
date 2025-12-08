/**
 * Priority utility functions
 * Maps priority levels 1-10 to color-coded emojis
 * 🔴 Red (10-9): Critical/Urgent
 * 🟠 Orange (8-7): High priority
 * 🟡 Yellow (6-5): Medium priority
 * 🟢 Green (4-3): Low priority
 * 🔵 Blue (2-1): Very low priority
 */

const PRIORITY_EMOJIS = {
    '10': '🔴',
    '9': '🔴',
    '8': '🟠',
    '7': '🟠',
    '6': '🟡',
    '5': '🟡',
    '4': '🟢',
    '3': '🟢',
    '2': '🔵',
    '1': '🔵'
};

/**
 * Get emoji for a priority level
 * @param {string|number} priority - Priority level (1-10)
 * @returns {string} Emoji representing the priority
 */
function getPriorityEmoji(priority) {
    // Handle old format (High/Medium/Low) for backwards compatibility
    if (typeof priority === 'string') {
        // Remove existing emoji if present
        const cleanPriority = priority.replace(/[🔴🟠🟡🟢🔵]\s*/g, '').trim();

        // Check if it's a number
        if (!isNaN(cleanPriority)) {
            return PRIORITY_EMOJIS[cleanPriority] || '⚪';
        }

        // Legacy support
        if (cleanPriority === 'High') return '🔴';
        if (cleanPriority === 'Medium') return '🟡';
        if (cleanPriority === 'Low') return '🟢';
    }

    return PRIORITY_EMOJIS[String(priority)] || '⚪';
}

/**
 * Get formatted priority string with emoji
 * @param {string|number} priority - Priority level (1-10)
 * @returns {string} Formatted priority with emoji
 */
function getFormattedPriority(priority) {
    const emoji = getPriorityEmoji(priority);
    const cleanPriority = String(priority).replace(/[🔴🟠🟡🟢🔵]\s*/g, '').trim();
    return `${emoji} ${cleanPriority}`;
}

/**
 * Get all priority choices for Discord slash commands
 * @returns {Array} Array of priority choices with emojis
 */
function getPriorityChoices() {
    return [
        { name: '🔴 10 - Critical', value: '10' },
        { name: '🔴 9 - Urgent', value: '9' },
        { name: '🟠 8 - High', value: '8' },
        { name: '🟠 7 - High', value: '7' },
        { name: '🟡 6 - Medium', value: '6' },
        { name: '🟡 5 - Medium', value: '5' },
        { name: '🟢 4 - Low', value: '4' },
        { name: '🟢 3 - Low', value: '3' },
        { name: '🔵 2 - Very Low', value: '2' },
        { name: '🔵 1 - Minimal', value: '1' }
    ];
}

/**
 * Clean priority value (remove emojis)
 * @param {string} priority - Priority string that may contain emojis
 * @returns {string} Clean priority value
 */
function cleanPriority(priority) {
    return String(priority).replace(/[🔴🟠🟡🟢🔵]\s*/g, '').trim();
}

module.exports = {
    getPriorityEmoji,
    getFormattedPriority,
    getPriorityChoices,
    cleanPriority,
    PRIORITY_EMOJIS
};
