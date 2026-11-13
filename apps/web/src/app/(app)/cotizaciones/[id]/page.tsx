'use client';

import type { MatchSummary, ProjectCard, QuoteView, SpecialistCard } from '@cc/contracts';
import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { QuoteBreakdown } from '@/components/quote-breakdown';
import { CredentialLine } from '@/components/specialist-profile';
import {
  Avatar,
  Button,
  ErrorNote,
  Field,
  LinkButton,
  Loading,
  Rating,
  StepIndicator,
  Textarea,
  WhatsAppButton,
} from '@/components/ui';
import { errorMessage, request, useApi } from '@/lib/api';
import { contactMessage } from '@/lib/format';
import { useViewer } from '../../viewer';

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useViewer();
  const isFamily = user.role === 'family';
  const quoteQuery = useApi<QuoteView>(`contracts/quotes/${id}`);
  const quote = quoteQuery.data;
  const specialists = useApi<SpecialistCard[]>(
    quote ? `marketplace/specialists?ids=${quote.specialistId}` : null,
  );
  const projects = useApi<ProjectCard[]>(isFamily ? 'marketplace/projects/mine' : null);
  const match = useApi<MatchSummary>(quote ? `marketplace/matches/${quote.matchId}` : null);
  const [adjusting, setAdjusting] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (quoteQuery.isLoading) {
    return <Loading />;
  }
  if (!quote) {
    return <ErrorNote message={quoteQuery.error?.message ?? 'Cotización no encontrada'} />;
  }

  const specialist = specialists.data?.[0];
  const project = projects.data?.find((item) => item.id === quote.projectId);
  const canDecide = isFamily && quote.status === 'submitted';

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const choose = () =>
    run(async () => {
      const result = await request<{ contractId: string }>(
        `contracts/quotes/${quote.id}/select`,
        'POST',
        {},
      );
      router.push(`/obra/${result.contractId}`);
    });

  const sendAdjustment = () =>
    run(async () => {
      await request(`contracts/quotes/${quote.id}/adjustment`, 'POST', { message });
      setAdjusting(false);
      await quoteQuery.mutate();
    });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      {isFamily ? <StepIndicator current={2} /> : null}
      <div className="flex items-center gap-3">
        <Link
          href={isFamily ? `/ofertas?obra=${quote.projectId}` : '/matches'}
          aria-label="Volver"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <Link
          href={`/especialistas/${quote.specialistId}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl hover:bg-white/70"
        >
          <Avatar name={specialist?.displayName ?? ''} url={specialist?.avatarUrl} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-bold">{specialist?.displayName ?? 'Especialista'}</h1>
            <div className="flex items-center gap-2 text-[13px] text-muted">
              {specialist?.verified ? (
                <span className="font-bold text-visto">Verificado</span>
              ) : null}
              <Rating value={specialist?.rating ?? null} count={specialist?.reviewCount} />
              <span className="font-bold text-plano-text underline">Ver perfil</span>
            </div>
          </div>
        </Link>
      </div>
      {specialist ? <CredentialLine specialist={specialist} /> : null}

      <QuoteBreakdown quote={quote} budgetMaxCents={project?.budgetMaxCents} />

      <ErrorNote message={error} />

      {adjusting ? (
        <div className="flex flex-col gap-3">
          <Field label="¿Qué necesitas que ajuste?">
            {(fieldId) => (
              <Textarea
                id={fieldId}
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" onClick={() => setAdjusting(false)}>
              Cancelar
            </Button>
            <Button busy={busy} disabled={message.trim().length < 5} onClick={sendAdjustment}>
              Enviar
            </Button>
          </div>
        </div>
      ) : canDecide ? (
        <div className="flex flex-col gap-2.5">
          <Button busy={busy} onClick={choose}>
            <Check className="size-5" aria-hidden="true" />
            Elegir a {specialist?.displayName ?? 'este especialista'}
          </Button>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" onClick={() => setAdjusting(true)}>
              Pedir ajuste
            </Button>
            {match.data?.counterpartPhone ? (
              <WhatsAppButton
                phone={match.data.counterpartPhone}
                text={contactMessage(quote.projectTitle)}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {!isFamily && (quote.status === 'submitted' || quote.status === 'adjustment_requested') ? (
        <LinkButton href={`/cotizar/${quote.matchId}?cotizacion=${quote.id}`} variant="specialist">
          Enviar nueva versión
        </LinkButton>
      ) : null}
      {quote.contractId ? (
        <LinkButton href={`/obra/${quote.contractId}`} variant="dark">
          Ver seguimiento de obra
        </LinkButton>
      ) : null}
    </div>
  );
}
