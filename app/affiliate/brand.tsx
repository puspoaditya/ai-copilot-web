import Link from "next/link";
export default function AffiliateBrand() {
  return (
    <Link href="/" className="aff-brand" aria-label="IntervAI beranda">
      <svg className="aff-mark" viewBox="0 0 40 34" aria-hidden="true">
        <defs>
          <linearGradient id="aff-brand-gradient" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#8239ff" />
            <stop offset=".5" stopColor="#5e35ff" />
            <stop offset="1" stopColor="#16c3ee" />
          </linearGradient>
        </defs>
        <path
          d="M5 27 16 7c2-4 8-1 6 3L12 29c-3 5-10 2-7-2Zm14 0L30 7c2-4 8-1 6 3L26 29c-3 5-10 2-7-2Z"
          fill="url(#aff-brand-gradient)"
        />
      </svg>
      Interv<span>AI</span>
    </Link>
  );
}
