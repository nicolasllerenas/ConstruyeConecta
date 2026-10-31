'use client';

import {
  LIMA_DISTRICTS,
  type MyProfile,
  type Role,
  SPECIALIST_KINDS,
  SPECIALTIES,
  type SpecialistKind,
} from '@cc/contracts';
import { LocateFixed } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { errorMessage, request } from '@/lib/api';
import { SPECIALIST_KIND_LABELS } from '@/lib/format';
import { Button, Chip, ErrorNote, Field, Input, Select, Textarea } from './ui';

const DEFAULT_RADIUS_KM = 8;

function RadiusMap({ radiusKm }: { radiusKm: number }) {
  const size = 60 + radiusKm * 3.2;
  return (
    <div
      aria-hidden="true"
      className="relative h-40 overflow-hidden rounded-2xl bg-[#e3e6ec] [background-image:linear-gradient(#d3d7df_1px,transparent_1px),linear-gradient(90deg,#d3d7df_1px,transparent_1px)] [background-size:22px_22px]"
    >
      <div className="absolute top-14 -left-5 h-4 w-[120%] -rotate-[14deg] bg-white" />
      <div className="absolute -top-5 left-1/2 h-[120%] w-3.5 rotate-[8deg] bg-white" />
      <div
        style={{ width: size, height: size }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-obra bg-obra/10 transition-all"
      />
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full"
        width="30"
        height="36"
        viewBox="0 0 24 28"
        aria-hidden="true"
      >
        <path d="M12 27s-10-8.5-10-15a10 10 0 0 1 20 0c0 6.5-10 15-10 15z" fill="#16181d" />
        <circle cx="12" cy="12" r="4" fill="#ff6a1a" />
      </svg>
      <span className="absolute right-3 bottom-3 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-bold text-white">
        Radio {radiusKm} km
      </span>
    </div>
  );
}

export function ProfileForm({
  role,
  defaultName,
  profile,
  submitLabel,
  onSaved,
}: {
  role: Role;
  defaultName: string;
  profile?: MyProfile;
  submitLabel: string;
  onSaved: (profile: MyProfile) => void;
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? defaultName);
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [district, setDistrict] = useState(profile?.district ?? 'Santiago de Surco');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [reference, setReference] = useState(profile?.reference ?? '');
  const [radiusKm, setRadiusKm] = useState(profile?.radiusKm ?? DEFAULT_RADIUS_KM);
  const [precise, setPrecise] = useState<{ latitude: number; longitude: number } | null>(
    profile ? { latitude: profile.latitude, longitude: profile.longitude } : null,
  );
  const [kind, setKind] = useState<SpecialistKind>(profile?.specialist?.kind ?? 'engineer');
  const [bio, setBio] = useState(profile?.specialist?.bio ?? '');
  const [specialties, setSpecialties] = useState<string[]>(profile?.specialist?.specialties ?? []);
  const [visitFee, setVisitFee] = useState(
    profile?.specialist ? String(profile.specialist.visitFeeCents / 100) : '',
  );
  const [availability, setAvailability] = useState(
    profile?.specialist?.availability ?? 'Lun a sáb, 8:00 a 18:00',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const districtCoordinates = useMemo(
    () => LIMA_DISTRICTS.find((item) => item.name === district),
    [district],
  );

  const locateMe = () => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setPrecise({ latitude: coords.latitude, longitude: coords.longitude }),
      () => setError('No pudimos obtener tu ubicación. Usaremos tu distrito.'),
    );
  };

  const toggleSpecialty = (specialty: string) => {
    setSpecialties((current) =>
      current.includes(specialty)
        ? current.filter((item) => item !== specialty)
        : [...current, specialty].slice(0, 6),
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const coordinates = precise ?? districtCoordinates;
    if (!coordinates) {
      setError('Elige un distrito');
      return;
    }
    const base = {
      displayName,
      phone,
      address,
      reference: reference || undefined,
      district,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusKm,
    };
    setBusy(true);
    try {
      const saved =
        role === 'family'
          ? await request<MyProfile>('marketplace/profile/family', 'PUT', base)
          : await request<MyProfile>('marketplace/profile/specialist', 'PUT', {
              ...base,
              kind,
              bio,
              specialties,
              visitFeeCents: Math.round(Number(visitFee) * 100),
              availability,
              avatarUrl: profile?.specialist?.avatarUrl ?? undefined,
            });
      onSaved(saved);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label={role === 'family' ? 'Tu nombre o el de tu familia' : 'Nombre profesional'}>
        {(id) => (
          <Input
            id={id}
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        )}
      </Field>
      <Field label="Celular" hint="Solo lo compartimos después de un match.">
        {(id) => (
          <Input
            id={id}
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="987654321"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        )}
      </Field>

      {role === 'specialist' ? (
        <>
          <Field label="¿Qué haces?">
            {(id) => (
              <Select
                id={id}
                value={kind}
                onChange={(event) => setKind(event.target.value as SpecialistKind)}
              >
                {SPECIALIST_KINDS.map((option) => (
                  <option key={option} value={option}>
                    {SPECIALIST_KIND_LABELS[option]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-bold">Especialidades (hasta 6)</legend>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((specialty) => (
                <Chip
                  key={specialty}
                  selected={specialties.includes(specialty)}
                  onClick={() => toggleSpecialty(specialty)}
                >
                  {specialty}
                </Chip>
              ))}
            </div>
          </fieldset>
          <Field label="Cuéntale a las familias sobre tu trabajo" hint="Mínimo 20 caracteres.">
            {(id) => (
              <Textarea
                id={id}
                required
                rows={3}
                minLength={20}
                maxLength={600}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visita de evaluación (S/)">
              {(id) => (
                <Input
                  id={id}
                  required
                  type="number"
                  min="0"
                  max="1000"
                  inputMode="numeric"
                  value={visitFee}
                  onChange={(event) => setVisitFee(event.target.value)}
                />
              )}
            </Field>
            <Field label="Disponibilidad">
              {(id) => (
                <Input
                  id={id}
                  required
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value)}
                />
              )}
            </Field>
          </div>
        </>
      ) : null}

      <RadiusMap radiusKm={radiusKm} />
      <Field label="Distrito">
        {(id) => (
          <Select
            id={id}
            value={district}
            onChange={(event) => {
              setDistrict(event.target.value);
              setPrecise(null);
            }}
          >
            {LIMA_DISTRICTS.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        label={role === 'family' ? 'Dirección de la obra' : 'Dirección base'}
        hint="La dirección exacta solo se comparte después del match."
      >
        {(id) => (
          <Input
            id={id}
            required
            autoComplete="street-address"
            placeholder="Av. Primavera 1250"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        )}
      </Field>
      <Field label="Referencia (opcional)">
        {(id) => (
          <Input
            id={id}
            placeholder="Frente al parque, puerta verde"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        )}
      </Field>
      <Button variant="ghost" onClick={locateMe} className="min-h-11 self-start text-sm">
        <LocateFixed className="size-4" aria-hidden="true" />
        {precise ? 'Ubicación guardada · actualizar' : 'Usar mi ubicación exacta'}
      </Button>
      <Field label={`Radio de búsqueda: ${radiusKm} km`}>
        {(id) => (
          <input
            id={id}
            type="range"
            min="1"
            max="50"
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
            className="w-full accent-obra"
          />
        )}
      </Field>
      <ErrorNote message={error} />
      <Button
        type="submit"
        busy={busy}
        variant={role === 'family' ? 'primary' : 'specialist'}
        disabled={role === 'specialist' && specialties.length === 0}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
