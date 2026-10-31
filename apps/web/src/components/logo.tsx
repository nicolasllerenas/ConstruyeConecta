interface MarkProps {
  size?: number;
  left?: string;
  right?: string;
  dot?: string;
}

export function LogoMark({
  size = 36,
  left = 'var(--color-ink)',
  right = 'var(--color-obra)',
  dot = 'var(--color-obra)',
}: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M28 54H11V29L28 12" fill="none" stroke={left} strokeWidth="7" />
      <path d="M36 12L53 29V54H36" fill="none" stroke={right} strokeWidth="7" />
      <circle cx="32" cy="40" r="5" fill={dot} />
    </svg>
  );
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark left={inverted ? '#ffffff' : undefined} />
      <span
        className={`text-xl font-extrabold tracking-tight [font-stretch:118%] ${inverted ? 'text-white' : 'text-ink'}`}
      >
        construye<span className="text-obra">conecta</span>
      </span>
    </span>
  );
}
