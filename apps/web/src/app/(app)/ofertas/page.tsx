'use client';

import type { MatchSummary, ProjectCard, QuoteView, SpecialistCard } from '@cc/contracts';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { CompareTable } from '@/components/compare-table';
import {
  Avatar,
  Empty,
  LinkButton,
  Loading,
  PageTitle,
  Select,
  StepIndicator,
  WhatsAppButton,
} from '@/components/ui';
import { useApi } from '@/lib/api';
import { compactNumber, contactMessage, soles } from '@/lib/format';

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
          actions={(quote, specialist) => {
            const match = matches.find((item) => item.specialistId === quote.specialistId);
            return (
              <div className="flex flex-col gap-2.5">
                <LinkButton href={`/cotizaciones/${quote.id}`}>
                  Ver desglose de {specialist?.displayName ?? 'esta oferta'}
                </LinkButton>
                <div className="grid grid-cols-2 gap-2.5">
                  <LinkButton href={`/especialistas/${quote.specialistId}`} variant="outline">
                    Ver perfil
                  </LinkButton>
                  {match?.counterpartPhone ? (
                    <WhatsAppButton
                      phone={match.counterpartPhone}
                      text={contactMessage(project.title)}
                    />
                  ) : null}
                </div>
              </div>
            );
          }}
        />
      ) : (
        <Empty
          title="Aún no recibes cotizaciones"
          description="Pide cotización a especialistas en Explorar. Cuando te envíen su oferta, la verás aquí con los mismos rubros."
          action={<LinkButton href={`/explorar?obra=${project.id}`}>Pedir cotizaciones</LinkButton>}
        />
      )}
      {waiting.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-bold">Aceptaron y están preparando su cotización</h2>
          {waiting.map((match) => (
            <div
              key={match.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3"
            >
              <Avatar name={match.specialistName} />
              <span className="min-w-0 flex-1 font-bold">{match.specialistName}</span>
              {match.counterpartPhone ? (
                <WhatsAppButton
                  phone={match.counterpartPhone}
                  text={contactMessage(match.projectTitle)}
                  className="min-h-11 rounded-xl px-3 text-sm"
                />
              ) : null}
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
      <StepIndicator current={1} />
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
