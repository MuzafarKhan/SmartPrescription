const { ipcMain } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const common = require("../common");
const db = new sqlite3.Database(common.getdbFilePath());

ipcMain.handle("get-chief-complaint", async () => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("SELECT * FROM chief_complaints");
    stmt.all((err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle("get-chief-complaint-by-name", async (event, name) => {
  console.log("Query received:", name);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id as Id, complaint as Name FROM chief_complaints WHERE complaint LIKE ?",
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

ipcMain.handle("get-chief-complaint-by-id", async (event, id) => {
  console.log("Query received:", id);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id as Id, complaint as Name FROM chief_complaints WHERE Id = ?",
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

ipcMain.handle("add-chief-complaint", async (event, complaint) => {
  const stmt = db.prepare(
    "INSERT INTO chief_complaints (complaint) VALUES (?)"
  );
  const result = stmt.run(complaint);
  return result.lastInsertRowid;
});

ipcMain.handle("update-chief-complaint", async (event, id, complaint) => {
  console.log(id, complaint);
  const stmt = db.prepare(
    "UPDATE chief_complaints SET complaint = ? WHERE id = ?"
  );
  const result = stmt.run(complaint, id);
  return result.changes;
});

ipcMain.handle("delete-chief-complaint-by-id", async (event, id) => {
  const stmt = db.prepare("DELETE FROM chief_complaints WHERE id = ?");
  const result = stmt.run(id);
  return result.changes;
});
