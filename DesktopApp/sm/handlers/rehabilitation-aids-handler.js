const { ipcMain } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const common = require("../common");
const db = new sqlite3.Database(common.getdbFilePath());

ipcMain.handle("get-rehabilitation-aids", async () => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("SELECT * FROM rehabilitation_aids");
    stmt.all((err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle("get-rehabilitation-aids-by-name", async (event, name) => {
  console.log("Query received:", name);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id as Id, name , moredetail  FROM rehabilitation_aids WHERE name LIKE ?",
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

ipcMain.handle("get-rehabilitation-aids-by-id", async (event, id) => {
  console.log("Query received:", id);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id as Id, name, moredetail from rehabilitation_aids WHERE Id = ?",
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

ipcMain.handle("add-rehabilitation-aids", async (event, name, moredetail) => {
  const stmt = db.prepare(
    "INSERT INTO rehabilitation_aids (name, moredetail) VALUES (?, ?)"
  );
  const result = stmt.run(name, moredetail);
  return result.lastInsertRowid;
});

ipcMain.handle(
  "update-rehabilitation-aids",
  async (event, id, name, moredetail) => {
    const stmt = db.prepare(
      "UPDATE rehabilitation_aids SET name = ? , moredetail = ? WHERE id = ?"
    );
    const result = stmt.run(name, moredetail, id);
    return result.changes;
  }
);

ipcMain.handle("delete-rehabilitation-aids-by-id", async (event, id) => {
  const stmt = db.prepare("DELETE FROM rehabilitation_aids WHERE id = ?");
  const result = stmt.run(id);
  return result.changes;
});
