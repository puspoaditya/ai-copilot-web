"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  AFFILIATE_POLICY as policy,
  money,
  type AffiliateDashboard,
} from "@/lib/affiliate-policy";
import AffiliateBrand from "./brand";

async function fetchDashboard(): Promise<
  (AffiliateDashboard | { account: null }) & { enabled: boolean }
> {
  const response = await fetch("/api/affiliate", {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Dashboard belum dapat dimuat.");
  return data;
}

async function action(body: Record<string, unknown>) {
  const response = await fetch("/api/affiliate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Permintaan gagal. Silakan coba lagi.");
  return data;
}
const date = (value: string) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
function statusLabel(status: string) {
  return (
    (
      {
        pending: "Diajukan",
        paid: "Dibayar",
        rejected: "Ditolak",
        void: "Dibatalkan",
      } as Record<string, string>
    )[status] || status
  );
}

export default function AffiliatePortal() {
  const [dashboard, setDashboard] = useState<AffiliateDashboard | null>(null);
  const [enabled, setEnabled] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(""),
    [name, setName] = useState(""),
    [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email"),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [bank, setBank] = useState(""),
    [number, setNumber] = useState(""),
    [accountName, setAccountName] = useState("");
  const [link, setLink] = useState("");
  async function refresh() {
    const data = await fetchDashboard();
    setEnabled(data.enabled);
    setDashboard(data.account ? data : null);
    if (data.account)
      setLink(`${window.location.origin}/r/${data.account.code}`);
  }
  useEffect(() => {
    let cancelled = false;
    fetchDashboard()
      .then((data) => {
        if (cancelled) return;
        setEnabled(data.enabled);
        setDashboard(data.account ? data : null);
        if (data.account)
          setLink(`${window.location.origin}/r/${data.account.code}`);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Tidak dapat terhubung.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (step === "email") {
        await action({ action: "request_code", email, name });
        setStep("code");
        setMessage("Kode dikirim ke email Anda. Periksa juga folder spam.");
      } else {
        await action({ action: "verify_code", email, code });
        await refresh();
        setCode("");
        setMessage("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Permintaan gagal.");
    } finally {
      setBusy(false);
    }
  }
  async function withdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action({
        action: "withdraw",
        bank,
        account_number: number,
        account_name: accountName,
      });
      await refresh();
      setMessage(
        "Permintaan pencairan diterima. Tim IntervAI akan memeriksa dan melakukan transfer.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pencairan gagal.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action({ action: "logout" });
      setDashboard(null);
      setLink("");
      setStep("email");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tidak dapat keluar.");
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Tautan referral disalin.");
    } catch {
      setError("Pilih dan salin tautan referral pada kotak di bawah.");
    }
  }
  return (
    <div className="affiliate-page">
      <header className="aff-nav aff-container">
        <AffiliateBrand />
        <div>
          <span className="aff-nav-label">Affiliate Program</span>
          {dashboard ? (
            <button
              className="aff-button secondary"
              onClick={logout}
              disabled={busy}
            >
              Keluar
            </button>
          ) : (
            <Link className="aff-button secondary" href="/">
              Kembali ke beranda
            </Link>
          )}
        </div>
      </header>
      <main className="aff-container">
        {error && (
          <p className="aff-notice error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="aff-notice" role="status">
            {message}
          </p>
        )}
        {loading ? (
          <div className="aff-card aff-loading" role="status">
            Memuat program affiliate…
          </div>
        ) : !dashboard ? (
          <>
            <section className="aff-hero">
              <div>
                <span className="aff-eyebrow">BERTUMBUH BERSAMA INTERVAI</span>
                <h1>
                  Bagikan IntervAI.
                  <br />
                  <span>Dapatkan komisi 30%.</span>
                </h1>
                <p className="aff-lead">
                  Bantu orang lain lebih percaya diri saat interview. Dapatkan
                  komisi dari setiap pembelian yang berhasil melalui tautan
                  referral Anda.
                </p>
                <div className="aff-examples">
                  <div>
                    <small>Paket bulanan</small>
                    <strong>Rp53.700</strong>
                    <span>komisi per pembelian</span>
                  </div>
                  <div>
                    <small>Paket tahunan</small>
                    <strong>Rp449.700</strong>
                    <span>komisi per pembelian</span>
                  </div>
                </div>
                <p className="aff-muted">
                  Gratis bergabung · Tanpa target penjualan · Dashboard
                  transparan
                </p>
              </div>
              <div className="aff-card aff-login">
                <span className="aff-icon">✦</span>
                <h2>
                  {step === "email"
                    ? "Mulai jadi affiliate"
                    : "Periksa email Anda"}
                </h2>
                <p>
                  {step === "email"
                    ? "Daftar atau masuk dengan kode email. Tidak perlu membuat password."
                    : `Masukkan 6 digit kode yang dikirim ke ${email}. Berlaku 10 menit.`}
                </p>
                {!enabled && (
                  <p className="aff-notice">
                    Pendaftaran segera dibuka. Anda dapat membaca ketentuan
                    program di bawah.
                  </p>
                )}
                <form onSubmit={login}>
                  {step === "email" ? (
                    <>
                      <label htmlFor="aff-name">Nama Anda</label>
                      <input
                        id="aff-name"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={80}
                        placeholder="Nama lengkap"
                      />
                      <label htmlFor="aff-email">Email</label>
                      <input
                        id="aff-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        maxLength={254}
                        placeholder="nama@email.com"
                      />
                    </>
                  ) : (
                    <>
                      <label htmlFor="aff-code">Kode verifikasi</label>
                      <input
                        id="aff-code"
                        className="aff-otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={(e) =>
                          setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        required
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="000000"
                      />
                    </>
                  )}
                  <button className="aff-button" disabled={!enabled || busy}>
                    {busy
                      ? "Memproses…"
                      : step === "email"
                        ? "Kirim kode masuk →"
                        : "Verifikasi & masuk →"}
                  </button>
                  {step === "code" && (
                    <button
                      className="aff-text-button"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setStep("email");
                        setCode("");
                        setError("");
                        setMessage("");
                      }}
                    >
                      Ganti email atau minta kode baru
                    </button>
                  )}
                </form>
                <p className="aff-fine">
                  Dengan bergabung, Anda menyetujui ketentuan program di bawah.
                </p>
              </div>
            </section>
            <section className="aff-steps" aria-label="Cara kerja affiliate">
              {[
                [
                  "01",
                  "Daftar & dapatkan tautan",
                  "Verifikasi email untuk mendapatkan tautan referral pribadi.",
                ],
                [
                  "02",
                  "Bagikan ke audiens Anda",
                  "Bagikan konten yang jujur melalui komunitas, media sosial, atau website.",
                ],
                [
                  "03",
                  "Pantau & cairkan komisi",
                  "Lihat pembelian berhasil dan ajukan pencairan dari dashboard.",
                ],
              ].map(([n, title, text]) => (
                <article className="aff-card" key={n}>
                  <span className="aff-step-number">{n}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </section>
          </>
        ) : (
          <>
            <section className="aff-dashboard-heading">
              <div>
                <span className="aff-eyebrow">DASHBOARD AFFILIATE</span>
                <h1>Halo, {dashboard.account.name}.</h1>
                <p>Pantau hasil dari tautan referral Anda.</p>
              </div>
              <button
                className="aff-button secondary"
                disabled={busy}
                onClick={() => {
                  setError("");
                  refresh().catch((e) => setError(e.message));
                }}
              >
                ↻ Muat ulang
              </button>
            </section>
            {dashboard.account.status === "blocked" && (
              <p className="aff-notice error">
                Akun Anda dinonaktifkan. Referral baru dan pencairan
                ditangguhkan.{" "}
                <a href="https://wa.me/6283854696436">Hubungi tim IntervAI.</a>
              </p>
            )}
            <section className="aff-metrics" aria-label="Statistik affiliate">
              {[
                ["Kunjungan referral", String(dashboard.stats.clicks)],
                ["Pembelian berhasil", String(dashboard.stats.sales)],
                ["Komisi menunggu", money(dashboard.stats.hold)],
                ["Siap ditarik", money(dashboard.stats.available)],
              ].map(([label, value]) => (
                <div className="aff-card" key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>
            <section className="aff-card aff-referral">
              <div>
                <span className="aff-eyebrow">TAUTAN REFERRAL ANDA</span>
                <h2>Satu tautan. Peluang tanpa batas.</h2>
                <p>
                  Komisi 30% · Referral {policy.referralDays} hari · Pembelian
                  sendiri tidak dihitung
                </p>
              </div>
              <div className="aff-link-row">
                <input
                  aria-label="Tautan referral"
                  value={link}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <button className="aff-button" onClick={copy}>
                  Salin tautan
                </button>
              </div>
            </section>
            <div className="aff-dashboard-grid">
              <section className="aff-card">
                <h2>Riwayat komisi</h2>
                <p className="aff-muted">
                  100 transaksi terbaru. Statistik mencakup seluruh transaksi.
                </p>
                {dashboard.commissions.length === 0 ? (
                  <div className="aff-empty">
                    Belum ada pembelian melalui tautan Anda. Mulai bagikan
                    tautan referral untuk mendapatkan komisi.
                  </div>
                ) : (
                  <div className="aff-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Transaksi</th>
                          <th>Komisi</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.commissions.map((c) => (
                          <tr key={c.order_id}>
                            <td>
                              <strong>
                                {c.plan === "yearly"
                                  ? "Paket tahunan"
                                  : "Paket bulanan"}
                              </strong>
                              <small>
                                {date(c.created_at)} · {c.order_id.slice(-8)}
                              </small>
                            </td>
                            <td>{money(c.amount)}</td>
                            <td>
                              <span className={`aff-status ${c.status}`}>
                                {c.status === "void"
                                  ? "Dibatalkan"
                                  : c.status === "paid"
                                    ? "Dibayar"
                                    : c.payout_id
                                      ? "Pencairan diajukan"
                                      : new Date(c.ready_at) > new Date()
                                        ? `Tersedia ${date(c.ready_at)}`
                                        : "Siap ditarik"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              <section className="aff-card">
                <h2>Ajukan pencairan</h2>
                <p>
                  Saldo siap ditarik{" "}
                  <strong>{money(dashboard.stats.available)}</strong>
                </p>
                <p className="aff-muted">
                  Sedang diajukan: {money(dashboard.stats.in_review)}
                  <br />
                  Sudah dibayar: {money(dashboard.stats.paid)}
                </p>
                {dashboard.stats.debt > 0 && (
                  <p className="aff-notice">
                    Penyesuaian refund {money(dashboard.stats.debt)} akan
                    dipotong dari komisi berikutnya.
                  </p>
                )}
                <form onSubmit={withdraw}>
                  <label htmlFor="aff-bank">Bank tujuan</label>
                  <input
                    id="aff-bank"
                    required
                    minLength={2}
                    maxLength={80}
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    placeholder="Contoh: BCA, BNI, Mandiri"
                  />
                  <label htmlFor="aff-number">Nomor rekening</label>
                  <input
                    id="aff-number"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6,30}"
                    maxLength={30}
                    value={number}
                    onChange={(e) =>
                      setNumber(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Nomor rekening tujuan"
                  />
                  <label htmlFor="aff-account-name">
                    Nama pemilik rekening
                  </label>
                  <input
                    id="aff-account-name"
                    required
                    minLength={2}
                    maxLength={80}
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Sesuai nama pada rekening"
                  />
                  <button
                    className="aff-button"
                    disabled={
                      busy ||
                      dashboard.account.status !== "active" ||
                      dashboard.stats.available < policy.minimumPayout
                    }
                  >
                    {busy ? "Memproses…" : "Ajukan pencairan"}
                  </button>
                </form>
                <p className="aff-fine">
                  Minimum {money(policy.minimumPayout)}. Permintaan diperiksa
                  admin sebelum transfer dilakukan.
                </p>
              </section>
            </div>
            <section className="aff-card aff-history">
              <h2>Riwayat pencairan</h2>
              {dashboard.payouts.length === 0 ? (
                <p className="aff-empty">Belum ada permintaan pencairan.</p>
              ) : (
                <div className="aff-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Tujuan</th>
                        <th>Jumlah</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.payouts.map((p) => (
                        <tr key={p.id}>
                          <td>{date(p.created_at)}</td>
                          <td>
                            {p.bank} · ••••{p.account_last4}
                          </td>
                          <td>{money(p.amount)}</td>
                          <td>
                            <span className={`aff-status ${p.status}`}>
                              {statusLabel(p.status)}
                            </span>
                            {(p.transfer_reference || p.admin_note) && (
                              <small>
                                {p.transfer_reference || p.admin_note}
                              </small>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
        <section className="aff-terms">
          <h2>Ketentuan program</h2>
          <ul>
            <li>
              Komisi {policy.commissionPercent}% untuk setiap pembelian yang
              berhasil melalui referral, dari harga paket yang dibayar.
            </li>
            <li>
              Referral berlaku {policy.referralDays} hari di browser yang sama.
              Tautan affiliate valid terakhir yang dikunjungi mendapat atribusi.
            </li>
            <li>
              Komisi dapat diajukan setelah {policy.holdDays} hari. Minimum
              pencairan {money(policy.minimumPayout)} melalui transfer bank oleh
              admin.
            </li>
            <li>
              Pembelian dengan email affiliate sendiri tidak mendapat komisi.
              Spam, klaim menyesatkan, dan penyalahgunaan program dapat
              menyebabkan akun dinonaktifkan.
            </li>
            <li>
              Refund, pembatalan, atau chargeback membatalkan komisi transaksi.
              Komisi yang sudah dibayarkan akan dipotong dari pendapatan
              berikutnya. Permintaan pencairan terkait yang belum dibayar
              dibatalkan dan saldo transaksi lainnya dikembalikan.
            </li>
            <li>
              Promosikan fitur secara jujur. Trial gratis sedang dinonaktifkan;
              tidak ada jaminan diterima kerja.
            </li>
          </ul>
        </section>
      </main>
      <footer className="aff-container aff-footer">
        <span>© IntervAI · Bertumbuh bersama</span>
        <a
          href="https://wa.me/6283854696436"
          target="_blank"
          rel="noopener noreferrer"
        >
          Bantuan affiliate ↗
        </a>
      </footer>
    </div>
  );
}
