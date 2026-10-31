'use client';

import type {
  ContractReviewState,
  ContractStageView,
  ContractView,
  MatchSummary,
} from '@cc/contracts';
import clsx from 'clsx';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ImagePicker } from '@/components/image-picker';
import {
  Button,
  Card,
  ErrorNote,
  Field,
  LinkButton,
  Loading,
  PilotPaymentNote,
  Textarea,
} from '@/components/ui';
import { errorMessage, request, useApi } from '@/lib/api';
import { STAGE_STATUS_LABELS, shortDate, soles, whatsappLink } from '@/lib/format';
import { useViewer } from '../../viewer';

const STAGE_TONES: Record<ContractStageView['status'], { dot: string; text: string }> = {
  approved: { dot: 'border-visto bg-visto text-white', text: 'text-visto' },
  submitted: { dot: 'border-obra bg-obra text-ink', text: 'text-obra-text' },
  in_progress: { dot: 'border-ink bg-ink text-white', text: 'text-ink' },
  pending: { dot: 'border-line bg-white text-muted', text: 'text-muted' },
};

function progressPercent(contract: ContractView): number {
  const weight = contract.stages.reduce((sum, stage) => {
    if (stage.status === 'approved' || stage.status === 'submitted') {
      return sum + stage.amountCents;
    }
    return sum;
  }, 0);
  return contract.totalCents > 0 ? Math.round((weight / contract.totalCents) * 100) : 0;
}

export default function ContractPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useViewer();
  const isFamily = user.role === 'family';
  const contractQuery = useApi<ContractView>(`contracts/contracts/${id}`, {
    refreshInterval: 20_000,
  });
  const contract = contractQuery.data;
  const matches = useApi<MatchSummary[]>('marketplace/matches');
  const reviews = useApi<ContractReviewState>(
    contract?.status === 'completed' ? `reputation/reviews/contract/${id}` : null,
  );
  const [message, setMessage] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (contractQuery.isLoading) {
    return <Loading />;
  }
  if (!contract) {
    return <ErrorNote message={contractQuery.error?.message ?? 'Obra no encontrada'} />;
  }

  const match = matches.data?.find(
    (item) => item.projectId === contract.projectId && item.specialistId === contract.specialistId,
  );
  const reviewStage = contract.stages.find((stage) => stage.status === 'submitted');
  const activeStage = contract.stages.find((stage) => stage.status === 'in_progress');
  const percent = progressPercent(contract);

  const run = async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await request<ContractView>(
        `contracts/contracts/${id}/${path}`,
        'POST',
        body,
      );
      await contractQuery.mutate(updated, { revalidate: false });
      setMessage('');
      setPhotoUrls([]);
      setRejecting(false);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight">{contract.projectTitle}</h1>
          <p className="text-muted">
            {match ? (isFamily ? match.specialistName : match.familyName) : ''}
            {match ? ' · ' : ''}Inició el {shortDate(contract.startedAt)}
          </p>
        </div>
        {match ? (
          <a
            href={whatsappLink(
              match.counterpartPhone,
              `Hola, te escribo por la obra "${contract.projectTitle}".`,
            )}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-ink px-3 text-sm font-bold text-white"
          >
            WhatsApp
          </a>
        ) : null}
      </header>

      <Card className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-[22px]">
            {contract.status === 'completed' ? 'Obra entregada' : `${percent}% avanzado`}
          </span>
          <span className="rounded-lg bg-visto-soft px-2 py-1 text-[13px] font-bold text-visto">
            {contract.durationWeeks} semanas
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-line">
          <div
            style={{ width: `${percent}%` }}
            className="h-2.5 rounded-full bg-ink transition-all"
          />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Liberado', value: contract.releasedCents, tone: 'text-visto' },
          { label: 'Protegido', value: contract.heldCents, tone: '' },
          { label: 'Pendiente', value: contract.pendingCents, tone: 'text-muted' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-line bg-white px-2.5 py-2">
            <div className="text-xs text-muted">{item.label}</div>
            <div className={clsx('text-[15px] font-extrabold', item.tone)}>{soles(item.value)}</div>
          </div>
        ))}
      </div>
      <PilotPaymentNote />

      <section className="flex flex-col gap-2">
        {contract.stages.map((stage) => {
          const tone = STAGE_TONES[stage.status];
          return (
            <div
              key={stage.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-2.5"
            >
              <span
                className={clsx(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold',
                  tone.dot,
                )}
              >
                {stage.position + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-bold">{stage.name}</span>
                <span className={clsx('text-[13px] font-semibold', tone.text)}>
                  {STAGE_STATUS_LABELS[stage.status]}
                </span>
                {stage.rejectionMessage ? (
                  <span className="text-[13px] text-obra-text">
                    Corrección pedida: {stage.rejectionMessage}
                  </span>
                ) : null}
              </span>
              <span className="text-sm font-extrabold whitespace-nowrap">
                {soles(stage.amountCents)}
              </span>
            </div>
          );
        })}
      </section>

      <ErrorNote message={error} />

      {isFamily && reviewStage ? (
        rejecting ? (
          <div className="flex flex-col gap-3">
            <Field label="¿Qué hay que corregir?">
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
              <Button variant="outline" onClick={() => setRejecting(false)}>
                Cancelar
              </Button>
              <Button
                busy={busy}
                disabled={message.trim().length < 5}
                onClick={() => run(`stages/${reviewStage.id}/reject`, { message })}
              >
                Pedir corrección
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <Button busy={busy} onClick={() => run(`stages/${reviewStage.id}/approve`, {})}>
              Aprobar etapa {reviewStage.position + 1} · liberar {soles(reviewStage.amountCents)}
            </Button>
            <Button variant="outline" onClick={() => setRejecting(true)}>
              Pedir corrección
            </Button>
          </div>
        )
      ) : null}

      {!isFamily && activeStage ? (
        <Card className="flex flex-col gap-3">
          <Field label={`Avance de ${activeStage.name}`}>
            {(fieldId) => (
              <Textarea
                id={fieldId}
                rows={3}
                placeholder="Cuéntale a la familia qué se hizo hoy"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            )}
          </Field>
          <ImagePicker urls={photoUrls} onChange={setPhotoUrls} max={12} tileClass="size-16" />
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Button
              variant="outline"
              busy={busy}
              disabled={message.trim().length < 3}
              onClick={() => run('updates', { message, photoUrls })}
            >
              Publicar avance
            </Button>
            <Button
              variant="specialist"
              busy={busy}
              disabled={message.trim().length < 3}
              onClick={() => run(`stages/${activeStage.id}/submit`, { message, photoUrls })}
            >
              Marcar etapa terminada
            </Button>
          </div>
        </Card>
      ) : null}

      {contract.status === 'completed' && reviews.data && !reviews.data.mine ? (
        <LinkButton href={`/obra/${id}/calificar`}>Calificar la obra</LinkButton>
      ) : null}

      {contract.updates.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-bold">Avances</h2>
          {contract.updates.map((update) => (
            <Card key={update.id} className="flex flex-col gap-2 p-3">
              <span className="text-xs font-bold tracking-wide text-muted uppercase">
                {shortDate(update.createdAt)}
              </span>
              <p className="text-[15px] leading-snug">{update.message}</p>
              {update.photoUrls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {update.photoUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img
                        src={url}
                        alt="Foto del avance"
                        loading="lazy"
                        className="size-20 rounded-xl object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}
