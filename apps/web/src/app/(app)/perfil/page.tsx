'use client';

import type { MyProfile } from '@cc/contracts';
import { LogOut, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ImagePicker } from '@/components/image-picker';
import { ProfileForm } from '@/components/profile-form';
import { Avatar, Button, Card, ErrorNote, Input, PageTitle, VerifiedBadge } from '@/components/ui';
import { errorMessage, request } from '@/lib/api';
import { SPECIALIST_KIND_LABELS } from '@/lib/format';
import { useViewer } from '../viewer';

function Portfolio({
  profile,
  onChange,
}: {
  profile: MyProfile;
  onChange: () => Promise<unknown>;
}) {
  const [pending, setPending] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = profile.specialist?.portfolio ?? [];

  const save = async () => {
    const url = pending[0];
    if (!url) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await request('marketplace/portfolio', 'POST', { url, caption });
      setPending([]);
      setCaption('');
      await onChange();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await request(`marketplace/portfolio/${id}`, 'DELETE');
      await onChange();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-bold">Portafolio · {items.length} fotos</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <figure key={item.id} className="relative aspect-square overflow-hidden rounded-xl">
            <img
              src={item.url}
              alt={item.caption}
              loading="lazy"
              className="size-full object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 truncate bg-ink/70 px-2 py-1 text-xs font-bold text-white">
              {item.caption}
            </figcaption>
            <button
              type="button"
              aria-label={`Eliminar ${item.caption}`}
              onClick={() => remove(item.id)}
              className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-ink/80 text-white"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </figure>
        ))}
      </div>
      <Card className="flex flex-col gap-3">
        <span className="text-sm font-bold">Sube un trabajo previo</span>
        <ImagePicker urls={pending} onChange={setPending} max={1} />
        {pending.length > 0 ? (
          <>
            <Input
              aria-label="Descripción de la foto"
              placeholder="Ej. Losa del 2.º piso"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
            <Button
              variant="specialist"
              busy={busy}
              disabled={caption.trim().length < 2}
              onClick={save}
            >
              Guardar en mi portafolio
            </Button>
          </>
        ) : null}
        <ErrorNote message={error} />
      </Card>
    </section>
  );
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useViewer();
  const [saved, setSaved] = useState(false);
  const details = profile.specialist;

  const logout = async () => {
    await request('session/logout', 'POST', {});
    window.location.assign('/');
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <PageTitle title="Mi perfil" />
      <Card className="flex items-center gap-3.5">
        <Avatar
          name={profile.displayName}
          url={details?.avatarUrl}
          size={68}
          tone={details ? 'plano' : 'obra'}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-extrabold">{profile.displayName}</span>
            {details?.plan === 'pro' ? (
              <span className="rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-extrabold text-white">
                PRO
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted">
            {details ? SPECIALIST_KIND_LABELS[details.kind] : 'Familia'} · {user.email}
          </p>
          {details?.verified ? <VerifiedBadge /> : null}
        </div>
      </Card>
      <Link
        href="/planes"
        className="flex min-h-14 items-center gap-3 rounded-2xl bg-ink px-4 font-bold text-white"
      >
        <Sparkles className="size-5 text-obra" aria-hidden="true" />
        {details ? 'Consigue más trabajos con Pro' : 'Destaca tu obra'}
      </Link>
      {details ? <Portfolio profile={profile} onChange={refreshProfile} /> : null}
      <h2 className="text-[15px] font-bold">Mis datos y ubicación</h2>
      <ProfileForm
        role={user.role}
        defaultName={user.fullName}
        profile={profile}
        submitLabel="Guardar cambios"
        onSaved={async () => {
          await refreshProfile();
          setSaved(true);
        }}
      />
      {saved ? (
        <p role="status" className="text-center text-sm font-bold text-visto">
          Cambios guardados
        </p>
      ) : null}
      <Button variant="ghost" onClick={logout}>
        <LogOut className="size-5" aria-hidden="true" />
        Cerrar sesión
      </Button>
    </div>
  );
}
