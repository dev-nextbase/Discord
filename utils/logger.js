const logger = {
    info: (message) => {
        console.log(`[${new Date().toISOString()}] ℹ️  INFO: ${message}`);
    },
    success: (message) => {
        console.log(`[${new Date().toISOString()}] ✅ SUCCESS: ${message}`);
    },
    error: (message, error) => {
        console.error(`[${new Date().toISOString()}] ❌ ERROR: ${message}`);
        if (error) {
            console.error(error);
        }
    },
    warn: (message) => {
        console.warn(`[${new Date().toISOString()}] ⚠️  WARNING: ${message}`);
    },
};

module.exports = logger;
