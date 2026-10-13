export const AFFILIATE_POLICY = {
  commissionPercent: 30,
  referralDays: 30,
  holdDays: 14,
  minimumPayout: 100000,
} as const;
export const PLAN_PRICES = { monthly: 179000, yearly: 1499000 } as const;
export const money = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
export type AffiliateDashboard = {
  account: {
    id: string;
    email: string;
    name: string;
    code: string;
    status: "active" | "blocked";
  };
  stats: {
    clicks: number;
    sales: number;
    hold: number;
    available: number;
    debt: number;
    in_review: number;
    paid: number;
  };
  commissions: {
    order_id: string;
    amount: number;
    status: string;
    ready_at: string;
    created_at: string;
    payout_id: string | null;
    plan: string;
  }[];
  payouts: {
    id: string;
    amount: number;
    status: string;
    bank: string;
    account_last4: string;
    transfer_reference: string | null;
    admin_note: string | null;
    created_at: string;
  }[];
};
