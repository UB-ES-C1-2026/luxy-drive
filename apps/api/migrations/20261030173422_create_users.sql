-- Migration: create_users
-- Nunca edites una migración ya mergeada: crea una nueva.

-- The role column and sessions come later, once SP-002 decides them.
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL
) STRICT;
