const { ipcMain } = require("electron");
const { getDatabase } = require("../database/connection");
const { reserveMrNumber } = require("../database/mr-number");

const db = getDatabase();

function runGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function runAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runExec(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastInsertRowid: this.lastInsertRowid });
    });
  });
}

ipcMain.handle("save-pending-patient", async (event, prescriptionData) => {
  const info = prescriptionData?.patientInformation;
  if (!info?.prescriptionUniqueId || !info?.patientname) {
    throw new Error("Invalid pending patient data");
  }

  let mrNumber = info.mrNumber?.trim() || "";
  mrNumber = await reserveMrNumber(mrNumber || "");
  info.mrNumber = mrNumber;
  prescriptionData.patientInformation = info;

  const sql = `
    INSERT INTO pending_patients (
      prescription_unique_id, mr_number, patient_name, patient_age, checkup_date,
      is_printed, prescription_data, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(prescription_unique_id) DO UPDATE SET
      mr_number = excluded.mr_number,
      patient_name = excluded.patient_name,
      patient_age = excluded.patient_age,
      checkup_date = excluded.checkup_date,
      is_printed = excluded.is_printed,
      prescription_data = excluded.prescription_data,
      updated_at = datetime('now')
  `;

  await runExec(sql, [
    info.prescriptionUniqueId.trim(),
    mrNumber,
    info.patientname.trim(),
    info.patientage || "",
    info.checkupDate || "",
    info.isPrinted ? 1 : 0,
    JSON.stringify(prescriptionData),
  ]);

  return { success: true, mrNumber };
});

const SORT_EXPRESSIONS = {
  mr_number: "mr_number",
  patient_name: "patient_name",
  patient_age: "CAST(NULLIF(patient_age, '') AS INTEGER)",
  checkup_date:
    "substr(checkup_date, 7, 4) || substr(checkup_date, 4, 2) || substr(checkup_date, 1, 2)",
  is_printed: "is_printed",
};

function buildOrderByClause(sortField, sortDir) {
  const expr = SORT_EXPRESSIONS[sortField];
  if (!expr) {
    return "is_printed DESC, updated_at DESC";
  }

  const direction = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";
  return `${expr} ${direction}, updated_at DESC`;
}

function escapeLikeTerm(term) {
  return String(term).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function buildPendingSearchClause(search) {
  const term = String(search || "").trim();
  if (!term) {
    return { clause: "", params: [] };
  }

  const like = `%${escapeLikeTerm(term)}%`;
  return {
    clause: ` WHERE (
      mr_number LIKE ? ESCAPE '\\'
      OR patient_name LIKE ? ESCAPE '\\'
      OR patient_age LIKE ? ESCAPE '\\'
      OR checkup_date LIKE ? ESCAPE '\\'
    )`,
    params: [like, like, like, like],
  };
}

ipcMain.handle(
  "get-pending-patients",
  async (event, { page = 1, pageSize = 25, sortField, sortDir, search } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 25));
  const offset = (safePage - 1) * safePageSize;
  const orderBy = buildOrderByClause(sortField, sortDir);
  const { clause, params } = buildPendingSearchClause(search);

  const countRow = await runGet(
    `SELECT COUNT(*) AS total FROM pending_patients${clause}`,
    params
  );
  const rows = await runAll(
    `SELECT prescription_unique_id, mr_number, patient_name, patient_age, checkup_date, is_printed
     FROM pending_patients
     ${clause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, safePageSize, offset]
  );

  return {
    rows: rows.map((row) => ({
      prescriptionUniqueId: row.prescription_unique_id,
      mrNumber: row.mr_number,
      patientname: row.patient_name,
      patientage: row.patient_age,
      checkupDate: row.checkup_date,
      isPrinted: row.is_printed === 1,
    })),
    total: Number(countRow?.total ?? 0),
    page: safePage,
    pageSize: safePageSize,
  };
});

ipcMain.handle("get-pending-patient-by-id", async (event, prescriptionUniqueId) => {
  const row = await runGet(
    "SELECT prescription_data, mr_number FROM pending_patients WHERE prescription_unique_id = ?",
    [prescriptionUniqueId]
  );

  if (!row) return null;
  const data = JSON.parse(row.prescription_data);
  if (data?.patientInformation && row.mr_number && !data.patientInformation.mrNumber) {
    data.patientInformation.mrNumber = row.mr_number;
  }
  return data;
});

ipcMain.handle("delete-pending-patient", async (event, prescriptionUniqueId) => {
  const result = await runExec(
    "DELETE FROM pending_patients WHERE prescription_unique_id = ?",
    [prescriptionUniqueId]
  );
  return { changes: result.changes };
});

ipcMain.handle("clear-pending-patients", async () => {
  const result = await runExec("DELETE FROM pending_patients");
  return { changes: result.changes };
});

ipcMain.handle("get-pending-patient-count", async () => {
  const row = await runGet("SELECT COUNT(*) AS total FROM pending_patients");
  return Number(row?.total ?? 0);
});
