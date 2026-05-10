'use client';
import { useState } from 'react';

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
      {open && <p className="pb-4 text-sm text-white/45 leading-relaxed">{a}</p>}
    </div>
  );
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');

  async function handleCheckout() {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan }),
      });
      const { token, error } = await res.json();
      if (error || !token) throw new Error(error ?? 'Failed to create payment');

      await loadSnapScript();
      window.snap.pay(token, {
        onSuccess: () => { window.location.href = '/success'; },
        onPending: () => { setLoading(false); },
        onError: () => { setLoading(false); alert('Pembayaran gagal. Coba lagi.'); },
        onClose: () => { setLoading(false); },
      });
    } catch {
      setLoading(false);
      alert('Terjadi kesalahan. Coba lagi.');
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d14] text-white">

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#0d0d14]/90 backdrop-blur">
        <span className="font-bold text-lg tracking-tight">
          <span className="text-[#5b8dee]">AI</span> Interview Copilot
        </span>
        <div className="flex items-center gap-6">
          <a href="#how" className="text-sm text-white/50 hover:text-white transition hidden md:block">Cara Kerja</a>
          <a href="#pricing" className="text-sm text-white/50 hover:text-white transition hidden md:block">Harga</a>
          <a href="#pricing" className="bg-[#5b8dee] hover:bg-[#4a7de0] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            Mulai Sekarang
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-8">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          {/* Left: copy */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-block bg-[#5b8dee]/10 text-[#5b8dee] text-xs font-semibold px-3 py-1 rounded-full mb-6 border border-[#5b8dee]/20">
              Real-time AI assistant · Windows
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-5">
              Jawab pertanyaan interview{' '}
              <span className="text-[#5b8dee]">secara real-time</span>{' '}
              dengan bantuan AI
            </h1>
            <p className="text-white/50 text-lg mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Aplikasi mendengarkan interviewer, lalu langsung menghasilkan jawaban cerdas yang personal — tanpa terlihat saat screen share.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a href="#pricing" className="bg-[#5b8dee] hover:bg-[#4a7de0] text-white font-semibold px-7 py-3.5 rounded-lg transition text-base">
                Coba Sekarang →
              </a>
              <a href="#how" className="bg-white/5 hover:bg-white/8 text-white/70 hover:text-white font-medium px-7 py-3.5 rounded-lg transition text-base border border-white/8">
                Lihat Cara Kerja
              </a>
            </div>
            {/* Social proof */}
            <div className="flex items-center gap-6 mt-8 justify-center lg:justify-start">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">500+</div>
                <div className="text-xs text-white/35 mt-0.5">Interview dibantu</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">&lt; 2s</div>
                <div className="text-xs text-white/35 mt-0.5">Latency AI answer</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">100%</div>
                <div className="text-xs text-white/35 mt-0.5">Tidak terlihat</div>
              </div>
            </div>
          </div>

          {/* Right: app mockup */}
          <div className="flex-1 w-full max-w-md">
            <div className="relative">
              {/* Glow */}
              <div className="absolute inset-0 bg-[#5b8dee]/20 blur-3xl rounded-3xl scale-90" />
              {/* App window */}
              <div className="relative bg-[#0f0f1a]/90 border border-white/10 rounded-xl overflow-hidden shadow-2xl text-xs">
                {/* Titlebar */}
                <div className="flex items-center justify-between px-3 py-2 bg-[#191926] border-b border-white/8">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white/60 font-semibold text-[11px]">AI Copilot · Listening…</span>
                  </div>
                  <div className="flex gap-2 text-white/30">
                    <span>🛡</span><span>⚙</span><span>—</span><span>✕</span>
                  </div>
                </div>
                {/* Source bar */}
                <div className="px-3 py-2 bg-[#14141f] border-b border-white/5 flex gap-2 items-center">
                  <div className="flex-1 bg-white/5 border border-white/8 rounded px-2 py-1 text-white/40">Screen 1</div>
                  <div className="bg-white/5 border border-white/8 rounded px-2 py-1 text-white/40">↺</div>
                </div>
                {/* Content */}
                <div className="grid grid-cols-2 divide-x divide-white/5">
                  {/* Transcript */}
                  <div className="p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Transcript</div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[#5b8dee] font-bold text-[10px] mr-1">INTERVIEWER</span>
                        <span className="text-white/50">Can you tell me about yourself and your experience?</span>
                      </div>
                      <div className="text-white/25 italic text-[10px]">Mendengarkan...</div>
                    </div>
                  </div>
                  {/* Answer */}
                  <div className="p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">AI Answer</div>
                    <div className="bg-[#5b8dee]/8 border-l-2 border-[#5b8dee]/40 rounded px-2 py-1.5 text-white/70 leading-relaxed">
                      I&apos;m a software engineer with 3 years of experience building scalable web apps. I&apos;ve led projects at a fintech startup using React and Node.js, and I&apos;m passionate about clean architecture...
                    </div>
                  </div>
                </div>
                {/* Hint bar */}
                <div className="flex justify-between px-3 py-1.5 bg-[#191926] border-t border-white/5 text-[9px] text-white/20">
                  <span>Ctrl+Shift+H — toggle</span>
                  <span>Ctrl+Shift+A — ask now</span>
                  <span>v1.0.8</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Cara Kerja</h2>
          <p className="text-white/40">Siap pakai dalam hitungan menit</p>
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
              <div className="w-16 h-16 rounded-full bg-[#5b8dee]/10 border border-[#5b8dee]/20 flex items-center justify-center text-2xl mb-4 relative z-10 bg-[#0d0d14]">
                {s.icon}
              </div>
              <div className="text-[10px] font-bold text-[#5b8dee]/60 mb-1 tracking-widest">{s.step}</div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Fitur Lengkap</h2>
          <p className="text-white/40">Semua yang kamu butuhkan untuk interview percaya diri</p>
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
            <div key={f.title} className="bg-white/3 border border-white/6 rounded-xl p-6 hover:bg-white/5 hover:border-white/10 transition">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-base mb-2">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Apa Kata Mereka</h2>
          <p className="text-white/40">Dari pengguna nyata yang sudah merasakannya</p>
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
            <div key={t.name} className="bg-white/3 border border-white/6 rounded-xl p-6 flex flex-col gap-4">
              <p className="text-white/60 text-sm leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#5b8dee]/20 border border-[#5b8dee]/30 flex items-center justify-center text-xs font-bold text-[#5b8dee]">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-white/35 text-xs">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-lg mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold text-center mb-3">Pilih Paket</h2>
        <p className="text-white/40 text-center mb-10">Batal kapan saja. Tidak ada kontrak panjang.</p>

        <div className="flex justify-center mb-8">
          <div className="bg-white/5 rounded-lg p-1 flex gap-1">
            {(['monthly', 'yearly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={`px-5 py-2 rounded-md text-sm font-medium transition ${
                  plan === p ? 'bg-[#5b8dee] text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                {p === 'monthly' ? 'Bulanan' : 'Tahunan'}
                {p === 'yearly' && (
                  <span className="ml-2 bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded-full">Hemat 30%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/4 border border-white/10 rounded-2xl p-8 relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-[#5b8dee]/60 blur-sm rounded-full" />

          <div className="flex items-end gap-2 mb-1">
            <span className="text-5xl font-bold">{plan === 'monthly' ? PRICE_MONTHLY : PRICE_YEARLY}</span>
            <span className="text-white/40 mb-2">/{plan === 'monthly' ? 'bulan' : 'tahun'}</span>
          </div>
          {plan === 'yearly' && (
            <p className="text-green-400 text-sm mb-4">~Rp 124.900/bulan, ditagih tahunan</p>
          )}

          <ul className="space-y-3 my-7 text-sm text-white/70">
            {[
              'Real-time transcription (Deepgram Nova-3)',
              'AI answers (Gemini 2.0 Flash)',
              'Invisible saat screen share',
              'Jawaban personal dari CV kamu',
              'Aplikasi Windows always-on-top',
              'Auto-update gratis selamanya',
              'Hingga 4 jam listening per hari',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="text-[#5b8dee] flex-shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <input
            type="email"
            placeholder="email@kamu.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckout()}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm mb-3 outline-none focus:border-[#5b8dee] transition"
          />
          <button
            onClick={handleCheckout}
            disabled={loading || !email}
            className="w-full bg-[#5b8dee] hover:bg-[#4a7de0] disabled:opacity-40 text-white font-semibold py-3.5 rounded-lg transition text-base"
          >
            {loading ? 'Memproses...' : 'Subscribe Sekarang'}
          </button>
          <p className="text-white/25 text-xs text-center mt-4 flex items-center justify-center gap-1">
            🔒 Pembayaran aman via Midtrans
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-10">Pertanyaan Umum</h2>
        <div className="divide-y divide-white/8 border-t border-white/8">
          {faqs.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="bg-[#5b8dee]/8 border border-[#5b8dee]/20 rounded-2xl p-10">
          <h2 className="text-3xl font-bold mb-4">Siap untuk interview berikutnya?</h2>
          <p className="text-white/50 mb-7">Mulai dalam 5 menit. Tidak perlu setup yang rumit.</p>
          <a href="#pricing" className="bg-[#5b8dee] hover:bg-[#4a7de0] text-white font-semibold px-8 py-3.5 rounded-lg transition text-base inline-block">
            Mulai Sekarang →
          </a>
        </div>
      </section>

      <footer className="text-center py-8 text-white/20 text-sm border-t border-white/5">
        © 2025 AI Interview Copilot · Dibuat dengan ❤️ di Indonesia
      </footer>
    </main>
  );
}
