-- Migration: create_users
-- Nunca edites una migración ya mergeada: crea una nueva.

-- Auth contract decided in SP-002 (README).
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client', 'provider'))
) STRICT;

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
) STRICT;

CREATE INDEX sessions_user_id ON sessions (user_id);
