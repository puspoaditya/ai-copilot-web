'use client';
import { useState, useRef, useEffect } from 'react';

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)', transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

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
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Lead');
        }
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
          <p className="text-white/35 text-xs mt-1">Belum masuk? Cek folder Spam — email ini dikirim otomatis.</p>
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
      const prices: Record<string, number> = { monthly: 179000, yearly: 1499000 };
      window.snap.pay(token, {
        onSuccess: () => {
          if ((window as any).fbq) (window as any).fbq('track', 'Purchase', { value: prices[plan] ?? 179000, currency: 'IDR' });
          window.location.href = '/success';
        },
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
        <div className="orb orb-blue orb-drift-1 w-175 h-175 -top-40 -left-40" />
        <div className="orb orb-purple orb-drift-2 w-125 h-125 top-1/3 -right-32" />
        <div className="orb orb-cyan orb-drift-3 w-100 h-100 bottom-1/4 left-1/4" />
        <div className="orb orb-blue orb-drift-4 w-100 h-100 bottom-0 right-1/4 opacity-50" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-white/8 bg-[#05091a]/90 backdrop-blur">
        <a href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-85 transition">
          <img src="/icon.ico" alt="IntervAI" className="w-7 h-7 rounded-md" />
          Interv <span className="text-[#4f8eff]">AI</span>
        </a>
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
          <FadeUp className="flex-1 w-full text-center lg:text-left">
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
                className="btn-shimmer flex items-center justify-center gap-2 text-white font-bold px-6 py-4 rounded-xl text-base transition hover:opacity-95 hover:scale-[1.02]"
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
          </FadeUp>

          {/* Right: app screenshot */}
          <div className="flex-1 w-full min-w-0 hero-float">
            <img
              src="/hero.webp"
              alt="IntervAI app screenshot"
              className="w-full rounded-2xl block"
              style={{ boxShadow: '0 0 0 1.5px rgba(79,142,255,0.6), 0 0 30px rgba(79,142,255,0.35), 0 0 70px rgba(139,92,246,0.2)' }}
            />
          </div>

        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 section-alt py-20">
        <div className="max-w-4xl mx-auto px-6">
        <FadeUp><div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Cara Kerja</h2>
          <p className="text-white/60">Siap pakai dalam hitungan menit</p>
        </div></FadeUp>
        <FadeUp delay={150}><div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
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
        </div></FadeUp>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        <FadeUp><div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Fitur Lengkap</h2>
          <p className="text-white/60">Semua yang kamu butuhkan untuk interview percaya diri</p>
        </div></FadeUp>
        <FadeUp delay={150}><div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
        </div></FadeUp>
      </section>

      {/* Comparison Table */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <FadeUp><div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Kenapa IntervAI?</h2>
          <p className="text-white/60">Ringan, terjangkau, dan langsung kerja — tanpa bloat</p>
        </div></FadeUp>
        <FadeUp delay={150}><div className="overflow-x-auto rounded-2xl border border-white/8">
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
        </div></FadeUp>
        <p className="text-center text-white/20 text-xs mt-4">Harga kompetitor berdasarkan data publik per Mei 2026. Dapat berubah sewaktu-waktu.</p>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 section-alt py-20">
        <div className="max-w-5xl mx-auto px-6">
        <FadeUp><div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Apa Kata Mereka</h2>
          <p className="text-white/60">Dari pengguna nyata yang sudah merasakannya</p>
        </div></FadeUp>
        <FadeUp delay={150}><div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
        </div></FadeUp>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        <FadeUp><div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">Pilih Paket</h2>
          <p className="text-white/60">Mulai gratis, upgrade kapan saja.</p>
        </div></FadeUp>

        <FadeUp delay={100}><div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

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

        </div></FadeUp>
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 py-20">
        <FadeUp>
          <h2 className="text-3xl font-bold text-center mb-10">Pertanyaan Umum</h2>
          <div className="divide-y divide-white/8 border-t border-white/8">
            {faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </FadeUp>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 py-16 text-center">
        <FadeUp>
          <div className="bg-[#4f8eff]/10 border border-[#4f8eff]/30 rounded-2xl p-10">
            <h2 className="text-3xl font-bold mb-4">Siap untuk interview berikutnya?</h2>
            <p className="text-white/70 mb-7">Mulai dalam 5 menit. Tidak perlu setup yang rumit.</p>
            <a href="#pricing" className="bg-[#4f8eff] hover:bg-[#3d76f5] text-white font-semibold px-8 py-3.5 rounded-lg transition text-base inline-block">
              Mulai Sekarang →
            </a>
          </div>
        </FadeUp>
      </section>

      <footer className="relative z-10 text-center py-8 text-white/40 text-sm border-t border-white/10">
        © 2025 IntervAI · Dibuat dengan ❤️ di Indonesia
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/6283854696436"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25d366] hover:bg-[#1ebe5d] text-white text-sm font-semibold px-4 py-3 rounded-full shadow-lg shadow-[#25d366]/30 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Hubungi Kami
      </a>
    </main>
  );
}
