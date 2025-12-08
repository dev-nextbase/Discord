const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Ensure attachments directory exists
const ATTACHMENTS_DIR = path.join(__dirname, '..', 'attachments');
if (!fs.existsSync(ATTACHMENTS_DIR)) {
    fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

/**
 * Downloads and saves Discord attachments locally
 * @param {Array} attachments - Array of Discord attachment objects
 * @param {string} taskId - Notion task ID for folder organization
 * @returns {Promise<Array>} Array of saved file paths
 */
async function downloadAttachments(attachments, taskId) {
    if (!attachments || attachments.length === 0) {
        return [];
    }

    const savedFiles = [];
    const taskDir = path.join(ATTACHMENTS_DIR, taskId);

    // Create task-specific directory
    if (!fs.existsSync(taskDir)) {
        fs.mkdirSync(taskDir, { recursive: true });
    }

    for (const attachment of attachments) {
        try {
            const response = await axios.get(attachment.url, {
                responseType: 'arraybuffer',
            });

            const filename = `${Date.now()}_${attachment.name}`;
            const filepath = path.join(taskDir, filename);

            fs.writeFileSync(filepath, response.data);
            savedFiles.push(filepath);

            logger.success(`Saved attachment: ${filename}`);
        } catch (error) {
            logger.error(`Failed to download attachment: ${attachment.name}`, error);
        }
    }

    return savedFiles;
}

/**
 * Gets attachment info for display
 * @param {Array} filePaths - Array of file paths
 * @returns {string} Formatted attachment info
 */
function getAttachmentInfo(filePaths) {
    if (!filePaths || filePaths.length === 0) {
        return 'None';
    }

    return filePaths.map(fp => path.basename(fp)).join(', ');
}

module.exports = {
    downloadAttachments,
    getAttachmentInfo,
};
