const madridOffset = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Madrid",
  timeZoneName: "longOffset",
});

// Minutes Madrid is ahead of UTC at that instant (+60 in winter, +120 in summer).
function offsetMinutes(utcMs: number) {
  const name = madridOffset.formatToParts(utcMs).find((part) => part.type === "timeZoneName");
  const [, sign, hours, minutes] = name?.value.match(/GMT([+-])(\d{2}):(\d{2})/) ?? [];
  return (sign === "-" ? -1 : 1) * (Number(hours ?? 0) * 60 + Number(minutes ?? 0));
}

// "2026-11-10T18:00" read as Madrid time, in Unix seconds. The second pass uses the
// offset of the real instant, which matters on the days the clocks change.
export function madridLocalToUnix(local: string) {
  const wall = Date.parse(`${local}:00Z`);
  const first = wall - offsetMinutes(wall) * 60_000;
  return (wall - offsetMinutes(first) * 60_000) / 1000;
}

export function isMadridLocalDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const date = new Date(`${value}:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
