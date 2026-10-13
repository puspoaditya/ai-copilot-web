"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import AffiliateBrand from "../../affiliate/brand";
import { money } from "@/lib/affiliate-policy";

type AdminData = {
  stats: {
    accounts: number;
    sales: number;
    pending_payouts: number;
    paid_payouts: number;
  };
  accounts: {
    id: string;
    name: string;
    email: string;
    code: string;
    status: string;
  }[];
  payouts: {
    id: string;
    amount: number;
    debit_amount: number;
    bank: string;
    account_number: string;
    account_name: string;
    name: string;
    email: string;
    status: string;
    transfer_reference: string | null;
    admin_note: string | null;
    created_at: string;
  }[];
};
export default function AffiliateAdmin() {
  const [password, setPassword] = useState(""),
    [data, setData] = useState<AdminData | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [references, setReferences] = useState<Record<string, string>>({}),
    [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  async function call(method: string, body: Record<string, unknown> = {}) {
    const response = await fetch("/api/admin/affiliate", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, ...body }),
      signal: AbortSignal.timeout(20000),
    });
    const json = await response.json();
    if (!response.ok) {
      if (response.status === 401) setData(null);
      throw new Error(json.error || "Permintaan gagal.");
    }
    return json;
  }
  async function refresh() {
    setData(await call("POST"));
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tidak dapat masuk.");
    } finally {
      setBusy(false);
    }
  }
  async function resolve(id: string, action: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await call("PATCH", { id, action, reference: references[id] });
      await refresh();
      setMessage(
        action === "paid"
          ? "Pencairan ditandai dibayar. Referensi transfer tersimpan."
          : action === "rejected"
            ? "Permintaan ditolak dan saldo dikembalikan."
            : "Status akun berhasil diperbarui.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tindakan gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="affiliate-page">
      <header className="aff-nav aff-container">
        <AffiliateBrand />
        <div>
          <Link className="aff-button secondary" href="/admin">
            Admin lisensi
          </Link>
          {data && (
            <button
              className="aff-button secondary"
              disabled={busy}
              onClick={() => {
                setData(null);
                setPassword("");
                setMessage("");
                setReferences({});
                setConfirmed({});
              }}
            >
              Keluar
            </button>
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
        {!data ? (
          <section className="aff-card aff-admin-login">
            <span className="aff-eyebrow">INTERVAI ADMIN</span>
            <h1>Kelola affiliate</h1>
            <p className="aff-muted">Gunakan password admin IntervAI.</p>
            <form onSubmit={login}>
              <label htmlFor="affiliate-admin-password">Password admin</label>
              <input
                id="affiliate-admin-password"
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button className="aff-button" disabled={busy}>
                {busy ? "Memverifikasi…" : "Masuk"}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="aff-dashboard-heading">
              <div>
                <span className="aff-eyebrow">ADMIN AFFILIATE</span>
                <h1>Kelola mitra & pencairan</h1>
                <p>Periksa rekening, transfer, lalu catat referensinya.</p>
              </div>
              <button
                className="aff-button secondary"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError("");
                  refresh()
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              >
                ↻ Muat ulang
              </button>
            </section>
            <section className="aff-metrics">
              {[
                ["Affiliate", String(data.stats.accounts)],
                ["Pembelian berhasil", String(data.stats.sales)],
                ["Menunggu transfer", money(data.stats.pending_payouts)],
                ["Sudah dibayar", money(data.stats.paid_payouts)],
              ].map(([label, value]) => (
                <div className="aff-card" key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>
            <section className="aff-card">
              <h2>Permintaan pencairan</h2>
              <p className="aff-muted">
                200 permintaan terbaru, dengan permintaan tertunda ditampilkan
                lebih dahulu. Transfer dilakukan manual melalui bank Anda.
              </p>
              {data.payouts.length === 0 ? (
                <p className="aff-empty">Belum ada permintaan pencairan.</p>
              ) : (
                data.payouts.map((p) => (
                  <article className="aff-admin-payout" key={p.id}>
                    <div className="aff-admin-summary">
                      <div>
                        <h3>{p.name}</h3>
                        <p>
                          {p.email} ·{" "}
                          {new Date(p.created_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <strong>{money(p.amount)}</strong>
                    </div>
                    <p>
                      {p.bank} · {p.account_number} · a.n. {p.account_name}
                    </p>
                    {p.debit_amount > 0 && (
                      <p>Potongan refund: {money(p.debit_amount)}</p>
                    )}
                    {p.status === "pending" ? (
                      <>
                        <div className="aff-admin-actions">
                          <input
                            aria-label={`Referensi atau alasan ${p.id}`}
                            value={references[p.id] || ""}
                            maxLength={160}
                            onChange={(e) =>
                              setReferences({
                                ...references,
                                [p.id]: e.target.value,
                              })
                            }
                            placeholder="Referensi transfer / alasan penolakan"
                          />
                          <button
                            className="aff-button"
                            disabled={
                              busy ||
                              !confirmed[p.id] ||
                              (references[p.id]?.trim().length || 0) < 2
                            }
                            onClick={() => resolve(p.id, "paid")}
                          >
                            Tandai dibayar
                          </button>
                          <button
                            className="aff-button secondary"
                            disabled={
                              busy || (references[p.id]?.trim().length || 0) < 2
                            }
                            onClick={() => resolve(p.id, "rejected")}
                          >
                            Tolak permintaan
                          </button>
                        </div>
                        <label
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <input
                            style={{ width: 18, minHeight: 18 }}
                            type="checkbox"
                            checked={!!confirmed[p.id]}
                            onChange={(e) =>
                              setConfirmed({
                                ...confirmed,
                                [p.id]: e.target.checked,
                              })
                            }
                          />
                          Saya sudah melakukan transfer ke rekening di atas.
                        </label>
                      </>
                    ) : (
                      <p>
                        <span className={`aff-status ${p.status}`}>
                          {p.status === "paid" ? "Dibayar" : "Ditolak"}
                        </span>{" "}
                        {p.transfer_reference || p.admin_note}
                      </p>
                    )}
                  </article>
                ))
              )}
            </section>
            <section className="aff-card aff-admin-list">
              <h2>Affiliate terdaftar</h2>
              <p className="aff-muted">
                200 akun terbaru. Menonaktifkan akun menghentikan referral baru
                dan permintaan pencairan.
              </p>
              {data.accounts.length === 0 ? (
                <p className="aff-empty">Belum ada affiliate.</p>
              ) : (
                <div className="aff-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Email</th>
                        <th>Kode</th>
                        <th>Status</th>
                        <th>Tindakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.accounts.map((a) => (
                        <tr key={a.id}>
                          <td>{a.name}</td>
                          <td>{a.email}</td>
                          <td>{a.code}</td>
                          <td>
                            {a.status === "active" ? "Aktif" : "Dinonaktifkan"}
                          </td>
                          <td>
                            <button
                              className="aff-button secondary"
                              disabled={busy}
                              onClick={() =>
                                resolve(
                                  a.id,
                                  a.status === "active" ? "block" : "activate",
                                )
                              }
                            >
                              {a.status === "active"
                                ? "Nonaktifkan"
                                : "Aktifkan"}
                            </button>
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
      </main>
      <footer className="aff-container aff-footer">
        IntervAI · Admin affiliate
      </footer>
    </div>
  );
}
