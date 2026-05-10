const DOWNLOAD_URL = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL ?? '#';

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-[#0d0d14] text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-4">Pembayaran Berhasil!</h1>
        <p className="text-white/50 mb-8">
          License key sudah dikirim ke email kamu. Cek inbox (dan folder spam).
        </p>

        <a
          href={DOWNLOAD_URL}
          className="inline-block bg-[#5b8dee] hover:bg-[#4a7de0] text-white font-semibold px-8 py-3.5 rounded-lg transition text-base mb-8"
        >
          ⬇ Download Aplikasi
        </a>

        <div className="bg-white/4 border border-white/10 rounded-xl p-6 text-left space-y-3 text-sm text-white/60">
          <p className="font-semibold text-white">Langkah selanjutnya:</p>
          <ol className="space-y-2 list-decimal list-inside">
            <li>Download dan install aplikasi</li>
            <li>Buka aplikasi</li>
            <li>Masukkan license key dari email</li>
            <li>Siap digunakan!</li>
          </ol>
        </div>
        <a href="/" className="inline-block mt-8 text-[#5b8dee] text-sm hover:underline">
          ← Kembali ke beranda
        </a>
      </div>
    </main>
  );
}
