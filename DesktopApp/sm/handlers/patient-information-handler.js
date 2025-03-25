const { ipcMain, BrowserWindow } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const common = require("../common");
const db = new sqlite3.Database(common.getdbFilePath());
