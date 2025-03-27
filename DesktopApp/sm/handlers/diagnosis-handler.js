const { ipcMain } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const common = require("../common");
const db = new sqlite3.Database(common.getdbFilePath());

ipcMain.handle("get-diagnosis", async () => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("SELECT * FROM diagnosis");
    stmt.all((err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle("get-diagnosis-by-name", async (event, name) => {
  console.log("Query received:", name);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id as Id, name, nameAlter FROM diagnosis WHERE name LIKE ?",
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

ipcMain.handle("get-diagnosis-by-id", async (event, id) => {
  console.log("Query received:", id);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id as Id, name, nameAlter from diagnosis WHERE Id = ?",
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

ipcMain.handle("add-diagnosis", async (event, name, nameAlter) => {
  const stmt = db.prepare(
    "INSERT INTO diagnosis (name,nameAlter) VALUES (?,?)"
  );
  const result = stmt.run(name, nameAlter);
  return result.lastInsertRowid;
});

ipcMain.handle("update-diagnosis", async (event, id, name, nameAlter) => {
  const stmt = db.prepare(
    "UPDATE diagnosis SET name = ?, nameAlter = ?  WHERE id = ?"
  );
  const result = stmt.run(name, nameAlter, id);
  return result.changes;
});

ipcMain.handle("delete-diagnosis-by-id", async (event, id) => {
  const stmt = db.prepare("DELETE FROM diagnosis WHERE id = ?");
  const result = stmt.run(id);
  return result.changes;
});

ipcMain.handle(
  "get-attach-medicine-by-diagnosisIds",
  async (event, diagnosisIds) => {
    console.log("Query received:", diagnosisIds); // Log the comma-separated IDs
    return new Promise((resolve, reject) => {
      // Convert comma-separated IDs into an array and construct the placeholders for SQL query
      const placeholders = diagnosisIds
        .split(",")
        .map(() => "?")
        .join(",");

      // Prepare the query with IN operator
      const query = `SELECT * from diagnosis_medicine WHERE diagnosisid IN (${placeholders})`;

      db.all(query, diagnosisIds.split(","), (err, rows) => {
        if (err) {
          console.error("Database error:", err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
);

ipcMain.handle("attach-medicine", async (event, id, medicines) => {
  if (!Array.isArray(medicines)) {
    throw new Error("Invalid data: Expected an array of medicines.");
  }

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Delete existing medicines
      db.run(
        "DELETE FROM diagnosis_medicine WHERE diagnosisid = ?",
        [id],
        function (err) {
          if (err) {
            db.run("ROLLBACK");
            return reject(err);
          }

          // Insert new medicines
          const stmt = db.prepare(
            "INSERT INTO diagnosis_medicine (diagnosisid, medicinename, morning, afternoon, night, isPrintableOnPrescription, durationnumber, duration, medicinetype, quantity, moredetail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          );

          let hasError = false;
          medicines.forEach((medicine) => {
            if (hasError) return;

            stmt.run(
              [
                id,
                medicine.medicinename,
                medicine.morning,
                medicine.afternoon,
                medicine.night,
                medicine.isPrintableOnPrescription,
                medicine.durationnumber,
                medicine.duration,
                medicine.medicinetype,
                medicine.quantity,
                medicine.moredetail,
              ],
              function (err) {
                if (err) {
                  hasError = true;
                  db.run("ROLLBACK");
                  return reject(err);
                }
              }
            );
          });

          stmt.finalize();

          if (!hasError) {
            // Check/insert into medicine table
            const checkStmt = db.prepare(
              "INSERT OR IGNORE INTO medicine (medicinename, morning, afternoon, night, isPrintableOnPrescription, durationnumber, duration, medicinetype, quantity, moredetail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );

            medicines.forEach((medicine) => {
              if (hasError) return;

              checkStmt.run(
                [
                  medicine.medicinename,
                  medicine.morning,
                  medicine.afternoon,
                  medicine.night,
                  medicine.isPrintableOnPrescription,
                  medicine.durationnumber,
                  medicine.duration,
                  medicine.medicinetype,
                  medicine.quantity,
                  medicine.moredetail,
                ],
                function (err) {
                  if (err) {
                    hasError = true;
                    db.run("ROLLBACK");
                    return reject(err);
                  }
                }
              );
            });

            checkStmt.finalize();
          }

          if (!hasError) {
            db.run("COMMIT", (err) => {
              if (err) {
                db.run("ROLLBACK");
                reject(err);
              } else {
                resolve({ success: true, count: medicines.length });
              }
            });
          }
        }
      );
    });
  });
});

ipcMain.handle(
  "get-attach-patient-instruction-by-diagnosisIds",
  async (event, diagnosisIds) => {
    console.log("Query received:", diagnosisIds); // Log the comma-separated IDs
    return new Promise((resolve, reject) => {
      // Convert comma-separated IDs into an array and construct the placeholders for SQL query
      const placeholders = diagnosisIds
        .split(",")
        .map(() => "?")
        .join(",");

      // Prepare the query with IN operator
      const query = `SELECT * from diagnosis_patient_instruction WHERE diagnosisid IN (${placeholders})`;

      db.all(query, diagnosisIds.split(","), (err, rows) => {
        if (err) {
          console.error("Database error:", err);
          reject(err);
        } else {
          console.error("Database rows:", rows);
          resolve(rows);
        }
      });
    });
  }
);

ipcMain.handle(
  "attach-patient-instruction",
  async (event, id, patientinstructions) => {
    if (!Array.isArray(patientinstructions)) {
      throw new Error(
        "Invalid data: Expected an array of patient instruction."
      );
    }

    // Delete existing patientinstruction for the diagnosis ID
    const deletePatientInstructions = () => {
      return new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM diagnosis_patient_instruction WHERE diagnosisid = ?",
          [id],
          function (err) {
            if (err) reject(err);
            resolve(); // Resolve when deletion is successful
          }
        );
      });
    };

    const insertIntoExistingPatientInstruction = (patientinstruction) => {
      const { title, detail } = patientinstruction;

      return new Promise((resolve, reject) => {
        // First, check if the medicine already exists
        db.get(
          "SELECT * FROM patient_instruction WHERE title = ?",
          [title],
          (err, row) => {
            if (err) {
              reject(err); // Handle errors from SELECT
              return;
            }

            if (row) {
              console.log(
                `Patient Instruction '${title}' already exists. Skipping insertion.`
              );
              resolve({
                message: `Patient Instruction '${title}' already exists.`,
              });
            } else {
              // If it doesn't exist, insert it
              db.run(
                "INSERT INTO patient_instruction (title, detail) VALUES (?, ?, ?)",
                [title, detail],
                function (err) {
                  if (err) {
                    reject(err); // Handle errors from INSERT
                  } else {
                    resolve({
                      id: this.lastID,
                      message: `Patient Instruction  '${title}' inserted.`,
                    });
                  }
                }
              );
            }
          }
        );
      });
    };

    const insertPatientInstruction = (patientinstruction) => {
      const { title, detail } = patientinstruction;
      return new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO diagnosis_patient_instruction (diagnosisid, title, detail) VALUES (?, ?, ?, ?)",
          [id, title, detail],
          function (err) {
            if (err) reject(err);
            resolve({ id: this.lastID });
          }
        );
      });
    };

    try {
      // Step 1: Delete existing Patient Instruction
      await deletePatientInstructions();

      // Step 2: Insert new Patient Instruction
      const results = [];
      for (const patientinstruction of patientinstructions) {
        const result = await insertPatientInstruction(patientinstruction);
        results.push(result);
      }

      // Step 2: Insert new Patient Instruction
      for (const patientinstruction of patientinstructions) {
        const result = await insertIntoExistingPatientInstruction(
          patientinstruction
        );
      }

      return results; // Return an array of results with IDs for all inserted medicines
    } catch (error) {
      console.error("Error attaching medicines:", error);
      throw error;
    }
  }
);
