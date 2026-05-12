'use client';
import { useState } from 'react';

type License = {
  key: string;
  email: string;
  status: string;
  plan: string;
  expires_at: string | null;
  device_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
};

type Stats = {
  total: number;
  activeTrial: number;
  expiredTrial: number;
  paid: number;
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [licenses, setLicenses] = useState<License[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'trial' | 'paid' | 'expired'>('all');

  async function handleLogin() {
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setError('Password salah.'); return; }
      const data = await res.json();
      setLicenses(data.licenses);
      setStats(data.stats);
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }

  function planBadge(plan: string, expires_at: string | null) {
    const expired = plan === 'trial' && expires_at && new Date(expires_at) <= new Date();
    if (expired) return { label: 'Expired', cls: 'bg-white/8 text-white/30' };
    if (plan === 'trial') return { label: 'Trial', cls: 'bg-[#5b8dee]/15 text-[#5b8dee]' };
    return { label: plan.charAt(0).toUpperCase() + plan.slice(1), cls: 'bg-emerald-500/15 text-emerald-400' };
  }

  const filtered = licenses?.filter(l => {
    const now = new Date();
    const isExpired = l.plan === 'trial' && l.expires_at && new Date(l.expires_at) <= now;
    const isPaid = ['paid', 'monthly', 'yearly'].includes(l.plan);
    if (filter === 'trial' && (l.plan !== 'trial' || isExpired)) return false;
    if (filter === 'paid' && !isPaid) return false;
    if (filter === 'expired' && !isExpired) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.email?.toLowerCase().includes(q) || l.key?.toLowerCase().includes(q);
    }
    return true;
  });

  if (!licenses) {
    return (
      <div className="min-h-screen bg-[#070711] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/4 border border-white/8 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-1">IntervAI Admin</h1>
          <p className="text-white/40 text-sm mb-6">Masukkan password untuk lanjut.</p>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full bg-white/5 border border-white/10 focus:border-[#5b8dee] rounded-lg px-4 py-3 text-sm text-white outline-none mb-3 transition"
          />
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#5b8dee] hover:bg-[#4a7de0] disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition text-sm"
          >
            {loading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070711] text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">IntervAI Admin</h1>
            <p className="text-white/40 text-sm mt-1">{stats?.total} total user terdaftar</p>
          </div>
          <button
            onClick={() => setLicenses(null)}
            className="text-white/30 hover:text-white text-sm transition"
          >
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total User', value: stats?.total ?? 0, color: 'text-white' },
            { label: 'Trial Aktif', value: stats?.activeTrial ?? 0, color: 'text-[#5b8dee]' },
            { label: 'Berbayar', value: stats?.paid ?? 0, color: 'text-emerald-400' },
            { label: 'Trial Expired', value: stats?.expiredTrial ?? 0, color: 'text-white/30' },
          ].map(s => (
            <div key={s.label} className="bg-white/4 border border-white/8 rounded-xl p-5">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-white/40 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-2">
            {(['all', 'trial', 'paid', 'expired'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${filter === f ? 'bg-[#5b8dee] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
              >
                {f === 'all' ? 'Semua' : f === 'trial' ? 'Trial' : f === 'paid' ? 'Berbayar' : 'Expired'}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Cari email atau license key..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 focus:border-[#5b8dee] rounded-lg px-4 py-2 text-sm text-white outline-none transition"
          />
        </div>

        {/* Table */}
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-white/8 text-white/40 text-xs">
                  <th className="text-left px-5 py-3.5 font-medium">Email</th>
                  <th className="text-left px-5 py-3.5 font-medium">License Key</th>
                  <th className="text-left px-5 py-3.5 font-medium">Plan</th>
                  <th className="text-left px-5 py-3.5 font-medium">Expires</th>
                  <th className="text-left px-5 py-3.5 font-medium">Device</th>
                  <th className="text-left px-5 py-3.5 font-medium">Daftar</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-white/20">Tidak ada data.</td></tr>
                )}
                {filtered?.map((l, i) => {
                  const badge = planBadge(l.plan, l.expires_at);
                  return (
                    <tr key={l.key} className={`border-b border-white/5 hover:bg-white/3 transition ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                      <td className="px-5 py-3.5 text-white/80">{l.email}</td>
                      <td className="px-5 py-3.5">
                        <code
                          className="text-xs text-white/50 cursor-pointer hover:text-white transition"
                          title="Klik untuk copy"
                          onClick={() => navigator.clipboard.writeText(l.key)}
                        >
                          {l.key}
                        </code>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td className="px-5 py-3.5 text-white/40 text-xs">
                        {l.expires_at ? new Date(l.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-white/25 text-xs font-mono">
                        {l.device_id ? l.device_id.slice(0, 12) + '…' : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-white/40 text-xs">
                        {new Date(l.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-white/5 text-white/25 text-xs">
            Menampilkan {filtered?.length ?? 0} dari {licenses.length} entri
          </div>
        </div>

      </div>
    </div>
  );
}
