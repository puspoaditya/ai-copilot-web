import type { NextRequest } from "next/server";
import { supabase } from "./supabase";
import { SESSION_COOKIE, sha256 } from "./affiliate-security";

export async function affiliateSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await supabase
    .from("affiliate_sessions")
    .select("affiliate_id")
    .eq("token_hash", sha256(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data?.affiliate_id as string | undefined;
}
export function affiliateError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (message.includes("RATE_LIMIT"))
    return {
      status: 429,
      error:
        "Terlalu banyak permintaan. Tunggu sebentar sebelum mencoba kembali.",
    };
  if (message.includes("MINIMUM_PAYOUT"))
    return {
      status: 400,
      error: "Saldo siap ditarik belum mencapai Rp100.000.",
    };
  if (message.includes("ACCOUNT_BLOCKED"))
    return {
      status: 403,
      error: "Akun affiliate dinonaktifkan. Hubungi tim IntervAI.",
    };
  if (
    /ALREADY_RESOLVED|PAYOUT_NOT_FOUND|INVALID_BANK|INVALID_ACTION/.test(
      message,
    )
  )
    return {
      status: 409,
      error:
        "Permintaan sudah berubah atau data tidak valid. Muat ulang halaman.",
    };
  console.error("Affiliate operation failed", {
    code:
      error && typeof error === "object" && "code" in error
        ? error.code
        : "unknown",
  });
  return {
    status: 503,
    error: "Layanan affiliate belum tersedia. Silakan coba lagi nanti.",
  };
}
