import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const CHECKIN_INTERVAL_MINUTES = 30;
const DAILY_LIMIT_HOURS = 4;
const DAILY_LIMIT = (DAILY_LIMIT_HOURS * 60) / CHECKIN_INTERVAL_MINUTES; // 8 check-ins

export async function POST(req: NextRequest) {
  const { key } = await req.json();
  if (!key) return NextResponse.json({ ok: false, error: 'No key' }, { status: 400 });

  const normalizedKey = key.toUpperCase().trim();

  const { data: license, error } = await supabase
    .from('licenses')
    .select('status, plan, expires_at')
    .eq('key', normalizedKey)
    .single();

  if (error || !license || license.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'License tidak aktif' }, { status: 401 });
  }

  // Check trial expiry
  if (license.plan === 'trial' && license.expires_at) {
    if (new Date(license.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: 'Trial 3 hari kamu sudah habis. Subscribe di ai-copilot-web.vercel.app untuk melanjutkan.' });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await supabase
    .from('usage')
    .select('count')
    .eq('license_key', normalizedKey)
    .eq('date', today)
    .single();

  const currentCount = usage?.count ?? 0;
  if (currentCount >= DAILY_LIMIT) {
    return NextResponse.json({
      ok: false,
      error: `Batas harian tercapai (${DAILY_LIMIT_HOURS} jam/hari). Reset besok.`,
    });
  }

  await supabase.rpc('increment_usage', { p_key: normalizedKey, p_date: today });

  return NextResponse.json({
    ok: true,
    remaining: DAILY_LIMIT - currentCount - 1,
    remainingMinutes: (DAILY_LIMIT - currentCount - 1) * CHECKIN_INTERVAL_MINUTES,
  });
}
