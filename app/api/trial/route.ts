import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateLicenseKey } from '@/lib/license';
import { sendTrialEmail } from '@/lib/resend';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

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
  } catch (_) {
    // Don't fail if email fails — key is already created
  }

  return NextResponse.json({ ok: true });
}
