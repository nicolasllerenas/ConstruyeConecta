'use client';

import type { ContractView } from '@cc/contracts';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Empty, LinkButton, Loading, PageTitle } from '@/components/ui';
import { useApi } from '@/lib/api';
import { soles } from '@/lib/format';
import { useViewer } from '../viewer';

export default function ContractsPage() {
  const { user } = useViewer();
  const contracts = useApi<ContractView[]>('contracts/contracts/mine');

  if (contracts.isLoading) {
    return <Loading />;
  }
  const list = contracts.data ?? [];
  const isFamily = user.role === 'family';

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <PageTitle title={isFamily ? 'Mi obra' : 'Mis trabajos'} />
      {list.length === 0 ? (
        <Empty
          title="Todavía no hay obras en marcha"
          description={
            isFamily
              ? 'Cuando elijas una cotización, aquí verás el avance y los pagos por etapa.'
              : 'Cuando una familia elija tu cotización, aquí gestionarás cada etapa.'
          }
          action={
            <LinkButton
              href={isFamily ? '/ofertas' : '/matches'}
              variant={isFamily ? 'primary' : 'specialist'}
            >
              {isFamily ? 'Ver mis ofertas' : 'Ver mis matches'}
            </LinkButton>
          }
        />
      ) : (
        list.map((contract) => {
          const approved = contract.stages.filter((stage) => stage.status === 'approved').length;
          return (
            <Link
              key={contract.id}
              href={`/obra/${contract.id}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-ink"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-bold">{contract.projectTitle}</span>
                <span className="text-sm text-muted">
                  {contract.status === 'completed'
                    ? 'Entregada'
                    : `Etapa ${Math.min(approved + 1, contract.stages.length)} de ${contract.stages.length}`}{' '}
                  · {soles(contract.totalCents)}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
            </Link>
          );
        })
      )}
    </div>
  );
}
