-- Migration: experience_withdrawn_at
-- Nunca edites una migración ya mergeada: crea una nueva.

-- Retirar un anuncio publicado (US-014.b). El anuncio sigue publicado, pero con la oferta
-- inactiva: deja de estar "disponible" (definición de US-001) y desaparece del catálogo,
-- de las ofertas y del detalle (410). withdrawn_at, en segundos Unix UTC, distingue un
-- anuncio retirado de uno publicado cuya oferta ha caducado. NULL = no retirado.
ALTER TABLE experiences ADD COLUMN withdrawn_at INTEGER;
