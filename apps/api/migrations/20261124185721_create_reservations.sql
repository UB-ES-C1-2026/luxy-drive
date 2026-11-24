-- Migration: create_reservations
-- Nunca edites una migración ya mergeada: crea una nueva.

-- Solicitudes de reserva (US-018.b), con las reglas de SP-003. Una reserva es privada y
-- completa: un solo cliente se queda la experiencia. Fechas en segundos Unix UTC.
CREATE TABLE reservations (
  id INTEGER PRIMARY KEY,
  experience_id INTEGER NOT NULL REFERENCES experiences (id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  -- Precio al solicitar: US-013 permite corregir el de un anuncio publicado.
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  created_at INTEGER NOT NULL,
  -- Cuándo la resolvió el proveedor; NULL mientras está pendiente.
  decided_at INTEGER,
  CHECK ((status = 'pending') = (decided_at IS NULL))
) STRICT;

-- Nunca dos confirmadas para la misma experiencia, aunque dos peticiones compitan.
CREATE UNIQUE INDEX reservations_one_confirmed
  ON reservations (experience_id) WHERE status = 'confirmed';

-- Un cliente solo tiene una solicitud pendiente por experiencia.
CREATE UNIQUE INDEX reservations_one_pending_per_client
  ON reservations (experience_id, client_id) WHERE status = 'pending';

CREATE INDEX reservations_experience_id ON reservations (experience_id);
CREATE INDEX reservations_client_id ON reservations (client_id);
