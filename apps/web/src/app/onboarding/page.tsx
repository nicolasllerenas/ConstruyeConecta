'use client';

import type { SessionUser } from '@cc/contracts';
import { Logo } from '@/components/logo';
import { ProfileForm } from '@/components/profile-form';
import { Loading, PageTitle } from '@/components/ui';
import { useApi } from '@/lib/api';

export default function OnboardingPage() {
  const { data: user } = useApi<SessionUser>('identity/me');
  if (!user) {
    return <Loading />;
  }
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-5 py-8">
      <Logo />
      <PageTitle
        title={user.role === 'family' ? '¿Dónde es tu obra?' : 'Completa tu perfil'}
        subtitle={
          user.role === 'family'
            ? 'Con tu ubicación te mostramos especialistas cerca.'
            : 'Las familias verán esta información antes de hacer match.'
        }
      />
      <ProfileForm
        role={user.role}
        defaultName={user.fullName}
        submitLabel="Continuar"
        onSaved={() => window.location.assign('/inicio')}
      />
    </main>
  );
}
