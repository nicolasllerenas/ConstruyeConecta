'use client';

import type { PublicReview, SpecialistCard } from '@cc/contracts';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { SpecialistProfile } from '@/components/specialist-profile';
import { ErrorNote, Loading } from '@/components/ui';
import { useApi } from '@/lib/api';

export default function SpecialistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const cards = useApi<SpecialistCard[]>(`marketplace/specialists?ids=${id}`);
  const reviews = useApi<PublicReview[]>(`reputation/reviews/user/${id}`);
  const specialist = cards.data?.[0];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-line bg-white px-3 text-sm font-bold"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver
      </button>
      {cards.isLoading ? (
        <Loading />
      ) : specialist ? (
        <SpecialistProfile specialist={specialist} reviews={reviews.data} />
      ) : (
        <ErrorNote message="No encontramos a este especialista." />
      )}
    </div>
  );
}
