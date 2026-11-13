'use client';

import { type QuoteView, rankQuotes, type SpecialistCard } from '@cc/contracts';
import clsx from 'clsx';
import { CircleHelp, Sparkles, TriangleAlert } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Avatar } from '@/components/ui';
import { compactNumber, soles } from '@/lib/format';

interface Cell {
  value: string;
  tone?: 'warn' | 'good' | 'strong';
}

const ROWS = [
  'Total',
  'Materiales',
  'Mano de obra',
  'Permisos',
  'Adicionales',
  'Plazo',
  'Calificación',
  'Experiencia',
];

export const RUBRO_GUIDE = [
  ['Materiales', 'Cemento, fierro, ladrillos y todo lo que se compra para la obra.'],
  ['Mano de obra', 'Lo que se paga al equipo que trabaja en tu casa.'],
  ['Permisos', 'Licencia municipal, planos firmados y supervisión.'],
  ['Adicionales', 'Imprevistos que podrían cobrarte aparte. «Sin definir» es un riesgo.'],
  ['Plazo', 'Semanas de trabajo desde que empieza la obra.'],
] as const;

const CELL_TONES = {
  warn: 'bg-obra-soft text-xs font-bold text-obra-text',
  good: 'bg-visto-soft font-bold text-visto',
  strong: 'text-sm font-extrabold sm:text-base',
};

function buildCells(
  quote: QuoteView,
  specialist: SpecialistCard | undefined,
  fastest: number,
): Cell[] {
  const { current } = quote;
  return [
    { value: compactNumber(current.totalCents), tone: 'strong' },
    { value: compactNumber(current.materialsCents) },
    { value: compactNumber(current.laborCents) },
    current.permitsCents === null
      ? { value: 'No incluye', tone: 'warn' }
      : { value: compactNumber(current.permitsCents) },
    current.extrasCents === null
      ? { value: 'Sin definir', tone: 'warn' }
      : current.extrasCents === 0
        ? { value: '0', tone: 'good' }
        : { value: compactNumber(current.extrasCents) },
    {
      value: `${current.durationWeeks} sem`,
      tone: current.durationWeeks === fastest ? 'good' : undefined,
    },
    { value: specialist?.rating ? `★ ${specialist.rating.toFixed(1)}` : 'Nuevo' },
    {
      value:
        specialist?.yearsExperience === null || specialist?.yearsExperience === undefined
          ? '—'
          : `${specialist.yearsExperience} años`,
    },
  ];
}

