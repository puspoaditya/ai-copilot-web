import { NextRequest, NextResponse } from 'next/server';
import { createSnapToken } from '@/lib/midtrans';

const PRICES: Record<string, number> = {
  monthly: 179000,
  yearly: 1499000,
};

export async function POST(req: NextRequest) {
  const { email, plan } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const orderId = `AIC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const amount = PRICES[plan] ?? PRICES.monthly;

  try {
    const token = await createSnapToken({ orderId, amount, email });
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
