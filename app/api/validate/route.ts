import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { key } = await req.json();

  if (!key) {
    return NextResponse.json({ valid: false, error: 'No key provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('licenses')
    .select('status, email, plan, expires_at')
    .eq('key', key.toUpperCase().trim())
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, error: 'License key tidak ditemukan' });
  }

  if (data.status !== 'active') {
    return NextResponse.json({ valid: false, error: 'Subscription tidak aktif' });
  }

  // Check trial expiry
  if (data.plan === 'trial' && data.expires_at) {
    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Trial 3 hari kamu sudah habis. Silakan subscribe untuk melanjutkan.' });
    }
  }

  return NextResponse.json({ valid: true, email: data.email, plan: data.plan, expiresAt: data.expires_at });
}
