-- Datos de demo de dev (SP-001.b). Todo es ficticio: no hay marcas, matrículas ni personas reales.
-- Las fechas son relativas al momento de carga para que la demo tenga siempre
-- experiencias futuras tras un "Reset dev DB"; con los días, las primeras irán caducando.
-- Por categoría: 3 disponibles, 1 con la oferta caducada y 1 con el servicio ya pasado.

-- Permite volver a cargar el seed sin chocar con los ids fijos.
DELETE FROM experiences;

INSERT INTO experiences
  (id, title, description, category, vehicle, location, service_at, capacity,
   price_cents, published, offer_active, offer_expires_at, offer_type)
VALUES
  -- Jets
  (1, 'Vuelo privado a Palma',
   'Vuelo directo de ida en jet ligero, con salida desde terminal privada.',
   'jet', 'Jet ligero de 6 plazas', 'Madrid → Palma',
   unixepoch('now', '+3 days'), 6, 1250000, 1, 1, unixepoch('now', '+2 days'), 'standard'),
  (2, 'Empty leg Barcelona – Niza',
   'Tramo de reposicionamiento con descuento. Horario cerrado por el operador.',
   'jet', 'Jet medio de 8 plazas', 'Barcelona → Niza',
   unixepoch('now', '+5 days'), 8, 690000, 1, 1, unixepoch('now', '+4 days'), 'empty_leg'),
  (3, 'Escapada a Ibiza de última hora',
   'Plazas libres en un vuelo de fin de semana. Precio por el avión completo.',
   'jet', 'Turbohélice de 7 plazas', 'Valencia → Ibiza',
   unixepoch('now', '+2 days'), 7, 480000, 1, 1, unixepoch('now', '+1 day'), 'last_minute'),
  (4, 'Empty leg Sevilla – Lisboa',
   'Oferta de reposicionamiento que ya ha caducado.',
   'jet', 'Jet ligero de 6 plazas', 'Sevilla → Lisboa',
   unixepoch('now', '+6 days'), 6, 520000, 1, 1, unixepoch('now', '-1 day'), 'empty_leg'),
  (5, 'Vuelo a Menorca',
   'Vuelo que ya se ha realizado.',
   'jet', 'Jet medio de 8 plazas', 'Bilbao → Menorca',
   unixepoch('now', '-3 days'), 8, 1100000, 1, 1, unixepoch('now', '-4 days'), 'standard'),

  -- Yates
  (6, 'Día de navegación por la costa de Ibiza',
   'Salida de 8 horas con patrón y tripulación, con parada para baño en calas.',
   'yacht', 'Yate a motor de 24 m', 'Ibiza',
   unixepoch('now', '+4 days'), 10, 650000, 1, 1, unixepoch('now', '+3 days'), 'standard'),
  (7, 'Puesta de sol en la bahía de Palma',
   'Travesía de tarde de 3 horas con aperitivo a bordo.',
   'yacht', 'Velero de 18 m', 'Palma',
   unixepoch('now', '+1 day'), 8, 180000, 1, 1, unixepoch('now', '+12 hours'), 'last_minute'),
  (8, 'Fin de semana por la Costa Brava',
   'Dos días de navegación con noche fondeados y tripulación incluida.',
   'yacht', 'Catamarán de 15 m', 'Roses → Cadaqués',
   unixepoch('now', '+9 days'), 6, 940000, 1, 1, unixepoch('now', '+7 days'), 'standard'),
  (9, 'Travesía a Formentera',
   'Oferta de travesía que ya ha caducado.',
   'yacht', 'Yate a motor de 20 m', 'Ibiza → Formentera',
   unixepoch('now', '+5 days'), 9, 420000, 1, 1, unixepoch('now', '-2 days'), 'last_minute'),
  (10, 'Ruta por Cabo de Gata',
   'Salida que ya se ha realizado.',
   'yacht', 'Velero de 14 m', 'Almería',
   unixepoch('now', '-2 days'), 6, 230000, 1, 1, unixepoch('now', '-3 days'), 'standard'),

  -- Autocaravanas
  (11, 'Ruta por los Picos de Europa',
   'Autocaravana equipada durante 5 días, con kilometraje ilimitado.',
   'camper', 'Autocaravana integral de 4 plazas', 'Oviedo',
   unixepoch('now', '+6 days'), 4, 210000, 1, 1, unixepoch('now', '+5 days'), 'standard'),
  (12, 'Costa da Morte en camper',
   'Furgoneta camper para una semana, recogida y entrega en Santiago.',
   'camper', 'Furgoneta camper de 2 plazas', 'Santiago de Compostela',
   unixepoch('now', '+3 days'), 2, 145000, 1, 1, unixepoch('now', '+2 days'), 'last_minute'),
  (13, 'Pirineo aragonés en familia',
   'Autocaravana perfilada de 6 plazas para 4 días por valles y pueblos de montaña.',
   'camper', 'Autocaravana perfilada de 6 plazas', 'Huesca',
   unixepoch('now', '+10 days'), 6, 180000, 1, 1, unixepoch('now', '+8 days'), 'standard'),
  (14, 'Ruta por la Alpujarra',
   'Oferta de alquiler que ya ha caducado.',
   'camper', 'Furgoneta camper de 4 plazas', 'Granada',
   unixepoch('now', '+4 days'), 4, 120000, 1, 1, unixepoch('now', '-1 day'), 'standard'),
  (15, 'Vuelta por la Costa Vasca',
   'Alquiler que ya se ha realizado.',
   'camper', 'Autocaravana integral de 4 plazas', 'San Sebastián',
   unixepoch('now', '-5 days'), 4, 160000, 1, 1, unixepoch('now', '-6 days'), 'standard');

-- Precio original de las ofertas flash y empty-leg (JS-001.b). Las 4 y 9 están caducadas;
-- las standard no tienen descuento.
UPDATE experiences SET original_price_cents = CASE id
  WHEN 2 THEN 980000
  WHEN 3 THEN 690000
  WHEN 4 THEN 760000
  WHEN 7 THEN 250000
  WHEN 9 THEN 560000
  WHEN 12 THEN 195000
END
WHERE id IN (2, 3, 4, 7, 9, 12);
