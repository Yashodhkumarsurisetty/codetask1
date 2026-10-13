export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <defs>
          <linearGradient id="fz" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--primary)" />
            <stop offset="1" stopColor="var(--primary-glow)" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#fz)" />
        <path d="M9 10h14M9 16h9M9 22h5" stroke="var(--primary-foreground)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      Flowzeno
    </span>
  );
}
