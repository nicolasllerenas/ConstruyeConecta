'use client';

import type { MatchSummary, QuoteView } from '@cc/contracts';
import { MapPin } from 'lucide-react';
import {
  Avatar,
  Card,
  Empty,
  LinkButton,
  Loading,
  PageTitle,
  WhatsAppButton,
} from '@/components/ui';
import { useApi } from '@/lib/api';
import { compactNumber, contactMessage, QUOTE_STATUS_LABELS, soles } from '@/lib/format';

export default function MatchesPage() {
  const matches = useApi<MatchSummary[]>('marketplace/matches');
  const quotes = useApi<QuoteView[]>('contracts/quotes/mine');

  if (matches.isLoading) {
    return <Loading />;
  }
  const list = matches.data ?? [];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <PageTitle
        title="Mis propuestas"
        subtitle="Obras a las que puedes cotizar. Los datos de contacto aparecen cuando la familia te invita o te elige."
      />
      {list.length === 0 ? (
        <Empty
          title="Aún no tienes propuestas"
          description="En Solicitudes, toca «Cotizar» en las obras que te interesan y envía tu cotización en formato estándar."
          action={
            <LinkButton href="/solicitudes" variant="specialist">
              Ver solicitudes
            </LinkButton>
          }
        />
      ) : (
        list.map((match) => {
          const quote = quotes.data?.find((item) => item.matchId === match.id);
          return (
            <Card key={match.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={match.familyName} tone="obra" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">{match.projectTitle}</h2>
                  <p className="text-sm text-muted">
                    {match.familyName} · {soles(match.budgetMinCents)} –{' '}
                    {compactNumber(match.budgetMaxCents)}
                  </p>
                </div>
              </div>
              <p className="flex items-start gap-1.5 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {match.address
                  ? `${match.address}, ${match.district}${match.reference ? ` (${match.reference})` : ''}`
                  : `${match.district} · la dirección se comparte cuando la familia te invite o te elija`}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {match.counterpartPhone ? (
                  <WhatsAppButton
                    phone={match.counterpartPhone}
                    text={contactMessage(match.projectTitle)}
                    variant="outline"
                    className="min-h-12 rounded-xl text-base"
                  />
                ) : null}
                {quote ? (
                  <LinkButton
                    href={`/cotizaciones/${quote.id}`}
                    variant="specialist"
                    className="min-h-12"
                  >
                    {QUOTE_STATUS_LABELS[quote.status]} · {soles(quote.current.totalCents)}
                  </LinkButton>
                ) : (
                  <LinkButton
                    href={`/cotizar/${match.id}`}
                    variant="specialist"
                    className="min-h-12"
                  >
                    Enviar cotización
                  </LinkButton>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