export function RubroGuide() {
  return (
    <details className="group rounded-2xl border border-line bg-white px-4 py-1">
      <summary className="flex min-h-11 items-center gap-2 text-sm font-bold">
        <CircleHelp className="size-4 text-plano" aria-hidden="true" />
        ¿Qué significa cada rubro?
      </summary>
      <dl className="flex flex-col gap-2 pb-3 text-sm">
        {RUBRO_GUIDE.map(([term, meaning]) => (
          <div key={term}>
            <dt className="inline font-bold">{term}: </dt>
            <dd className="inline text-muted">{meaning}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function CompareTable({
  quotes,
  specialists,
  budgetMaxCents,
  actions,
}: {
  quotes: QuoteView[];
  specialists: Map<string, SpecialistCard>;
  budgetMaxCents: number;
  actions: (quote: QuoteView, specialist: SpecialistCard | undefined) => ReactNode;
}) {
  const [selectedId, setSelectedId] = useState(quotes[0]?.id);
  const fastest = Math.min(...quotes.map((quote) => quote.current.durationWeeks));
  const cheapest = quotes.reduce((best, quote) =>
    quote.current.totalCents < best.current.totalCents ? quote : best,
  );
  const cheapestIsRisky =
    quotes.length > 1 &&
    (cheapest.current.permitsCents === null || cheapest.current.extrasCents === null);
  const selected = quotes.find((quote) => quote.id === selectedId) ?? quotes[0];
  const [best] =
    quotes.length > 1
      ? rankQuotes(
          quotes.map((quote) => {
            const specialist = specialists.get(quote.specialistId);
            return {
              id: quote.id,
              totalCents: quote.current.totalCents,
              permitsCents: quote.current.permitsCents,
              extrasCents: quote.current.extrasCents,
              durationWeeks: quote.current.durationWeeks,
              rating: specialist?.rating ?? null,
              reviewCount: specialist?.reviewCount ?? 0,
            };
          }),
          budgetMaxCents,
        )
      : [];
  const bestQuote = quotes.find((quote) => quote.id === best?.id);
  const bestName = bestQuote
    ? (specialists.get(bestQuote.specialistId)?.displayName ?? 'esta oferta')
    : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">Toca una columna para elegirla.</p>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div
          style={{
            gridTemplateColumns: `4.75rem repeat(${quotes.length}, minmax(5.25rem, 1fr))`,
          }}
          className="grid min-w-full gap-1.5"
        >
          <div className="flex flex-col">
            <div className="flex h-24 items-end pb-1.5 text-xs text-muted">Montos en S/</div>
            {ROWS.map((row) => (
              <div
                key={row}
                className="flex h-10 items-center text-[13px] font-semibold text-muted"
              >
                {row}
              </div>
            ))}
          </div>
          {quotes.map((quote) => {
            const specialist = specialists.get(quote.specialistId);
            const isSelected = quote.id === selected?.id;
            return (
              <button
                key={quote.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(quote.id)}
                className={clsx(
                  'relative flex flex-col overflow-hidden rounded-2xl border-2 text-left transition',
                  isSelected ? 'border-ink bg-white shadow-lg' : 'border-line hover:border-muted',
                )}
              >
                {quote.id === best?.id ? (
                  <span className="absolute inset-x-0 top-0 bg-visto py-0.5 text-center text-[10px] font-extrabold tracking-tight whitespace-nowrap text-white">
                    MEJOR VALOR
                  </span>
                ) : null}
                <span className="flex h-24 w-full flex-col gap-1 px-2 pt-6">
                  <Avatar
                    name={specialist?.displayName ?? '?'}
                    size={28}
                    url={specialist?.avatarUrl}
                  />
                  <span className="line-clamp-2 text-[13px] leading-tight font-extrabold">
                    {specialist?.displayName ?? 'Especialista'}
                  </span>
                </span>
                {buildCells(quote, specialist, fastest).map((cell, index) => (
                  <span
                    key={ROWS[index]}
                    className={clsx(
                      'flex h-10 w-full items-center border-t border-line/70 px-2 text-[13px] font-semibold',
                      cell.tone && CELL_TONES[cell.tone],
                    )}
                  >
                    {cell.value}
                  </span>
                ))}
              </button>
            );
          })}
        </div>
      </div>
      {cheapestIsRisky ? (
        <p className="flex gap-2.5 rounded-2xl bg-ink px-3.5 py-3 text-sm leading-snug text-white">
          <TriangleAlert className="size-5 shrink-0 text-obra" aria-hidden="true" />
          <span>
            <strong>Ojo:</strong>{' '}
            <span className="text-mist">
              la más barata deja costos sin definir. Al final podría salir más cara.
            </span>
          </span>
        </p>
      ) : null}
      {best && bestName ? (
        <section className="flex flex-col gap-2 rounded-2xl border-2 border-visto bg-visto-soft p-3.5 text-sm">
          <p className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-visto" aria-hidden="true" />
            <span>
              <strong>Mejor valor: {bestName}.</strong> No solo miramos el precio:
            </span>
          </p>
          <ul className="flex flex-col gap-1 pl-6 font-semibold">
            {best.reasons.map((reason) => (
              <li key={reason}>✓ {reason}</li>
            ))}
          </ul>
          <p className="pl-6 text-xs text-muted">
            Comparamos precio, costos definidos, reseñas, plazo y tu presupuesto. La decisión es
            tuya.
          </p>
        </section>
      ) : null}
      <RubroGuide />
      {selected && selected.current.totalCents > budgetMaxCents ? (
        <p className="rounded-xl bg-obra-soft px-3.5 py-2.5 text-sm font-semibold text-obra-text">
          Esta oferta supera tu presupuesto máximo de {soles(budgetMaxCents)}.
        </p>
      ) : null}
      {selected ? actions(selected, specialists.get(selected.specialistId)) : null}
    </div>
  );
}
