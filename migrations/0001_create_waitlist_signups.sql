CREATE TABLE IF NOT EXISTS waitlist_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  phone TEXT,
  consent INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'pingloapp.com',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created_at
ON waitlist_signups (created_at);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_email
ON waitlist_signups (email);
