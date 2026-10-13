import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { resend } from "@/lib/resend";
import { affiliateError, affiliateSession } from "@/lib/affiliate";
import {
  affiliateEnabled,
  SESSION_COOKIE,
  sha256,
  otpHash,
  privateIpHash,
  newToken,
  sameOrigin,
  requestOrigin,
  validEmail,
} from "@/lib/affiliate-security";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  if (!affiliateEnabled()) return json({ enabled: false, account: null });
  try {
    const id = await affiliateSession(request);
    if (!id) return json({ enabled: true, account: null });
    const { data, error } = await supabase.rpc("affiliate_dashboard", {
      p_affiliate_id: id,
    });
    if (error) throw error;
    return json({ enabled: true, ...data });
  } catch (error) {
    const failure = affiliateError(error);
    return json({ error: failure.error }, failure.status);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return json({ error: "Permintaan tidak diizinkan." }, 403);
  if (!affiliateEnabled())
    return json(
      { error: "Pendaftaran affiliate segera dibuka. Silakan kembali nanti." },
      503,
    );
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object")
      return json({ error: "Data tidak valid." }, 400);
    if (body.action === "request_code") {
      if (!validEmail(body.email))
        return json({ error: "Format email tidak valid." }, 400);
      const email = body.email.trim().toLowerCase();
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 80)
        return json({ error: "Nama harus 2–80 karakter." }, 400);
      const code = String(randomInt(0, 1000000)).padStart(6, "0"),
        hash = otpHash(email, code);
      const ip =
        request.headers.get("x-vercel-forwarded-for") ||
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        "unknown";
      const { error } = await supabase.rpc("affiliate_issue_otp", {
        p_email: email,
        p_name: name,
        p_hash: hash,
        p_ip_hash: privateIpHash(ip),
      });
      if (error) throw error;
      const { error: emailError } = await resend.emails.send({
        from: "IntervAI <hello@intervai.my.id>",
        to: email,
        subject: "Kode masuk Affiliate IntervAI",
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px"><h2>Affiliate IntervAI</h2><p>Kode untuk masuk atau mendaftar:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#6335ff">${code}</p><p>Berlaku 10 menit. Jangan berikan kode ini kepada siapa pun.</p><p>Abaikan email ini jika Anda tidak meminta kode.</p></div>`,
      });
      if (emailError) {
        await supabase
          .from("affiliate_otps")
          .delete()
          .eq("email", email)
          .eq("code_hash", hash);
        throw new Error("EMAIL_DELIVERY_FAILED");
      }
      return json({ ok: true });
    }
    if (body.action === "verify_code") {
      if (
        !validEmail(body.email) ||
        typeof body.code !== "string" ||
        !/^\d{6}$/.test(body.code)
      )
        return json({ error: "Email atau kode tidak valid." }, 400);
      const token = newToken(),
        email = body.email.trim().toLowerCase();
      const { data, error } = await supabase.rpc("affiliate_verify_otp", {
        p_email: email,
        p_hash: otpHash(email, body.code),
        p_session_hash: sha256(token),
      });
      if (error) throw error;
      if (!data)
        return json(
          {
            error:
              "Kode salah, kedaluwarsa, atau sudah digunakan. Minta kode baru jika diperlukan.",
          },
          401,
        );
      const response = json({ ok: true });
      response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: requestOrigin(request).startsWith("https:"),
        path: "/",
        maxAge: 30 * 86400,
      });
      return response;
    }
    const id = await affiliateSession(request);
    if (!id) return json({ error: "Silakan masuk kembali." }, 401);
    if (body.action === "logout") {
      const { error } = await supabase
        .from("affiliate_sessions")
        .delete()
        .eq("token_hash", sha256(request.cookies.get(SESSION_COOKIE)!.value));
      if (error) throw error;
      const response = json({ ok: true });
      response.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: requestOrigin(request).startsWith("https:"),
        path: "/",
        maxAge: 0,
      });
      return response;
    }
    if (body.action === "withdraw") {
      const bank = typeof body.bank === "string" ? body.bank.trim() : "",
        number =
          typeof body.account_number === "string"
            ? body.account_number.trim()
            : "",
        name =
          typeof body.account_name === "string" ? body.account_name.trim() : "";
      if (
        bank.length < 2 ||
        bank.length > 80 ||
        !/^\d{6,30}$/.test(number) ||
        name.length < 2 ||
        name.length > 80
      )
        return json(
          {
            error:
              "Lengkapi nama bank, nomor rekening (6–30 digit), dan nama pemilik rekening.",
          },
          400,
        );
      const { data, error } = await supabase.rpc("affiliate_request_payout", {
        p_affiliate_id: id,
        p_bank: bank,
        p_number: number,
        p_name: name,
      });
      if (error) throw error;
      return json({ ok: true, id: data });
    }
    return json({ error: "Tindakan tidak valid." }, 400);
  } catch (error) {
    const failure = affiliateError(error);
    return json({ error: failure.error }, failure.status);
  }
}
