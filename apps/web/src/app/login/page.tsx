'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useState } from 'react';
import { Logo } from '@/components/logo';
import { Button, ErrorNote, Field, Input } from '@/components/ui';
import { errorMessage, request } from '@/lib/api';

function safeNext(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/inicio';
}

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await request('session/login', 'POST', { email, password });
      window.location.assign(safeNext(params.get('next')));
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
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
      <Field label="Contraseña">
        {(id) => (
          <Input
            id={id}
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </Field>
      <ErrorNote message={error} />
      <Button type="submit" busy={busy}>
        Iniciar sesión
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-7 px-6 py-10">
      <Link href="/" aria-label="Volver al inicio">
        <Logo />
      </Link>
      <h1 className="font-display text-3xl">Qué bueno verte de nuevo</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-center text-[15px] text-muted">
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className="font-bold text-obra-text hover:text-ink">
          Regístrate
        </Link>
      </p>
    </main>
  );
}
