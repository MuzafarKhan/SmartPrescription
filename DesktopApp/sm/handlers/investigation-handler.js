const { ipcMain } = require("electron");
const { getDatabase } = require("../database/connection");
const db = getDatabase();

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
      "SELECT id as Id, name, isPrintableOnPrescription FROM investigation WHERE name LIKE ?",
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
      "SELECT id as Id, name, isPrintableOnPrescription from investigation WHERE Id = ?",
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

ipcMain.handle(
  "add-investigation",
  async (event, name, isPrintableOnPrescription) => {
    const stmt = db.prepare(
      "INSERT INTO investigation (name, isPrintableOnPrescription) VALUES (?, ?)"
    );
    const result = stmt.run(name, isPrintableOnPrescription);
    stmt.finalize();
    return result.lastInsertRowid;
  }
);

ipcMain.handle(
  "update-investigation",
  async (event, id, name, isPrintableOnPrescription) => {
    const stmt = db.prepare(
      "UPDATE investigation SET name = ? , isPrintableOnPrescription = ? WHERE id = ?"
    );
    const result = stmt.run(name, isPrintableOnPrescription, id);
    stmt.finalize();
    return result.changes;
  }
);

ipcMain.handle("delete-investigation-by-id", async (event, id) => {
  const stmt = db.prepare("DELETE FROM investigation WHERE id = ?");
  const result = stmt.run(id);
  stmt.finalize();
  return result.changes;
});
