import { ImageResponse } from 'next/og';

export const alt = 'AI Interview Copilot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          backgroundColor: '#0d0d14',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #5b8dee, #8b5cf6)',
            display: 'flex',
          }}
        />

        {/* Left glow */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            left: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            backgroundColor: '#5b8dee',
            opacity: 0.07,
            display: 'flex',
          }}
        />

        {/* Right glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            right: '-80px',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            backgroundColor: '#8b5cf6',
            opacity: 0.07,
            display: 'flex',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(91,141,238,0.15)',
            border: '1px solid rgba(91,141,238,0.3)',
            borderRadius: '999px',
            padding: '8px 20px',
            marginBottom: '32px',
          }}
        >
          <span style={{ color: '#5b8dee', fontSize: '16px', fontWeight: 600 }}>
            Real-time AI Assistant · Windows App
          </span>
        </div>

        {/* Headline line 1 */}
        <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '8px' }}>
          <span style={{ fontSize: '58px', fontWeight: 700, color: '#ffffff', lineHeight: 1.15 }}>
            Jawab interview dengan{' '}
          </span>
          <span style={{ fontSize: '58px', fontWeight: 700, color: '#5b8dee', lineHeight: 1.15 }}>
            AI
          </span>
        </div>

        {/* Headline line 2 */}
        <div style={{ display: 'flex', marginBottom: '28px' }}>
          <span style={{ fontSize: '58px', fontWeight: 700, color: '#ffffff', lineHeight: 1.15 }}>
            secara real-time
          </span>
        </div>

        {/* Subtext */}
        <div style={{ display: 'flex', marginBottom: '44px' }}>
          <span style={{ fontSize: '22px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
            Transkripsi otomatis + jawaban AI instan. Tidak terlihat saat screen share.
          </span>
        </div>

        {/* Feature chips */}
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px 20px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '15px',
              marginRight: '16px',
            }}
          >
            Deepgram Transcription
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px 20px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '15px',
              marginRight: '16px',
            }}
          >
            Gemini AI Answers
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px 20px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '15px',
            }}
          >
            Invisible in Screen Share
          </div>
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            right: '80px',
            display: 'flex',
            color: 'rgba(255,255,255,0.18)',
            fontSize: '15px',
          }}
        >
          ai-copilot-web.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
