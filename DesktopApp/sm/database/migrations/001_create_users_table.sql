-- Login users table with default admin account
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

INSERT OR IGNORE INTO users (username, password) VALUES ('admin', 'admin123');
