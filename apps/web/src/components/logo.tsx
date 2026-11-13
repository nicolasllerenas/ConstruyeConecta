interface MarkProps {
  size?: number;
  frame?: string;
  block?: string;
}

export function LogoMark({
  size = 36,
  frame = 'var(--color-ink)',
  block = 'var(--color-obra)',
}: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M50 12.5H12.5V51.5H50" fill="none" stroke={frame} strokeWidth="9" />
      <rect x="29" y="23" width="18" height="18" rx="2" fill={block} />
    </svg>
  );
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark frame={inverted ? '#ffffff' : undefined} />
      <span
        className={`text-[26px] leading-none font-extrabold tracking-tight [font-stretch:120%] ${inverted ? 'text-white' : 'text-ink'}`}
      >
        cuadra
      </span>
    </span>
  );
}
