'use client';

import type { Role } from '@cc/contracts';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useState } from 'react';
import { Logo } from '@/components/logo';
import { Button, ErrorNote, Field, Input } from '@/components/ui';
import { errorMessage, request } from '@/lib/api';

function RegisterForm() {
  const params = useSearchParams();
  const [role, setRole] = useState<Role>(
    params.get('rol') === 'specialist' ? 'specialist' : 'family',
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await request('session/register', 'POST', { fullName, email, password, role });
      window.location.assign('/onboarding');
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div
        role="radiogroup"
        aria-label="Tipo de cuenta"
        className="grid grid-cols-2 gap-1 rounded-2xl bg-line/60 p-1"
      >
        {(
          [
            ['family', 'Familia'],
            ['specialist', 'Especialista'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={role === value}
            onClick={() => setRole(value)}
            className={`min-h-11 rounded-xl font-bold transition ${role === value ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Field label="Nombre completo">
        {(id) => (
          <Input
            id={id}
            required
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        )}
      </Field>
      <Field label="Correo">
        {(id) => (
          <Input
            id={id}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        )}
      </Field>
      <Field label="Contraseña" hint="Usa al menos 10 caracteres.">
        {(id) => (
          <Input
            id={id}
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </Field>
      <ErrorNote message={error} />
      <Button type="submit" busy={busy} variant={role === 'family' ? 'primary' : 'specialist'}>
        Crear cuenta
      </Button>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-7 px-6 py-10">
      <Link href="/" aria-label="Volver al inicio">
        <Logo />
      </Link>
      <h1 className="font-display text-3xl">Crea tu cuenta</h1>
      <Suspense>
        <RegisterForm />
      </Suspense>
      <p className="text-center text-[15px] text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-bold text-obra-text hover:text-ink">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
