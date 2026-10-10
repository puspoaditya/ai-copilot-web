# Deploy landing page IntervAI

Halaman home sudah berupa komponen Next.js, sehingga tidak perlu mengonversi ZIP HTML atau mengganti konfigurasi Vercel.

## Ganti halaman existing

1. Buka pull request landing page ini dan tinjau perubahan.
2. Buka Preview Deployment dari project Vercel yang terhubung ke repository ini. Periksa harga, tampilan desktop/mobile, demo, serta form checkout. Jangan menyelesaikan transaksi produksi hanya untuk pemeriksaan UI.
3. Pastikan environment variable existing tersedia pada environment Preview dan Production. Checkout menggunakan `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` dan `MIDTRANS_SERVER_KEY`; API existing juga memerlukan konfigurasi Supabase dan Resend yang sudah digunakan project. Pertahankan nilai pada project existing, jangan menyalin konfigurasi dummy dari pemeriksaan lokal.
4. Setelah sesuai, merge pull request ke `master` jika branch tersebut merupakan Production Branch di project Vercel. Bila Production Branch berbeda, sesuaikan target deployment dengan pengaturan project.
5. Dengan integrasi Git Vercel standar, commit pada Production Branch otomatis dibuild dan dideploy. Tunggu status Ready, kemudian buka domain existing. Tidak perlu project baru atau perubahan DNS bila domain tetap terhubung ke project yang sama.
6. Jika perlu kembali ke tampilan sebelumnya, gunakan rollback ke deployment produksi sebelumnya di Vercel, atau revert commit perubahan lalu deploy kembali.

## Integrasi aplikasi

- Pilih Bulanan/Tahunan membuka form email dan memanggil `/api/create-checkout` dengan plan `monthly`/`yearly`. Harga API existing tetap Rp179.000/Rp1.499.000.
- Pembayaran memakai Midtrans Snap production sesuai implementasi existing. Native dialog ditutup saat Snap tampil, kemudian dibuka kembali jika pembayaran ditutup, menunggu, atau gagal.
- Keberhasilan checkout menuju `/success`. Tombol unduhan pada halaman tersebut memakai environment URL existing atau fallback `/api/download`.
- Semua tombol Download landing page memakai `/api/download`. Bantuan memakai tautan WhatsApp existing.
- Tidak ada route login pengguna di repository ini; tombol Masuk dari mockup diganti dengan Download. Route admin dan semua endpoint backend dipertahankan.
- Trial tetap disabled di UI dan `/api/trial` tetap mengembalikan 403. Metadata tidak lagi menawarkan trial aktif.
- Demo memakai data ilustratif lokal. Testimoni mempertahankan isi dari halaman existing.
- CSS dibatasi pada `.intervai-landing`; aset baru berada di `public/landing`. Font landing page memakai `next/font`. Gambar WebP dan logo SVG dirender melalui `next/image`.

## Pemeriksaan yang dilakukan

- `npm run build`: berhasil dengan environment dummy untuk Supabase/Resend karena kredensial deployment tidak tersedia di workspace.
- `npm run lint`: berhasil, dengan warning existing pada kode trial yang nonaktif dan gambar tracking noscript.
- TypeScript dan `git diff --check`: berhasil.
- Chromium: tidak ada error runtime, overflow horizontal tidak muncul pada lebar 320–2880 px dan emulasi viewport/DPR yang setara zoom 80%, 100%, 125%, 150%, dan 200%. Ini bukan pemeriksaan tombol zoom UI Chrome pada komputer pengguna.
- Uji interaksi: menu mobile, FAQ eksklusif, carousel mobile, demo/tab keyboard/replay, paket bulanan/tahunan, error dan retry checkout, penutupan/pembukaan kembali dialog saat Snap digunakan, serta pesan jika client key belum tersedia.
- Halaman success/admin tetap memakai desain existing, termasuk setelah navigasi dari landing page; API trial tetap 403.
- Pembayaran diuji dengan respons checkout dan SDK Snap simulasi. Tidak ada transaksi, email, atau penerbitan lisensi nyata selama pengujian.

Dokumentasi deployment: https://vercel.com/docs/git
