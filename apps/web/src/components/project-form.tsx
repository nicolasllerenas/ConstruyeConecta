'use client';

import {
  type CreateProjectInput,
  PROJECT_KINDS,
  PROJECT_TIMINGS,
  type ProjectKind,
  type ProjectTiming,
} from '@cc/contracts';
import { type FormEvent, type ReactNode, useState } from 'react';
import { ImagePicker } from '@/components/image-picker';
import { Button, Chip, ErrorNote, Field, Input, Textarea } from '@/components/ui';
import { VoiceRecorder } from '@/components/voice-recorder';
import { errorMessage } from '@/lib/api';
import { isoDateFromNow, PROJECT_KIND_LABELS, PROJECT_TIMING_LABELS } from '@/lib/format';
import { type Uploader, uploadFile } from '@/lib/upload';

const TIMING_DAYS: Record<ProjectTiming, number | null> = {
  asap: 14,
  within_3_months: 60,
  just_quoting: null,
};

const KIND_HINTS: Record<ProjectKind, string> = {
  build: 'Una casa o un ambiente desde cero',
  expand: 'Sumar un piso o un cuarto',
  remodel: 'Cambiar cocina, baño o acabados',
  repair: 'Arreglar filtraciones, grietas o instalaciones',
};

function toCents(value: string): number {
  return Math.round(Number(value.replace(/[^\d.]/g, '')) * 100);
}

export function ProjectForm({
  onSubmit,
  upload = uploadFile,
  submitLabel = 'Pedir cotizaciones',
  allowHighlight = true,
  footer,
}: {
  onSubmit: (input: CreateProjectInput) => Promise<void>;
  upload?: Uploader;
  submitLabel?: string;
  allowHighlight?: boolean;
  footer?: ReactNode;
}) {
  const [kind, setKind] = useState<ProjectKind>('expand');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | undefined>();
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [timing, setTiming] = useState<ProjectTiming>('within_3_months');
  const [estimatedDate, setEstimatedDate] = useState(() => isoDateFromNow(60));
  const [highlight, setHighlight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseTiming = (option: ProjectTiming) => {
    setTiming(option);
    const days = TIMING_DAYS[option];
    setEstimatedDate(days === null ? '' : isoDateFromNow(days));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (photoUrls.length === 0 && !voiceNoteUrl && !description.trim()) {
      setError('Agrega una foto, un audio o unas líneas para que entiendan tu obra.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        kind,
        title,
        description: description.trim() || undefined,
        photoUrls,
        voiceNoteUrl,
        budgetMinCents: toCents(budgetMin),
        budgetMaxCents: toCents(budgetMax),
        timing,
        estimatedDate: estimatedDate || undefined,
        highlight,
      });
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[15px] font-bold">¿Qué quieres hacer?</legend>
        <div className="flex flex-wrap gap-2">
          {PROJECT_KINDS.map((option) => (
            <Chip key={option} selected={kind === option} onClick={() => setKind(option)}>
              {PROJECT_KIND_LABELS[option]}
            </Chip>
          ))}
        </div>
        <p className="text-sm text-muted">{KIND_HINTS[kind]}</p>
      </fieldset>
      <Field label="Ponle un nombre" hint="Como se lo dirías a un amigo.">
        {(id) => (
          <Input
            id={id}
            required
            minLength={4}
            maxLength={80}
            placeholder="Ampliar 2.º piso, 40 m²"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-[15px] font-bold">Fotos y nota de voz</span>
        <ImagePicker urls={photoUrls} onChange={setPhotoUrls} upload={upload} />
        <VoiceRecorder url={voiceNoteUrl} onChange={setVoiceNoteUrl} upload={upload} />
      </div>
      <Field label="O escríbelo si prefieres (opcional)">
        {(id) => (
          <Textarea
            id={id}
            rows={2}
            maxLength={600}
            placeholder="Queremos dos cuartos y un baño arriba."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        )}
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[15px] font-bold">Presupuesto disponible (S/)</legend>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Desde">
            {(id) => (
              <Input
                id={id}
                required
                inputMode="numeric"
                placeholder="50000"
                value={budgetMin}
                onChange={(event) => setBudgetMin(event.target.value)}
              />
            )}
          </Field>
          <Field label="Hasta">
            {(id) => (
              <Input
                id={id}
                required
                inputMode="numeric"
                placeholder="60000"
                value={budgetMax}
                onChange={(event) => setBudgetMax(event.target.value)}
              />
            )}
          </Field>
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[15px] font-bold">¿Para cuándo?</legend>
        <div className="flex flex-wrap gap-2">
          {PROJECT_TIMINGS.map((option) => (
            <Chip key={option} selected={timing === option} onClick={() => chooseTiming(option)}>
              {PROJECT_TIMING_LABELS[option]}
            </Chip>
          ))}
        </div>
        <Field
          label="Fecha estimada de inicio"
          hint="Aproximada. La conversas con el especialista."
        >
          {(id) => (
            <Input
              id={id}
              type="date"
              min={isoDateFromNow(0)}
              required={timing !== 'just_quoting'}
              value={estimatedDate}
              onChange={(event) => setEstimatedDate(event.target.value)}
            />
          )}
        </Field>
      </fieldset>
      {allowHighlight ? (
        <label className="flex min-h-11 items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={highlight}
            onChange={(event) => setHighlight(event.target.checked)}
            className="size-5 accent-obra"
          />
          <span>
            <strong>Destacar mi obra</strong> · aparece primero · gratis durante el piloto
          </span>
        </label>
      ) : null}
      {footer}
      <ErrorNote message={error} />
      <Button type="submit" busy={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
