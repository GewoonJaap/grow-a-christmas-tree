import { Guild, IGuild } from "../models/Guild";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { unlinkSync } from "fs";
import path = require("path");
import pino from "pino";

const logger = pino({
  level: "info"
});

let backupTimerStarted = false;

export async function startBackupTimer() {
  if (backupTimerStarted) return;
  backupTimerStarted = true;
  //run createBackup() every 24 hours
  setInterval(createBackup, 1000 * 60 * 60 * 24);
  createBackup();
}

async function createBackup() {
  //fetch all guilds
  const guilds = await Guild.find({});

  //create backup object
  const backup: Backup = {
    guilds,
    createdAt: Date.now(),
    createdAtReadable: new Date().toString()
  };

  //write it to backup-files folder, call the file the current date like: backup-14-12-2023-19-09-00.json
  const fileName = `backup-${new Date().toLocaleDateString().replace(/\//g, "-")}-${new Date()
    .toLocaleTimeString()
    .replace(/:/g, "-")}.json`.replace(/ /g, "-");

  const backupFilesDir = path.resolve(__dirname, "../../backup-files");
  const filePath = path.join(backupFilesDir, fileName);

  try {
    writeFileSync(filePath, JSON.stringify(backup));

    removeOldBackups();
  } catch (err) {
    logger.error(err);
  }
}

async function removeOldBackups() {
  // Remove backups that are older than 7 days
  const backupFilesDir = path.resolve(__dirname, "../../backup-files");
  const files = readdirSync(backupFilesDir);

  const now = Date.now();
  const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;

  files.forEach((file) => {
    if (file.endsWith(".json")) {
      try {
        const filePath = path.join(backupFilesDir, file);
        //read json file
        const backupFile: Backup = JSON.parse(readFileSync(filePath, "utf-8"));
        const fileCreatedAt = backupFile.createdAt;
        //check if file is older than 7 days

        if (now - fileCreatedAt > sevenDaysInMillis) {
          //delete file
          unlinkSync(filePath);
        }
      } catch (err) {
        logger.error(err);
      }
    }
  });
}

interface Backup {
  guilds: IGuild[];
  createdAt: number;
  createdAtReadable: string;
}
