-- MR number sequence (starts at MR 0000031111)
CREATE TABLE IF NOT EXISTS mr_number_seq (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_value INTEGER NOT NULL
);

INSERT OR IGNORE INTO mr_number_seq (id, next_value) VALUES (1, 31111);

-- Master patient record (one per MR number)
CREATE TABLE IF NOT EXISTS patients (
  mr_number TEXT PRIMARY KEY,
  patient_name TEXT NOT NULL,
  patient_age TEXT,
  first_visit_date TEXT,
  last_visit_date TEXT,
  visit_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Completed visit records (structured clinical data, not full prescription JSON)
CREATE TABLE IF NOT EXISTS patient_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mr_number TEXT NOT NULL,
  prescription_unique_id TEXT NOT NULL UNIQUE,
  visit_date TEXT,
  patient_age TEXT,
  comorbidities TEXT,
  complaints TEXT,
  diagnosis TEXT,
  investigations TEXT,
  investigation_detail TEXT,
  plan TEXT,
  medicines TEXT,
  rehabilitation_aids TEXT,
  patient_instructions TEXT,
  clinical_exam TEXT,
  surgery TEXT,
  followup_unit TEXT,
  followup_duration TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (mr_number) REFERENCES patients(mr_number)
);

CREATE INDEX IF NOT EXISTS idx_patient_history_mr ON patient_history(mr_number);
CREATE INDEX IF NOT EXISTS idx_patient_history_visit_date ON patient_history(visit_date);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(patient_name);
CREATE INDEX IF NOT EXISTS idx_patients_last_visit ON patients(last_visit_date);

ALTER TABLE pending_patients ADD COLUMN mr_number TEXT;
