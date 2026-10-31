'use client';

import type { MatchSummary, ProjectCard, QuoteView, SpecialistCard } from '@cc/contracts';
import clsx from 'clsx';
import { MessageCircle, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { Avatar, Empty, LinkButton, Loading, PageTitle, Select } from '@/components/ui';
import { useApi } from '@/lib/api';
import { compactNumber, soles, whatsappLink } from '@/lib/format';

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
];

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
  ];
}

const CELL_TONES = {
  warn: 'bg-obra-soft text-xs font-bold text-obra-text',
  good: 'bg-visto-soft font-bold text-visto',
  strong: 'text-sm font-extrabold sm:text-base',
};

function CompareTable({
  quotes,
  specialists,
  budgetMaxCents,
}: {
  quotes: QuoteView[];
  specialists: Map<string, SpecialistCard>;
  budgetMaxCents: number;
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
  const selectedName = selected ? specialists.get(selected.specialistId)?.displayName : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div
          style={{
            gridTemplateColumns: `4.75rem repeat(${quotes.length}, minmax(5.25rem, 1fr))`,
          }}
          className="grid min-w-full gap-1.5"
        >
          <div className="flex flex-col">
            <div className="flex h-20 items-end pb-1.5 text-xs text-muted">Montos en S/</div>
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
                  'flex flex-col overflow-hidden rounded-2xl border-2 text-left transition',
                  isSelected ? 'border-ink bg-white' : 'border-line',
                )}
              >
                <span className="flex h-20 w-full flex-col gap-1 px-2 pt-2">
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
      {selected && selected.current.totalCents > budgetMaxCents ? (
        <p className="rounded-xl bg-obra-soft px-3.5 py-2.5 text-sm font-semibold text-obra-text">
          Esta oferta supera tu presupuesto máximo de {soles(budgetMaxCents)}.
        </p>
      ) : null}
      {selected ? (
        <LinkButton href={`/cotizaciones/${selected.id}`}>
          Ver desglose de {selectedName ?? 'esta oferta'}
        </LinkButton>
      ) : null}
    </div>
  );
}

function ProjectOffers({ project, matches }: { project: ProjectCard; matches: MatchSummary[] }) {
  const quotes = useApi<QuoteView[]>(`contracts/quotes?projectId=${project.id}`);
  const ids = useMemo(() => {
    const all = [
      ...(quotes.data ?? []).map((quote) => quote.specialistId),
      ...matches.map((match) => match.specialistId),
    ];
    return [...new Set(all)];
  }, [quotes.data, matches]);
  const specialists = useApi<SpecialistCard[]>(
    ids.length > 0 ? `marketplace/specialists?ids=${ids.join(',')}` : null,
  );
  const byId = useMemo(
    () => new Map((specialists.data ?? []).map((item) => [item.id, item])),
    [specialists.data],
  );

  if (quotes.isLoading) {
    return <Loading label="Cargando cotizaciones…" />;
  }
  const list = quotes.data ?? [];
  const quoted = new Set(list.map((quote) => quote.specialistId));
  const waiting = matches.filter((match) => !quoted.has(match.specialistId));
  const contractId = list.find((quote) => quote.contractId)?.contractId;

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-xl bg-obra-soft px-3.5 py-2.5 text-sm">
        Tu presupuesto:{' '}
        <strong>
          {soles(project.budgetMinCents)} – {compactNumber(project.budgetMaxCents)}
        </strong>
      </p>
      {contractId ? (
        <LinkButton href={`/obra/${contractId}`} variant="dark">
          Ya elegiste una cotización · Ver mi obra
        </LinkButton>
      ) : null}
      {list.length > 0 ? (
        <CompareTable
          key={list.map((quote) => quote.id).join()}
          quotes={list}
          specialists={byId}
          budgetMaxCents={project.budgetMaxCents}
        />
      ) : (
        <Empty
          title="Aún no recibes cotizaciones"
          description="Cuando un especialista con el que hiciste match envíe su oferta, la verás aquí en el mismo formato."
          action={<LinkButton href="/explorar">Seguir explorando</LinkButton>}
        />
      )}
      {waiting.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-bold">Matches esperando cotización</h2>
          {waiting.map((match) => (
            <div
              key={match.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3"
            >
              <Avatar name={match.specialistName} />
              <span className="min-w-0 flex-1 font-bold">{match.specialistName}</span>
              <a
                href={whatsappLink(
                  match.counterpartPhone,
                  `Hola, hicimos match en ConstruyeConecta por "${match.projectTitle}".`,
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-ink px-3 text-sm font-bold text-white"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                WhatsApp
              </a>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function OffersContent() {
  const params = useSearchParams();
  const projects = useApi<ProjectCard[]>('marketplace/projects/mine');
  const matches = useApi<MatchSummary[]>('marketplace/matches');
  const [selected, setSelected] = useState<string | null>(params.get('obra'));

  if (projects.isLoading) {
    return <Loading />;
  }
  const list = projects.data ?? [];
  const project = list.find((item) => item.id === selected) ?? list[0];
  if (!project) {
    return (
      <Empty
        title="Todavía no publicas una obra"
        action={<LinkButton href="/obras/nueva">Publicar mi obra</LinkButton>}
      />
    );
  }
  return (
    <>
      {list.length > 1 ? (
        <Select
          aria-label="Obra"
          value={project.id}
          onChange={(event) => setSelected(event.target.value)}
        >
          {list.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </Select>
      ) : null}
      <ProjectOffers
        key={project.id}
        project={project}
        matches={(matches.data ?? []).filter((match) => match.projectId === project.id)}
      />
    </>
  );
}

export default function OffersPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="Compara cotizaciones" subtitle="Mismos rubros, sin letra chica." />
      <Suspense fallback={<Loading />}>
        <OffersContent />
      </Suspense>
      <Link href="/planes" className="text-center text-sm font-bold text-obra-text">
        Ver planes y destacar mi obra
      </Link>
    </div>
  );
}
