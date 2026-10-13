"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CheckoutDialog, { type Plan } from "./checkout-dialog";
import DemoDialog from "./demo-dialog";
import Testimonials from "./testimonials";

export default function Landing({ className }: { className: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [toast, setToast] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest(".site-header")
      )
        setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const resize = () => {
      if (window.innerWidth > 760) setMenuOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", resize);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText("https://www.intervai.my.id/");
      setToast("Tautan IntervAI berhasil disalin.");
    } catch {
      setToast("Tautan IntervAI: https://www.intervai.my.id/");
    }
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }
  return (
    <div ref={root} className={`intervai-landing ${className}`}>
      <svg
        className="svg-defs"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="brand-gradient" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#8239ff" />
            <stop offset=".5" stopColor="#5e35ff" />
            <stop offset="1" stopColor="#16c3ee" />
          </linearGradient>
          <symbol id="i-arrow" viewBox="0 0 24 24">
            <path d="M4 12h15m-6-6 6 6-6 6" />
          </symbol>
          <symbol id="i-wave" viewBox="0 0 24 24">
            <path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4" />
          </symbol>
          <symbol id="i-spark" viewBox="0 0 24 24">
            <path d="m13 3 2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3ZM4 2v4M2 4h4" />
          </symbol>
          <symbol id="i-doc" viewBox="0 0 24 24">
            <path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 12h8M8 16h8" />
          </symbol>
          <symbol id="i-lock" viewBox="0 0 24 24">
            <rect x="5" y="10" width="14" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
          </symbol>
          <symbol id="i-chat" viewBox="0 0 24 24">
            <path d="M20 16a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3ZM8 8h8M8 12h5" />
          </symbol>
          <symbol id="i-video" viewBox="0 0 24 24">
            <rect x="2" y="6" width="13" height="12" rx="3" />
            <path d="m15 10 7-4v12l-7-4" />
          </symbol>
          <symbol id="i-globe" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18ZM5 7h14M5 17h14" />
          </symbol>
          <symbol id="i-shield" viewBox="0 0 24 24">
            <path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4ZM8 12l3 3 5-6" />
          </symbol>
          <symbol id="i-settings" viewBox="0 0 24 24">
            <path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3h3l2 3h3l2-3h3l2-3-1-3 2-2-2-3-3-1-1-3H9Z" />
            <circle cx="12" cy="12" r="3" />
          </symbol>
          <symbol id="i-check" viewBox="0 0 24 24">
            <path d="m5 12 4 4L19 6" />
          </symbol>
          <symbol id="i-download" viewBox="0 0 24 24">
            <path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6" />
          </symbol>
          <symbol id="i-play" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="m10 8 6 4-6 4Z" />
          </symbol>
          <symbol id="i-laptop" viewBox="0 0 24 24">
            <path d="M4 3h16v14H4V3ZM2 21h20l-2-4H4l-2 4Z" />
          </symbol>
          <symbol id="i-chevron" viewBox="0 0 24 24">
            <path d="m9 5 7 7-7 7" />
          </symbol>
          <symbol id="i-close" viewBox="0 0 24 24">
            <path d="m6 6 12 12M18 6 6 18" />
          </symbol>
          <symbol id="i-menu" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </symbol>
          <symbol id="i-copy" viewBox="0 0 24 24">
            <rect x="8" y="8" width="13" height="13" rx="2" />
            <path d="M16 8V3H3v13h5" />
          </symbol>
          <symbol id="i-star" viewBox="0 0 24 24">
            <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" />
          </symbol>
        </defs>
      </svg>
      <a className="skip-link" href="#main">
        Lewati ke konten
      </a>
      <header className="site-header">
        <div className="nav-wrap container">
          <Link href="/" className="brand" aria-label="IntervAI beranda">
            <svg viewBox="0 0 40 34" aria-hidden="true">
              <path
                d="M5 27 16 7c2-4 8-1 6 3L12 29c-3 5-10 2-7-2Zm14 0L30 7c2-4 8-1 6 3L26 29c-3 5-10 2-7-2Z"
                fill="url(#brand-gradient)"
              />
            </svg>
            <span>
              Interv<span className="brand-ai">AI</span>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Menu utama">
            <a href="#cara-kerja">Cara Kerja</a>
            <a href="#fitur">Fitur</a>
            <a href="#harga">Harga</a>
            <a href="#testimoni">Testimoni</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-actions">
            <a
              className="button button-soft button-sm login-link"
              href="/api/download"
            >
              Download
            </a>
            <a
              className="button button-primary button-sm"
              href="#harga"
              onClick={() => setMenuOpen(false)}
            >
              Mulai Sekarang{" "}
              <svg className="icon">
                <use href="#i-arrow" />
              </svg>
            </a>
            <button
              className="menu-toggle icon-button"
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <svg className="icon">
                <use href="#i-menu" />
              </svg>
            </button>
          </div>
        </div>
        <nav
          id="mobile-nav"
          className="mobile-nav"
          aria-label="Menu mobile"
          hidden={!menuOpen}
          onClick={() => setMenuOpen(false)}
        >
          <a href="#cara-kerja">Cara Kerja</a>
          <a href="#fitur">Fitur</a>
          <a href="#harga">Harga</a>
          <a href="#testimoni">Testimoni</a>
          <a href="#faq">FAQ</a>
          <a href="/api/download">Download</a>
        </nav>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-glow" aria-hidden="true"></div>
          <div className="container hero-layout">
            <div className="hero-copy">
              <span className="eyebrow hero-eyebrow">
                <span className="tiny-spark">✦</span> AI INTERVIEW COPILOT UNTUK
                PROFESIONAL INDONESIA
              </span>
              <h1 id="hero-title">
                Interview Lebih
                <br />
                Percaya Diri
                <br />
                <span className="gradient-text">dengan AI</span>
              </h1>
              <p className="hero-description">
                Dengarkan pertanyaan, dapatkan saran jawaban yang relevan dengan
                CV dan posisi impianmu.
              </p>
              <div className="hero-benefits">
                <span>
                  <i>✓</i> Transkripsi real-time
                </span>
                <span>
                  <i>✓</i> Jawaban sesuai CV
                </span>
                <span>
                  <i>✓</i> Ringkasan &amp; feedback
                </span>
              </div>
              <div className="hero-buttons">
                <a
                  className="button button-primary"
                  href="#harga"
                  onClick={() => setMenuOpen(false)}
                >
                  Mulai Sekarang{" "}
                  <svg className="icon">
                    <use href="#i-arrow" />
                  </svg>
                </a>
                <button
                  className="button button-outline"
                  id="demo-button"
                  onClick={() => {
                    setMenuOpen(false);
                    setDemoOpen(true);
                  }}
                >
                  <svg className="icon">
                    <use href="#i-play" />
                  </svg>{" "}
                  Lihat Demo
                </button>
              </div>
              <div className="windows-availability">
                <svg
                  className="windows-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M1 3.3 10.5 2v9H1zm11-1.5L23 0v11H12zM1 13h9.5v9L1 20.7zm11 0h11v11l-11-1.8z"
                  />
                </svg>
                <div>
                  <strong>Tersedia untuk Windows</strong>
                  <span>Berjalan di background saat interview online</span>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <Image
                className="hero-art"
                src="/landing/hero-v2.webp"
                width={1374}
                height={1145}
                alt="Ilustrasi laptop dengan video interview dan maskot IntervAI yang memberi semangat."
                fetchPriority="high"
                sizes="(max-width: 760px) 95vw, 50vw"
              />
              <div className="transcript-badge">
                <svg className="icon">
                  <use href="#i-wave" />
                </svg>
                <div>
                  <strong>
                    <i></i> Live transcription
                  </strong>
                  <span>
                    Mendengarkan pertanyaan
                    <br />
                    secara real-time.
                  </span>
                </div>
              </div>
              <div className="confidence-sticker">
                <span>✦</span> INTERVIEW
                <br />
                JADI LEBIH
                <br />
                MUDAH!
              </div>
              <div
                className="hero-copilot"
                aria-label="Contoh panel jawaban IntervAI"
              >
                <div className="hero-copilot-title">
                  <strong>
                    <span>✦</span> Interv<span>AI</span>
                  </strong>
                  <span className="hero-active">
                    <i></i> Aktif
                  </span>
                </div>
                <div className="hero-copilot-tabs">
                  <span>Transkripsi</span>
                  <span className="selected">Saran Jawaban</span>
                  <span>Ringkasan</span>
                </div>
                <div className="hero-question">
                  <strong>
                    <svg className="icon">
                      <use href="#i-wave" />
                    </svg>{" "}
                    Pertanyaan saat ini
                  </strong>
                  <p>“Bisa ceritakan pengalaman Anda memimpin sebuah tim?”</p>
                </div>
                <div className="hero-answer">
                  <strong>
                    <svg className="icon">
                      <use href="#i-spark" />
                    </svg>{" "}
                    Saran Jawaban AI
                  </strong>
                  <p>
                    Tentu. Di posisi sebelumnya, saya memimpin tim lintas fungsi
                    untuk membangun solusi yang sesuai dengan kebutuhan
                    pengguna.
                  </p>
                  <p>
                    Saya memastikan setiap anggota memahami prioritas,
                    berkomunikasi dengan terbuka, dan mencapai tujuan bersama.
                  </p>
                </div>
                <div className="hero-cv-badge">
                  <svg className="icon">
                    <use href="#i-doc" />
                  </svg>
                  <span>
                    <strong>Jawaban sesuai CV</strong>
                    <br />
                    Disesuaikan dengan pengalamanmu.
                  </span>
                </div>
              </div>
              <span className="visual-caption">ILUSTRASI PENGGUNAAN</span>
            </div>
          </div>
        </section>
        <section
          className="company-strip container"
          aria-label="Perusahaan dalam referensi desain"
        >
          <p>Temani langkahmu menuju perusahaan impian</p>
          <div className="company-logos">
            <div className="company-logo logo-google">
              <Image
                src="/landing/logos/google.svg"
                alt="Google"
                loading="lazy"
                width={240}
                height={64}
                sizes="(max-width: 760px) 20vw, 8vw"
              />
            </div>
            <div className="company-logo logo-microsoft">
              <Image
                src="/landing/logos/microsoft.svg"
                alt="Microsoft"
                loading="lazy"
                width={240}
                height={64}
                sizes="(max-width: 760px) 20vw, 8vw"
              />
            </div>
            <div className="company-logo logo-amazon">
              <Image
                src="/landing/logos/amazon.svg"
                alt="Amazon"
                loading="lazy"
                width={240}
                height={64}
                sizes="(max-width: 760px) 20vw, 8vw"
              />
            </div>
            <div className="company-logo logo-meta">
              <Image
                src="/landing/logos/meta.svg"
                alt="Meta"
                loading="lazy"
                width={240}
                height={64}
                sizes="(max-width: 760px) 20vw, 8vw"
              />
            </div>
            <div className="company-logo logo-tesla">
              <Image
                src="/landing/logos/tesla.svg"
                alt="Tesla"
                loading="lazy"
                width={240}
                height={64}
                sizes="(max-width: 760px) 20vw, 8vw"
              />
            </div>
            <div className="company-logo logo-apple">
              <Image
                src="/landing/logos/apple.svg"
                alt="Apple"
                loading="lazy"
                width={240}
                height={64}
                sizes="(max-width: 760px) 20vw, 8vw"
              />
            </div>
            <div className="company-logo logo-shopify">
              <Image
                src="/landing/logos/shopify.svg"
                alt="Shopify"
                loading="lazy"
                width={240}
                height={64}
                sizes="(max-width: 760px) 20vw, 8vw"
              />
            </div>
            <div className="company-logo logo-ibm">
              <Image
                src="/landing/logos/ibm.svg"
                alt="Ibm"
                loading="lazy"
                width={240}
                height={64}
                sizes="(max-width: 760px) 20vw, 8vw"
              />
            </div>
            <div className="company-logo logo-oracle">
              <Image
                src="/landing/logos/oracle.svg"
                alt="Oracle"
                loading="lazy"
                width={240}
                height={64}
                sizes="(max-width: 760px) 20vw, 8vw"
              />
            </div>
            <div className="company-logo logo-netflix">
              <Image
                src="/landing/logos/netflix.svg"
                alt="Netflix"
                loading="lazy"
                width={240}
                height={64}
                sizes="(max-width: 760px) 20vw, 8vw"
              />
            </div>
          </div>
        </section>
        <section
          className="quick-features container"
          aria-label="Manfaat utama"
        >
          <article className="quick-card">
            <div className="icon-tile purple">
              <svg className="icon">
                <use href="#i-wave" />
              </svg>
            </div>
            <h3>Transkripsi Real-time</h3>
            <p>
              Ubah pertanyaan dari interviewer menjadi teks secara langsung.
            </p>
          </article>
          <article className="quick-card">
            <div className="icon-tile violet">
              <svg className="icon">
                <use href="#i-spark" />
              </svg>
            </div>
            <h3>Jawaban Personal</h3>
            <p>
              Dapatkan saran jawaban yang relevan dengan CV &amp; deskripsi
              pekerjaan.
            </p>
          </article>
          <article className="quick-card">
            <div className="icon-tile blue">
              <svg className="icon">
                <use href="#i-doc" />
              </svg>
            </div>
            <h3>Ringkasan Otomatis</h3>
            <p>Buat rangkuman interview dan poin penting dengan lebih mudah.</p>
          </article>
          <article className="quick-card">
            <div className="icon-tile green">
              <svg className="icon">
                <use href="#i-lock" />
              </svg>
            </div>
            <h3>Ringan untuk Windows</h3>
            <p>
              Berjalan di background dengan overlay yang praktis dan tidak
              mengganggu.
            </p>
          </article>
        </section>
        <section className="section container how-section" id="cara-kerja">
          <div className="section-heading">
            <span className="eyebrow">CARA KERJA</span>
            <h2>Siap dalam 4 Langkah Mudah</h2>
            <p>Dari instalasi hingga siap interview dalam hitungan menit.</p>
          </div>
          <div className="steps">
            <article className="step">
              <div className="step-art">
                <span className="step-number">01</span>
                <div className="mini-laptop">
                  <div>
                    <span className="mini-brand">
                      ↗ Interv<span>AI</span>
                    </span>
                  </div>
                  <svg className="icon download-stamp">
                    <use href="#i-download" />
                  </svg>
                </div>
              </div>
              <h3>Download &amp; Install</h3>
              <p>Pasang IntervAI di Windows kamu dalam 1 menit.</p>
            </article>
            <span className="step-arrow" aria-hidden="true">
              →
            </span>
            <article className="step">
              <div className="step-art">
                <span className="step-number">02</span>
                <div className="cv-illustration">
                  <span>CV</span>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <svg className="icon">
                    <use href="#i-check" />
                  </svg>
                </div>
              </div>
              <h3>Upload CV</h3>
              <p>AI akan memahami pengalaman dan keahlianmu.</p>
            </article>
            <span className="step-arrow" aria-hidden="true">
              →
            </span>
            <article className="step">
              <div className="step-art">
                <span className="step-number">03</span>
                <div className="platform-illustration">
                  <div className="mini-window-dots">● ● ●</div>
                  <div className="platform-icons">
                    <span className="zoom">
                      <svg className="icon">
                        <use href="#i-video" />
                      </svg>
                    </span>
                    <span className="meet">▰</span>
                    <span className="teams">T</span>
                  </div>
                </div>
              </div>
              <h3>Mulai Interview</h3>
              <p>Jalankan IntervAI di background saat interview online.</p>
            </article>
            <span className="step-arrow" aria-hidden="true">
              →
            </span>
            <article className="step">
              <div className="step-art">
                <span className="step-number">04</span>
                <div className="answer-illustration">
                  <svg className="icon">
                    <use href="#i-spark" />
                  </svg>
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
              </div>
              <h3>Dapatkan Saran Jawaban</h3>
              <p>Lihat transkripsi dan jawaban AI secara real-time.</p>
            </article>
          </div>
        </section>
        <section className="section container feature-section" id="fitur">
          <div className="section-heading">
            <span className="eyebrow">FITUR LENGKAP</span>
            <h2>Semua yang Kamu Butuhkan untuk Interview Lebih Baik</h2>
            <p>Satu copilot. Dukungan di setiap momen interviewmu.</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <div className="icon-tile blue">
                <svg className="icon">
                  <use href="#i-wave" />
                </svg>
              </div>
              <div>
                <h3>Live Transcription</h3>
                <p>
                  Transkripsi pertanyaan secara real-time dengan akurasi tinggi.
                </p>
              </div>
            </article>
            <article className="feature-card">
              <div className="icon-tile green">
                <svg className="icon">
                  <use href="#i-chat" />
                </svg>
              </div>
              <div>
                <h3>AI Answer Suggestion</h3>
                <p>
                  Saran jawaban yang relevan dengan CV dan posisi yang dilamar.
                </p>
              </div>
            </article>
            <article className="feature-card">
              <div className="icon-tile blue">
                <svg className="icon">
                  <use href="#i-video" />
                </svg>
              </div>
              <div>
                <h3>Multi Platform</h3>
                <p>
                  Bekerja dengan Zoom, Google Meet, Microsoft Teams, dan
                  lainnya.
                </p>
              </div>
            </article>
            <article className="feature-card">
              <div className="icon-tile purple">
                <svg className="icon">
                  <use href="#i-doc" />
                </svg>
              </div>
              <div>
                <h3>Interview Summary</h3>
                <p>
                  Ringkasan hasil interview dan poin penting setelah selesai.
                </p>
              </div>
            </article>
            <article className="feature-card">
              <div className="icon-tile violet">
                <svg className="icon">
                  <use href="#i-settings" />
                </svg>
              </div>
              <div>
                <h3>Custom Instructions</h3>
                <p>Atur gaya jawaban sesuai kepribadianmu.</p>
              </div>
            </article>
            <article className="feature-card">
              <div className="icon-tile amber">
                <svg className="icon">
                  <use href="#i-globe" />
                </svg>
              </div>
              <div>
                <h3>Multiple Languages</h3>
                <p>Dukung bahasa Indonesia dan Inggris.</p>
              </div>
            </article>
            <article className="feature-card">
              <div className="icon-tile green">
                <svg className="icon">
                  <use href="#i-shield" />
                </svg>
              </div>
              <div>
                <h3>Privacy &amp; Secure</h3>
                <p>Data CV dan percakapan kamu tetap aman.</p>
              </div>
            </article>
            <article className="feature-card">
              <div className="icon-tile blue">
                <svg className="icon">
                  <use href="#i-laptop" />
                </svg>
              </div>
              <div>
                <h3>Lightweight App</h3>
                <p>
                  Ringan, berjalan di background, tidak mengganggu interview.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className="pricing-section section" id="harga">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">
                SATU COPILOT, DUA PILIHAN LANGGANAN
              </span>
              <h2>Investasi untuk Karier Impianmu</h2>
              <p>Pilih langganan bulanan atau tahunan sesuai kebutuhanmu.</p>
            </div>
            <div className="pricing-grid">
              <article className="trial-card" aria-labelledby="trial-title">
                <span className="trial-status">
                  <span>●</span> SEMENTARA NONAKTIF
                </span>
                <h3 id="trial-title">Coba Gratis</h3>
                <p className="trial-subtitle">Kenali copilot interviewmu.</p>
                <div className="trial-notice">
                  <svg className="icon">
                    <use href="#i-lock" />
                  </svg>
                  <h4>Trial Sementara Dinonaktifkan</h4>
                  <p>
                    Mohon maaf, trial gratis sementara kami nonaktifkan
                    dikarenakan tingginya biaya operasional (server, AI model,
                    dan API). Silakan pilih paket berbayar di sebelah kanan.
                  </p>
                </div>
                <button className="button trial-disabled" disabled>
                  Trial Sementara Dinonaktifkan
                </button>
              </article>
              <article className="subscription-card monthly-card">
                <span className="plan-kicker">FLEKSIBEL SETIAP BULAN</span>
                <h3>Bulanan</h3>
                <p className="plan-description">Untuk persiapan interviewmu.</p>
                <div className="subscription-price">
                  <span>Rp</span>
                  <strong>179.000</strong>
                  <small>/bulan</small>
                </div>
                <p className="billing-info">Ditagih setiap bulan.</p>
                <ul>
                  <li>Transkripsi real-time</li>
                  <li>Saran jawaban personal sesuai CV</li>
                  <li>Ringkasan &amp; feedback interview</li>
                  <li>Bahasa Indonesia &amp; Inggris</li>
                  <li>Custom instructions</li>
                </ul>
                <button
                  className="button button-outline"
                  onClick={() => setPlan("monthly")}
                >
                  Pilih Bulanan{" "}
                  <svg className="icon">
                    <use href="#i-arrow" />
                  </svg>
                </button>
              </article>
              <article className="subscription-card annual-card">
                <span className="popular-badge">✦ Hemat 30%</span>
                <span className="plan-kicker">
                  LEBIH HEMAT UNTUK JANGKA PANJANG
                </span>
                <h3>Tahunan</h3>
                <p className="plan-description">
                  Temani perjalanan kariermu sepanjang tahun.
                </p>
                <div className="subscription-price">
                  <span>Rp</span>
                  <strong>1.499.000</strong>
                  <small>/tahun</small>
                </div>
                <p className="billing-info">
                  Ditagih tahunan. Hemat Rp649.000 per tahun.
                </p>
                <ul>
                  <li>Semua fitur langganan bulanan</li>
                  <li>Transkripsi real-time</li>
                  <li>Saran jawaban personal sesuai CV</li>
                  <li>Ringkasan &amp; feedback interview</li>
                  <li>Custom instructions</li>
                </ul>
                <button
                  className="button button-primary"
                  onClick={() => setPlan("yearly")}
                >
                  Pilih Tahunan{" "}
                  <svg className="icon">
                    <use href="#i-arrow" />
                  </svg>
                </button>
              </article>
            </div>
            <p className="pricing-note">
              Satu pilihan untuk pengalaman interview yang lebih percaya diri.
            </p>
          </div>
        </section>
        <section className="testimonials-section section" id="testimoni">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">TESTIMONI</span>
              <h2>Mereka Sudah Merasakan Manfaatnya</h2>
              <p>
                Interview lebih tenang. Ceritakan pengalamanmu dengan lebih
                percaya diri.
              </p>
            </div>
            <Testimonials />
          </div>
        </section>
        <section className="faq-section section" id="faq">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">FAQ</span>
              <h2>Pertanyaan yang Sering Diajukan</h2>
            </div>
            <div className="faq-layout">
              <div className="faq-list">
                <details name="intervai-faq">
                  <summary>
                    Apakah IntervAI aman digunakan?
                    <span className="faq-plus" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p>
                    IntervAI dirancang sebagai copilot pribadi untuk membantumu
                    mempersiapkan dan memahami interview. Pastikan penggunaan
                    alat bantu sesuai ketentuan interviewer. Hubungi tim kami
                    jika ada pertanyaan tentang pengelolaan data.
                  </p>
                </details>
                <details name="intervai-faq">
                  <summary>
                    Platform interview apa saja yang didukung?
                    <span className="faq-plus" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p>
                    IntervAI berjalan di Windows dan mendukung interview online
                    melalui Zoom, Google Meet, Microsoft Teams, serta platform
                    lain. Unduh versi terbaru melalui tombol Download.
                  </p>
                </details>
                <details name="intervai-faq">
                  <summary>
                    Apakah IntervAI hanya untuk bahasa Indonesia?
                    <span className="faq-plus" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p>
                    Pilihan paket pada halaman ini mencakup bahasa Indonesia dan
                    Inggris. Kamu dapat menggunakan saran jawaban untuk berlatih
                    menyampaikan pengalaman profesional dalam kedua bahasa.
                  </p>
                </details>
                <details name="intervai-faq">
                  <summary>
                    Apakah interviewer bisa melihat IntervAI?
                    <span className="faq-plus" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p>
                    IntervAI menggunakan panel overlay di perangkatmu. Tampilan
                    yang terlihat oleh orang lain bergantung pada pengaturan
                    berbagi layar. Hindari membagikan seluruh desktop jika hanya
                    perlu menunjukkan satu jendela.
                  </p>
                </details>
                <details name="intervai-faq">
                  <summary>
                    Bagaimana cara kerja saran jawaban AI?
                    <span className="faq-plus" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p>
                    AI menggabungkan konteks pertanyaan, pengalaman dalam CV,
                    dan deskripsi pekerjaan untuk menyusun saran jawaban.
                    Sesuaikan saran tersebut dengan pengalaman yang benar-benar
                    kamu miliki. Coba contoh interaktif melalui tombol Lihat
                    Demo.
                  </p>
                </details>
              </div>
              <div className="faq-visual">
                <Image
                  src="/landing/faq-mascot-v2.webp"
                  width={1254}
                  height={1254}
                  alt="Maskot IntervAI menunjuk lampu ide"
                  loading="lazy"
                  sizes="(max-width: 760px) 45vw, 25vw"
                />
                <div className="help-card">
                  <strong>Masih ada pertanyaan?</strong>
                  <p>Kami siap membantu kamu.</p>
                  <a
                    className="button button-primary button-sm"
                    href="https://wa.me/6283854696436"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Hubungi Kami{" "}
                    <svg className="icon">
                      <use href="#i-arrow" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="final-cta">
          <div className="cta-orbit" aria-hidden="true"></div>
          <div className="container cta-layout">
            <span className="plane-illustration" aria-hidden="true">
              ✈
            </span>
            <div>
              <span className="cta-eyebrow">LANGKAH KECIL, PELUANG BESAR</span>
              <h2>Wujudkan Karier Globalmu</h2>
              <p>
                Interview lebih percaya diri, raih peluang di perusahaan impian,
                <br className="desktop-break" /> di mana saja di dunia.
              </p>
            </div>
            <a
              className="button button-lime"
              href="#harga"
              onClick={() => setMenuOpen(false)}
            >
              Mulai Sekarang{" "}
              <svg className="icon">
                <use href="#i-arrow" />
              </svg>
            </a>
            <span className="cta-spark" aria-hidden="true">
              ✦
            </span>
          </div>
        </section>
      </main>
      <footer className="site-footer container">
        <div className="footer-grid">
          <div className="footer-about">
            <Link href="/" className="brand" aria-label="IntervAI beranda">
              <svg viewBox="0 0 40 34" aria-hidden="true">
                <path
                  d="M5 27 16 7c2-4 8-1 6 3L12 29c-3 5-10 2-7-2Zm14 0L30 7c2-4 8-1 6 3L26 29c-3 5-10 2-7-2Z"
                  fill="url(#brand-gradient)"
                />
              </svg>
              <span>
                Interv<span className="brand-ai">AI</span>
              </span>
            </Link>
            <p>
              AI Interview Copilot untuk profesional Indonesia.
              <br />
              Interview lebih percaya diri dengan AI.
            </p>
          </div>
          <div className="footer-column">
            <h3>Produk</h3>
            <a href="#fitur">Fitur</a>
            <a href="#harga">Harga</a>
            <a href="/api/download">Download</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-column">
            <h3>Perusahaan</h3>
            <Link href="/affiliate">Affiliate · Komisi 30%</Link>
            <a href="#cara-kerja" rel="noopener">
              Tentang Kami ↗
            </a>
            <a
              href="https://wa.me/6283854696436"
              target="_blank"
              rel="noopener"
            >
              Pertanyaan Privasi ↗
            </a>
            <a
              href="https://wa.me/6283854696436"
              target="_blank"
              rel="noopener"
            >
              Bantuan Penggunaan ↗
            </a>
            <a
              href="https://wa.me/6283854696436"
              target="_blank"
              rel="noopener noreferrer"
            >
              Hubungi Kami
            </a>
          </div>
          <div className="footer-column">
            <h3>Bagikan IntervAI</h3>
            <div className="social-links">
              <a
                href="https://twitter.com/intent/tweet?text=Interview%20lebih%20percaya%20diri%20dengan%20IntervAI&url=https%3A%2F%2Fwww.intervai.my.id%2F"
                target="_blank"
                rel="noopener"
                aria-label="Bagikan di X"
              >
                𝕏
              </a>
              <a
                href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.intervai.my.id%2F"
                target="_blank"
                rel="noopener"
                aria-label="Bagikan di LinkedIn"
              >
                <b>in</b>
              </a>
              <button
                id="copy-link"
                aria-label="Salin tautan IntervAI"
                onClick={copyLink}
              >
                <svg className="icon">
                  <use href="#i-copy" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 IntervAI. All rights reserved.</span>
          <span>
            Dibuat untuk profesional Indonesia <span className="heart">♥</span>
          </span>
        </div>
      </footer>
      <DemoDialog open={demoOpen} onClose={() => setDemoOpen(false)} />
      <CheckoutDialog
        plan={plan}
        onChangePlan={setPlan}
        onClose={() => setPlan(null)}
      />
      <div className="toast" role="status" aria-live="polite" hidden={!toast}>
        {toast}
      </div>
    </div>
  );
}
