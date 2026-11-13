'use client';

import { FREE_PLAN_MONTHLY_QUOTES, type Role } from '@cc/contracts';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Button, ErrorNote, LinkButton, PageTitle } from '@/components/ui';
import { errorMessage, request } from '@/lib/api';
import { shortDate } from '@/lib/format';
import { useViewer } from '../viewer';

interface Plan {
  name: string;
  price: string;
  period?: string;
  items: string[];
  featured?: boolean;
}

const PLANS: Record<Role, { title: string; plans: Plan[] }> = {
  specialist: {
    title: 'Consigue más trabajos cerca de ti',
    plans: [
      {
        name: 'Básico',
        price: 'Gratis',
        items: [`${FREE_PLAN_MONTHLY_QUOTES} cotizaciones al mes`, 'Perfil, portafolio y reseñas'],
      },
      {
        name: 'Pro',
        price: 'S/ 14.90',
        period: '/ mes',
        items: [
          'Cotizaciones ilimitadas',
          'Apareces primero a familias cercanas',
          'Insignia PRO en tu tarjeta',
        ],
        featured: true,
      },
    ],
  },
  family: {
    title: 'Lo esencial es gratis',
    plans: [
      {
        name: 'Gratis',
        price: 'S/ 0',
        items: ['Publica tu obra', 'Compara cotizaciones lado a lado', 'Pagos por etapa'],
      },
      {
        name: 'Destacar mi obra',
        price: 'S/ 4.90',
        period: '/ publicación',
        items: ['Tu obra aparece primero a especialistas de tu zona'],
        featured: true,
      },
    ],
  },
};

export default function PlansPage() {
  const { user, profile, refreshProfile } = useViewer();
  const [tab, setTab] = useState<Role>(user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { title, plans } = PLANS[tab];
  const expiresAt = profile.specialist?.planExpiresAt;
  const proActive =
    profile.specialist?.plan === 'pro' && expiresAt && new Date(expiresAt).getTime() > Date.now();

  const activate = async () => {
    setBusy(true);
    setError(null);
    try {
      await request('marketplace/plan/activate', 'POST', { plan: 'pro' });
      await refreshProfile();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div
        role="tablist"
        aria-label="Tipo de cuenta"
        className="grid grid-cols-2 gap-1 rounded-2xl bg-line/60 p-1"
      >
        {(
          [
            ['specialist', 'Especialista'],
            ['family', 'Familia'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={clsx(
              'min-h-11 rounded-xl font-bold',
              tab === value ? 'bg-white text-ink shadow-sm' : 'text-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <PageTitle title={title} />
      {plans.map((plan) => (
        <section
          key={plan.name}
          className={clsx(
            'flex flex-col gap-2.5 rounded-3xl border-2 p-5',
            plan.featured ? 'border-ink bg-ink text-white' : 'border-line bg-white',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl">{plan.name}</h2>
            {plan.featured ? (
              <span
                className={clsx(
                  'rounded-lg px-2 py-1 text-xs font-extrabold',
                  tab === 'specialist' ? 'bg-plano text-white' : 'bg-obra text-ink',
                )}
              >
                RECOMENDADO
              </span>
            ) : null}
          </div>
          <p className="text-3xl font-extrabold">
            {plan.price}{' '}
            {plan.period ? (
              <span className="text-sm font-semibold opacity-80">{plan.period}</span>
            ) : null}
          </p>
          {plan.items.map((item) => (
            <p key={item} className="flex items-start gap-2 text-sm leading-snug">
              <Check className="mt-px size-4.5 shrink-0" strokeWidth={2.6} aria-hidden="true" />
              {item}
            </p>
          ))}
        </section>
      ))}
      <ErrorNote message={error} />
      {tab === 'specialist' && user.role === 'specialist' ? (
        proActive && expiresAt ? (
          <p className="rounded-xl bg-visto-soft px-3.5 py-3 text-center text-sm font-bold text-visto">
            Pro activo hasta el {shortDate(expiresAt)}
          </p>
        ) : (
          <Button variant="specialist" busy={busy} onClick={activate}>
            Probar Pro 14 días gratis
          </Button>
        )
      ) : null}
      {tab === 'family' && user.role === 'family' ? (
        <LinkButton href="/obras/nueva">Publicar mi obra gratis</LinkButton>
      ) : null}
      <p className="text-center text-[13px] text-muted">
        Precios referenciales en soles. Durante el piloto no realizamos cobros.
      </p>
    </div>
  );
}
