'use client';
import { useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function TrialForm({ onDone }: { onDone?: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleTrial() {
    if (!email) return;
    if (!EMAIL_RE.test(email)) { setError('Format email tidak valid.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Terjadi kesalahan. Coba lagi.');
      } else {
        setDone(true);
        onDone?.();
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="text-2xl">📬</span>
        <div>
          <p className="font-semibold text-white text-sm">Cek emailmu!</p>
          <p className="text-white/50 text-xs">License key dikirim ke <span className="text-white/70">{email}</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="email@kamu.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleTrial()}
          className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/50 transition placeholder:text-white/40"
        />
        <button
          onClick={handleTrial}
          disabled={loading || !email}
          className="shrink-0 bg-white text-[#4f8eff] font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition hover:bg-white/90 whitespace-nowrap"
        >
          {loading ? '...' : 'Kirim →'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

declare global {
  interface Window {
    snap: {
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
  }
}

const PRICE_MONTHLY = 'Rp 179.000';
const PRICE_YEARLY = 'Rp 1.499.000';

function loadSnapScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.snap) return resolve();
    const script = document.createElement('script');
    script.src = 'https://app.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!);
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

const faqs = [
  {
    q: 'Apakah interviewer bisa melihat aplikasinya?',
    a: 'Tidak. Aplikasi ini menggunakan content protection sehingga tidak terlihat saat kamu share screen di Zoom, Google Meet, atau Teams.',
  },
  {
    q: 'Apakah perlu internet saat interview?',
    a: 'Ya, koneksi internet diperlukan untuk transkripsi real-time dan AI answer. Koneksi standar sudah cukup.',
  },
  {
    q: 'Berapa lama bisa dipakai per hari?',
    a: 'Sampai 4 jam listening per hari. Lebih dari cukup untuk beberapa sesi interview.',
  },
  {
    q: 'Apa bedanya bulanan dan tahunan?',
    a: 'Fitur sama persis. Paket tahunan lebih hemat sekitar 30% (setara ~Rp 124.900/bulan).',
  },
  {
    q: 'AI apa yang digunakan?',
    a: 'Transkripsi menggunakan Deepgram Nova-3, sedangkan jawaban AI menggunakan Gemini 2.0 Flash — keduanya model mutakhir dengan latency rendah.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/8">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-4 text-left text-sm font-medium text-white/80 hover:text-white transition"
      >
        {q}
        <span className="ml-4 flex-shrink-0 text-white/40 text-lg">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="pb-4 text-sm text-white/70 leading-relaxed">{a}</p>}
    </div>
  );
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  async function handleCheckout() {
    if (!email) return;
    if (!EMAIL_RE.test(email)) { setEmailError('Format email tidak valid.'); return; }
    setEmailError('');
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan }),
      });
      const { token, error } = await res.json();
      if (error || !token) throw new Error(error ?? 'Terjadi kesalahan. Coba lagi.');

      await loadSnapScript();
      const scrollY = window.scrollY;
      const restoreScroll = () => setTimeout(() => window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior }), 50);
      window.snap.pay(token, {
        onSuccess: () => { window.location.href = '/success'; },
        onPending: () => { setLoading(false); restoreScroll(); },
        onError: () => { setLoading(false); setEmailError('Pembayaran gagal. Coba lagi.'); restoreScroll(); },
        onClose: () => { setLoading(false); restoreScroll(); },
      });
    } catch (err: unknown) {
      setLoading(false);
      setEmailError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.');
    }
  }

  return (
    <main className="min-h-screen bg-dot-pattern text-white overflow-x-hidden">

      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="orb orb-blue w-[700px] h-[700px] -top-40 -left-40" />
        <div className="orb orb-purple w-[500px] h-[500px] top-1/3 -right-32" />
        <div className="orb orb-cyan w-[400px] h-[400px] bottom-1/4 left-1/4" />
        <div className="orb orb-blue w-[400px] h-[400px] bottom-0 right-1/4 opacity-50" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-white/8 bg-[#05091a]/90 backdrop-blur">
        <span className="font-bold text-lg tracking-tight">
          Interv<span className="text-[#4f8eff]">AI</span>
        </span>
        <div className="flex items-center gap-6">
          <a href="#how" className="text-sm text-white/65 hover:text-white transition hidden md:block">Cara Kerja</a>
          <a href="#pricing" className="text-sm text-white/65 hover:text-white transition hidden md:block">Harga</a>
          <a href="#pricing" className="bg-[#4f8eff] hover:bg-[#3d76f5] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            Mulai Sekarang
          </a>
        </div>
      </nav>


      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-8">
        {/* Hero glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-150 h-100 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(79,142,255,0.18) 0%, rgba(139,92,246,0.10) 40%, transparent 70%)' }} />
        <div className="flex flex-col lg:flex-row lg:items-center gap-12">

          {/* Left: copy */}
          <div className="flex-1 w-full text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 text-white text-xs font-semibold px-4 py-2 rounded-full mb-7">
              <span className="text-[#4f8eff]">✦</span>
              Realtime AI Assistance
            </div>

            {/* Headline */}
            <h1 className="font-extrabold leading-none mb-5">
              <span className="block text-6xl lg:text-7xl text-white">AI Interview</span>
              <span className="block text-6xl lg:text-7xl" style={{ background: 'linear-gradient(90deg, #4f8eff, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Copilot</span>
            </h1>

            {/* Underline accent */}
            <div className="w-14 h-0.5 mb-6 mx-auto lg:mx-0" style={{ background: 'linear-gradient(90deg, #4f8eff, #8b5cf6)' }} />

            {/* Subtitle */}
            <p className="text-white/80 text-base mb-8 leading-relaxed">
              Bantu Kamu Jawab Pertanyaan Saat Interview<br />
              Dengan Bantuan AI Secara{' '}
              <span className="text-[#4f8eff] font-semibold">Real Time</span>
              {' '}& <span className="text-[#8b5cf6] font-semibold">Tidak Terlihat</span>
            </p>

            {/* Feature pills */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { icon: '⚡', title: 'Jawaban Instan', sub: '& Relevan' },
                { icon: '🙈', title: 'Tidak Terlihat', sub: 'di Layar' },
                { icon: '🧠', title: 'AI Cerdas', sub: '& Akurat' },
                { icon: '🛡', title: 'Aman &', sub: 'Privasi Terjaga' },
              ].map((f) => (
                <div key={f.title} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-[#4f8eff]/15 border border-[#4f8eff]/20 flex items-center justify-center text-base shrink-0">
                    {f.icon}
                  </div>
                  <div className="text-left">
                    <div className="text-white text-xs font-semibold leading-tight">{f.title}</div>
                    <div className="text-white/40 text-xs leading-tight">{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#pricing"
                className="flex items-center justify-center gap-2 text-white font-bold px-6 py-4 rounded-xl text-base transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #4f8eff, #8b5cf6)' }}
              >
                🚀 Coba Gratis Sekarang →
              </a>
              <a
                href="#pricing"
                className="flex items-center justify-center gap-2 bg-white/8 hover:bg-white/12 border border-white/15 text-white/85 hover:text-white font-semibold px-6 py-4 rounded-xl text-base transition"
              >
                ✓ Siap Hadapi Interview
              </a>
            </div>
          </div>

          {/* Right: app screenshot */}
          <div className="flex-1 w-full min-w-0">
            <img
              src="/hero.webp"
              alt="IntervAI app screenshot"
              className="w-full rounded-2xl block"
              style={{ boxShadow: '0 0 0 1.5px rgba(91,141,238,0.6), 0 0 30px rgba(91,141,238,0.35), 0 0 70px rgba(139,92,246,0.2)' }}
            />
          </div>

        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 section-alt py-20">
        <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Cara Kerja</h2>
          <p className="text-white/60">Siap pakai dalam hitungan menit</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-white/8" />
          {[
            { step: '01', icon: '💳', title: 'Subscribe', desc: 'Pilih paket dan bayar via Midtrans. License key dikirim ke emailmu.' },
            { step: '02', icon: '⬇', title: 'Download', desc: 'Install aplikasi Windows. Masukkan license key saat pertama buka.' },
            { step: '03', icon: '🎙', title: 'Pilih Audio', desc: 'Pilih Screen sebagai sumber audio agar suara interviewer tertangkap.' },
            { step: '04', icon: '✨', title: 'Interview!', desc: 'Tekan Start dan jawaban AI muncul otomatis saat interviewer selesai bicara.' },
          ].map((s) => (
            <div key={s.step} className="flex flex-col items-center text-center relative">
              <div className="w-16 h-16 rounded-full bg-[#07102a] border border-[#4f8eff]/25 flex items-center justify-center text-2xl mb-4 relative z-10">
                {s.icon}
              </div>
              <div className="text-[10px] font-bold text-[#4f8eff]/60 mb-1 tracking-widest">{s.step}</div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-white/65 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Fitur Lengkap</h2>
          <p className="text-white/60">Semua yang kamu butuhkan untuk interview percaya diri</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: '🎙', title: 'Transkripsi Real-time', desc: 'Deepgram Nova-3 mengubah suara interviewer jadi teks dalam milidetik — akurat dan responsif.' },
            { icon: '🤖', title: 'Jawaban Personal', desc: 'Isi profil CV dan job description-mu, AI akan menjawab sesuai pengalamanmu yang spesifik.' },
            { icon: '🛡', title: 'Tidak Terlihat', desc: 'Content protection aktif by default — overlay sama sekali tidak muncul saat kamu share screen.' },
            { icon: '🎧', title: 'Tangkap Suara PC', desc: 'Menangkap audio sistem (Zoom, Meet, Teams) bukan hanya mic — sempurna untuk interview online.' },
            { icon: '⚡', title: 'Latency Rendah', desc: 'Jawaban AI muncul dalam kurang dari 2 detik setelah interviewer selesai bicara.' },
            { icon: '🔄', title: 'Auto-update', desc: 'Aplikasi memperbarui dirinya sendiri secara otomatis. Selalu pakai versi terbaru.' },
          ].map((f) => (
            <div key={f.title} className="bg-[#0a1228] border border-white/10 rounded-xl p-6 hover:bg-[#0d1530] hover:border-white/18 transition">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-base mb-2">{f.title}</h3>
              <p className="text-white/65 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Kenapa IntervAI?</h2>
          <p className="text-white/60">Ringan, terjangkau, dan langsung kerja — tanpa bloat</p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full text-sm min-w-140">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-5 py-4 text-white/40 font-medium w-[30%]">Fitur</th>
                {[
                  { name: 'IntervAI', highlight: true },
                  { name: 'Final Round AI', highlight: false },
                  { name: 'Cluely', highlight: false },
                  { name: 'Interview Coder', highlight: false },
                ].map((col) => (
                  <th key={col.name} className={`px-5 py-4 text-center font-semibold ${col.highlight ? 'text-[#4f8eff]' : 'text-white/50'}`}>
                    {col.highlight && <span className="block text-[10px] font-bold uppercase tracking-widest text-[#4f8eff]/70 mb-1">Kamu di sini</span>}
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: 'Harga mulai',
                  values: ['Rp 179.000/bln', '~Rp 400.000/bln', '~Rp 1.200.000/bln', '~Rp 4.800.000/bln'],
                },
                {
                  label: 'Real-time transkripsi',
                  values: ['✓', '✓', '✓', '✓'],
                },
                {
                  label: 'Tidak terlihat saat screen share',
                  values: ['✓', '✓', '✓', '✓'],
                },
                {
                  label: 'Tangkap audio PC (Zoom, Meet)',
                  values: ['✓', '✓', '✓', '✓'],
                },
                {
                  label: 'Jawaban personal sesuai CV',
                  values: ['✓', '✓', '✓', '✗'],
                },
                {
                  label: 'Ukuran aplikasi',
                  values: ['< 80 MB', 'Web + berat', '~200 MB', '~300 MB'],
                },
                {
                  label: 'Trial gratis',
                  values: ['3 hari penuh', 'Sesi terbatas', '✗', 'Terbatas'],
                },
                {
                  label: 'Bahasa Indonesia',
                  values: ['✓', '✗', '✗', '✗'],
                },
              ].map((row, i) => (
                <tr key={row.label} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/1.5' : ''}`}>
                  <td className="px-5 py-3.5 text-white/60">{row.label}</td>
                  {row.values.map((val, vi) => (
                    <td
                      key={vi}
                      className={`px-5 py-3.5 text-center ${
                        vi === 0
                          ? val === '✓' ? 'text-[#4f8eff] font-semibold' : val === '✗' ? 'text-white/20' : 'text-white font-semibold'
                          : val === '✓' ? 'text-white/50' : val === '✗' ? 'text-white/15' : 'text-white/40'
                      }`}
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-center text-white/20 text-xs mt-4">Harga kompetitor berdasarkan data publik per Mei 2026. Dapat berubah sewaktu-waktu.</p>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 section-alt py-20">
        <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Apa Kata Mereka</h2>
          <p className="text-white/60">Dari pengguna nyata yang sudah merasakannya</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              name: 'Rizky A.',
              role: 'Fresh Graduate · IT',
              avatar: 'RA',
              text: 'Pertama kali interview kerja, nervous banget. Dengan copilot ini aku lebih tenang karena ada backup jawaban. Alhamdulillah langsung lolos ke tahap berikutnya!',
            },
            {
              name: 'Dinda S.',
              role: 'Software Engineer',
              avatar: 'DS',
              text: 'Yang paling saya suka itu bisa isi CV dulu, jadi jawabannya beneran spesifik pakai pengalaman saya sendiri. Tidak generik sama sekali.',
            },
            {
              name: 'Budi H.',
              role: 'Product Manager',
              avatar: 'BH',
              text: 'Awalnya skeptis, tapi ternyata latency-nya cepat banget. Interviewer selesai ngomong, dalam hitungan detik sudah ada draft jawaban di layar.',
            },
          ].map((t) => (
            <div key={t.name} className="bg-[#0a1228] border border-white/10 rounded-xl p-6 flex flex-col gap-4">
              <p className="text-white/80 text-sm leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#4f8eff]/20 border border-[#4f8eff]/30 flex items-center justify-center text-xs font-bold text-[#4f8eff]">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-white/55 text-xs">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold text-center mb-3">Pilih Paket</h2>
        <p className="text-white/60 text-center mb-10">Mulai gratis, upgrade kapan saja.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

          {/* Free Trial Card */}
          <div className="bg-[#0a1228] border border-white/12 rounded-2xl p-7 flex flex-col gap-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#4f8eff] mb-2">Coba Gratis</div>
              <div className="text-4xl font-bold mb-1">3 Hari</div>
              <p className="text-white/60 text-sm">Tidak perlu kartu kredit</p>
            </div>
            <ul className="space-y-2.5 text-sm text-white/75">
              {[
                'Semua fitur lengkap',
                'Real-time transcription',
                'AI answers',
                'Invisible saat screen share',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-[#4f8eff]">✓</span>{item}
                </li>
              ))}
            </ul>
            <div className="border-t border-white/8 pt-5">
              <p className="text-white/60 text-xs mb-3">Masukkan email untuk dapat license key trial:</p>
              <TrialForm />
            </div>
          </div>

          {/* Paid Card */}
          <div className="bg-[#0a1228] border border-[#4f8eff]/40 rounded-2xl p-7 relative overflow-hidden flex flex-col gap-5">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-[#4f8eff]/60 blur-sm rounded-full" />
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#4f8eff] mb-2">Full Access</div>
              <div className="flex justify-start mb-4">
                <div className="bg-white/5 rounded-lg p-1 flex gap-1">
                  {(['monthly', 'yearly'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlan(p)}
                      className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${
                        plan === p ? 'bg-[#4f8eff] text-white' : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {p === 'monthly' ? 'Bulanan' : 'Tahunan'}
                      {p === 'yearly' && (
                        <span className="ml-1.5 bg-green-500/20 text-green-400 text-[9px] px-1 py-0.5 rounded-full">-30%</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-bold">{plan === 'monthly' ? PRICE_MONTHLY : PRICE_YEARLY}</span>
                <span className="text-white/60 mb-1 text-sm">/{plan === 'monthly' ? 'bulan' : 'tahun'}</span>
              </div>
              {plan === 'yearly' && <p className="text-green-400 text-xs">~Rp 124.900/bulan, ditagih tahunan</p>}
            </div>
            <ul className="space-y-2.5 text-sm text-white/80">
              {[
                'Real-time transcription (Deepgram Nova-3)',
                'AI answers (Gemini 2.0 Flash)',
                'Invisible saat screen share',
                'Jawaban personal dari CV kamu',
                'Aplikasi Windows always-on-top',
                'Auto-update gratis selamanya',
                'Hingga 4 jam listening per hari',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-[#4f8eff] shrink-0">✓</span>{item}
                </li>
              ))}
            </ul>
            <div className="border-t border-white/8 pt-5">
              <input
                type="email"
                placeholder="email@kamu.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckout()}
                className={`w-full bg-white/5 border rounded-lg px-4 py-3 text-sm mb-1 outline-none transition ${emailError ? 'border-red-500/60' : 'border-white/10 focus:border-[#4f8eff]'}`}
              />
              {emailError && <p className="text-red-400 text-xs mb-2">{emailError}</p>}
              <button
                onClick={handleCheckout}
                disabled={loading || !email}
                className="w-full bg-[#4f8eff] hover:bg-[#3d76f5] disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition text-sm mt-2"
              >
                {loading ? 'Memproses...' : 'Subscribe Sekarang'}
              </button>
              <p className="text-white/45 text-xs text-center mt-3">🔒 Pembayaran aman via Midtrans</p>
            </div>
          </div>

        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-10">Pertanyaan Umum</h2>
        <div className="divide-y divide-white/8 border-t border-white/8">
          {faqs.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="bg-[#4f8eff]/10 border border-[#4f8eff]/30 rounded-2xl p-10">
          <h2 className="text-3xl font-bold mb-4">Siap untuk interview berikutnya?</h2>
          <p className="text-white/70 mb-7">Mulai dalam 5 menit. Tidak perlu setup yang rumit.</p>
          <a href="#pricing" className="bg-[#4f8eff] hover:bg-[#3d76f5] text-white font-semibold px-8 py-3.5 rounded-lg transition text-base inline-block">
            Mulai Sekarang →
          </a>
        </div>
      </section>

      <footer className="relative z-10 text-center py-8 text-white/40 text-sm border-t border-white/10">
        © 2025 IntervAI · Dibuat dengan ❤️ di Indonesia
      </footer>

      {/* Floating Feedback Button */}
      <button
        onClick={() => setFeedbackOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#4f8eff] hover:bg-[#3d76f5] text-white text-sm font-semibold px-4 py-3 rounded-full shadow-lg shadow-[#4f8eff]/30 transition"
      >
        💬 Masukan
      </button>

      {/* Feedback Popup */}
      {feedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 p-0">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFeedbackOpen(false)} />
          <div className="relative bg-[#07102a] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:w-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <span className="font-semibold text-sm">Punya Masukan?</span>
              <button onClick={() => setFeedbackOpen(false)} className="text-white/40 hover:text-white text-xl leading-none transition">×</button>
            </div>
            <iframe
              src="https://tally.so/embed/0Q1D6j?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
              width="100%"
              height="480"
              style={{ border: 'none' }}
              title="Form Masukan IntervAI"
            />
          </div>
        </div>
      )}
    </main>
  );
}
