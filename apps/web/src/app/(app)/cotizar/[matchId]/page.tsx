'use client';

import type { MatchSummary, QuoteVersionView, QuoteView } from '@cc/contracts';
import { Plus, Trash2 } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useEffect, useState } from 'react';
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  Loading,
  PageTitle,
  Textarea,
} from '@/components/ui';
import { errorMessage, request, useApi } from '@/lib/api';
import { soles } from '@/lib/format';

interface StageDraft {
  key: number;
  name: string;
  weekFrom: string;
  weekTo: string;
  amount: string;
}

const toCents = (value: string) => Math.round(Number(value || 0) * 100);
const toSoles = (cents: number | null) => (cents === null ? '' : String(cents / 100));

const DEFAULT_STAGES: StageDraft[] = [
  { key: 1, name: 'Cimientos y estructura', weekFrom: '1', weekTo: '4', amount: '' },
  { key: 2, name: 'Muros y techo', weekFrom: '5', weekTo: '8', amount: '' },
  { key: 3, name: 'Acabados y entrega', weekFrom: '9', weekTo: '10', amount: '' },
];

function fromVersion(version: QuoteVersionView): StageDraft[] {
  return version.stages.map((stage, index) => ({
    key: index + 1,
    name: stage.name,
    weekFrom: String(stage.weekFrom),
    weekTo: String(stage.weekTo),
    amount: toSoles(stage.amountCents),
  }));
}

