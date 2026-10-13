import { NextRequest, NextResponse } from "next/server";
import { createSnapToken } from "@/lib/midtrans";
import { randomUUID } from "node:crypto";
import { supabase } from "@/lib/supabase";
import {
  affiliateEnabled,
  REFERRAL_COOKIE,
  readReferral,
  validEmail,
} from "@/lib/affiliate-security";
import { AFFILIATE_POLICY, PLAN_PRICES } from "@/lib/affiliate-policy";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (
      !body ||
      !validEmail(body.email) ||
      !["monthly", "yearly"].includes(body.plan)
    ) {
      return NextResponse.json(
        { error: "Email atau paket tidak valid." },
        { status: 400 },
      );
    }
    const email = body.email.trim().toLowerCase();
    const plan = body.plan as keyof typeof PLAN_PRICES;
    const orderId = `AIC-${randomUUID()}`,
      amount = PLAN_PRICES[plan];
    if (affiliateEnabled()) {
      let affiliateId: string | null = null;
      const code = readReferral(req.cookies.get(REFERRAL_COOKIE)?.value);
      if (code) {
        const { data, error } = await supabase
          .from("affiliates")
          .select("id,email")
          .eq("code", code)
          .eq("status", "active")
          .maybeSingle();
        if (error) throw error;
        if (data && data.email !== email) affiliateId = data.id;
      }
      const { error } = await supabase
        .from("checkout_orders")
        .insert({
          id: orderId,
          email,
          plan,
          amount,
          affiliate_id: affiliateId,
          commission_percent: AFFILIATE_POLICY.commissionPercent,
        });
      if (error) throw error;
    }
    const token = await createSnapToken({ orderId, amount, email });
    return NextResponse.json({ token, orderId });
  } catch (err) {
    console.error("Checkout failed", {
      code:
        err && typeof err === "object" && "code" in err
          ? err.code
          : "provider_error",
    });
    return NextResponse.json(
      { error: "Pembayaran belum dapat dibuat. Silakan coba lagi nanti." },
      { status: 503 },
    );
  }
}
