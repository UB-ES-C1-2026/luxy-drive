import { fromBase64Url, toBase64Url } from "./encoding";

// 100 000 is the PBKDF2 ceiling in Workers (see SP-002 in the README).
const ITERATIONS = 100_000;
const encoder = new TextEncoder();
// Workers extension to Web Crypto; the web app also type-checks this file with DOM types.
const subtle = crypto.subtle as SubtleCrypto & {
  timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean;
};

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

// Hash of a password nobody has: an unknown email costs the same as a wrong password.
const DUMMY_HASH = `v1$pbkdf2-sha256$${ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;

export async function verifyPassword(password: string, stored: string | null, pepper: string) {
  const [version, algorithm, iterations, salt, hash] = (stored ?? DUMMY_HASH).split("$");
  if (version !== "v1" || algorithm !== "pbkdf2-sha256" || !iterations || !salt || !hash) {
    return false;
  }
  const expected = fromBase64Url(hash);
  const actual = await derive(password, fromBase64Url(salt), Number(iterations), pepper);
  const equal =
    actual.byteLength === expected.byteLength && subtle.timingSafeEqual(actual, expected);
  return stored !== null && equal;
}
