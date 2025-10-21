const { exec } = require('child_process');
const logger = require('../utilities/logger.util')
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

const backupsDir = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
}

const createBackup = () => {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFolder = path.join(backupsDir, `backup-${timestamp}`);

        if (!fs.existsSync(backupFolder)) {
            fs.mkdirSync(backupFolder, { recursive: true });
        }

        const mongoUri = process.env.CONNECTION_STRING;
        const command = `mongodump --uri="${mongoUri}" --out="${backupFolder}" --gzip`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                logger?.error(`[Backup Error]: ${error.message}`);
                return reject(error);
            }
            logger?.info(`[Backup Completed]: ${stdout || stderr}`);
            resolve(`Backup created at ${backupFolder}`);
        })
    })
};

const restoreBackup = (folderName) => {
    return new Promise((resolve, reject) => {
        if (!folderName) {
            const errMsg = 'Folder name for restore is required';
            logger?.warn(`[Restore Warning]: ${errMsg}`);
            return reject(new Error(errMsg));
        }

        const mongoUri = process.env.CONNECTION_STRING;
        const backupPath = path.join(backupsDir, folderName, process.env.DB_NAME);

        if (!fs.existsSync(backupPath)) {
            const errMsg = `Backup path does not exist: ${backupPath}`;
            logger?.warn(`[Restore Warning]: ${errMsg}`);
            return reject(new Error(errMsg));
        }

        const command = `mongorestore --uri="${mongoUri}" --drop --gzip "${backupPath}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                logger?.error(`[Restore Error]: ${error.message}`);
                return reject(error);
            }
            logger?.info(`[Restore Completed]: ${stdout || stderr}`);
            resolve('Restore completed successfully');
        });
    });
};

// 0 2 * * *
const scheduleBackup = () => {
    cron.schedule('0 2 * * *', async () => {
        logger?.info('[Backup Scheduler] Starting scheduled backup...');
        try {
            const msg = await createBackup();
            logger?.info(`[Backup Scheduler] ${msg}`);
        } catch (err) {
            logger?.error(`[Backup Scheduler] Error: ${err.message}`);
        }
    });
};

module.exports = {
    createBackup,
    restoreBackup,
    scheduleBackup
};