import assert from 'node:assert/strict';
import { test } from 'node:test';
import pg from 'pg';
import {
  Actor,
  BASE_URL,
  PROJECT,
  QUOTE_VERSION,
  registerFamily,
  registerSpecialist,
  testEmail,
} from './helpers.mjs';

test('sin sesión no se accede a ningún dato', async () => {
  const anonymous = new Actor();
  for (const path of ['identity/me', 'marketplace/projects/mine', 'contracts/contracts/mine']) {
    const result = await anonymous.call('GET', path);
    assert.equal(result.status, 401, path);
  }
  const page = await fetch(`${BASE_URL}/explorar`, { redirect: 'manual' });
  assert.equal(page.status, 307);
  assert.match(page.headers.get('location'), /\/login/);
});

test('el gateway no expone rutas internas ni de autenticación del servicio', async () => {
  const family = await registerFamily();
  const internalPaths = [
    'marketplace/internal/matches/00000000-0000-4000-8000-000000000000',
    'contracts/internal/contracts/00000000-0000-4000-8000-000000000000',
    'identity/auth/refresh',
    'billing/anything',
  ];
  for (const path of internalPaths) {
    const result = await family.call('GET', path);
    assert.equal(result.status, 404, path);
  }
});

test('una petición de otro origen se rechaza', async () => {
  const family = await registerFamily();
  const result = await family.call('POST', 'marketplace/projects', PROJECT, {
    origin: 'https://sitio-malicioso.example',
  });
  assert.equal(result.status, 403);
  const login = await new Actor().call(
    'POST',
    'session/login',
    { email: 'a@b.co', password: 'x' },
    { origin: 'https://sitio-malicioso.example' },
  );
  assert.equal(login.status, 403);
});

test('los roles no pueden usar rutas ajenas', async () => {
  const family = await registerFamily();
  const specialist = await registerSpecialist();
  assert.equal((await specialist.call('POST', 'marketplace/projects', PROJECT)).status, 403);
  assert.equal((await family.call('GET', 'marketplace/feed')).status, 403);
  assert.equal(
    (
      await family.call('POST', 'contracts/quotes', {
        matchId: '00000000-0000-4000-8000-000000000000',
        version: QUOTE_VERSION,
      })
    ).status,
    403,
  );
});

test('un usuario no puede leer ni modificar datos de otro', async () => {
  const family = await registerFamily();
  const stranger = await registerFamily('Familia Intrusa');
  const specialist = await registerSpecialist();
  const outsider = await registerSpecialist('Ing. Intruso');

  const project = await family.ok('POST', 'marketplace/projects', PROJECT);
  await family.ok('POST', 'marketplace/swipes/family', {
    projectId: project.id,
    specialistId: specialist.id,
    decision: 'like',
  });
  const { matchId } = await specialist.ok('POST', 'marketplace/swipes/specialist', {
    projectId: project.id,
    decision: 'like',
  });

  assert.equal((await stranger.call('GET', `marketplace/matches/${matchId}`)).status, 404);
  assert.equal(
    (await stranger.call('GET', `marketplace/projects/${project.id}/candidates`)).status,
    404,
  );
  assert.equal(
    (
      await stranger.call('POST', 'marketplace/swipes/family', {
        projectId: project.id,
        specialistId: specialist.id,
        decision: 'pass',
      })
    ).status,
    403,
  );
  assert.equal(
    (await outsider.call('POST', 'contracts/quotes', { matchId, version: QUOTE_VERSION })).status,
    403,
  );

  const quote = await specialist.ok('POST', 'contracts/quotes', {
    matchId,
    version: QUOTE_VERSION,
  });
  assert.equal((await stranger.call('GET', `contracts/quotes/${quote.id}`)).status, 404);
  assert.equal(
    (await stranger.call('POST', `contracts/quotes/${quote.id}/select`, {})).status,
    404,
  );
  assert.deepEqual(await stranger.ok('GET', `contracts/quotes?projectId=${project.id}`), []);

  const { contractId } = await family.ok('POST', `contracts/quotes/${quote.id}/select`, {});
  assert.equal((await stranger.call('GET', `contracts/contracts/${contractId}`)).status, 404);
  assert.equal(
    (await outsider.call('GET', `reputation/reviews/contract/${contractId}`)).status,
    403,
  );
});

test('los datos inválidos se rechazan en el borde del servicio', async () => {
  const family = await registerFamily();
  const specialist = await registerSpecialist();
  const invalidBudget = await family.call('POST', 'marketplace/projects', {
    ...PROJECT,
    budgetMinCents: 900,
    budgetMaxCents: 100,
  });
  assert.equal(invalidBudget.status, 400);
  const foreignMedia = await family.call('POST', 'marketplace/projects', {
    ...PROJECT,
    photoUrls: ['https://sitio-malicioso.example/foto.jpg'],
  });
  assert.equal(foreignMedia.status, 400, 'solo se aceptan archivos de nuestro almacenamiento');
  const project = await family.ok('POST', 'marketplace/projects', PROJECT);
  await family.ok('POST', 'marketplace/swipes/family', {
    projectId: project.id,
    specialistId: specialist.id,
    decision: 'like',
  });
  const { matchId } = await specialist.ok('POST', 'marketplace/swipes/specialist', {
    projectId: project.id,
    decision: 'like',
  });
  const unbalanced = await specialist.call('POST', 'contracts/quotes', {
    matchId,
    version: { ...QUOTE_VERSION, laborCents: 1 },
  });
  assert.equal(unbalanced.status, 400, 'las etapas deben sumar el total');
  assert.equal((await family.call('GET', 'contracts/quotes/no-es-uuid')).status, 400);
});