function QuoteForm() {
  const { matchId } = useParams<{ matchId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const quoteId = params.get('cotizacion');
  const match = useApi<MatchSummary>(`marketplace/matches/${matchId}`);
  const existing = useApi<QuoteView>(quoteId ? `contracts/quotes/${quoteId}` : null);

  const [materials, setMaterials] = useState('');
  const [labor, setLabor] = useState('');
  const [permits, setPermits] = useState('');
  const [permitsIncluded, setPermitsIncluded] = useState(true);
  const [extras, setExtras] = useState('');
  const [extrasDefined, setExtrasDefined] = useState(true);
  const [weeks, setWeeks] = useState('10');
  const [scope, setScope] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [stages, setStages] = useState<StageDraft[]>(DEFAULT_STAGES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = existing.data?.current;
  useEffect(() => {
    if (!current) {
      return;
    }
    setMaterials(toSoles(current.materialsCents));
    setLabor(toSoles(current.laborCents));
    setPermits(toSoles(current.permitsCents));
    setPermitsIncluded(current.permitsCents !== null);
    setExtras(toSoles(current.extrasCents));
    setExtrasDefined(current.extrasCents !== null);
    setWeeks(String(current.durationWeeks));
    setScope(current.scope);
    setStages(fromVersion(current));
  }, [current]);

  if (match.isLoading) {
    return <Loading />;
  }

  const totalCents =
    toCents(materials) +
    toCents(labor) +
    (permitsIncluded ? toCents(permits) : 0) +
    (extrasDefined ? toCents(extras) : 0);
  const stagedCents = stages.reduce((sum, stage) => sum + toCents(stage.amount), 0);
  const balanced = totalCents > 0 && totalCents === stagedCents;

  const updateStage = (key: number, patch: Partial<StageDraft>) =>
    setStages((list) => list.map((stage) => (stage.key === key ? { ...stage, ...patch } : stage)));

  const distribute = () => {
    const share = Math.floor(totalCents / stages.length);
    setStages((list) =>
      list.map((stage, index) => ({
        ...stage,
        amount: String(
          (index === list.length - 1 ? totalCents - share * (list.length - 1) : share) / 100,
        ),
      })),
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const version = {
      materialsCents: toCents(materials),
      laborCents: toCents(labor),
      permitsCents: permitsIncluded ? toCents(permits) : null,
      extrasCents: extrasDefined ? toCents(extras) : null,
      durationWeeks: Number(weeks),
      scope,
      changeNote: changeNote || undefined,
      stages: stages.map((stage) => ({
        name: stage.name,
        weekFrom: Number(stage.weekFrom),
        weekTo: Number(stage.weekTo),
        amountCents: toCents(stage.amount),
      })),
    };
    try {
      const quote = quoteId
        ? await request<QuoteView>(`contracts/quotes/${quoteId}/versions`, 'POST', version)
        : await request<QuoteView>('contracts/quotes', 'POST', { matchId, version });
      router.push(`/cotizaciones/${quote.id}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-xl flex-col gap-5">
      <PageTitle
        title={quoteId ? 'Nueva versión' : 'Tu cotización'}
        subtitle={match.data ? `${match.data.projectTitle} · ${match.data.familyName}` : undefined}
      />
      {existing.data?.adjustmentMessage ? (
        <p className="rounded-xl bg-obra-soft px-3.5 py-3 text-sm">
          <strong>La familia pidió:</strong> {existing.data.adjustmentMessage}
        </p>
      ) : null}

      <Card className="flex flex-col gap-4">
        <h2 className="text-[15px] font-bold">Desglose en soles</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Materiales">
            {(id) => (
              <Input
                id={id}
                required
                type="number"
                min="0"
                value={materials}
                onChange={(event) => setMaterials(event.target.value)}
              />
            )}
          </Field>
          <Field label="Mano de obra">
            {(id) => (
              <Input
                id={id}
                required
                type="number"
                min="0"
                value={labor}
                onChange={(event) => setLabor(event.target.value)}
              />
            )}
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <Field label="Permisos y supervisión">
            {(id) => (
              <Input
                id={id}
                type="number"
                min="0"
                required={permitsIncluded}
                disabled={!permitsIncluded}
                value={permitsIncluded ? permits : ''}
                onChange={(event) => setPermits(event.target.value)}
              />
            )}
          </Field>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!permitsIncluded}
              onChange={(event) => setPermitsIncluded(!event.target.checked)}
              className="size-5 accent-plano"
            />
            No incluye permisos
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <Field label="Adicionales posibles">
            {(id) => (
              <Input
                id={id}
                type="number"
                min="0"
                required={extrasDefined}
                disabled={!extrasDefined}
                value={extrasDefined ? extras : ''}
                onChange={(event) => setExtras(event.target.value)}
              />
            )}
          </Field>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!extrasDefined}
              onChange={(event) => setExtrasDefined(!event.target.checked)}
              className="size-5 accent-plano"
            />
            Todavía sin definir
          </label>
          {!permitsIncluded || !extrasDefined ? (
            <p className="text-sm text-obra-text">
              La familia verá estos rubros marcados como riesgo al comparar.
            </p>
          ) : null}
        </div>
        <Field label="Plazo total (semanas)">
          {(id) => (
            <Input
              id={id}
              required
              type="number"
              min="1"
              max="260"
              value={weeks}
              onChange={(event) => setWeeks(event.target.value)}
            />
          )}
        </Field>
        <Field label="Qué incluye tu trabajo" hint="Explícalo sin términos técnicos.">
          {(id) => (
            <Textarea
              id={id}
              required
              rows={3}
              minLength={10}
              maxLength={1000}
              value={scope}
              onChange={(event) => setScope(event.target.value)}
            />
          )}
        </Field>
        {quoteId ? (
          <Field label="¿Qué cambió en esta versión?">
            {(id) => (
              <Input
                id={id}
                maxLength={300}
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
              />
            )}
          </Field>
        ) : null}
        <p className="flex justify-between border-t border-line pt-3 text-lg font-extrabold">
          <span>Total</span>
          <span>{soles(totalCents)}</span>
        </p>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold">Pagos por etapa</h2>
          <button
            type="button"
            onClick={distribute}
            className="min-h-11 text-sm font-bold text-plano-text"
          >
            Repartir en partes iguales
          </button>
        </div>
        {stages.map((stage, index) => (
          <div key={stage.key} className="flex flex-col gap-2 border-b border-line/60 pb-4">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field label={`Etapa ${index + 1}`}>
                  {(id) => (
                    <Input
                      id={id}
                      required
                      value={stage.name}
                      onChange={(event) => updateStage(stage.key, { name: event.target.value })}
                    />
                  )}
                </Field>
              </div>
              {stages.length > 1 ? (
                <button
                  type="button"
                  aria-label={`Quitar etapa ${index + 1}`}
                  onClick={() => setStages((list) => list.filter((item) => item.key !== stage.key))}
                  className="flex size-13 shrink-0 items-center justify-center rounded-xl border border-line"
                >
                  <Trash2 className="size-5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Semana inicio">
                {(id) => (
                  <Input
                    id={id}
                    required
                    type="number"
                    min="1"
                    value={stage.weekFrom}
                    onChange={(event) => updateStage(stage.key, { weekFrom: event.target.value })}
                  />
                )}
              </Field>
              <Field label="Semana fin">
                {(id) => (
                  <Input
                    id={id}
                    required
                    type="number"
                    min="1"
                    value={stage.weekTo}
                    onChange={(event) => updateStage(stage.key, { weekTo: event.target.value })}
                  />
                )}
              </Field>
              <Field label="Monto (S/)">
                {(id) => (
                  <Input
                    id={id}
                    required
                    type="number"
                    min="0"
                    value={stage.amount}
                    onChange={(event) => updateStage(stage.key, { amount: event.target.value })}
                  />
                )}
              </Field>
            </div>
          </div>
        ))}
        {stages.length < 8 ? (
          <Button
            variant="ghost"
            className="min-h-11 self-start text-sm"
            onClick={() =>
              setStages((list) => [
                ...list,
                {
                  key: Math.max(...list.map((item) => item.key)) + 1,
                  name: '',
                  weekFrom: '',
                  weekTo: '',
                  amount: '',
                },
              ])
            }
          >
            <Plus className="size-4" aria-hidden="true" />
            Agregar etapa
          </Button>
        ) : null}
        <p className={`text-sm font-bold ${balanced ? 'text-visto' : 'text-obra-text'}`}>
          Etapas: {soles(stagedCents)} de {soles(totalCents)}
          {balanced ? ' · cuadra' : ' · deben sumar el total'}
        </p>
      </Card>

      <ErrorNote message={error} />
      <Button type="submit" variant="specialist" busy={busy} disabled={!balanced}>
        {quoteId ? 'Enviar nueva versión' : 'Enviar cotización'}
      </Button>
    </form>
  );
}

export default function QuoteFormPage() {
  return (
    <Suspense fallback={<Loading />}>
      <QuoteForm />
    </Suspense>
  );
}
