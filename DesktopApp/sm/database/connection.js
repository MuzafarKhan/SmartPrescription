const sqlite3 = require("sqlite3").verbose();
const common = require("../common");

let db = null;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(common.getdbFilePath());
  }
  return db;
}

function runExec(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastInsertRowid: this.lastInsertRowid });
    });
  });
}

function getFreeBytes() {
  return new Promise((resolve, reject) => {
    getDatabase().get(
      "SELECT freelist_count * page_size AS free_bytes FROM pragma_freelist_count(), pragma_page_size()",
      (err, row) => {
        if (err) reject(err);
        else resolve(Number(row?.free_bytes ?? 0));
      }
    );
  });
}

async function compactDatabase() {
  const freeBytes = await getFreeBytes();
  await runExec("VACUUM");
  return { vacuumed: true, freeBytes };
}

module.exports = { getDatabase, getFreeBytes, compactDatabase };