test('la autenticación no filtra información y las contraseñas débiles se rechazan', async () => {
  const email = testEmail('auth');
  const actor = new Actor();
  const weak = await actor.call('POST', 'session/register', {
    email,
    password: 'corta',
    fullName: 'Prueba Débil',
    role: 'family',
  });
  assert.equal(weak.status, 400);

  await actor.ok('POST', 'session/register', {
    email,
    password: 'una-clave-larga-e2e',
    fullName: 'Prueba Auth',
    role: 'family',
  });
  const duplicate = await new Actor().call('POST', 'session/register', {
    email,
    password: 'una-clave-larga-e2e',
    fullName: 'Prueba Auth',
    role: 'family',
  });
  assert.equal(duplicate.status, 409);

  const wrongPassword = await new Actor().call('POST', 'session/login', {
    email,
    password: 'clave-incorrecta-e2e',
  });
  const unknownUser = await new Actor().call('POST', 'session/login', {
    email: testEmail('nadie'),
    password: 'clave-incorrecta-e2e',
  });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownUser.status, 401);
  assert.equal(wrongPassword.body.message, unknownUser.body.message);
});

test('las cookies de sesión son httpOnly y los tokens no llegan al navegador', async () => {
  const response = await fetch(`${BASE_URL}/api/session/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: new URL(BASE_URL).origin },
    body: JSON.stringify({
      email: testEmail('session'),
      password: 'una-clave-larga-e2e',
      fullName: 'Prueba Sesión',
      role: 'family',
    }),
  });
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  for (const cookie of cookies) {
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
  }
  const body = await response.json();
  assert.equal('accessToken' in body, false);
  assert.equal('refreshToken' in body, false);
});

test('cerrar sesión invalida el refresh aunque alguien lo haya copiado', async () => {
  const email = testEmail('logout');
  const actor = new Actor();
  await actor.ok('POST', 'session/register', {
    email,
    password: 'una-clave-larga-e2e',
    fullName: 'Prueba Logout',
    role: 'family',
  });
  const stolen = new Actor();
  stolen.cookies = new Map(actor.cookies);
  for (const name of stolen.cookies.keys()) {
    if (name.endsWith('cc_access')) {
      stolen.cookies.delete(name);
    }
  }
  await actor.ok('POST', 'session/logout', {});
  assert.equal((await actor.call('GET', 'identity/me')).status, 401);
  assert.equal((await stolen.call('GET', 'identity/me')).status, 401);
});

test('el refresh rota y su reutilización tardía revoca toda la sesión', async () => {
  const owner = process.env.DATABASE_OWNER_URL;
  assert.ok(owner, 'esta prueba necesita DATABASE_OWNER_URL');
  const email = testEmail('rotation');
  const actor = new Actor();
  await actor.ok('POST', 'session/register', {
    email,
    password: 'una-clave-larga-e2e',
    fullName: 'Prueba Rotación',
    role: 'family',
  });
  const dropAccess = (target) => {
    for (const name of target.cookies.keys()) {
      if (name.endsWith('cc_access')) {
        target.cookies.delete(name);
      }
    }
  };
  dropAccess(actor);
  const stolen = new Actor();
  stolen.cookies = new Map(actor.cookies);

  await actor.ok('GET', 'identity/me');
  const refreshName = [...actor.cookies.keys()].find((name) => name.endsWith('cc_refresh'));
  assert.notEqual(actor.cookies.get(refreshName), stolen.cookies.get(refreshName));

  const client = new pg.Client({ connectionString: owner });
  await client.connect();
  await client.query(
    `UPDATE identity.refresh_sessions s SET rotated_at = now() - interval '5 minutes'
     FROM identity.users u WHERE s.user_id = u.id AND u.email = $1 AND s.rotated_at IS NOT NULL`,
    [email],
  );
  await client.end();

  assert.equal((await stolen.call('GET', 'identity/me')).status, 401);
  dropAccess(actor);
  assert.equal((await actor.call('GET', 'identity/me')).status, 401);
});

test('cada servicio solo puede leer su propio esquema', async () => {
  const owner = process.env.DATABASE_OWNER_URL;
  assert.ok(owner, 'esta prueba necesita DATABASE_OWNER_URL');
  const client = new pg.Client({ connectionString: owner });
  await client.connect();
  const { rows } = await client.query(`
    SELECT r.role, s.schema,
      has_schema_privilege(r.role, s.schema, 'USAGE') AS allowed
    FROM (VALUES ('identity_service'), ('marketplace_service'), ('contracts_service'), ('reputation_service')) r(role)
    CROSS JOIN (VALUES ('identity'), ('marketplace'), ('contracts'), ('reputation')) s(schema)
  `);
  await client.end();
  assert.equal(rows.length, 16);
  for (const { role, schema, allowed } of rows) {
    assert.equal(allowed, role === `${schema}_service`, `${role} sobre ${schema}`);
  }
});

test('los intentos repetidos de login a una cuenta se bloquean', async () => {
  const email = testEmail('brute');
  const attempts = [];
  for (let index = 0; index < 11; index += 1) {
    attempts.push(
      await new Actor().call('POST', 'session/login', { email, password: 'clave-incorrecta-e2e' }),
    );
  }
  assert.equal(attempts.at(0).status, 401);
  assert.equal(attempts.at(-1).status, 429);
});
