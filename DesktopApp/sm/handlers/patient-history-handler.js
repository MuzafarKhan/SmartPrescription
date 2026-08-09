const { ipcMain } = require("electron");
const { getDatabase } = require("../database/connection");

const { reserveMrNumber, peekNextMrNumber } = require("../database/mr-number");

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

function extractHistoryFields(prescriptionData) {
  const info = prescriptionData?.patientInformation || {};
  return {
    visitDate: info.checkupDate || "",
    patientAge: info.patientage || "",
    comorbidities: JSON.stringify({
      dm: !!info.dm,
      htn: !!info.htn,
      cva: !!info.cva,
      cad: !!info.cad,
      hepatitis: !!info.hepatitis,
      trauma: !!info.trauma,
    }),
    complaints: JSON.stringify(info.complaintData || []),
    diagnosis: JSON.stringify(info.selectedDiagnosis || []),
    investigations: JSON.stringify(info.selectedInvestigation || []),
    investigationDetail: info.investigationMoreDetail || "",
    plan: JSON.stringify(info.selectedPlan || []),
    medicines: JSON.stringify(info.selectedMedicines || []),
    rehabilitationAids: JSON.stringify(info.selectedRehabilitationAids || []),
    patientInstructions: JSON.stringify(info.selectedPatientInstructions || []),
    clinicalExam: JSON.stringify({
      gcs: info.gcs || "",
      bp: info.bp || "",
      powerUL1: info.powerUL1 || "",
      powerUL2: info.powerUL2 || "",
      powerLL1: info.powerLL1 || "",
      powerLL2: info.powerLL2 || "",
      sensations: info.sensations || "",
      feber: info.feber || "",
      reflexes: info.reflexes || "",
      sphincter: info.sphincter || "",
      slr: info.slr || "",
      PHALLENSIGN: !!info.PHALLENSIGN,
      TINNELSIGN: !!info.TINNELSIGN,
      SPERLINGSIGN: !!info.SPERLINGSIGN,
      HOFFSIGN: !!info.HOFFSIGN,
    }),
    surgery: JSON.stringify({
      laminectomy: !!info.laminectomy,
      tpf: !!info.tpf,
      craniotomy: !!info.craniotomy,
      vpshunt: !!info.vpshunt,
      mmc: !!info.mmc,
      unitsurgery: info.unitsurgery || "",
      durationsurgery: info.durationsurgery || "",
      patientSurgeryFurtherDetail: info.patientSurgeryFurtherDetail || "",
    }),
    followupUnit: info.defaultfollowupunit || "",
    followupDuration: info.defaultfollowupduration || "",
  };
}

const VISIT_COUNT_EXPR =
  "(SELECT COUNT(*) FROM patient_history ph WHERE ph.mr_number = p.mr_number)";

const PATIENT_SORT_EXPRESSIONS = {
  mr_number: "p.mr_number",
  patient_name: "p.patient_name",
  patient_age: "CAST(NULLIF(p.patient_age, '') AS INTEGER)",
  last_visit_date:
    "substr(p.last_visit_date, 7, 4) || substr(p.last_visit_date, 4, 2) || substr(p.last_visit_date, 1, 2)",
  visit_count: VISIT_COUNT_EXPR,
};

function buildPatientOrderBy(sortField, sortDir) {
  const expr = PATIENT_SORT_EXPRESSIONS[sortField];
  if (!expr) {
    return "p.last_visit_date DESC, p.updated_at DESC";
  }
  const direction = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";
  return `${expr} ${direction}, p.updated_at DESC`;
}

