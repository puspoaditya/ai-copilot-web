import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { AFFILIATE_POLICY } from "@/lib/affiliate-policy";
import {
  affiliateEnabled,
  requestOrigin,
  newToken,
  REFERRAL_COOKIE,
  VISITOR_COOKIE,
  sha256,
  signReferral,
  validCode,
} from "@/lib/affiliate-security";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const response = NextResponse.redirect(
    new URL("/", requestOrigin(request)),
    302,
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex");
  const { code } = await params;
  if (!affiliateEnabled() || !validCode(code)) return response;
  try {
    const { data: affiliate, error } = await supabase
      .from("affiliates")
      .select("id")
      .eq("code", code)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    if (!affiliate) return response;
    const existing = request.cookies.get(VISITOR_COOKIE)?.value;
    const visitor =
      existing && /^[a-f0-9]{64}$/.test(existing) ? existing : newToken();
    const { error: clickError } = await supabase
      .from("affiliate_clicks")
      .upsert(
        { affiliate_id: affiliate.id, visitor_hash: sha256(visitor) },
        { onConflict: "affiliate_id,visitor_hash,day", ignoreDuplicates: true },
      );
    if (clickError) throw clickError;
    const options = {
      httpOnly: true,
      secure: requestOrigin(request).startsWith("https:"),
      sameSite: "lax" as const,
      path: "/",
      maxAge: AFFILIATE_POLICY.referralDays * 86400,
    };
    response.cookies.set(REFERRAL_COOKIE, signReferral(code), options);
    response.cookies.set(VISITOR_COOKIE, visitor, options);
  } catch (error) {
    console.error("Referral could not be recorded", {
      code:
        error && typeof error === "object" && "code" in error
          ? error.code
          : "unknown",
    });
  }
  return response;
}
