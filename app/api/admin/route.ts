import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function checkAuth(password: string) {
  return process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!checkAuth(password)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: licenses, error } = await supabase
    .from('licenses')
    .select('key, email, status, plan, expires_at, device_id, stripe_customer_id, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });

  const now = new Date();
  const stats = {
    total: licenses?.length ?? 0,
    activeTrial: licenses?.filter(l => l.plan === 'trial' && l.status === 'active' && new Date(l.expires_at) > now).length ?? 0,
    expiredTrial: licenses?.filter(l => l.plan === 'trial' && (l.status !== 'active' || new Date(l.expires_at) <= now)).length ?? 0,
    paid: licenses?.filter(l => ['paid', 'monthly', 'yearly'].includes(l.plan) && l.status === 'active').length ?? 0,
  };

  return NextResponse.json({ licenses, stats });
}

// Update: extend trial, change status/plan
export async function PATCH(req: NextRequest) {
  const { password, key, updates } = await req.json();
  if (!checkAuth(password)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 });

  const allowed = ['status', 'plan', 'expires_at'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));

  const { error } = await supabase.from('licenses').update(filtered).eq('key', key);
  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// Revoke: set status to inactive
export async function DELETE(req: NextRequest) {
  const { password, key } = await req.json();
  if (!checkAuth(password)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 });

  const { error } = await supabase.from('licenses').update({ status: 'inactive' }).eq('key', key);
  if (error) return NextResponse.json({ error: 'Revoke failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
