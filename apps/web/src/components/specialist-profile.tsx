import type { PublicReview, SpecialistCard } from '@cc/contracts';
import { Award, CalendarClock, MapPin, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Avatar,
  Card,
  DemoBadge,
  LevelBadge,
  Loading,
  Rating,
  VerifiedBadge,
} from '@/components/ui';
import { SPECIALIST_KIND_LABELS, shortDate, soles, yearsLabel } from '@/lib/format';

export function CredentialLine({ specialist }: { specialist: SpecialistCard }) {
  const parts = [
    specialist.credential,
    specialist.yearsExperience === null
      ? null
      : `${yearsLabel(specialist.yearsExperience)} de experiencia`,
  ].filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  return (
    <p className="flex items-start gap-1.5 text-[13px] leading-snug text-muted">
      <Award className="mt-px size-4 shrink-0 text-plano" aria-hidden="true" />
      {parts.join(' · ')}
    </p>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-cemento px-3 py-2.5">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <span className="text-[15px] leading-tight font-extrabold">{value}</span>
    </div>
  );
}

function ReviewItem({ review }: { review: PublicReview }) {
  return (
    <li className="flex flex-col gap-1.5 border-b border-line/70 py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <span className="flex gap-0.5" role="img" aria-label={`${review.stars} de 5 estrellas`}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              className={`size-4 ${value <= review.stars ? 'fill-obra text-obra' : 'text-line'}`}
              aria-hidden="true"
            />
          ))}
        </span>
        <span className="text-xs text-muted">{shortDate(review.createdAt)}</span>
      </div>
      {review.comment ? <p className="text-[15px] leading-snug">{review.comment}</p> : null}
      {review.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {review.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-visto-soft px-2 py-0.5 text-xs font-bold text-visto"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </li>
  );
}

export function SpecialistProfile({
  specialist,
  reviews,
}: {
  specialist: SpecialistCard;
  reviews: PublicReview[] | undefined;
}) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-4">
        <Avatar name={specialist.displayName} url={specialist.avatarUrl} size={72} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-2xl leading-tight">{specialist.displayName}</h1>
          <p className="text-[15px] text-muted">{SPECIALIST_KIND_LABELS[specialist.kind]}</p>
          <div className="flex flex-wrap gap-1.5">
            <LevelBadge level={specialist.level} />
            {specialist.verified ? <VerifiedBadge /> : null}
            {specialist.demo ? <DemoBadge /> : null}
          </div>
        </div>
      </header>

      <Card className="flex flex-col gap-3">
        <h2 className="text-[15px] font-bold">Credenciales a la vista</h2>
        <div className="grid grid-cols-2 gap-2">
          <Fact label="Credencial" value={specialist.credential ?? 'No declarada'} />
          <Fact
            label="Experiencia"
            value={
              specialist.yearsExperience === null ? '—' : yearsLabel(specialist.yearsExperience)
            }
          />
          <Fact label="Obras realizadas" value={specialist.completedJobs} />
          <Fact
            label="Calificación"
            value={<Rating value={specialist.rating} count={specialist.reviewCount} />}
          />
        </div>
        <p className="text-xs text-muted">
          Credenciales declaradas por el especialista. Pídele su número de colegiatura en la visita.
        </p>
      </Card>

      <Card className="flex flex-col gap-2.5">
        <p className="text-[15px] leading-relaxed">{specialist.bio}</p>
        <div className="flex flex-wrap gap-1.5">
          {specialist.specialties.map((specialty) => (
            <span
              key={specialty}
              className="rounded-xl border border-line px-2.5 py-1 text-[13px] font-semibold"
            >
              {specialty}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-1 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden="true" />
            {specialist.district}
            {specialist.distanceKm === null ? '' : ` · ${specialist.distanceKm} km`}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-4" aria-hidden="true" />
            {specialist.availability} · visita {soles(specialist.visitFeeCents)}
          </span>
        </div>
      </Card>

      {specialist.portfolio.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-[15px] font-bold">Obras anteriores</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {specialist.portfolio.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-xl bg-photo">
                <img
                  src={item.url}
                  alt={item.caption}
                  className="aspect-square w-full object-cover"
                />
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <Card className="py-2">
        <h2 className="pt-1 text-[15px] font-bold">Lo que dicen las familias</h2>
        {reviews === undefined ? (
          <Loading label="Cargando reseñas…" />
        ) : reviews.length === 0 ? (
          <p className="py-3 text-sm text-muted">Todavía no tiene reseñas publicadas.</p>
        ) : (
          <ul>
            {reviews
              .filter((review) => review.authorRole === 'family')
              .map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
