const { ipcMain } = require("electron");
const { getDatabase } = require("../database/connection");
const db = getDatabase();

ipcMain.handle("get-patient-instruction", async () => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("SELECT * FROM patient_instruction");
    stmt.all((err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle("get-patient-instruction-by-name", async (event, name) => {
  console.log("Query received:", name);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id as Id, name , moredetail  FROM patient_instruction WHERE name LIKE ?",
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

ipcMain.handle("get-patient-instruction-by-id", async (event, id) => {
  console.log("Query received:", id);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * from patient_instruction WHERE Id = ?",
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

ipcMain.handle("add-patient-instruction", async (event, title, detail) => {
  const stmt = db.prepare(
    "INSERT INTO patient_instruction (title, detail) VALUES (?, ?)"
  );
  const result = stmt.run(title, detail);
  stmt.finalize();
  return result.lastInsertRowid;
});

ipcMain.handle(
  "update-patient-instruction",
  async (event, id, title, detail) => {
    const stmt = db.prepare(
      "UPDATE patient_instruction SET title = ?, detail = ? WHERE id = ?"
    );
    const result = stmt.run(title, detail, id);
    stmt.finalize();
    return result.changes;
  }
);

ipcMain.handle("delete-patient-instruction-by-id", async (event, id) => {
  const stmt = db.prepare("DELETE FROM patient_instruction WHERE id = ?");
  const result = stmt.run(id);
  stmt.finalize();
  return result.changes;
});
