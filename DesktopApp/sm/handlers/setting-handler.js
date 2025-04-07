const { ipcMain, dialog, BrowserWindow } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const common = require("../common");
const db = new sqlite3.Database(common.getdbFilePath());
const fs = require("fs");

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
    surgeryDetailValues,
    defaultPrescriptionPrinterName,
    defaultThermalPrinterName
  ) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(
        "UPDATE settings SET defaultdate = ?, defaultday = ?, defaultcomplaintunit = ?, defaultcomplaintduration = ?, defaultfollowupunit = ?, defaultfollowupduration = ?, investigationDetailValues = ?, surgeryDetailValues = ?, defaultPrescriptionPrinterName = ? , defaultThermalPrinterName = ?"
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
          defaultPrescriptionPrinterName,
          defaultThermalPrinterName,
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

ipcMain.handle(
  "print-direct",
  async (event, { type, data, printer, options }) => {
    return new Promise(async (resolve, reject) => {
      const win = new BrowserWindow({ show: false });

      try {
        await win.loadURL(
          `data:text/html;charset=UTF-8,${encodeURIComponent(data)}`
        );

        const printers = await win.webContents.getPrintersAsync();
        const targetPrinter = printer
          ? printers.find((p) => p.name === printer)
          : printers.find((p) => p.isDefault) || printers[0];

        if (!targetPrinter) {
          return reject(new Error("No printers available"));
        }

        console.log("Selected printer:", targetPrinter.name);
        console.log("data:", data);

        if (targetPrinter.name === "Microsoft Print to PDF") {
          // Show save dialog
          const { canceled, filePath } = await dialog.showSaveDialog({
            title: "Save PDF",
            defaultPath: "document.pdf",
            filters: [{ name: "PDF Files", extensions: ["pdf"] }],
          });

          if (canceled || !filePath) {
            return reject(new Error("Save dialog was canceled"));
          }

          // Generate PDF
          const pdfData = await win.webContents.printToPDF({
            printBackground: true,
          });

          fs.writeFileSync(filePath, pdfData);

          resolve({ success: true, filePath });
        } else {
          // Direct print
          await win.webContents.print({
            silent: true,
            printBackground: true,
            deviceName: targetPrinter.name,
            ...options,
          });

          resolve({ success: true, printer: targetPrinter.name });
        }
      } catch (error) {
        console.error("Print failed:", error);
        reject({ success: false, error: error.message });
      } finally {
        win.destroy();
      }
    });
  }
);

// Close the database when the app exits
process.on("exit", () => {
  db.close();
});
