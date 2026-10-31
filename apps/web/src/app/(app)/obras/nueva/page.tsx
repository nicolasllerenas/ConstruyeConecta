'use client';

import {
  PROJECT_KINDS,
  PROJECT_TIMINGS,
  type ProjectKind,
  type ProjectTiming,
} from '@cc/contracts';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { ImagePicker } from '@/components/image-picker';
import {
  Button,
  Chip,
  ErrorNote,
  Field,
  Input,
  Loading,
  PageTitle,
  Textarea,
} from '@/components/ui';
import { VoiceRecorder } from '@/components/voice-recorder';
import { errorMessage, request } from '@/lib/api';
import { PROJECT_KIND_LABELS, PROJECT_TIMING_LABELS } from '@/lib/format';
import { useViewer } from '../../viewer';

function toCents(value: string): number {
  return Math.round(Number(value.replace(/[^\d.]/g, '')) * 100);
}

export default function NewProjectPage() {
  const router = useRouter();
  const { user, profile } = useViewer();
  const [kind, setKind] = useState<ProjectKind>('expand');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | undefined>();
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [timing, setTiming] = useState<ProjectTiming>('within_3_months');
  const [highlight, setHighlight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user.role !== 'family') {
    router.replace('/solicitudes');
    return <Loading />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await request('marketplace/projects', 'POST', {
        kind,
        title,
        description: description || undefined,
        photoUrls,
        voiceNoteUrl,
        budgetMinCents: toCents(budgetMin),
        budgetMaxCents: toCents(budgetMax),
        timing,
        highlight,
      });
      router.push('/explorar');
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-xl flex-col gap-5">
      <PageTitle
        title="Cuéntanos tu obra"
        subtitle="Sin términos técnicos. Con fotos o un audio basta."
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[15px] font-bold">¿Qué quieres hacer?</legend>
        <div className="flex flex-wrap gap-2">
          {PROJECT_KINDS.map((option) => (
            <Chip key={option} selected={kind === option} onClick={() => setKind(option)}>
              {PROJECT_KIND_LABELS[option]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <Field label="Ponle un nombre">
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
        <ImagePicker urls={photoUrls} onChange={setPhotoUrls} />
        <VoiceRecorder url={voiceNoteUrl} onChange={setVoiceNoteUrl} />
      </div>
      <Field label="O escríbelo si prefieres (opcional)">
        {(id) => (
          <Textarea
            id={id}
            rows={2}
            maxLength={600}
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
            <Chip key={option} selected={timing === option} onClick={() => setTiming(option)}>
              {PROJECT_TIMING_LABELS[option]}
            </Chip>
          ))}
        </div>
      </fieldset>
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
      <p className="text-sm text-muted">
        Obra en {profile.district}. Puedes cambiar tu ubicación en tu perfil.
      </p>
      <ErrorNote message={error} />
      <Button type="submit" busy={busy}>
        Pedir cotizaciones
      </Button>
    </form>
  );
}
