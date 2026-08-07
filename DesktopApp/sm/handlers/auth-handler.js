const { ipcMain } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const common = require("../common");

const db = new sqlite3.Database(common.getdbFilePath());

ipcMain.handle("login", async (event, username, password) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      "SELECT id, username FROM users WHERE username = ? AND password = ? LIMIT 1"
    );
    stmt.get([username, password], (err, row) => {
      stmt.finalize();
      if (err) {
        reject(err);
      } else if (row) {
        resolve({ success: true, user: { id: row.id, username: row.username } });
      } else {
        resolve({ success: false, message: "Invalid username or password" });
      }
    });
  });
});

process.on("exit", () => {
  db.close();
});
