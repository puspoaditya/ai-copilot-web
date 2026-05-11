import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateLicenseKey } from '@/lib/license';
import { sendTrialEmail, notifyOwner } from '@/lib/resend';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwam.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info',
  'yopmail.com','trashmail.com','dispostable.com','maildrop.cc',
  'spamgourmet.com','spamgourmet.net','fakeinbox.com','mailnull.com',
  'spamherelots.com','spamhereplease.com','tempinbox.com','throwam.com',
  'discard.email','spamfree24.org','mailexpire.com','trashmail.at',
  'trashmail.io','trashmail.me','trashmail.xyz','mailnesia.com',
  'mailnull.com','spamevader.com','spamgob.com','tempr.email',
  'burnermail.io','getairmail.com','tempail.com','emailondeck.com',
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (isDisposableEmail(normalizedEmail)) {
    return NextResponse.json({ error: 'Gunakan email utama kamu (bukan email sementara).' }, { status: 400 });
  }

  // One trial per email
  const { data: existing } = await supabase
    .from('licenses')
    .select('key, plan, status')
    .eq('email', normalizedEmail)
    .in('plan', ['trial', 'paid', 'monthly', 'yearly'])
    .single();

  if (existing) {
    if (existing.plan !== 'trial') {
      return NextResponse.json({ error: 'Email ini sudah memiliki lisensi berbayar.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Email ini sudah pernah mendaftar trial.' }, { status: 409 });
  }

  const key = generateLicenseKey();
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase.from('licenses').insert({
    key,
    email: normalizedEmail,
    status: 'active',
    plan: 'trial',
    expires_at: expiresAt,
  });

  if (insertError) {
    return NextResponse.json({ error: 'Gagal membuat trial. Coba lagi.' }, { status: 500 });
  }

  try {
    await sendTrialEmail(normalizedEmail, key);
    notifyOwner(
      '🆕 Trial baru — IntervAI',
      `<p><strong>Email:</strong> ${normalizedEmail}</p><p><strong>License Key:</strong> <code>${key}</code></p><p><strong>Waktu:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>`
    ).catch(() => {});
  } catch (_) {
    // Don't fail if email fails — key is already created
  }

  return NextResponse.json({ ok: true });
}
