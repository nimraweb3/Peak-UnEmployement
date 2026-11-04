export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path d="M5 8h26a7 7 0 0 1 7 7v16H20L9 40v-9H5V8Z" fill="currentColor" />
      <path
        d="m13 24 8-10 6 7 5-5 8 12"
        stroke="var(--logo-cutout, #fff)"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M38 9h5v27H29l-7 6v-6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? "brand-compact" : ""}`}>
      <BrandMark />
      <span className="brand-wordmark">
        Peak <span>Unemployment</span>
      </span>
    </span>
  );
}
