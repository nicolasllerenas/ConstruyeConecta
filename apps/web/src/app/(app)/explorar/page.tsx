'use client';

import type { ProjectCard, SpecialistCard, SwipeResult } from '@cc/contracts';
import { Check, MapPin, X } from 'lucide-react';
import {
  AnimatePresence,
  animate,
  motion,
  type PanInfo,
  useMotionValue,
  useTransform,
} from 'motion/react';
import { useState } from 'react';
import { MatchScreen } from '@/components/match-screen';
import {
  DemoBadge,
  Empty,
  ErrorNote,
  Field,
  LinkButton,
  Loading,
  Rating,
  Select,
  VerifiedBadge,
} from '@/components/ui';
import { errorMessage, request, useApi } from '@/lib/api';
import { SPECIALIST_KIND_LABELS, soles } from '@/lib/format';
import { useViewer } from '../viewer';

const SWIPE_THRESHOLD = 110;

function SpecialistSwipeCard({
  specialist,
  onDecision,
}: {
  specialist: SpecialistCard;
  onDecision: (decision: 'like' | 'pass') => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-14, 14]);
  const likeOpacity = useTransform(x, [20, 110], [0, 1]);
  const passOpacity = useTransform(x, [-110, -20], [1, 0]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const photo = specialist.portfolio[photoIndex];

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
      onDecision(info.offset.x > 0 ? 'like' : 'pass');
      return;
    }
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
  };

  return (
    <motion.article
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="relative cursor-grab touch-pan-y overflow-hidden rounded-[26px] bg-white shadow-[0_14px_34px_rgb(22_24_29/0.14)] active:cursor-grabbing"
    >
      <div className="blueprint relative h-64 sm:h-72">
        {photo ? (
          <img
            src={photo.url}
            alt={photo.caption}
            draggable={false}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center px-6 text-center text-sm text-mist">
            Este especialista aún no sube fotos de su portafolio
          </div>
        )}
        {specialist.portfolio.length > 1 ? (
          <div className="absolute inset-x-3 top-3 flex gap-1">
            {specialist.portfolio.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Ver foto ${index + 1}`}
                onClick={() => setPhotoIndex(index)}
                className={`h-1.5 flex-1 rounded-full ${index === photoIndex ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        ) : null}
        {specialist.affinity !== null ? (
          <span className="absolute top-7 right-3 rounded-lg bg-obra px-2 py-1 text-[13px] font-extrabold text-ink">
            {specialist.affinity}% afín
          </span>
        ) : null}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {specialist.verified ? <VerifiedBadge /> : null}
          {specialist.pro ? (
            <span className="rounded-lg bg-ink px-2 py-1 text-xs font-extrabold text-white">
              PRO
            </span>
          ) : null}
          {specialist.demo ? <DemoBadge /> : null}
        </div>
        <motion.span
          style={{ opacity: likeOpacity }}
          className="absolute top-14 left-5 -rotate-12 rounded-xl border-4 border-obra bg-ink/70 px-3 py-1 text-2xl font-extrabold text-obra"
        >
          ME INTERESA
        </motion.span>
        <motion.span
          style={{ opacity: passOpacity }}
          className="absolute top-14 right-5 rotate-12 rounded-xl border-4 border-white bg-ink/70 px-3 py-1 text-2xl font-extrabold text-white"
        >
          PASO
        </motion.span>
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl leading-tight">{specialist.displayName}</h2>
          {specialist.distanceKm !== null ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-muted">
              <MapPin className="size-3.5" aria-hidden="true" />
              {specialist.distanceKm} km
            </span>
          ) : null}
        </div>
        <p className="-mt-1.5 text-[15px] text-muted">{SPECIALIST_KIND_LABELS[specialist.kind]}</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-cemento px-2.5 py-2">
            <Rating value={specialist.rating} compact />
            <div className="text-xs text-muted">{specialist.reviewCount} reseñas</div>
          </div>
          <div className="rounded-xl bg-cemento px-2.5 py-2">
            <div className="font-extrabold">{specialist.completedJobs}</div>
            <div className="text-xs text-muted">servicios</div>
          </div>
          <div className="rounded-xl bg-cemento px-2.5 py-2">
            <div className="font-extrabold">{soles(specialist.visitFeeCents)}</div>
            <div className="text-xs text-muted">visita</div>
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-muted">{specialist.bio}</p>
        <div className="flex flex-wrap gap-1.5">
          {specialist.specialties.slice(0, 4).map((specialty) => (
            <span
              key={specialty}
              className="rounded-xl border border-line px-2.5 py-1 text-[13px] font-semibold"
            >
              {specialty}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

function SwipeDeck({ project }: { project: ProjectCard }) {
  const candidates = useApi<SpecialistCard[]>(`marketplace/projects/${project.id}/candidates`, {
    revalidateOnFocus: false,
  });
  const [decided, setDecided] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [matched, setMatched] = useState<string | null>(null);

  if (candidates.isLoading) {
    return <Loading label="Buscando especialistas cerca…" />;
  }
  if (candidates.error) {
    return <ErrorNote message={candidates.error.message} />;
  }

  const remaining = (candidates.data ?? []).filter((item) => !decided.includes(item.id));
  const current = remaining[0];

  const decide = async (decision: 'like' | 'pass') => {
    if (!current) {
      return;
    }
    setDecided((ids) => [...ids, current.id]);
    setError(null);
    try {
      const result = await request<SwipeResult>('marketplace/swipes/family', 'POST', {
        projectId: project.id,
        specialistId: current.id,
        decision,
      });
      if (result.matched) {
        setMatched(current.displayName);
      }
    } catch (caught) {
      setDecided((ids) => ids.filter((id) => id !== current.id));
      setError(errorMessage(caught));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ErrorNote message={error} />
      {current ? (
        <>
          <div className="relative">
            {remaining[1] ? (
              <div
                aria-hidden="true"
                className="absolute inset-x-3.5 -top-1 bottom-2 -rotate-[2.5deg] rounded-[26px] bg-line"
              />
            ) : null}
            <AnimatePresence mode="popLayout">
              <SpecialistSwipeCard key={current.id} specialist={current} onDecision={decide} />
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-center gap-6 py-1">
            <button
              type="button"
              aria-label="Pasar"
              onClick={() => decide('pass')}
              className="flex size-16 items-center justify-center rounded-full border border-line bg-white shadow-md transition hover:scale-105"
            >
              <X className="size-7" strokeWidth={2.6} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Me interesa"
              onClick={() => decide('like')}
              className="flex size-20 items-center justify-center rounded-full bg-obra shadow-[0_10px_22px_rgb(255_106_26/0.35)] transition hover:scale-105"
            >
              <Check className="size-9 text-ink" strokeWidth={2.8} aria-hidden="true" />
            </button>
          </div>
          <p className="text-center text-sm text-muted">
            Desliza a la derecha si te interesa. Hay match cuando el interés es mutuo.
          </p>
        </>
      ) : (
        <Empty
          title="Ya viste a todos los especialistas cerca"
          description="Te avisaremos en Ofertas cuando alguien acepte y te envíe una cotización. También puedes ampliar tu radio en tu perfil."
          action={<LinkButton href="/ofertas">Ver mis ofertas</LinkButton>}
        />
      )}
      {matched ? (
        <MatchScreen
          counterpart={matched}
          projectTitle={project.title}
          steps={[
            'Coordinan una visita para evaluar tu obra.',
            'Te envía su cotización en formato estándar.',
            'La comparas lado a lado con las demás.',
          ]}
          primaryHref={`/ofertas?obra=${project.id}`}
          primaryLabel="Ver mis cotizaciones"
          onClose={() => setMatched(null)}
        />
      ) : null}
    </div>
  );
}

export default function ExplorePage() {
  const { profile } = useViewer();
  const projects = useApi<ProjectCard[]>('marketplace/projects/mine');
  const [selected, setSelected] = useState<string | null>(null);

  if (projects.isLoading) {
    return <Loading />;
  }
  const open = (projects.data ?? []).filter((project) => project.status === 'open');
  const project = open.find((item) => item.id === selected) ?? open[0];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="flex items-center gap-2 text-[15px] font-bold">
        <MapPin className="size-4" aria-hidden="true" />
        {profile.district} · {profile.radiusKm} km
      </div>
      {project ? (
        <>
          {open.length > 1 ? (
            <Field label="Buscando para">
              {(id) => (
                <Select
                  id={id}
                  value={project.id}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  {open.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : (
            <p className="rounded-xl bg-obra-soft px-3.5 py-2.5 text-sm">
              Para tu obra: <strong>{project.title}</strong>
            </p>
          )}
          <SwipeDeck key={project.id} project={project} />
        </>
      ) : (
        <Empty
          title="Primero cuéntanos tu obra"
          description="Con fotos o un audio basta. Así te mostramos a los especialistas adecuados."
          action={<LinkButton href="/obras/nueva">Publicar mi obra</LinkButton>}
        />
      )}
    </div>
  );
}
