import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.LINK_SECRET || "";

/** Short HMAC over the question. Links made on the site carry it; only those may spin a VM. */
export function sign(q: string): string {
  if (!secret()) return "";
  return createHmac("sha256", secret()).update(q).digest("base64url").slice(0, 24);
}

export function verify(q: string, s: string | undefined): boolean {
  const want = sign(q);
  if (!want || !s || s.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(s), Buffer.from(want));
}
