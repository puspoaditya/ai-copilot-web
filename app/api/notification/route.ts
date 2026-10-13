import { after, NextRequest, NextResponse } from "next/server";
import { verifySignature, getTransactionStatus } from "@/lib/midtrans";
import { affiliateEnabled } from "@/lib/affiliate-security";
import { supabase } from "@/lib/supabase";
import { generateLicenseKey } from "@/lib/license";
import { sendLicenseEmail, notifyOwner } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.order_id !== "string" ||
    typeof body.status_code !== "string" ||
    typeof body.gross_amount !== "string" ||
    typeof body.signature_key !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid notification" },
      { status: 400 },
    );
  }

  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    fraud_status,
  } = body;

  if (!verifySignature(order_id, status_code, gross_amount, signature_key)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Reject transactions not originating from our checkout
  if (!order_id.startsWith("AIC-")) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  // Reject suspiciously low amounts (minimum Rp 100.000)
  if (!Number.isFinite(Number(gross_amount)) || Number(gross_amount) < 100000) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  {
    // Previously tracked orders still settle even if new affiliate registrations are paused.
    try {
      const { data: order, error: lookupError } = await supabase
        .from("checkout_orders")
        .select("id,amount")
        .eq("id", order_id)
        .maybeSingle();
      if (
        lookupError &&
        (affiliateEnabled() ||
          !["42P01", "PGRST205"].includes(lookupError.code))
      )
        throw lookupError;
      if (order) {
        if (order.amount !== Number(gross_amount))
          return NextResponse.json(
            { error: "Invalid amount" },
            { status: 400 },
          );
        // A signature does not sign transaction_status. Verify the current state with Midtrans too.
        const verified = await getTransactionStatus(order_id);
        if (Number(verified.gross_amount) !== order.amount)
          return NextResponse.json(
            { error: "Invalid provider amount" },
            { status: 400 },
          );
        const paid =
          (verified.transaction_status === "settlement" ||
            verified.transaction_status === "capture") &&
          (!verified.fraud_status || verified.fraud_status === "accept");
        const reversed = [
          "refund",
          "partial_refund",
          "chargeback",
          "partial_chargeback",
          "cancel",
          "deny",
        ].includes(verified.transaction_status);
        const { data: saved, error } = await supabase.rpc(
          "affiliate_record_payment",
          {
            p_order_id: order_id,
            p_amount: order.amount,
            p_state: reversed ? "reversed" : paid ? "paid" : "unpaid",
          },
        );
        if (error) throw error;
        if (saved?.status === "paid" && paid && !saved.license_delivered) {
          const { data: license, error: licenseError } = await supabase.rpc(
            "affiliate_prepare_license",
            { p_order_id: order_id, p_key: generateLicenseKey() },
          );
          if (licenseError) throw licenseError;
          if (!license.delivered) {
            await sendLicenseEmail(license.email, license.key);
            const { error: deliveryError } = await supabase
              .from("checkout_orders")
              .update({ license_delivered: true })
              .eq("id", order_id)
              .eq("status", "paid");
            if (deliveryError) throw deliveryError;
            after(async () => {
              await notifyOwner(
                "💰 Subscriber baru — IntervAI",
                `<p><strong>Order ID:</strong> ${order_id}</p><p><strong>Amount:</strong> Rp ${order.amount.toLocaleString("id-ID")}</p><p><strong>Program:</strong> ${saved.affiliate_id ? "Melalui affiliate" : "Pembelian langsung"}</p>`,
              ).catch(() =>
                console.error("Owner payment notification delivery failed"),
              );
            });
          }
        }
        return NextResponse.json({ ok: true });
      }
      // Orders started before activation retain the existing fulfillment path below.
    } catch (error) {
      console.error("Payment notification processing failed", {
        code:
          error && typeof error === "object" && "code" in error
            ? error.code
            : "provider_or_delivery_error",
      });
      return NextResponse.json(
        { error: "Processing unavailable; retry notification" },
        { status: 503 },
      );
    }
  }

  const isPaid =
    transaction_status === "settlement" ||
    (transaction_status === "capture" && fraud_status === "accept");

  if (!isPaid) {
    return NextResponse.json({ ok: true });
  }

  const email: string =
    body.customer_details?.email ?? body.custom_field1 ?? "";
  if (!email) {
    return NextResponse.json(
      { error: "No email in notification" },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("licenses")
    .select("key")
    .eq("email", email)
    .eq("status", "active")
    .single();

  if (!existing) {
    const key = generateLicenseKey();
    await supabase.from("licenses").insert({
      key,
      email,
      stripe_customer_id: order_id,
      stripe_subscription_id: order_id,
      status: "active",
    });
    await sendLicenseEmail(email, key);
    notifyOwner(
      "💰 Subscriber baru — IntervAI",
      `<p><strong>Email:</strong> ${email}</p><p><strong>Order ID:</strong> ${order_id}</p><p><strong>Amount:</strong> Rp ${Number(gross_amount).toLocaleString("id-ID")}</p><p><strong>License Key:</strong> <code>${key}</code></p><p><strong>Waktu:</strong> ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>`,
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
