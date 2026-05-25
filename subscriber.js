const fs = require('fs');
const path = require('path');
const eventBus = require('./eventBus');

const logFilePath = path.join(__dirname, 'stats.json');

eventBus.on('requestCompleted', (statsData) => {
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        let logs = [];
        if (!err && data) {
            try {
                logs = JSON.parse(data);
            } catch (e) {
                logs = [];
            }
        }
        logs.push(statsData);
        
        fs.writeFile(logFilePath, JSON.stringify(logs, null, 2), (writeErr) => {
            if (writeErr) console.error('Помилка запису логів:', writeErr);
        });
    });
});