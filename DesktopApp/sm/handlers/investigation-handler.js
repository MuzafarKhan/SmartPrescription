const { ipcMain } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const common = require("../common");
const db = new sqlite3.Database(common.getdbFilePath());

ipcMain.handle("get-investigation", async () => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("SELECT * FROM investigation");
    stmt.all((err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle("get-investigation-by-name", async (event, name) => {
  console.log("Query received:", name);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id as Id, name FROM investigation WHERE name LIKE ?",
      [`%${name}%`],
      (err, rows) => {
        if (err) {
          console.error("Database error:", err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
});

ipcMain.handle("get-investigation-by-id", async (event, id) => {
  console.log("Query received:", id);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id as Id, name from investigation WHERE Id = ?",
      [`${id}`],
      (err, rows) => {
        if (err) {
          console.error("Database error:", err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
});

ipcMain.handle("add-investigation", async (event, name) => {
  const stmt = db.prepare("INSERT INTO investigation (name) VALUES (?)");
  const result = stmt.run(name);
  return result.lastInsertRowid;
});

ipcMain.handle("update-investigation", async (event, id, name) => {
  const stmt = db.prepare("UPDATE investigation SET name = ? WHERE id = ?");
  const result = stmt.run(name, id);
  return result.changes;
});

ipcMain.handle("delete-investigation-by-id", async (event, id) => {
  const stmt = db.prepare("DELETE FROM investigation WHERE id = ?");
  const result = stmt.run(id);
  return result.changes;
});
