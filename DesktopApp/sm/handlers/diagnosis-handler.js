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
      "SELECT id as Id, name FROM diagnosis WHERE name LIKE ?",
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

ipcMain.handle("get-diagnosis-by-id", async (event, id) => {
  console.log("Query received:", id);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id as Id, name from diagnosis WHERE Id = ?",
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

ipcMain.handle("add-diagnosis", async (event, name) => {
  const stmt = db.prepare("INSERT INTO diagnosis (name) VALUES (?)");
  const result = stmt.run(name);
  return result.lastInsertRowid;
});

ipcMain.handle("update-diagnosis", async (event, id, name) => {
  const stmt = db.prepare("UPDATE diagnosis SET name = ?  WHERE id = ?");
  const result = stmt.run(name, id);
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
          console.log("Database rows:", rows);
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

  // Delete existing medicines for the diagnosis ID
  const deleteMedicines = () => {
    return new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM diagnosis_medicine WHERE diagnosisid = ?",
        [id],
        function (err) {
          if (err) reject(err);
          resolve(); // Resolve when deletion is successful
        }
      );
    });
  };

  const insertIntoExistingMedicine = (medicine) => {
    const {
      medicinename,
      morning,
      afternoon,
      night,
      beforemeal,
      durationnumber,
      duration,
      medicinetype,
      quantity,
      moredetail,
    } = medicine;

    console.log(medicinename + "________________________" + medicinename);

    return new Promise((resolve, reject) => {
      // First, check if the medicine already exists
      db.get(
        "SELECT * FROM medicine WHERE medicinename = ?",
        [medicinename],
        (err, row) => {
          if (err) {
            reject(err); // Handle errors from SELECT
            return;
          }

          if (row) {
            console.log(
              `Medicine '${medicinename}' already exists. Skipping insertion.`
            );
            resolve({ message: `Medicine '${medicinename}' already exists.` });
          } else {
            // If it doesn't exist, insert it
            db.run(
              "INSERT INTO medicine (medicinename, morning, afternoon, night, beforemeal, durationnumber, duration, medicinetype, quantity, moredetail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                medicinename,
                morning,
                afternoon,
                night,
                beforemeal,
                durationnumber,
                duration,
                medicinetype,
                quantity,
                moredetail,
              ],
              function (err) {
                if (err) {
                  reject(err); // Handle errors from INSERT
                } else {
                  resolve({
                    id: this.lastID,
                    message: `Medicine '${medicinename}' inserted.`,
                  });
                }
              }
            );
          }
        }
      );
    });
  };

  const insertMedicine = (medicine) => {
    const {
      medicinename,
      morning,
      afternoon,
      night,
      beforemeal,
      durationnumber,
      duration,
      medicinetype,
      quantity,
      moredetail,
    } = medicine;
    console.log(medicinename + "________________________" + medicinename);

    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO diagnosis_medicine (diagnosisid, medicinename, morning, afternoon, night, beforemeal, durationnumber, duration, medicinetype, quantity, moredetail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          medicinename,
          morning,
          afternoon,
          night,
          beforemeal,
          durationnumber,
          duration,
          medicinetype,
          quantity,
          moredetail,
        ],
        function (err) {
          if (err) reject(err);
          resolve({ id: this.lastID });
        }
      );
    });
  };

  try {
    // Step 1: Delete existing medicines
    await deleteMedicines();

    // Step 2: Insert new medicines
    const results = [];
    for (const medicine of medicines) {
      const result = await insertMedicine(medicine);
      results.push(result);
    }

    // Step 2: Insert new medicines
    for (const medicine of medicines) {
      const result = await insertIntoExistingMedicine(medicine);
    }

    return results; // Return an array of results with IDs for all inserted medicines
  } catch (error) {
    console.error("Error attaching medicines:", error);
    throw error;
  }
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
          console.log("Database rows:", rows);
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
      const { title, correctway, incorrectway } = patientinstruction;

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
                "INSERT INTO patient_instruction (title, correctway, incorrectway) VALUES (?, ?, ?)",
                [title, correctway, incorrectway],
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
      const { title, correctway, incorrectway } = patientinstruction;
      return new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO diagnosis_patient_instruction (diagnosisid, title, correctway, incorrectway) VALUES (?, ?, ?, ?)",
          [id, title, correctway, incorrectway],
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
