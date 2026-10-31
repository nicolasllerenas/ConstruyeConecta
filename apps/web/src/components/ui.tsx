'use client';

import clsx from 'clsx';
import { BadgeCheck, Loader2, Star, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';
import { initials } from '@/lib/format';

type Variant = 'primary' | 'specialist' | 'outline' | 'ghost' | 'dark' | 'outlineDark';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-obra text-ink hover:brightness-95',
  specialist: 'bg-plano text-white hover:brightness-110',
  outline: 'border-2 border-ink text-ink hover:bg-ink/5',
  ghost: 'text-ink hover:bg-ink/5',
  dark: 'bg-ink text-white hover:bg-night',
  outlineDark: 'border-2 border-night-line text-white hover:bg-white/5',
};

const buttonClass = (variant: Variant, className?: string) =>
  clsx(
    'inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-base font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    className,
  );

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  busy?: boolean;
}

export function Button({ variant = 'primary', busy, className, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      className={buttonClass(variant, className)}
    >
      {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = 'primary',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={buttonClass(variant, className)} />;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-sm font-semibold text-obra-text">{error}</p> : null}
      {hint && !error ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

const controlClass =
  'w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-none';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(controlClass, 'h-13', className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(controlClass, 'resize-none py-3', className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(controlClass, 'h-13', className)} />;
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        'min-h-11 rounded-full border px-4 text-sm font-semibold transition',
        selected
          ? 'border-ink bg-ink text-white'
          : 'border-line bg-white text-ink hover:border-ink',
      )}
    >
      {children}
    </button>
  );
}

export function Avatar({
  name,
  url,
  tone = 'plano',
  size = 44,
}: {
  name: string;
  url?: string | null;
  tone?: 'plano' | 'obra' | 'ink';
  size?: number;
}) {
  const tones = {
    plano: 'bg-plano text-white',
    obra: 'bg-obra text-ink',
    ink: 'bg-ink text-white',
  };
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-extrabold',
        tones[tone],
      )}
    >
      {initials(name)}
    </span>
  );
}

export function ErrorNote({ message }: { message: string | null | undefined }) {
  if (!message) {
    return null;
  }
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-obra-soft px-3.5 py-3 text-sm font-semibold text-obra-text"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-muted">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      <h2 className="font-display text-xl">{title}</h2>
      {description ? <p className="max-w-sm text-muted">{description}</p> : null}
      {action}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="font-display text-3xl leading-tight">{title}</h1>
      {subtitle ? <p className="text-muted">{subtitle}</p> : null}
    </header>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={clsx('rounded-2xl border border-line bg-white p-4', className)}>
      {children}
    </section>
  );
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-bold text-visto">
      <BadgeCheck className="size-4" aria-hidden="true" />
      Verificado
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="rounded-lg bg-night px-2 py-1 text-xs font-bold text-white">
      Perfil de demostración
    </span>
  );
}

export function Rating({
  value,
  count,
  compact,
}: {
  value: number | null;
  count?: number;
  compact?: boolean;
}) {
  if (value === null) {
    return compact ? (
      <span className="font-extrabold">Nuevo</span>
    ) : (
      <span className="text-sm opacity-70">Sin calificaciones aún</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-bold">
      <Star className="size-4 fill-obra text-obra" aria-hidden="true" />
      {value.toFixed(1)}
      {count === undefined ? null : <span className="font-normal opacity-70">({count})</span>}
    </span>
  );
}

export function PilotPaymentNote() {
  return (
    <p className="rounded-xl bg-plano-soft px-3.5 py-3 text-sm text-plano-text">
      <strong>Piloto:</strong> los pagos están simulados. Registramos cada etapa, pero todavía no se
      mueve dinero real por la app.
    </p>
  );
}
