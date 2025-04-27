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

ipcMain.handle("print-direct", async (event, { data, printer }) => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
    },
  });

  console.log("Initializing print job for printer:", printer);

  try {
    // 1. Load content
    await win.loadURL(
      `data:text/html;charset=UTF-8,${encodeURIComponent(data)}`
    );
    await win.webContents.executeJavaScript(`
      new Promise(resolve => document.readyState === 'complete' ? resolve() : window.addEventListener('load', resolve))
    `);

    // 2. Get printers with enhanced debugging
    const printers =
      win.webContents.getPrinters?.() ||
      (await win.webContents.getPrintersAsync?.()) ||
      [];
    console.log("Available printers:", JSON.stringify(printers, null, 2));

    // 3. Enhanced printer matching (exact, case-insensitive, then partial)
    const targetPrinter = printer
      ? printers.find((p) => p.name === printer) || // Exact match
        printers.find((p) => p.name.toLowerCase() === printer.toLowerCase()) || // Case-insensitive
        printers.find((p) =>
          p.name.toLowerCase().includes(printer.toLowerCase())
        )
      : printers.find((p) => p.isDefault);

    console.log(
      "Selected printer details:",
      JSON.stringify(targetPrinter, null, 2)
    );

    if (!targetPrinter) {
      throw new Error(
        `Printer "${printer}" not found. Available: ${printers
          .map((p) => p.name)
          .join(", ")}`
      );
    }

    // 4. Print with verification
    const printSuccess = await new Promise((resolve) => {
      const printOptions = {
        silent: true,
        deviceName: targetPrinter.name,
        printBackground: true,
        // Additional options that might help on Windows:
        pageSize: "A4",
        marginsType: 0, // Default margins
        copies: 1,
      };

      console.log("Attempting to print with options:", printOptions);

      win.webContents.print(printOptions, (success, error) => {
        console.log(`Print result - Success: ${success}, Error: ${error}`);
        resolve(success);
      });
    });

    return {
      success: printSuccess,
      printerUsed: targetPrinter.name,
      printerStatus: targetPrinter.status,
      availablePrinters: printers.map((p) => p.name),
    };
  } catch (error) {
    console.error("Print error:", error);
    return {
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  } finally {
    setTimeout(() => win.destroy(), 1000);
  }
});
// Helper to identify failure stage
function getErrorStage() {
  if (!console.log.toString().includes("log 3")) return "loading-content";
  if (!console.log.toString().includes("log 5")) return "fetching-printers";
  return "print-dialog";
}
// Close the database when the app exits
process.on("exit", () => {
  db.close();
});
