import type {
  ProjectKind,
  ProjectTiming,
  QuoteStatus,
  SpecialistKind,
  StageStatus,
} from '@cc/contracts';

const solesFormatter = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });

export function soles(cents: number): string {
  return `S/ ${solesFormatter.format(cents / 100)}`;
}

export function compactNumber(cents: number): string {
  return solesFormatter.format(cents / 100);
}

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

export function initials(name: string): string {
  const words = name
    .replace(/^(Ing\.|Arq\.|Mtro\.)\s*/i, '')
    .split(/\s+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  const number = digits.startsWith('51') ? digits : `51${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export const PROJECT_KIND_LABELS: Record<ProjectKind, string> = {
  build: 'Construir',
  expand: 'Ampliar',
  remodel: 'Remodelar',
  repair: 'Reparar',
};

export const PROJECT_TIMING_LABELS: Record<ProjectTiming, string> = {
  asap: 'Lo antes posible',
  within_3_months: 'En 1–3 meses',
  just_quoting: 'Solo estoy cotizando',
};

export const SPECIALIST_KIND_LABELS: Record<SpecialistKind, string> = {
  engineer: 'Ingeniería civil',
  architect: 'Arquitectura',
  master_builder: 'Maestro de obra',
  technician: 'Técnico especializado',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  submitted: 'Enviada',
  adjustment_requested: 'Ajuste pedido',
  selected: 'Elegida',
  rejected: 'No elegida',
};

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  submitted: 'Terminada · falta revisión',
  approved: 'Aprobada · pago liberado',
};
