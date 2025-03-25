const { ipcMain } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const common = require("../common");
const db = new sqlite3.Database(common.getdbFilePath());

ipcMain.handle("get-plan", async () => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("SELECT * FROM plan");
    stmt.all((err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle("get-plan-by-name", async (event, name) => {
  console.log("Query received:", name);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id as Id, name  FROM plan WHERE name LIKE ?",
      [`%${name}%`],
      (err, rows) => {
        if (err) {
          console.error("Database error:", err);
          reject(err);
        } else {
          console.log("Database rows:", rows);
          resolve(rows);
        }
      }
    );
  });
});

ipcMain.handle("get-plan-by-id", async (event, id) => {
  console.log("Query received:", id);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id as Id, name from plan WHERE Id = ?",
      [`${id}`],
      (err, rows) => {
        if (err) {
          console.error("Database error:", err);
          reject(err);
        } else {
          console.log("Database rows:", rows);
          resolve(rows);
        }
      }
    );
  });
});

ipcMain.handle("add-plan", async (event, name) => {
  const stmt = db.prepare("INSERT INTO plan (name) VALUES (?)");
  const result = stmt.run(name);
  return result.lastInsertRowid;
});

ipcMain.handle("update-plan", async (event, id, name) => {
  const stmt = db.prepare("UPDATE plan SET name = ? WHERE id = ?");
  const result = stmt.run(name, id);
  return result.changes;
});

ipcMain.handle("delete-plan-by-id", async (event, id) => {
  const stmt = db.prepare("DELETE FROM plan WHERE id = ?");
  const result = stmt.run(id);
  return result.changes;
});
