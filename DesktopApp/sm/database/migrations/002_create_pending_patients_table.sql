CREATE TABLE IF NOT EXISTS pending_patients (
  prescription_unique_id TEXT PRIMARY KEY,
  patient_name TEXT NOT NULL,
  patient_age TEXT,
  checkup_date TEXT,
  is_printed INTEGER NOT NULL DEFAULT 0,
  prescription_data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pending_patients_is_printed ON pending_patients(is_printed);
CREATE INDEX IF NOT EXISTS idx_pending_patients_updated_at ON pending_patients(updated_at);
