import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const ORIGIN = new URL(BASE_URL).origin;

const owner = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
await owner.connect();
await owner.query('TRUNCATE identity.rate_limits');
await owner.end();

export class Actor {
  cookies = new Map();

  async call(method, path, body, headers = {}) {
    const response = await fetch(`${BASE_URL}/api/${path}`, {
      method,
      redirect: 'manual',
      headers: {
        origin: ORIGIN,
        cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (value) {
        this.cookies.set(name, value);
      } else {
        this.cookies.delete(name);
      }
    }
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  async ok(method, path, body) {
    const result = await this.call(method, path, body);
    assert.ok(
      result.status >= 200 && result.status < 300,
      `${method} ${path} -> ${result.status} ${JSON.stringify(result.body)}`,
    );
    return result.body;
  }
}

export function testEmail(label) {
  return `e2e.${label}.${randomUUID().slice(0, 8)}@construyeconecta.test`;
}

export const LOCATION = {
  address: 'Av. Primavera 1250',
  district: 'Santiago de Surco',
  latitude: -12.1339,
  longitude: -76.9939,
  radiusKm: 15,
};

export async function registerFamily(name = 'Familia E2E') {
  const actor = new Actor();
  const { user } = await actor.ok('POST', 'session/register', {
    email: testEmail('family'),
    password: 'una-clave-larga-e2e',
    fullName: name,
    role: 'family',
  });
  await actor.ok('PUT', 'marketplace/profile/family', {
    ...LOCATION,
    displayName: name,
    phone: '987654321',
  });
  return Object.assign(actor, { id: user.id });
}

export async function registerSpecialist(name = 'Ing. E2E') {
  const actor = new Actor();
  const { user } = await actor.ok('POST', 'session/register', {
    email: testEmail('specialist'),
    password: 'una-clave-larga-e2e',
    fullName: name,
    role: 'specialist',
  });
  await actor.ok('PUT', 'marketplace/profile/specialist', {
    ...LOCATION,
    displayName: name,
    phone: '912345678',
    kind: 'engineer',
    bio: 'Especialista creado para la prueba end to end del flujo completo.',
    specialties: ['Ampliaciones', 'Estructuras'],
    visitFeeCents: 8000,
    availability: 'Lun a sáb',
  });
  return Object.assign(actor, { id: user.id });
}

export const PROJECT = {
  kind: 'expand',
  title: 'Prueba E2E: ampliar piso',
  description: 'Queremos dos cuartos arriba.',
  photoUrls: [],
  budgetMinCents: 5_000_000,
  budgetMaxCents: 6_000_000,
  timing: 'within_3_months',
};

export const QUOTE_VERSION = {
  materialsCents: 2_950_000,
  laborCents: 2_200_000,
  permitsCents: 570_000,
  extrasCents: 120_000,
  durationWeeks: 10,
  scope: 'Estructura, muros, techo y acabados del segundo piso.',
  stages: [
    { name: 'Cimientos y estructura', weekFrom: 1, weekTo: 4, amountCents: 2_000_000 },
    { name: 'Muros y techo', weekFrom: 5, weekTo: 8, amountCents: 2_200_000 },
    { name: 'Acabados y entrega', weekFrom: 9, weekTo: 10, amountCents: 1_640_000 },
  ],
};
