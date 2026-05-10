import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { key } = await req.json();

  if (!key) {
    return NextResponse.json({ valid: false, error: 'No key provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('licenses')
    .select('status, email')
    .eq('key', key.toUpperCase().trim())
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, error: 'License key not found' });
  }

  if (data.status !== 'active') {
    return NextResponse.json({ valid: false, error: 'Subscription inactive' });
  }

  return NextResponse.json({ valid: true, email: data.email });
}
