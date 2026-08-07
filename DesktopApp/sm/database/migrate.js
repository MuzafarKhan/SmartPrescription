const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

function getDbPath() {
  const dbArgIndex = process.argv.indexOf("--db");
  if (dbArgIndex !== -1 && process.argv[dbArgIndex + 1]) {
    return path.resolve(process.argv[dbArgIndex + 1]);
  }
  return path.join(__dirname, "..", "preData.db");
}

function run(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getAppliedMigrations(db) {
  return new Promise((resolve, reject) => {
    db.all("SELECT name FROM schema_migrations ORDER BY name", (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map((r) => r.name));
    });
  });
}

function recordMigration(db, name) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO schema_migrations (name, applied_at) VALUES (?, datetime('now'))",
      [name],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function getMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function migrate() {
  const dbPath = getDbPath();

  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    process.exit(1);
  }

  const db = new sqlite3.Database(dbPath);

  try {
    await run(
      db,
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
      )`
    );

    const applied = await getAppliedMigrations(db);
    const files = getMigrationFiles();
    const pending = files.filter((f) => !applied.includes(f));

    if (!pending.length) {
      console.log("No pending migrations.");
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`Applying ${file}...`);
      await run(db, "BEGIN");
      try {
        await run(db, sql);
        await recordMigration(db, file);
        await run(db, "COMMIT");
        console.log(`Applied ${file}`);
      } catch (err) {
        await run(db, "ROLLBACK");
        throw err;
      }
    }

    console.log(`Done. ${pending.length} migration(s) applied.`);
  } finally {
    db.close();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
