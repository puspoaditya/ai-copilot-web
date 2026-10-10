"use client";

import { useRef, useState, type FormEvent } from "react";
import Dialog from "./dialog";

export type Plan = "monthly" | "yearly";
const plans = {
  monthly: {
    name: "Bulanan",
    price: "Rp179.000",
    period: "bulan",
    amount: 179000,
  },
  yearly: {
    name: "Tahunan",
    price: "Rp1.499.000",
    period: "tahun",
    amount: 1499000,
  },
};

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
    fbq?: (event: string, name: string, data?: Record<string, unknown>) => void;
  }
}

let snapPromise: Promise<void> | undefined;
function loadSnapScript(): Promise<void> {
  if (window.snap) return Promise.resolve();
  if (snapPromise) return snapPromise;
  const key = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  if (!key)
    return Promise.reject(
      new Error("Pembayaran belum tersedia. Silakan hubungi tim IntervAI."),
    );
  snapPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://app.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", key);
    script.async = true;
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error("Layanan pembayaran tidak dapat dimuat. Coba lagi."));
    };
    const timeout = window.setTimeout(fail, 15000);
    script.onerror = fail;
    script.onload = () => {
      if (!window.snap) {
        fail();
        return;
      }
      clearTimeout(timeout);
      resolve();
    };
    document.head.appendChild(script);
  }).catch((error) => {
    snapPromise = undefined;
    throw error;
  });
  return snapPromise;
}

export default function CheckoutDialog({
  plan,
  onChangePlan,
  onClose,
}: {
  plan: Plan | null;
  onChangePlan: (plan: Plan) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const busy = useRef(false);
  const selected = plans[plan ?? "monthly"];

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan || busy.current) return;
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Format email tidak valid.");
      return;
    }
    busy.current = true;
    setLoading(true);
    setError("");
    const selectedPlan = plan;
    try {
      // Load the client before creating an order, so a missing script/key cannot strand checkout.
      await loadSnapScript();
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, plan: selectedPlan }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (
        !response.ok ||
        data.error ||
        typeof data.token !== "string" ||
        !data.token
      ) {
        throw new Error(data.error || "Terjadi kesalahan. Coba lagi.");
      }
      const scrollY = window.scrollY;
      // A native dialog lives above the Midtrans iframe. Close it before opening Snap.
      setPaymentOpen(true);
      const restore = (message = "") => {
        busy.current = false;
        setLoading(false);
        setPaymentOpen(false);
        setError(message);
        window.scrollTo({ top: scrollY, behavior: "instant" });
      };
      window.snap!.pay(data.token, {
        onSuccess: () => {
          window.fbq?.("track", "Purchase", {
            value: plans[selectedPlan].amount,
            currency: "IDR",
          });
          window.location.assign("/success");
        },
        onPending: () =>
          restore(
            "Pembayaran masih menunggu. Ikuti petunjuk dari Midtrans untuk menyelesaikannya.",
          ),
        onError: () => restore("Pembayaran gagal. Coba lagi."),
        onClose: () => restore(),
      });
    } catch (err: unknown) {
      busy.current = false;
      setLoading(false);
      setPaymentOpen(false);
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.",
      );
    }
  }

  return (
    <Dialog
      open={plan !== null && !paymentOpen}
      onClose={() => {
        setError("");
        onClose();
      }}
      busy={loading}
      className="start-dialog checkout-dialog"
      titleId="checkout-title"
      closeLabel="Tutup pembayaran"
    >
      <div className="start-icon">✦</div>
      <span className="eyebrow">LANGGANAN INTERVAI</span>
      <h2 id="checkout-title">Siap untuk interview berikutnya?</h2>
      <p>
        Pilih paket dan masukkan email. License key akan dikirim ke email
        setelah pembayaran berhasil.
      </p>
      <div className="checkout-plans" aria-label="Pilih paket">
        {(["monthly", "yearly"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={plan === value}
            disabled={loading}
            onClick={() => {
              onChangePlan(value);
              setError("");
            }}
          >
            {plans[value].name}
            {value === "yearly" ? " · Hemat 30%" : ""}
          </button>
        ))}
      </div>
      <p className="checkout-price">
        <strong>{selected.price}</strong>/{selected.period}
      </p>
      <form onSubmit={checkout} aria-busy={loading}>
        <label htmlFor="checkout-email">Email penerima license key</label>
        <input
          id="checkout-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="email@kamu.com"
          value={email}
          disabled={loading}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "checkout-error" : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
        />
        {error && (
          <p id="checkout-error" className="checkout-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="button button-primary"
          disabled={loading || !email.trim()}
        >
          {loading ? "Memproses…" : `Bayar ${selected.price}`}{" "}
          <svg className="icon">
            <use href="#i-arrow" />
          </svg>
        </button>
      </form>
      <p className="start-note">
        Pembayaran aman via Midtrans. Trial gratis sementara dinonaktifkan.
      </p>
    </Dialog>
  );
}
