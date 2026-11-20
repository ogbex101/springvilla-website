export const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const adminCreds = { email: process.env.E2E_ADMIN_EMAIL ?? "", password: process.env.E2E_ADMIN_PASSWORD ?? "" };
export const hasAdmin = hasSupabase && Boolean(adminCreds.email && adminCreds.password);
export const PUBLIC_ROUTES = ["/", "/discover", "/our-system", "/our-system/digital-skills", "/our-system/business", "/life-here", "/stories-and-ideas", "/ideas", "/journeys", "/news", "/events", "/offices", "/join", "/contact", "/faq", "/privacy", "/terms"];

import { createHmac } from "node:crypto";

/** RFC 6238 TOTP (SHA-1, 30s, 6 digits) from a base32 secret, for super-admin MFA in tests. */
export function totp(secretBase32: string, at = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = secretBase32.replace(/[\s=-]/g, "").toUpperCase();
  let bits = "";
  for (const ch of clean) {
    const v = alphabet.indexOf(ch);
    if (v < 0) throw new Error("E2E_ADMIN_TOTP_SECRET is not valid base32");
    bits += v.toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}
export const totpSecret = process.env.E2E_ADMIN_TOTP_SECRET ?? "";
