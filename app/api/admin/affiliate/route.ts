import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { affiliateError } from "@/lib/affiliate";
import {
  affiliateEnabled,
  sameOrigin,
  secureEqual,
} from "@/lib/affiliate-security";

async function authorized(request: NextRequest) {
  if (!sameOrigin(request)) return null;
  const body = await request.json().catch(() => null),
    password = process.env.ADMIN_PASSWORD;
  return password &&
    typeof body?.password === "string" &&
    secureEqual(body.password, password)
    ? body
    : null;
}
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: NextRequest) {
  const body = await authorized(request);
  if (!body) return json({ error: "Password admin salah." }, 401);
  if (!affiliateEnabled())
    return json({ error: "Program affiliate belum diaktifkan." }, 503);
  try {
    const { data, error } = await supabase.rpc("affiliate_admin_dashboard");
    if (error) throw error;
    return json(data);
  } catch (error) {
    const failure = affiliateError(error);
    return json({ error: failure.error }, failure.status);
  }
}
export async function PATCH(request: NextRequest) {
  const body = await authorized(request);
  if (!body) return json({ error: "Password admin salah." }, 401);
  if (!affiliateEnabled())
    return json({ error: "Program affiliate belum diaktifkan." }, 503);
  if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/.test(body.id))
    return json({ error: "ID tidak valid." }, 400);
  try {
    if (body.action === "paid" || body.action === "rejected") {
      if (
        typeof body.reference !== "string" ||
        body.reference.trim().length < 2 ||
        body.reference.trim().length > 160
      )
        return json(
          { error: "Isi referensi transfer atau alasan penolakan." },
          400,
        );
      const { error } = await supabase.rpc("affiliate_resolve_payout", {
        p_id: body.id,
        p_action: body.action,
        p_reference: body.reference.trim(),
      });
      if (error) throw error;
    } else if (body.action === "block" || body.action === "activate") {
      const { data, error } = await supabase
        .from("affiliates")
        .update({ status: body.action === "block" ? "blocked" : "active" })
        .eq("id", body.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Akun tidak ditemukan." }, 404);
    } else return json({ error: "Tindakan tidak valid." }, 400);
    return json({ ok: true });
  } catch (error) {
    const failure = affiliateError(error);
    return json({ error: failure.error }, failure.status);
  }
}
