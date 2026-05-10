import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendLicenseEmail(email: string, licenseKey: string) {
  const downloadUrl = process.env.APP_DOWNLOAD_URL ?? '#';

  await resend.emails.send({
    from: 'AI Interview Copilot <noreply@karakterku.my.id>',
    to: email,
    subject: '🎉 License Key & Link Download AI Interview Copilot',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff">
        <h2 style="color:#5b8dee;margin-bottom:4px">AI Interview Copilot</h2>
        <p style="color:#888;font-size:13px;margin-top:0">Terima kasih telah berlangganan!</p>

        <p style="margin-top:24px">Berikut license key kamu:</p>
        <div style="background:#f4f4f8;border-radius:8px;padding:16px 24px;margin:12px 0 24px;text-align:center">
          <code style="font-size:22px;font-weight:bold;letter-spacing:3px;color:#1a1a2e">${licenseKey}</code>
        </div>

        <p>Download aplikasinya di sini:</p>
        <a href="${downloadUrl}"
           style="display:inline-block;background:#5b8dee;color:#fff;text-decoration:none;
                  padding:12px 28px;border-radius:8px;font-weight:600;margin:8px 0 24px">
          ⬇ Download AI Interview Copilot
        </a>

        <div style="background:#f9f9fb;border-radius:8px;padding:16px 20px;font-size:13px;color:#555">
          <p style="font-weight:600;margin:0 0 8px">Langkah selanjutnya:</p>
          <ol style="margin:0;padding-left:18px;line-height:2">
            <li>Download dan install aplikasi</li>
            <li>Buka aplikasi</li>
            <li>Masukkan license key di atas saat diminta</li>
            <li>Siap digunakan!</li>
          </ol>
        </div>

        <p style="color:#aaa;font-size:12px;margin-top:24px">
          Simpan email ini. License key terikat dengan akun kamu.<br/>
          Butuh bantuan? Balas email ini.
        </p>
      </div>
    `,
  });
}
