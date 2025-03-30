const { ipcMain } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const common = require("../common");
const db = new sqlite3.Database(common.getdbFilePath());

ipcMain.handle("get-settings", async () => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("SELECT * FROM settings ORDER BY id DESC LIMIT 1");
    stmt.all((err, rows) => {
      stmt.finalize(); // Clean up the statement
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle("get-translations", async (event) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("SELECT * FROM translations");
    stmt.all((err, rows) => {
      stmt.finalize(); // Clean up the statement
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle(
  "update-settings",
  async (
    event,
    defaultdate,
    defaultday,
    defaultcomplaintunit,
    defaultcomplaintduration,
    defaultfollowupunit,
    defaultfollowupduration,
    investigationDetailValues,
    surgeryDetailValues
  ) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(
        "UPDATE settings SET defaultdate = ?, defaultday = ?, defaultcomplaintunit = ?, defaultcomplaintduration = ?, defaultfollowupunit = ?, defaultfollowupduration = ?, investigationDetailValues = ?, surgeryDetailValues = ?"
      );
      stmt.run(
        [
          defaultdate,
          defaultday,
          defaultcomplaintunit,
          defaultcomplaintduration,
          defaultfollowupunit,
          defaultfollowupduration,
          investigationDetailValues,
          surgeryDetailValues,
        ],
        function (err) {
          stmt.finalize(); // Clean up the statement
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }
);

ipcMain.handle("save-translations", async (event, translations) => {
  if (!Array.isArray(translations)) {
    throw new Error("Invalid data: Expected an array of translations.");
  }

  return new Promise((resolve, reject) => {
    // Start a transaction
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // 1. Delete existing translations
      db.run("DELETE FROM translations", function (err) {
        if (err) {
          return db.run("ROLLBACK", () => reject(err));
        }

        // 2. Insert new translations
        const insertStmt = db.prepare(
          "INSERT INTO translations (english, tourdu) VALUES (?, ?)"
        );

        let hasError = false;
        for (const translation of translations) {
          if (hasError) break;

          insertStmt.run([translation.english, translation.tourdu], (err) => {
            if (err) {
              hasError = true;
              insertStmt.finalize(); // Clean up the statement
              return db.run("ROLLBACK", () => reject(err));
            }
          });
        }

        if (!hasError) {
          insertStmt.finalize(); // Clean up the statement
          db.run("COMMIT", (err) => {
            if (err) {
              reject(err);
            } else {
              resolve({ success: true, count: translations.length });
            }
          });
        }
      });
    });
  });
});

// Close the database when the app exits
process.on("exit", () => {
  db.close();
});
