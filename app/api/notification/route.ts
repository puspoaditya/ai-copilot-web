import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@/lib/midtrans';
import { supabase } from '@/lib/supabase';
import { generateLicenseKey } from '@/lib/license';
import { sendLicenseEmail, notifyOwner } from '@/lib/resend';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = body;

  if (!verifySignature(order_id, status_code, gross_amount, signature_key)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const isPaid =
    transaction_status === 'settlement' ||
    (transaction_status === 'capture' && fraud_status === 'accept');

  if (!isPaid) {
    return NextResponse.json({ ok: true });
  }

  const email: string = body.customer_details?.email ?? body.custom_field1 ?? '';
  if (!email) {
    return NextResponse.json({ error: 'No email in notification' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('licenses')
    .select('key')
    .eq('email', email)
    .eq('status', 'active')
    .single();

  if (!existing) {
    const key = generateLicenseKey();
    await supabase.from('licenses').insert({
      key,
      email,
      stripe_customer_id: order_id,
      stripe_subscription_id: order_id,
      status: 'active',
    });
    await sendLicenseEmail(email, key);
    notifyOwner(
      '💰 Subscriber baru — IntervAI',
      `<p><strong>Email:</strong> ${email}</p><p><strong>Order ID:</strong> ${order_id}</p><p><strong>Amount:</strong> Rp ${Number(gross_amount).toLocaleString('id-ID')}</p><p><strong>License Key:</strong> <code>${key}</code></p><p><strong>Waktu:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>`
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
