const { getDatabase } = require("./connection");

const MR_START = 31111;

function runGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function runAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runExec(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

function parseMrNumber(mrNumber) {
  if (!mrNumber) return null;
  const match = String(mrNumber).trim().match(/(\d+)\s*$/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function formatMrNumber(value) {
  return `MR ${String(value).padStart(10, "0")}`;
}

async function getMaxUsedMrNumeric() {
  const rows = await runAll(
    `SELECT mr_number FROM pending_patients
     WHERE mr_number IS NOT NULL AND trim(mr_number) != ''
     UNION ALL
     SELECT mr_number FROM patients
     WHERE mr_number IS NOT NULL AND trim(mr_number) != ''`
  );

  let maxUsed = MR_START - 1;
  for (const row of rows) {
    const numeric = parseMrNumber(row.mr_number);
    if (numeric !== null && numeric > maxUsed) {
      maxUsed = numeric;
    }
  }
  return maxUsed;
}

async function getNextMrNumeric() {
  const maxUsed = await getMaxUsedMrNumeric();
  return Math.max(MR_START, maxUsed + 1);
}

async function ensureSeqAtLeast(nextValue) {
  const seqRow = await runGet("SELECT next_value FROM mr_number_seq WHERE id = 1");
  if (!seqRow) {
    throw new Error("MR number sequence is not initialized");
  }
  if (nextValue > seqRow.next_value) {
    await runExec("UPDATE mr_number_seq SET next_value = ? WHERE id = 1", [nextValue]);
  }
}

/** Show on form only — does not consume the number. */
async function peekNextMrNumber() {
  const next = await getNextMrNumeric();
  return formatMrNumber(next);
}

/** Assign on save — uses existing MR from form or takes next available. */
async function reserveMrNumber(mrNumberFromForm) {
  const trimmed = mrNumberFromForm?.trim();
  if (trimmed) {
    const numeric = parseMrNumber(trimmed);
    if (numeric === null) {
      throw new Error("Invalid MR number");
    }
    await ensureSeqAtLeast(numeric + 1);
    return trimmed;
  }

  const next = await getNextMrNumeric();
  await runExec("UPDATE mr_number_seq SET next_value = ? WHERE id = 1", [next + 1]);
  return formatMrNumber(next);
}

module.exports = {
  MR_START,
  formatMrNumber,
  parseMrNumber,
  peekNextMrNumber,
  reserveMrNumber,
};
