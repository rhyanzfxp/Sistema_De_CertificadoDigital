const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'app.log');

// Ensure logs directory exists
const LOGS_DIR = path.dirname(LOG_FILE);
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR);
}

function log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({
        timestamp,
        level: level.toUpperCase(),
        message,
        ...data
    }) + '\n';

    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
}

module.exports = {
    info: (message, data) => log('info', message, data),
    error: (message, data) => log('error', message, data),
    event: (message, data) => log('event', message, data),
};
