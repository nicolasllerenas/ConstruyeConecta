'use client';

import type { ProjectCard, SwipeResult } from '@cc/contracts';
import { Bookmark, Check, ChevronUp, ImageOff, X } from 'lucide-react';
import { useState } from 'react';
import { MatchScreen } from '@/components/match-screen';
import { Avatar, DemoBadge, ErrorNote, Loading, Rating } from '@/components/ui';
import { errorMessage, request, useApi } from '@/lib/api';
import { compactNumber, PROJECT_KIND_LABELS, PROJECT_TIMING_LABELS } from '@/lib/format';

function RequestSlide({
  project,
  onDecision,
  saved,
  onSave,
}: {
  project: ProjectCard;
  onDecision: (decision: 'like' | 'pass') => void;
  saved: boolean;
  onSave: () => void;
}) {
  const [photo, setPhoto] = useState(0);
  const url = project.photoUrls[photo];
  return (
    <article className="flex h-[calc(100dvh-4.75rem)] snap-start snap-always flex-col bg-ink text-white lg:h-dvh">
      <div className="blueprint relative min-h-0 flex-1">
        {url ? (
          <img src={url} alt={`Foto de ${project.title}`} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-sm text-mist">
            <ImageOff className="size-8" aria-hidden="true" />
            La familia no subió fotos
          </div>
        )}
        {project.photoUrls.length > 1 ? (
          <div className="absolute inset-x-5 top-4 flex gap-1">
            {project.photoUrls.map((item, index) => (
              <button
                key={item}
                type="button"
                aria-label={`Ver foto ${index + 1}`}
                onClick={() => setPhoto(index)}
                className={`h-1.5 flex-1 rounded-full ${index === photo ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        ) : null}
        <div className="absolute right-3.5 bottom-4 flex flex-col items-center gap-3.5">
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              aria-label="Me interesa"
              onClick={() => onDecision('like')}
              className="flex size-15 items-center justify-center rounded-full border-4 border-ink bg-plano transition hover:scale-105"
            >
              <Check className="size-7" strokeWidth={2.8} aria-hidden="true" />
            </button>
            <span className="text-xs font-bold [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
              Me interesa
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              aria-label="Guardar"
              aria-pressed={saved}
              onClick={onSave}
              className="flex size-12 items-center justify-center rounded-full bg-ink/70"
            >
              <Bookmark className={`size-5 ${saved ? 'fill-white' : ''}`} aria-hidden="true" />
            </button>
            <span className="text-xs font-bold [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
              Guardar
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              aria-label="Pasar"
              onClick={() => onDecision('pass')}
              className="flex size-12 items-center justify-center rounded-full bg-ink/70"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <span className="text-xs font-bold [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">Pasar</span>
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5 px-5 pt-4 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {project.invited ? (
            <span className="rounded-lg bg-plano px-2 py-1 text-xs font-extrabold">TE INVITÓ</span>
          ) : null}
          <span className="rounded-lg bg-obra px-2 py-1 text-xs font-extrabold text-ink uppercase">
            {PROJECT_TIMING_LABELS[project.timing]}
          </span>
          <span className="rounded-lg bg-night px-2 py-1 text-xs font-bold">
            {PROJECT_KIND_LABELS[project.kind]}
          </span>
          {project.highlighted ? (
            <span className="rounded-lg bg-white px-2 py-1 text-xs font-extrabold text-ink">
              DESTACADA
            </span>
          ) : null}
          {project.demo ? <DemoBadge /> : null}
        </div>
        <h2 className="font-display text-[26px] leading-tight">{project.title}</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-night px-2.5 py-2">
            <div className="text-xs text-mist">Distancia</div>
            <div className="text-[15px] font-extrabold">
              {project.distanceKm === null ? '—' : `${project.distanceKm} km`}
            </div>
          </div>
          <div className="col-span-2 rounded-xl bg-night px-2.5 py-2">
            <div className="text-xs text-mist">Presupuesto · {project.district}</div>
            <div className="text-[15px] font-extrabold">
              S/ {compactNumber(project.budgetMinCents)} – {compactNumber(project.budgetMaxCents)}
            </div>
          </div>
        </div>
        {project.voiceNoteUrl ? (
          <audio src={project.voiceNoteUrl} controls className="h-10 w-full">
            <track kind="captions" />
          </audio>
        ) : null}
        {project.description ? (
          <p className="line-clamp-2 text-sm leading-snug text-mist">{project.description}</p>
        ) : null}
        <div className="flex items-center gap-2.5 text-sm">
          <Avatar name={project.familyName} size={32} tone="obra" />
          <strong className="truncate">{project.familyName}</strong>
          <Rating value={project.familyRating} count={project.familyReviewCount} />
        </div>
        <p className="flex items-center justify-center gap-1 text-xs text-mist">
          <ChevronUp className="size-3.5" aria-hidden="true" />
          Desliza hacia arriba para la siguiente
        </p>
      </div>
    </article>
  );
}

export default function RequestsFeedPage() {
  const feed = useApi<ProjectCard[]>('marketplace/feed', { revalidateOnFocus: false });
  const [decided, setDecided] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<{ id: string; project: ProjectCard } | null>(null);

  if (feed.isLoading) {
    return (
      <div className="min-h-dvh bg-ink text-mist">
        <Loading label="Buscando obras cerca de ti…" />
      </div>
    );
  }

  const remaining = (feed.data ?? []).filter((project) => !decided.includes(project.id));

  const decide = async (project: ProjectCard, decision: 'like' | 'pass') => {
    setDecided((ids) => [...ids, project.id]);
    setError(null);
    try {
      const result = await request<SwipeResult>('marketplace/swipes/specialist', 'POST', {
        projectId: project.id,
        decision,
      });
      if (result.matched && result.matchId) {
        setMatch({ id: result.matchId, project });
      }
    } catch (caught) {
      setDecided((ids) => ids.filter((id) => id !== project.id));
      setError(errorMessage(caught));
    }
  };

  return (
    <div className="no-scrollbar h-[calc(100dvh-4.75rem)] snap-y snap-mandatory overflow-y-auto bg-ink lg:h-dvh">
      {error ? (
        <div className="absolute inset-x-4 top-4 z-20">
          <ErrorNote message={error} />
        </div>
      ) : null}
      {remaining.length > 0 ? (
        remaining.map((project) => (
          <RequestSlide
            key={project.id}
            project={project}
            onDecision={(decision) => decide(project, decision)}
            saved={saved.includes(project.id)}
            onSave={() =>
              setSaved((ids) =>
                ids.includes(project.id)
                  ? ids.filter((id) => id !== project.id)
                  : [...ids, project.id],
              )
            }
          />
        ))
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center text-white">
          <h1 className="font-display text-2xl">Viste todas las obras cerca</h1>
          <p className="text-mist">
            Vuelve pronto o amplía tu radio en tu perfil para recibir más solicitudes.
          </p>
        </div>
      )}
      {match ? (
        <MatchScreen
          counterpart={match.project.familyName}
          projectTitle={match.project.title}
          steps={[
            'Coordina la visita para evaluar la obra.',
            'Envía tu cotización en formato estándar.',
            'La familia la compara y elige.',
          ]}
          primaryHref={`/cotizar/${match.id}`}
          primaryLabel="Enviar cotización"
          onClose={() => setMatch(null)}
        />
      ) : null}
    </div>
  );
}
