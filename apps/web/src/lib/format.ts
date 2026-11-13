import type {
  ProjectKind,
  ProjectTiming,
  QuoteStatus,
  SpecialistKind,
  SpecialistLevel,
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

const calendarFormatter = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const shortCalendarFormatter = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

export function calendarDate(isoDate: string): string {
  return calendarFormatter.format(new Date(isoDate));
}

export function shortCalendarDate(isoDate: string): string {
  return shortCalendarFormatter.format(new Date(isoDate));
}

export function isoDateFromNow(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function yearsLabel(years: number): string {
  return years === 1 ? '1 año' : `${years} años`;
}

export function durationLabel(milliseconds: number): string {
  const totalSeconds = Math.max(1, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes === 0 ? `${seconds} s` : `${minutes} min ${String(seconds).padStart(2, '0')} s`;
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

export function contactMessage(projectTitle: string): string {
  return `Hola, te escribo desde Cuadra por la obra "${projectTitle}".`;
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

export const SPECIALIST_LEVEL_LABELS: Record<SpecialistLevel, string> = {
  new: 'Nuevo',
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
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
