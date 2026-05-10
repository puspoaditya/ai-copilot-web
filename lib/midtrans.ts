import crypto from 'crypto';

const BASE_URL = 'https://app.midtrans.com/snap/v1';

export async function createSnapToken(params: {
  orderId: string;
  amount: number;
  email: string;
}): Promise<string> {
  const auth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString('base64');

  const res = await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.amount,
      },
      customer_details: {
        email: params.email,
      },
      custom_field1: params.email,
    }),
  });

  const data = await res.json();
  if (!data.token) throw new Error(data.error_messages?.join(', ') ?? 'Midtrans error');
  return data.token as string;
}

export function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
): boolean {
  const expected = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + process.env.MIDTRANS_SERVER_KEY!)
    .digest('hex');
  return expected === signatureKey;
}
