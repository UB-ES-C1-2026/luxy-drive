// "Available" as defined in US-001 (published, active offer, future service) plus SP-003:
// nobody holds a confirmed reservation for it. Use it in a query over `experiences` and
// bind the current Unix time twice, in this order.
export const AVAILABLE = `(experiences.published = 1 AND experiences.offer_active = 1
  AND experiences.offer_expires_at > ? AND experiences.service_at > ?
  AND NOT EXISTS (
    SELECT 1 FROM reservations
    WHERE reservations.experience_id = experiences.id AND reservations.status = 'confirmed'
  ))`;
