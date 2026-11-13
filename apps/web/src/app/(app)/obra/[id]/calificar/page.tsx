'use client';

import {
  type ContractReviewState,
  type ContractView,
  type MatchSummary,
  REVIEW_TAGS,
} from '@cc/contracts';
import { Check, ShieldCheck, Star } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, Button, Chip, ErrorNote, Field, Loading, Textarea } from '@/components/ui';
import { errorMessage, request, useApi } from '@/lib/api';
import { soles } from '@/lib/format';
import { useViewer } from '../../../viewer';

const WORDS = ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useViewer();
  const isFamily = user.role === 'family';
  const contract = useApi<ContractView>(`contracts/contracts/${id}`);
  const state = useApi<ContractReviewState>(`reputation/reviews/contract/${id}`);
  const matches = useApi<MatchSummary[]>('marketplace/matches');
  const [stars, setStars] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (contract.isLoading || state.isLoading) {
    return <Loading />;
  }
  if (!contract.data) {
    return <ErrorNote message="Obra no encontrada" />;
  }

  const match = matches.data?.find(
    (item) =>
      item.projectId === contract.data?.projectId &&
      item.specialistId === contract.data?.specialistId,
  );
  const counterpart = match ? (isFamily ? match.specialistName : match.familyName) : '';

  const submit = async () => {
    if (stars === null) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await request('reputation/reviews', 'POST', {
        contractId: id,
        stars,
        tags,
        comment: comment || undefined,
      });
      router.push(`/obra/${id}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <header className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-visto">
          <Check className="size-6 text-white" strokeWidth={2.8} aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-2xl">Obra entregada</h1>
          <p className="text-sm text-muted">
            {contract.data.durationWeeks} semanas · {soles(contract.data.totalCents)}
          </p>
        </div>
      </header>

      <section className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-white px-4 py-5 text-center">
        <Avatar name={counterpart || 'C C'} size={64} tone={isFamily ? 'plano' : 'obra'} />
        <h2 className="text-xl font-extrabold">
          ¿Cómo te fue con {counterpart || 'tu contraparte'}?
        </h2>
        <div role="radiogroup" aria-label="Calificación" className="flex items-center gap-1">
          <button
            type="button"
            role="radio"
            aria-checked={stars === 0}
            aria-label="0 estrellas"
            onClick={() => setStars(0)}
            className={`flex size-11 items-center justify-center rounded-full text-sm font-extrabold ${stars === 0 ? 'bg-ink text-white' : 'text-muted'}`}
          >
            0
          </button>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={stars === value}
              aria-label={`${value} estrellas`}
              onClick={() => setStars(value)}
              className="flex size-11 items-center justify-center"
            >
              <Star
                className={`size-9 text-obra ${stars !== null && value <= stars ? 'fill-obra' : ''}`}
                strokeWidth={1.6}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
        <p className="min-h-6 font-bold">{stars === null ? 'Toca para calificar' : WORDS[stars]}</p>
      </section>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[15px] font-bold">¿Qué destacó?</legend>
        <div className="flex flex-wrap gap-2">
          {REVIEW_TAGS.map((tag) => (
            <Chip
              key={tag}
              selected={tags.includes(tag)}
              onClick={() =>
                setTags((current) =>
                  current.includes(tag)
                    ? current.filter((item) => item !== tag)
                    : [...current, tag].slice(0, 5),
                )
              }
            >
              {tag}
            </Chip>
          ))}
        </div>
      </fieldset>

      <Field label="Comentario (opcional)">
        {(fieldId) => (
          <Textarea
            id={fieldId}
            rows={2}
            maxLength={500}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        )}
      </Field>

      <div className="flex gap-3 rounded-2xl bg-ink px-4 py-3.5 text-sm leading-relaxed text-white">
        <ShieldCheck className="size-6 shrink-0 text-obra" aria-hidden="true" />
        <p>
          <strong>Calificación mutua.</strong>{' '}
          <span className="text-mist">
            Ambas reseñas se publican juntas cuando los dos envían, o a los 7 días.
          </span>
        </p>
      </div>

      <ErrorNote message={error} />
      <Button busy={busy} disabled={stars === null} onClick={submit}>
        Enviar calificación
      </Button>
    </div>
  );
}
