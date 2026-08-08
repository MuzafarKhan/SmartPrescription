const { ipcMain } = require("electron");
const { getDatabase } = require("../database/connection");

const db = getDatabase();

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
