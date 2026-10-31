'use client';

import type { MyProfile, Role, SessionUser } from '@cc/contracts';
import clsx from 'clsx';
import {
  BriefcaseBusiness,
  Handshake,
  HardHat,
  Inbox,
  Layers,
  type LucideIcon,
  Plus,
  ReceiptText,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo } from 'react';
import { Logo } from '@/components/logo';
import { Loading } from '@/components/ui';
import { useApi } from '@/lib/api';
import { ViewerContext } from './viewer';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAVIGATION: Record<Role, NavItem[]> = {
  family: [
    { href: '/explorar', label: 'Explorar', icon: Layers },
    { href: '/obras/nueva', label: 'Publicar', icon: Plus },
    { href: '/ofertas', label: 'Ofertas', icon: ReceiptText },
    { href: '/obra', label: 'Mi obra', icon: HardHat },
    { href: '/perfil', label: 'Perfil', icon: UserRound },
  ],
  specialist: [
    { href: '/solicitudes', label: 'Solicitudes', icon: Inbox },
    { href: '/matches', label: 'Matches', icon: Handshake },
    { href: '/obra', label: 'Mis trabajos', icon: BriefcaseBusiness },
    { href: '/perfil', label: 'Perfil', icon: UserRound },
  ],
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useApi<SessionUser>('identity/me');
  const profileQuery = useApi<MyProfile>('marketplace/profile/me');
  const missingProfile = profileQuery.error?.status === 404;

  useEffect(() => {
    if (missingProfile) {
      router.replace('/onboarding');
    }
  }, [missingProfile, router]);

  const viewer = useMemo(
    () =>
      user && profileQuery.data
        ? { user, profile: profileQuery.data, refreshProfile: () => profileQuery.mutate() }
        : null,
    [user, profileQuery.data, profileQuery.mutate],
  );

  if (!viewer) {
    return <Loading />;
  }

  const items = NAVIGATION[viewer.user.role];
  const activeClass = viewer.user.role === 'family' ? 'text-obra-text' : 'text-plano-text';
  const immersive = pathname === '/solicitudes';

  return (
    <ViewerContext.Provider value={viewer}>
      <div className="lg:pl-64">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-8 bg-ink px-5 py-7 text-white lg:flex">
          <Link href="/inicio" aria-label="Inicio">
            <Logo inverted />
          </Link>
          <nav aria-label="Principal" className="flex flex-col gap-1">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'flex min-h-12 items-center gap-3 rounded-xl px-3.5 font-bold transition',
                    active ? 'bg-night text-white' : 'text-mist hover:bg-night/60 hover:text-white',
                  )}
                >
                  <Icon
                    className={clsx(
                      'size-5',
                      active && (viewer.user.role === 'family' ? 'text-obra' : 'text-plano-light'),
                    )}
                    aria-hidden="true"
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main
          className={clsx(
            immersive ? '' : 'mx-auto max-w-5xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12',
          )}
        >
          {children}
        </main>
        <nav
          aria-label="Principal"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
          className={clsx(
            'fixed inset-x-0 bottom-0 z-30 grid border-t pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden',
            immersive ? 'border-night bg-ink' : 'border-line bg-white',
          )}
        >
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex min-h-11 flex-col items-center justify-center gap-1 text-xs font-bold',
                  active
                    ? immersive
                      ? 'text-plano-light'
                      : activeClass
                    : immersive
                      ? 'text-mist'
                      : 'text-muted',
                )}
              >
                <Icon className="size-6" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </ViewerContext.Provider>
  );
}
