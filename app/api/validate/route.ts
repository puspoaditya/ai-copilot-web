import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { key, hwid } = await req.json();

  if (!key) {
    return NextResponse.json({ valid: false, error: 'No key provided' }, { status: 400 });
  }

  const normalizedKey = key.toUpperCase().trim();

  const { data, error } = await supabase
    .from('licenses')
    .select('status, email, plan, expires_at, device_id')
    .eq('key', normalizedKey)
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, error: 'License key tidak ditemukan' });
  }

  if (data.status !== 'active') {
    return NextResponse.json({ valid: false, error: 'Subscription tidak aktif' });
  }

  if (data.plan === 'trial' && data.expires_at) {
    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'Trial 3 hari kamu sudah habis. Silakan subscribe untuk melanjutkan.',
      });
    }

    // Device fingerprint check for trial licenses
    if (hwid) {
      if (data.device_id && data.device_id !== hwid) {
        // This trial was activated on a different device
        return NextResponse.json({
          valid: false,
          error: 'Trial hanya bisa digunakan di 1 perangkat.',
        });
      }

      if (!data.device_id) {
        // First activation — check if this device already used a trial before
        const { data: usedByDevice } = await supabase
          .from('licenses')
          .select('key')
          .eq('device_id', hwid)
          .eq('plan', 'trial')
          .neq('key', normalizedKey)
          .maybeSingle();

        if (usedByDevice) {
          return NextResponse.json({
            valid: false,
            error: 'Perangkat ini sudah pernah menggunakan trial.',
          });
        }

        // Store device_id for this trial
        await supabase
          .from('licenses')
          .update({ device_id: hwid })
          .eq('key', normalizedKey);
      }
    }
  }

  return NextResponse.json({
    valid: true,
    email: data.email,
    plan: data.plan,
    expiresAt: data.expires_at,
  });
}
