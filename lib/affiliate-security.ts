import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { AFFILIATE_POLICY } from "./affiliate-policy";

export const SESSION_COOKIE = "intervai_affiliate_session";
export const REFERRAL_COOKIE = "intervai_referral";
export const VISITOR_COOKIE = "intervai_visitor";
export const affiliateEnabled = () => process.env.AFFILIATE_ENABLED === "true";
export const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const secret = () => {
  const value =
    process.env.AFFILIATE_AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("Affiliate authentication is not configured");
  return value;
};
const sign = (value: string) =>
  createHmac("sha256", secret()).update(value).digest("hex");
export const otpHash = (email: string, code: string) =>
  sign(`otp:${email}:${code}`);
export const privateIpHash = (ip: string) => sign(`ip:${ip}`);
export const newToken = () => randomBytes(32).toString("hex");
export function secureEqual(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export const validEmail = (email: unknown): email is string =>
  typeof email === "string" &&
  email.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validCode = (code: string) => /^[a-f0-9]{12}$/.test(code);
export function signReferral(code: string, now = Date.now()) {
  const payload = `${code}.${now + AFFILIATE_POLICY.referralDays * 86400000}`;
  return `${payload}.${sign(`referral:${payload}`)}`;
}
export function readReferral(cookie: string | undefined, now = Date.now()) {
  if (!cookie) return null;
  const parts = cookie.split(".");
  if (parts.length !== 3) return null;
  const [code, expires, signature] = parts;
  if (
    !validCode(code) ||
    !Number.isSafeInteger(Number(expires)) ||
    Number(expires) <= now ||
    Number(expires) > now + AFFILIATE_POLICY.referralDays * 86400000
  )
    return null;
  return secureEqual(signature, sign(`referral:${code}.${expires}`))
    ? code
    : null;
}
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  // NextURL normalizes loopback IPs to localhost; Host preserves the browser origin.
  const host = request.headers.get("host");
  if (host) url.host = host;
  const protocol = request.headers.get("x-forwarded-proto");
  if (protocol === "https" || protocol === "http")
    url.protocol = `${protocol}:`;
  return url.origin;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === requestOrigin(request);
}
