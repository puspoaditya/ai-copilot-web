import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: licenses, error } = await supabase
    .from('licenses')
    .select('key, email, status, plan, expires_at, device_id, stripe_customer_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
  }

  const now = new Date();
  const stats = {
    total: licenses?.length ?? 0,
    activeTrial: licenses?.filter(l => l.plan === 'trial' && l.status === 'active' && new Date(l.expires_at) > now).length ?? 0,
    expiredTrial: licenses?.filter(l => l.plan === 'trial' && (l.status !== 'active' || new Date(l.expires_at) <= now)).length ?? 0,
    paid: licenses?.filter(l => ['paid', 'monthly', 'yearly'].includes(l.plan) && l.status === 'active').length ?? 0,
  };

  return NextResponse.json({ licenses, stats });
}
