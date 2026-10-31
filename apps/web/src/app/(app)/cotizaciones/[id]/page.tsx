'use client';

import type { ProjectCard, QuoteView, SpecialistCard } from '@cc/contracts';
import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  ErrorNote,
  Field,
  LinkButton,
  Loading,
  PilotPaymentNote,
  Rating,
  Textarea,
} from '@/components/ui';
import { errorMessage, request, useApi } from '@/lib/api';
import { QUOTE_STATUS_LABELS, soles } from '@/lib/format';
import { useViewer } from '../../viewer';

function BudgetBar({ totalCents, maxCents }: { totalCents: number; maxCents: number }) {
  const within = totalCents <= maxCents;
  return (
    <>
      <div className="h-2 rounded-full bg-night-line">
        <div
          style={{ width: `${Math.min(100, (totalCents / maxCents) * 100)}%` }}
          className={`h-2 rounded-full ${within ? 'bg-[#3ddc97]' : 'bg-obra'}`}
        />
      </div>
      <p className={`text-[13px] ${within ? 'text-[#9fe8c6]' : 'text-obra'}`}>
        {within ? 'Dentro de' : 'Por encima de'} tu presupuesto (máx. {soles(maxCents)})
      </p>
    </>
  );
}

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
  const { current } = quote;
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

  const rows = [
    { label: 'Materiales', value: soles(current.materialsCents) },
    { label: 'Mano de obra', value: soles(current.laborCents) },
    {
      label: 'Permisos y supervisión',
      value: current.permitsCents === null ? 'No incluye' : soles(current.permitsCents),
      warn: current.permitsCents === null,
    },
    {
      label: 'Adicionales posibles',
      value: current.extrasCents === null ? 'Sin definir' : soles(current.extrasCents),
      warn: current.extrasCents === null || current.extrasCents > 0,
    },
  ];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link
          href={isFamily ? `/ofertas?obra=${quote.projectId}` : '/matches'}
          aria-label="Volver"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <Avatar name={specialist?.displayName ?? ''} url={specialist?.avatarUrl} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-bold">{specialist?.displayName ?? 'Especialista'}</h1>
          <div className="flex items-center gap-2 text-[13px] text-muted">
            {specialist?.verified ? <span className="font-bold text-visto">Verificado</span> : null}
            <Rating value={specialist?.rating ?? null} count={specialist?.reviewCount} />
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-2.5 rounded-3xl bg-ink p-5 text-white">
        <div className="flex justify-between gap-3 text-[13px]">
          <span className="text-mist">Total · {quote.projectTitle}</span>
          <span className="shrink-0 font-bold text-obra">
            v{current.version} · {QUOTE_STATUS_LABELS[quote.status]}
          </span>
        </div>
        <p className="text-[40px] leading-none font-extrabold tracking-tight [font-stretch:118%]">
          {soles(current.totalCents)}
        </p>
        <p className="text-sm leading-snug text-mist">
          {current.durationWeeks} semanas.
          {quote.previousTotalCents !== null
            ? ` Antes ${soles(quote.previousTotalCents)}${current.changeNote ? `: ${current.changeNote}` : '.'}`
            : ''}
        </p>
        {project ? (
          <BudgetBar totalCents={current.totalCents} maxCents={project.budgetMaxCents} />
        ) : null}
      </section>

      {quote.adjustmentMessage ? (
        <p className="rounded-xl bg-obra-soft px-3.5 py-3 text-sm">
          <strong>Ajuste pedido:</strong> {quote.adjustmentMessage}
        </p>
      ) : null}

      <Card className="py-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex justify-between gap-3 border-b border-line/60 py-3 text-[15px] ${row.warn ? 'text-obra-text' : ''}`}
          >
            <span>{row.label}</span>
            <span className="font-bold whitespace-nowrap">{row.value}</span>
          </div>
        ))}
        <p className="py-2.5 text-[13px] text-muted">
          Formato estándar: todas las cotizaciones muestran estos mismos rubros.
        </p>
      </Card>

      <Card>
        <h2 className="mb-1 text-[15px] font-bold">Qué incluye</h2>
        <p className="text-[15px] leading-relaxed text-muted">{current.scope}</p>
      </Card>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[15px] font-bold">Pagos por etapa</h2>
        {current.stages.map((stage, index) => (
          <div
            key={stage.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-2.5"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink font-extrabold text-white">
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-bold">{stage.name}</span>
              <span className="text-[13px] text-muted">
                Semanas {stage.weekFrom}–{stage.weekTo}
              </span>
            </span>
            <span className="font-extrabold whitespace-nowrap">{soles(stage.amountCents)}</span>
          </div>
        ))}
        <PilotPaymentNote />
      </section>

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
        <div className="grid grid-cols-[1fr_1.5fr] gap-2.5">
          <Button variant="outline" onClick={() => setAdjusting(true)}>
            Pedir ajuste
          </Button>
          <Button busy={busy} onClick={choose}>
            <Check className="size-5" aria-hidden="true" />
            Elegir
          </Button>
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
