-- Migration: create_experiences
-- Nunca edites una migración ya mergeada: crea una nueva.

CREATE TABLE experiences (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('jet', 'yacht', 'camper')),
  vehicle TEXT NOT NULL,
  location TEXT NOT NULL,
  service_at INTEGER NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  offer_active INTEGER NOT NULL DEFAULT 0 CHECK (offer_active IN (0, 1)),
  offer_expires_at INTEGER NOT NULL,
  offer_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (offer_type IN ('standard', 'empty_leg', 'last_minute'))
) STRICT;
