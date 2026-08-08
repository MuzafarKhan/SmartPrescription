const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const common = require("../common");

const DEFAULT_MIN_FREE_BYTES = 10 * 1024 * 1024;

function openDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function getFreeBytes(db) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT freelist_count * page_size AS free_bytes FROM pragma_freelist_count(), pragma_page_size()",
      (err, row) => {
        if (err) reject(err);
        else resolve(Number(row?.free_bytes ?? 0));
      }
    );
  });
}

function runVacuum(db) {
  return new Promise((resolve, reject) => {
    db.run("VACUUM", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getDbPathFromArgs() {
  const dbArgIndex = process.argv.indexOf("--db");
  if (dbArgIndex !== -1 && process.argv[dbArgIndex + 1]) {
    return path.resolve(process.argv[dbArgIndex + 1]);
  }
  return common.getdbFilePath();
}

async function runVacuumIfNeeded(options = {}) {
  const minFreeBytes = options.minFreeBytes ?? DEFAULT_MIN_FREE_BYTES;
  const force = options.force === true;
  const dbPath = options.dbPath ?? common.getdbFilePath();

  const db = await openDatabase(dbPath);
  try {
    const freeBytes = await getFreeBytes(db);
    if (!force && freeBytes < minFreeBytes) {
      return { vacuumed: false, freeBytes, dbPath };
    }

    await runVacuum(db);
    return { vacuumed: true, freeBytes, dbPath };
  } finally {
    await closeDatabase(db);
  }
}

if (require.main === module) {
  const force = process.argv.includes("--force");
  const dbPath = getDbPathFromArgs();

  runVacuumIfNeeded({ dbPath, force, minFreeBytes: force ? 0 : DEFAULT_MIN_FREE_BYTES })
    .then((result) => {
      if (result.vacuumed) {
        console.log(
          `VACUUM complete (~${Math.round(result.freeBytes / 1024 / 1024)} MB reclaimed): ${result.dbPath}`
        );
      } else {
        console.log(`No VACUUM needed (${result.freeBytes} bytes free): ${result.dbPath}`);
      }
    })
    .catch((err) => {
      console.error("VACUUM failed:", err.message);
      process.exit(1);
    });
}

module.exports = { runVacuumIfNeeded, DEFAULT_MIN_FREE_BYTES };
