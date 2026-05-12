'use client';
import { useState, useMemo } from 'react';

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

type Stats = { total: number; activeTrial: number; expiredTrial: number; paid: number };
type SortKey = 'created_at' | 'email' | 'plan' | 'expires_at' | 'status';
type SortDir = 'asc' | 'desc';

function planBadge(plan: string, status: string, expires_at: string | null) {
  const revoked = status === 'inactive';
  const expired = plan === 'trial' && expires_at && new Date(expires_at) <= new Date();
  if (revoked) return { label: 'Revoked', cls: 'bg-red-500/10 text-red-400' };
  if (expired) return { label: 'Expired', cls: 'bg-white/8 text-white/30' };
  if (plan === 'trial') return { label: 'Trial', cls: 'bg-[#5b8dee]/15 text-[#5b8dee]' };
  return { label: plan.charAt(0).toUpperCase() + plan.slice(1), cls: 'bg-emerald-500/15 text-emerald-400' };
}

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'trial' | 'paid' | 'expired' | 'revoked'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [editTarget, setEditTarget] = useState<License | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [extendDays, setExtendDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  async function handleLogin() {
    if (!password) return;
    setLoadingLogin(true);
    setLoginError('');
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoadingLogin(false);
    if (!res.ok) { setLoginError('Password salah.'); return; }
    const data = await res.json();
    setLicenses(data.licenses);
    setStats(data.stats);
    setAuthed(true);
  }

  async function refresh() {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLicenses(data.licenses);
    setStats(data.stats);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-white/15 ml-1">↕</span>;
    return <span className="text-[#5b8dee] ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const filtered = useMemo(() => {
    const now = new Date();
    return licenses
      .filter(l => {
        const isExpired = l.plan === 'trial' && l.expires_at && new Date(l.expires_at) <= now;
        const isPaid = ['paid', 'monthly', 'yearly'].includes(l.plan);
        const isRevoked = l.status === 'inactive';
        if (filter === 'trial' && (l.plan !== 'trial' || isExpired || isRevoked)) return false;
        if (filter === 'paid' && (!isPaid || isRevoked)) return false;
        if (filter === 'expired' && !isExpired) return false;
        if (filter === 'revoked' && !isRevoked) return false;
        if (search) {
          const q = search.toLowerCase();
          return l.email?.toLowerCase().includes(q) || l.key?.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        let va: string = '', vb: string = '';
        if (sortKey === 'created_at') { va = a.created_at ?? ''; vb = b.created_at ?? ''; }
        else if (sortKey === 'email') { va = a.email ?? ''; vb = b.email ?? ''; }
        else if (sortKey === 'plan') { va = a.plan ?? ''; vb = b.plan ?? ''; }
        else if (sortKey === 'expires_at') { va = a.expires_at ?? ''; vb = b.expires_at ?? ''; }
        else if (sortKey === 'status') { va = a.status ?? ''; vb = b.status ?? ''; }
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
  }, [licenses, filter, search, sortKey, sortDir]);

  function openEdit(l: License) {
    setEditTarget(l);
    setEditPlan(l.plan);
    setEditStatus(l.status);
    setExtendDays('');
    setActionMsg('');
  }

  async function handleSave() {
    if (!editTarget) return;
    setSaving(true);
    const updates: Record<string, string> = { plan: editPlan, status: editStatus };
    if (extendDays && Number(extendDays) > 0) {
      const base = editTarget.expires_at && new Date(editTarget.expires_at) > new Date()
        ? new Date(editTarget.expires_at)
        : new Date();
      base.setDate(base.getDate() + Number(extendDays));
      updates.expires_at = base.toISOString();
    }
    const res = await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, key: editTarget.key, updates }),
    });
    setSaving(false);
    if (!res.ok) { setActionMsg('Gagal menyimpan.'); return; }
    await refresh();
    setEditTarget(null);
  }

  async function handleRevoke(key: string) {
    if (!confirm('Revoke license ini? User tidak bisa login lagi.')) return;
    const res = await fetch('/api/admin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, key }),
    });
    if (!res.ok) { alert('Gagal revoke.'); return; }
    await refresh();
  }

  if (!authed) {
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
          {loginError && <p className="text-red-400 text-xs mb-3">{loginError}</p>}
          <button
            onClick={handleLogin}
            disabled={loadingLogin}
            className="w-full bg-[#5b8dee] hover:bg-[#4a7de0] disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition text-sm"
          >
            {loadingLogin ? 'Memverifikasi...' : 'Masuk'}
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
          <div className="flex items-center gap-4">
            <button onClick={refresh} className="text-white/40 hover:text-white text-sm transition">↻ Refresh</button>
            <button onClick={() => { setAuthed(false); setLicenses([]); }} className="text-white/30 hover:text-white text-sm transition">Logout</button>
          </div>
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
          <div className="flex gap-2 flex-wrap">
            {(['all', 'trial', 'paid', 'expired', 'revoked'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${filter === f ? 'bg-[#5b8dee] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
              >
                {f === 'all' ? 'Semua' : f === 'trial' ? 'Trial' : f === 'paid' ? 'Berbayar' : f === 'expired' ? 'Expired' : 'Revoked'}
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
            <table className="w-full text-sm min-w-200">
              <thead>
                <tr className="border-b border-white/8 text-white/40 text-xs">
                  {([
                    { key: 'email', label: 'Email' },
                    { key: null, label: 'License Key' },
                    { key: 'plan', label: 'Plan' },
                    { key: 'expires_at', label: 'Expires' },
                    { key: 'status', label: 'Status' },
                    { key: 'created_at', label: 'Daftar' },
                    { key: null, label: 'Aksi' },
                  ] as { key: SortKey | null; label: string }[]).map(col => (
                    <th
                      key={col.label}
                      className={`text-left px-5 py-3.5 font-medium ${col.key ? 'cursor-pointer hover:text-white/70 select-none' : ''}`}
                      onClick={() => col.key && handleSort(col.key)}
                    >
                      {col.label}{col.key && <SortIcon col={col.key} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-white/20">Tidak ada data.</td></tr>
                )}
                {filtered.map((l, i) => {
                  const badge = planBadge(l.plan, l.status, l.expires_at);
                  return (
                    <tr key={l.key} className={`border-b border-white/5 hover:bg-white/3 transition ${i % 2 === 0 ? '' : 'bg-white/1'}`}>
                      <td className="px-5 py-3.5 text-white/80 max-w-45 truncate">{l.email}</td>
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
                      <td className="px-5 py-3.5 text-white/40 text-xs">{fmt(l.expires_at)}</td>
                      <td className="px-5 py-3.5 text-white/40 text-xs">{l.status}</td>
                      <td className="px-5 py-3.5 text-white/40 text-xs">{fmt(l.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(l)}
                            className="text-xs text-[#5b8dee] hover:underline"
                          >
                            Edit
                          </button>
                          {l.status === 'active' && (
                            <button
                              onClick={() => handleRevoke(l.key)}
                              className="text-xs text-red-400 hover:underline"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-white/5 text-white/25 text-xs">
            Menampilkan {filtered.length} dari {licenses.length} entri
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditTarget(null)} />
          <div className="relative bg-[#0d0d1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="font-bold text-base mb-1">Edit License</h2>
            <p className="text-white/40 text-xs mb-5 font-mono">{editTarget.email}</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Plan</label>
                <select
                  value={editPlan}
                  onChange={e => setEditPlan(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#5b8dee] transition"
                >
                  <option value="trial">Trial</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#5b8dee] transition"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1.5 block">
                  Extend Trial (hari)
                  {editTarget.expires_at && (
                    <span className="ml-2 text-white/25">saat ini: {fmt(editTarget.expires_at)}</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Misal: 3"
                  value={extendDays}
                  onChange={e => setExtendDays(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#5b8dee] transition"
                />
                <p className="text-white/25 text-xs mt-1">Kosongkan jika tidak ingin mengubah tanggal expired.</p>
              </div>
            </div>

            {actionMsg && <p className="text-red-400 text-xs mt-3">{actionMsg}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 font-semibold py-2.5 rounded-lg transition text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#5b8dee] hover:bg-[#4a7de0] disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition text-sm"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
