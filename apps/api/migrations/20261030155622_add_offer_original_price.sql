-- Migration: add_offer_original_price
-- Nunca edites una migración ya mergeada: crea una nueva.

-- Precio antes del descuento de una oferta (JS-001.b). price_cents sigue siendo el
-- precio que se paga; NULL significa que no hay descuento.
ALTER TABLE experiences ADD COLUMN original_price_cents INTEGER
  CHECK (original_price_cents IS NULL OR original_price_cents >= 0);
