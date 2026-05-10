import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

const DAILY_LIMIT = 200;

export async function POST(req: NextRequest) {
  const { key, question, systemPrompt } = await req.json();

  if (!key || !question) {
    return new Response(JSON.stringify({ error: 'key and question required' }), { status: 400 });
  }

  const normalizedKey = key.toUpperCase().trim();
  const today = new Date().toISOString().slice(0, 10);

  // Run license validation + usage check in parallel
  const [licenseRes, usageRes] = await Promise.all([
    supabase.from('licenses').select('status').eq('key', normalizedKey).single(),
    supabase.from('usage').select('count').eq('license_key', normalizedKey).eq('date', today).single(),
  ]);

  if (licenseRes.error || !licenseRes.data || licenseRes.data.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const currentCount = usageRes.data?.count ?? 0;
  if (currentCount >= DAILY_LIMIT) {
    return new Response(
      JSON.stringify({ error: `Batas harian tercapai (${DAILY_LIMIT} request/hari)` }),
      { status: 429 },
    );
  }

  // Increment usage async — don't block the AI response
  supabase.rpc('increment_usage', { p_key: normalizedKey, p_date: today }).then(() => {});

  // Proxy to AI — keys stay server-side
  const aiRes = await fetch(`${process.env.AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL,
      stream: true,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    return new Response(JSON.stringify({ error: errText }), { status: aiRes.status });
  }

  return new Response(aiRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
