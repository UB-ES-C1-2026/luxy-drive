// Crea una migración D1 con prefijo de fecha/hora para que dos PRs no choquen por número.
// Uso: pnpm db:new create_listings
import { writeFileSync } from "node:fs";

const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error("Uso: pnpm db:new <nombre_en_snake_case>");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const file = `apps/api/migrations/${stamp}_${name}.sql`;
writeFileSync(
  file,
  `-- Migration: ${name}\n-- Nunca edites una migración ya mergeada: crea una nueva.\n\n`,
  { flag: "wx" },
);
console.log(`Creada ${file}`);
