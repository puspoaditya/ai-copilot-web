import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AI Interview Copilot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0d0d14',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background orb left */}
        <div
          style={{
            position: 'absolute',
            top: '-150px',
            left: '-150px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(91,141,238,0.25) 0%, transparent 70%)',
          }}
        />
        {/* Background orb right */}
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(91,141,238,0.12)',
            border: '1px solid rgba(91,141,238,0.3)',
            borderRadius: '999px',
            padding: '6px 16px',
            marginBottom: '28px',
          }}
        >
          <span style={{ color: '#5b8dee', fontSize: '14px', fontWeight: 600 }}>
            Real-time AI · Windows App
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: '58px',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.15,
            marginBottom: '24px',
            maxWidth: '800px',
          }}
        >
          Jawab interview{' '}
          <span style={{ color: '#5b8dee' }}>dengan AI</span>
          {'\n'}secara real-time
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: '22px',
            color: 'rgba(255,255,255,0.45)',
            maxWidth: '680px',
            lineHeight: 1.5,
            marginBottom: '40px',
          }}
        >
          Transkripsi otomatis + jawaban AI instan. Tidak terlihat saat screen share.
        </div>

        {/* Features row */}
        <div style={{ display: 'flex', gap: '24px' }}>
          {['🎙 Real-time Transcription', '🤖 AI Answers', '🛡 Invisible in Screen Share'].map((f) => (
            <div
              key={f}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '10px 18px',
                color: 'rgba(255,255,255,0.65)',
                fontSize: '15px',
              }}
            >
              {f}
            </div>
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '80px',
            color: 'rgba(255,255,255,0.2)',
            fontSize: '16px',
          }}
        >
          ai-copilot-web.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
