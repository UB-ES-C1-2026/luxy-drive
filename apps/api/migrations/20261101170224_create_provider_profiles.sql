-- Migration: create_provider_profiles
-- Nunca edites una migración ya mergeada: crea una nueva.


-- One company profile per provider account (US-008).
CREATE TABLE provider_profiles (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  trade_name TEXT NOT NULL,
  description TEXT NOT NULL,
  phone TEXT NOT NULL
) STRICT;