function escapeLikeTerm(term) {
  return String(term).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function buildPatientSearchClause(search) {
  const term = String(search || "").trim();
  if (!term) {
    return { clause: "", params: [] };
  }

  const like = `%${escapeLikeTerm(term)}%`;
  return {
    clause: ` WHERE (
      p.mr_number LIKE ? ESCAPE '\\'
      OR p.patient_name LIKE ? ESCAPE '\\'
      OR p.patient_age LIKE ? ESCAPE '\\'
    )`,
    params: [like, like, like],
  };
}

const VISIT_DATE_ORDER_SQL =
  "substr(visit_date, 7, 4) || substr(visit_date, 4, 2) || substr(visit_date, 1, 2) DESC, id DESC";

async function getPatientHistoryRetentionLimit() {
  const row = await runGet(
    "SELECT patientHistoryRetention FROM settings ORDER BY id DESC LIMIT 1"
  );
  const value = Number(row?.patientHistoryRetention);
  if (!Number.isFinite(value) || value < 1) {
    return 3;
  }
  return Math.min(Math.max(Math.floor(value), 1), 10);
}

async function trimPatientHistory(mrNumber, retentionLimit) {
  if (!mrNumber || retentionLimit < 1) {
    return;
  }

  await runExec(
    `DELETE FROM patient_history
     WHERE mr_number = ?
     AND id IN (
       SELECT id FROM (
         SELECT id FROM patient_history
         WHERE mr_number = ?
         ORDER BY ${VISIT_DATE_ORDER_SQL}
         LIMIT -1 OFFSET ?
       )
     )`,
    [mrNumber, mrNumber, retentionLimit]
  );

  await runExec(
    `UPDATE patients SET
       visit_count = (SELECT COUNT(*) FROM patient_history WHERE mr_number = ?),
       updated_at = datetime('now')
     WHERE mr_number = ?`,
    [mrNumber, mrNumber]
  );
}

ipcMain.handle("peek-next-mr-number", async () => {
  const mrNumber = await peekNextMrNumber();
  return { mrNumber };
});

ipcMain.handle("allocate-mr-number", async () => {
  const mrNumber = await peekNextMrNumber();
  return { mrNumber };
});

ipcMain.handle("complete-prescription", async (event, prescriptionData) => {
  const info = prescriptionData?.patientInformation;
  if (!info?.prescriptionUniqueId || !info?.patientname) {
    throw new Error("Invalid prescription data");
  }

  let mrNumber = info.mrNumber?.trim();
  if (!mrNumber) {
    mrNumber = await reserveMrNumber("");
  } else {
    mrNumber = await reserveMrNumber(mrNumber);
  }

  const fields = extractHistoryFields(prescriptionData);
  const prescriptionUniqueId = info.prescriptionUniqueId.trim();
  const patientName = info.patientname.trim();
  const patientAge = info.patientage || "";

  const existingVisit = await runGet(
    "SELECT mr_number FROM patient_history WHERE prescription_unique_id = ?",
    [prescriptionUniqueId]
  );
  if (existingVisit) {
    await runExec(
      "DELETE FROM pending_patients WHERE prescription_unique_id = ?",
      [prescriptionUniqueId]
    );
    return {
      success: true,
      mrNumber: existingVisit.mr_number,
      alreadyCompleted: true,
    };
  }

  await runExec("BEGIN TRANSACTION");
  try {
    const existingPatient = await runGet(
      "SELECT mr_number FROM patients WHERE mr_number = ?",
      [mrNumber]
    );

    if (existingPatient) {
      await runExec(
        `UPDATE patients SET
          patient_name = ?,
          patient_age = ?,
          last_visit_date = ?,
          visit_count = visit_count + 1,
          updated_at = datetime('now')
         WHERE mr_number = ?`,
        [patientName, patientAge, fields.visitDate, mrNumber]
      );
    } else {
      await runExec(
        `INSERT INTO patients (
          mr_number, patient_name, patient_age, first_visit_date, last_visit_date, visit_count
        ) VALUES (?, ?, ?, ?, ?, 1)`,
        [mrNumber, patientName, patientAge, fields.visitDate, fields.visitDate]
      );
    }

    await runExec(
      `INSERT INTO patient_history (
        mr_number, prescription_unique_id, visit_date, patient_age,
        comorbidities, complaints, diagnosis, investigations, investigation_detail,
        plan, medicines, rehabilitation_aids, patient_instructions,
        clinical_exam, surgery, followup_unit, followup_duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mrNumber,
        prescriptionUniqueId,
        fields.visitDate,
        fields.patientAge,
        fields.comorbidities,
        fields.complaints,
        fields.diagnosis,
        fields.investigations,
        fields.investigationDetail,
        fields.plan,
        fields.medicines,
        fields.rehabilitationAids,
        fields.patientInstructions,
        fields.clinicalExam,
        fields.surgery,
        fields.followupUnit,
        fields.followupDuration,
      ]
    );

    await runExec(
      "DELETE FROM pending_patients WHERE prescription_unique_id = ?",
      [prescriptionUniqueId]
    );

    const retentionLimit = await getPatientHistoryRetentionLimit();
    await trimPatientHistory(mrNumber, retentionLimit);

    await runExec("COMMIT");
    return { success: true, mrNumber };
  } catch (error) {
    await runExec("ROLLBACK");
    throw error;
  }
});

ipcMain.handle(
  "get-patient-history",
  async (event, { page = 1, pageSize = 25, sortField, sortDir, search } = {}) => {
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 25));
    const offset = (safePage - 1) * safePageSize;
    const orderBy = buildPatientOrderBy(sortField, sortDir);
    const { clause, params } = buildPatientSearchClause(search);

    const countRow = await runGet(
      `SELECT COUNT(*) AS total FROM patients p${clause}`,
      params
    );
    const rows = await runAll(
      `SELECT mr_number, patient_name, patient_age, last_visit_date,
              ${VISIT_COUNT_EXPR} AS visit_count
       FROM patients p
       ${clause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, safePageSize, offset]
    );

    return {
      rows: rows.map((row) => ({
        mrNumber: row.mr_number,
        patientname: row.patient_name,
        patientage: row.patient_age,
        lastVisitDate: row.last_visit_date,
        visitCount: row.visit_count,
      })),
      total: Number(countRow?.total ?? 0),
      page: safePage,
      pageSize: safePageSize,
    };
  }
);

ipcMain.handle("get-patient-visits", async (event, mrNumber) => {
  const rows = await runAll(
    `SELECT id, visit_date, patient_age, diagnosis, medicines, created_at
     FROM patient_history
     WHERE mr_number = ?
     ORDER BY substr(visit_date, 7, 4) || substr(visit_date, 4, 2) || substr(visit_date, 1, 2) DESC, id DESC`,
    [mrNumber]
  );

  return rows.map((row) => ({
    id: row.id,
    visitDate: row.visit_date,
    patientAge: row.patient_age,
    diagnosis: JSON.parse(row.diagnosis || "[]"),
    medicines: JSON.parse(row.medicines || "[]"),
    createdAt: row.created_at,
  }));
});

ipcMain.handle("get-patient-visit-by-id", async (event, visitId) => {
  const row = await runGet("SELECT * FROM patient_history WHERE id = ?", [visitId]);
  if (!row) return null;

  return {
    id: row.id,
    mrNumber: row.mr_number,
    prescriptionUniqueId: row.prescription_unique_id,
    visitDate: row.visit_date,
    patientAge: row.patient_age,
    comorbidities: JSON.parse(row.comorbidities || "{}"),
    complaints: JSON.parse(row.complaints || "[]"),
    diagnosis: JSON.parse(row.diagnosis || "[]"),
    investigations: JSON.parse(row.investigations || "[]"),
    investigationDetail: row.investigation_detail,
    plan: JSON.parse(row.plan || "[]"),
    medicines: JSON.parse(row.medicines || "[]"),
    rehabilitationAids: JSON.parse(row.rehabilitation_aids || "[]"),
    patientInstructions: JSON.parse(row.patient_instructions || "[]"),
    clinicalExam: JSON.parse(row.clinical_exam || "{}"),
    surgery: JSON.parse(row.surgery || "{}"),
    followupUnit: row.followup_unit,
    followupDuration: row.followup_duration,
    createdAt: row.created_at,
  };
});
