import type { QuoteView } from '@cc/contracts';
import { Card, PilotPaymentNote } from '@/components/ui';
import { QUOTE_STATUS_LABELS, soles } from '@/lib/format';

const STAGE_TONES = [
  'bg-obra text-ink',
  'bg-plano text-white',
  'bg-visto text-white',
  'bg-ink text-white',
];

const stageTone = (index: number) => STAGE_TONES[index % STAGE_TONES.length];

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

export function QuoteBreakdown({
  quote,
  budgetMaxCents,
}: {
  quote: QuoteView;
  budgetMaxCents?: number;
}) {
  const { current } = quote;
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
  const share = (amount: number) => Math.round((amount / current.totalCents) * 100);

  return (
    <>
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
        {budgetMaxCents ? (
          <BudgetBar totalCents={current.totalCents} maxCents={budgetMaxCents} />
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
        <h2 className="text-[15px] font-bold">Cómo pagarías: por etapas</h2>
        <p className="-mt-1.5 text-sm text-muted">
          Pagas cada etapa solo cuando apruebas el avance.
        </p>
        <div className="flex h-3 overflow-hidden rounded-full" aria-hidden="true">
          {current.stages.map((stage, index) => (
            <span
              key={stage.id}
              style={{ width: `${share(stage.amountCents)}%` }}
              className={`${stageTone(index)} border-r-2 border-cemento last:border-r-0`}
            />
          ))}
        </div>
        {current.stages.map((stage, index) => (
          <div
            key={stage.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-2.5"
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-extrabold ${stageTone(index)}`}
            >
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-bold">{stage.name}</span>
              <span className="text-[13px] text-muted">
                Semanas {stage.weekFrom}–{stage.weekTo} · {share(stage.amountCents)}% del total
              </span>
            </span>
            <span className="font-extrabold whitespace-nowrap">{soles(stage.amountCents)}</span>
          </div>
        ))}
        <PilotPaymentNote />
      </section>
    </>
  );
}
