import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { key } = await req.json();

  if (!key) {
    return NextResponse.json({ error: 'No key provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('licenses')
    .select('status')
    .eq('key', key.toUpperCase().trim())
    .single();

  if (error || !data || data.status !== 'active') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    deepgramApiKey: process.env.DEEPGRAM_API_KEY,
    aiBaseUrl: process.env.AI_BASE_URL,
    aiApiKey: process.env.AI_API_KEY,
    aiModel: process.env.AI_MODEL,
  });
}
