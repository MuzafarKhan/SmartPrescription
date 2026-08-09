const { ipcMain } = require("electron");
const { getDatabase } = require("../database/connection");
const db = getDatabase();

ipcMain.handle("get-medicine", async () => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("SELECT * FROM medicine");
    stmt.all((err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle("get-medicine-by-name", async (event, name) => {
  console.log("Query received:", name);
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id as Id, medicinename as Name
       FROM medicine
       WHERE medicinename LIKE ? OR medicinegenericname LIKE ?`,
      [`%${name}%`, `%${name}%`],
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

ipcMain.handle("get-medicine-by-id", async (event, id) => {
  console.log("Query received:", id);
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM medicine WHERE Id = ?", [`${id}`], (err, rows) => {
      if (err) {
        console.error("Database error:", err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle("add-medicine", async (event, medicine) => {
  const {
    medicineName,
    medicineGenericName,
    timingType,
    morning,
    afternoon,
    night,
    isPrintableOnPrescription,
    durationnumber,
    duration,
    medicineType,
    injType,
    quantity,
    moreDetails,
  } = medicine;
  console.log(medicine);

  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO medicine (medicinename, medicinegenericname, timingType, morning, afternoon, night, isPrintableOnPrescription, durationnumber, duration, medicinetype, injType, quantity, moredetail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        medicineName,
        medicineGenericName || "",
        timingType,
        morning,
        afternoon,
        night,
        isPrintableOnPrescription,
        durationnumber,
        duration,
        medicineType,
        injType,
        quantity,
        moreDetails,
      ],
      function (err) {
        if (err) reject(err);
        resolve({ id: this.lastID });
      }
    );
  });
});

ipcMain.handle("update-medicine-by-id", (event, id, medicine) => {
  const {
    medicineName,
    medicineGenericName,
    timingType,
    morning,
    afternoon,
    night,
    isPrintableOnPrescription,
    durationnumber,
    duration,
    medicineType,
    injType,
    quantity,
    moreDetails,
  } = medicine;
  console.log(medicine);
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE medicine SET medicinename = ?, medicinegenericname = ?, timingType = ?, morning = ?, afternoon = ?, night = ?, isPrintableOnPrescription = ?, durationnumber = ?, duration = ?, medicinetype = ?, injType = ?, quantity = ?, moredetail = ? WHERE id = ?",
      [
        medicineName,
        medicineGenericName || "",
        timingType,
        morning,
        afternoon,
        night,
        isPrintableOnPrescription,
        durationnumber,
        duration,
        medicineType,
        injType,
        quantity,
        moreDetails,
        id,
      ],
      function (err) {
        if (err) reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
});

ipcMain.handle("delete-medicine-by-id", async (event, id) => {
  const stmt = db.prepare("DELETE FROM medicine WHERE id = ?");
  const result = stmt.run(id);
  stmt.finalize();
  return result.changes;
});
