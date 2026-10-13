import crypto from "crypto";

const BASE_URL = "https://app.midtrans.com/snap/v1";

export type TransactionStatus = {
  order_id: string;
  gross_amount: string;
  transaction_status: string;
  fraud_status?: string;
};
export async function getTransactionStatus(
  orderId: string,
): Promise<TransactionStatus> {
  const res = await fetch(
    `https://api.midtrans.com/v2/${encodeURIComponent(orderId)}/status`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64")}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!res.ok) throw new Error("Midtrans status verification failed");
  const data = await res.json();
  if (data.order_id !== orderId || !Number.isFinite(Number(data.gross_amount)))
    throw new Error("Invalid provider response");
  return data;
}

export async function createSnapToken(params: {
  orderId: string;
  amount: number;
  email: string;
}): Promise<string> {
  const auth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString(
    "base64",
  );

  const res = await fetch(`${BASE_URL}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    signal: AbortSignal.timeout(15000),
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
  if (!data.token)
    throw new Error(data.error_messages?.join(", ") ?? "Midtrans error");
  return data.token as string;
}

export function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
): boolean {
  const expected = crypto
    .createHash("sha512")
    .update(
      orderId + statusCode + grossAmount + process.env.MIDTRANS_SERVER_KEY!,
    )
    .digest("hex");
  const signature = Buffer.from(signatureKey ?? "");
  const digest = Buffer.from(expected);
  return (
    signature.length === digest.length &&
    crypto.timingSafeEqual(signature, digest)
  );
}
