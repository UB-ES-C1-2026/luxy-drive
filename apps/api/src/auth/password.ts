import { toBase64Url } from "./encoding";

// 100 000 is the PBKDF2 ceiling in Workers (see SP-002 in the README).
const ITERATIONS = 100_000;
const encoder = new TextEncoder();

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  pepper: string,
) {
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const peppered = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(password));
  const key = await crypto.subtle.importKey("raw", peppered, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, pepper: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS, pepper);
  return `v1$pbkdf2-sha256$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}
