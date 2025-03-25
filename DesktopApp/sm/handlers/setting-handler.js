const { ipcMain } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const common = require("../common");
const db = new sqlite3.Database(common.getdbFilePath());

ipcMain.handle("get-settings", async () => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      "select * from settings s order by id desc limit 1"
    );
    stmt.all((err, rows) => {
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
    defaultcomplaintduration
  ) => {
    const stmt = db.prepare(
      "UPDATE settings SET defaultdate = ? , defaultday = ?, defaultcomplaintunit = ?, defaultcomplaintduration = ?"
    );
    const result = stmt.run(
      defaultdate,
      defaultday,
      defaultcomplaintunit,
      defaultcomplaintduration
    );
    return result.changes;
  }
);

ipcMain.handle("save-translations", async (event, translations) => {
  if (!Array.isArray(translations)) {
    throw new Error("Invalid data: Expected an array of translations.");
  }

  // Delete existing translations for the diagnosis ID
  const deleteTranslations = () => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM translations", function (err) {
        if (err) reject(err);
        resolve(); // Resolve when deletion is successful
      });
    });
  };

  const insertTranslation = (translation) => {
    const { english, tourdu } = translation;

    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO translations (english, tourdu) VALUES (?, ?)",
        [english, tourdu],
        function (err) {
          if (err) reject(err);
          resolve({ id: this.lastID });
        }
      );
    });
  };

  try {
    // Step 1: Delete existing translations
    await deleteTranslations();

    // Step 2: Insert new translations
    const results = [];
    for (const translation of translations) {
      const result = await insertTranslation(translation);
      results.push(result);
    }

    return results; // Return an array of results with IDs for all inserted translations
  } catch (error) {
    console.error("Error save translations:", error);
    throw error;
  }
});
