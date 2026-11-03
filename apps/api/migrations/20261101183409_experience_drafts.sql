-- Migration: experience_drafts
-- Nunca edites una migración ya mergeada: crea una nueva.

-- Borradores de anuncios (US-009.b). Un borrador solo necesita el título, pero el
-- esquema original exigía todos los campos. SQLite no permite quitar un NOT NULL, así
-- que se rehace la tabla y se copian los datos. Cada anuncio pasa a tener proveedor
-- (NULL en los datos de demo, que no pertenecen a nadie).
-- Un anuncio publicado sigue teniendo todos los campos: el catálogo y el detalle nunca
-- reciben uno incompleto, y el código anterior a esta migración sigue funcionando.
CREATE TABLE experiences_new (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('jet', 'yacht', 'camper')),
  vehicle TEXT,
  location TEXT,
  service_at INTEGER,
  capacity INTEGER CHECK (capacity > 0),
  price_cents INTEGER CHECK (price_cents >= 0),
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  offer_active INTEGER NOT NULL DEFAULT 0 CHECK (offer_active IN (0, 1)),
  offer_expires_at INTEGER,
  offer_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (offer_type IN ('standard', 'empty_leg', 'last_minute')),
  original_price_cents INTEGER
    CHECK (original_price_cents IS NULL OR original_price_cents >= 0),
  provider_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
  CHECK (
    published = 0 OR (
      description IS NOT NULL AND category IS NOT NULL AND vehicle IS NOT NULL
      AND location IS NOT NULL AND service_at IS NOT NULL AND capacity IS NOT NULL
      AND price_cents IS NOT NULL AND offer_expires_at IS NOT NULL
    )
  )
) STRICT;

INSERT INTO experiences_new
  (id, title, description, category, vehicle, location, service_at, capacity,
   price_cents, published, offer_active, offer_expires_at, offer_type, original_price_cents)
SELECT id, title, description, category, vehicle, location, service_at, capacity,
       price_cents, published, offer_active, offer_expires_at, offer_type, original_price_cents
FROM experiences;

DROP TABLE experiences;
ALTER TABLE experiences_new RENAME TO experiences;

CREATE INDEX experiences_provider_id ON experiences (provider_id);
