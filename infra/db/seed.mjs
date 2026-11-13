import { createHash, randomBytes } from 'node:crypto';
import pg from 'pg';
import { hashPassword } from '../../services/identity/dist/auth/passwords.js';

const password = process.env.DEFAULT_USERS_PASSWORD;
if (!password) {
  throw new Error('Missing environment variable DEFAULT_USERS_PASSWORD');
}

function id(name) {
  const hex = createHash('sha256').update(`construyeconecta:${name}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const SURCO = { district: 'Santiago de Surco', latitude: -12.1339, longitude: -76.9939 };
const soles = (amount) => amount * 100;

const family = {
  key: 'family',
  email: 'familia@cuadra.test',
  fullName: 'Familia Mendoza',
  phone: '999111222',
  address: 'Av. Primavera 1250',
  reference: 'Frente al parque, puerta verde',
  ...SURCO,
};

const specialists = [
  {
    key: 'quispe',
    email: 'especialista@cuadra.test',
    fullName: 'Ing. Carlos Quispe',
    kind: 'engineer',
    phone: '999333444',
    bio: 'Ingeniero civil con experiencia en ampliaciones de vivienda y refuerzo de estructuras en Lima.',
    specialties: ['Ampliaciones', 'Estructuras', 'Planos y permisos'],
    visitFee: 80,
    completedJobs: 214,
    district: 'Surquillo',
    latitude: -12.1136,
    longitude: -77.0167,
    credential: 'Ingeniero civil colegiado (CIP)',
    yearsExperience: 12,
    reviews: [
      [
        5,
        ['Respetó el presupuesto', 'Buena comunicación'],
        'Explicó cada partida sin tecnicismos y no hubo gastos sorpresa.',
      ],
      [
        5,
        ['Cumplió el plazo', 'Trabajo limpio'],
        'Terminó la ampliación en las semanas que prometió.',
      ],
      [4, ['Puntual'], 'Buen trabajo. Nos avisó antes de cada cambio en el presupuesto.'],
      [
        5,
        ['Buena comunicación', 'Trabajo limpio'],
        'Nos mandaba fotos del avance antes de cada pago.',
      ],
    ],
  },
  {
    key: 'salas',
    email: 'salas.demo@cuadra.test',
    fullName: 'Arq. Diego Salas',
    kind: 'architect',
    phone: '999555666',
    bio: 'Arquitecto dedicado a remodelaciones integrales, planos y acabados para hogares familiares.',
    specialties: ['Remodelaciones', 'Planos y permisos', 'Acabados'],
    visitFee: 100,
    completedJobs: 63,
    district: 'Miraflores',
    latitude: -12.1211,
    longitude: -77.0297,
    credential: 'Arquitecto colegiado (CAP)',
    yearsExperience: 9,
    reviews: [
      [5, ['Buena comunicación'], 'Los planos y la licencia salieron sin problemas.'],
      [4, ['Trabajo limpio'], 'Diseño muy cuidado, aunque fue la opción más cara.'],
      [
        5,
        ['Cumplió el plazo', 'Respetó el presupuesto'],
        'Entregó antes de lo previsto y con todo incluido.',
      ],
    ],
  },
  {
    key: 'huaman',
    email: 'huaman.demo@cuadra.test',
    fullName: 'Mtro. Julio Huamán',
    kind: 'master_builder',
    phone: '999777888',
    bio: 'Maestro de obra con cuadrilla propia para albañilería, techos y vaciado de columnas.',
    specialties: ['Ampliaciones', 'Techos', 'Construcción nueva'],
    visitFee: 50,
    completedJobs: 152,
    district: 'San Juan de Miraflores',
    latitude: -12.1581,
    longitude: -76.9711,
    credential: 'Maestro de obra certificado por SENCICO',
    yearsExperience: 20,
    reviews: [
      [4, ['Puntual'], 'Cuadrilla rápida, pero los permisos corrieron por nuestra cuenta.'],
      [5, ['Trabajo limpio', 'Cumplió el plazo'], 'Techó el segundo piso antes de las lluvias.'],
      [
        4,
        ['Buena comunicación'],
        'Precio justo. Hubo un adicional que no estaba en la cotización.',
      ],
      [5, ['Puntual', 'Trabajo limpio'], 'Trato directo y trabajo ordenado.'],
    ],
  },
  {
    key: 'paredes',
    email: 'paredes.demo@cuadra.test',
    fullName: 'Arq. Lucía Paredes',
    kind: 'architect',
    phone: '999123123',
    bio: 'Arquitecta especializada en ampliaciones pequeñas y aprovechamiento de espacios en casa.',
    specialties: ['Ampliaciones', 'Remodelaciones', 'Planos y permisos'],
    visitFee: 90,
    completedJobs: 41,
    district: 'San Borja',
    latitude: -12.1078,
    longitude: -77.0006,
    credential: 'Arquitecta colegiada (CAP)',
    yearsExperience: 7,
    reviews: [
      [5, ['Buena comunicación'], 'Aprovechó muy bien el espacio de la azotea.'],
      [5, ['Respetó el presupuesto', 'Puntual'], 'Clara con los costos desde la primera visita.'],
    ],
  },
  {
    key: 'ccori',
    email: 'ccori.demo@cuadra.test',
    fullName: 'Rosa Ccori',
    kind: 'technician',
    phone: '999456456',
    bio: 'Técnica en gasfitería y electricidad para instalaciones de obra nueva y reparaciones.',
    specialties: ['Gasfitería', 'Electricidad', 'Ampliaciones'],
    visitFee: 40,
    completedJobs: 98,
    district: 'Surquillo',
    latitude: -12.1136,
    longitude: -77.0167,
    credential: 'Técnica electricista certificada por SENCICO',
    yearsExperience: 10,
    reviews: [
      [5, ['Trabajo limpio'], 'Dejó todas las instalaciones probadas y rotuladas.'],
      [4, ['Puntual', 'Buena comunicación'], 'Llegó a tiempo y explicó cada punto de luz.'],
    ],
  },
];

const client = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
await client.connect();
await client.query('BEGIN');

async function upsertUser(user, role, passwordHash) {
  await client.query(
    `INSERT INTO identity.users (id, email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash`,
    [id(user.key), user.email, passwordHash, user.fullName, role],
  );
  await client.query(
    `INSERT INTO marketplace.profiles
       (user_id, role, display_name, phone, address, reference, district, latitude, longitude, radius_km)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 15)
     ON CONFLICT (user_id) DO NOTHING`,
    [
      id(user.key),
      role,
      user.fullName,
      user.phone,
      user.address ?? `Base en ${user.district}`,
      user.reference ?? null,
      user.district,
      user.latitude,
      user.longitude,
    ],
  );
}

const defaultHash = await hashPassword(password);
await upsertUser(family, 'family', defaultHash);

for (const specialist of specialists) {
  const hash =
    specialist.key === 'quispe'
      ? defaultHash
      : await hashPassword(randomBytes(32).toString('base64url'));
  await upsertUser(specialist, 'specialist', hash);
  await client.query(
    `INSERT INTO marketplace.specialist_details
       (user_id, kind, bio, specialties, visit_fee_cents, availability, verified, demo,
        completed_jobs, credential, years_experience)
     VALUES ($1, $2, $3, $4, $5, 'Lun a sáb, 8:00 a 18:00', true, true, $6, $7, $8)
     ON CONFLICT (user_id) DO UPDATE SET
       credential = EXCLUDED.credential,
       years_experience = EXCLUDED.years_experience`,
    [
      id(specialist.key),
      specialist.kind,
      specialist.bio,
      specialist.specialties,
      soles(specialist.visitFee),
      specialist.completedJobs,
      specialist.credential,
      specialist.yearsExperience,
    ],
  );
  for (const [index, [stars, tags, comment]] of specialist.reviews.entries()) {
    await client.query(
      `INSERT INTO reputation.reviews
         (id, contract_id, author_id, subject_id, author_role, stars, tags, comment, created_at)
       VALUES ($1, $2, $3, $4, 'family', $5, $6, $7, now() - make_interval(days => 40 + $8 * 9))
       ON CONFLICT (id) DO UPDATE SET stars = EXCLUDED.stars, tags = EXCLUDED.tags, comment = EXCLUDED.comment`,
      [
        id(`review:${specialist.key}:${index}`),
        id(`demo-contract:${specialist.key}:${index}`),
        id(`demo-author:${specialist.key}:${index}`),
        id(specialist.key),
        stars,
        tags,
        comment,
        index,
      ],
    );
  }
}

async function insertProject(key, values) {
  await client.query(
    `INSERT INTO marketplace.projects
       (id, family_id, kind, title, description, photo_urls, budget_min_cents, budget_max_cents,
        timing, estimated_date, district, latitude, longitude, radius_km, status, demo)
     VALUES ($1, $2, $3, $4, $5, '{}', $6, $7, $8, $13, $9, $10, $11, 15, $12, true)
     ON CONFLICT (id) DO UPDATE SET estimated_date = EXCLUDED.estimated_date`,
    [
      id(key),
      id('family'),
      values.kind,
      values.title,
      values.description,
      soles(values.budgetMin),
      soles(values.budgetMax),
      values.timing,
      family.district,
      family.latitude,
      family.longitude,
      values.status,
      values.estimatedDate ?? null,
    ],
  );
}

async function insertMatch(projectKey, specialistKey) {
  for (const actor of ['family', 'specialist']) {
    await client.query(
      `INSERT INTO marketplace.swipes (project_id, specialist_id, actor, decision)
       VALUES ($1, $2, $3, 'like') ON CONFLICT DO NOTHING`,
      [id(projectKey), id(specialistKey), actor],
    );
  }
  await client.query(
    `INSERT INTO marketplace.matches (id, project_id, specialist_id, family_id)
     VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [id(`match:${projectKey}:${specialistKey}`), id(projectKey), id(specialistKey), id('family')],
  );
}

async function insertQuote(projectKey, projectTitle, specialistKey, status, versions) {
  const quoteId = id(`quote:${projectKey}:${specialistKey}`);
  await client.query(
    `INSERT INTO contracts.quotes
       (id, match_id, project_id, project_title, family_id, specialist_id, status, current_version, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now() - interval '40 days')
     ON CONFLICT (id) DO NOTHING`,
    [
      quoteId,
      id(`match:${projectKey}:${specialistKey}`),
      id(projectKey),
      projectTitle,
      id('family'),
      id(specialistKey),
      status,
      versions.length,
    ],
  );
  for (const [index, version] of versions.entries()) {
    await client.query(
      `INSERT INTO contracts.quote_versions
         (id, quote_id, version, materials_cents, labor_cents, permits_cents, extras_cents,
          duration_weeks, scope, change_note, stages)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        id(`quote-version:${quoteId}:${index + 1}`),
        quoteId,
        index + 1,
        soles(version.materials),
        soles(version.labor),
        version.permits === null ? null : soles(version.permits),
        version.extras === null ? null : soles(version.extras),
        version.weeks,
        version.scope,
        version.changeNote ?? null,
        JSON.stringify(
          version.stages.map(([name, weekFrom, weekTo, amount]) => ({
            name,
            weekFrom,
            weekTo,
            amountCents: soles(amount),
          })),
        ),
      ],
    );
  }
  return quoteId;
}

async function insertContract(projectKey, projectTitle, quoteId, status, weeks, stages) {
  const contractId = id(`contract:${projectKey}`);
  const total = stages.reduce((sum, stage) => sum + stage.amount, 0);
  await client.query(
    `INSERT INTO contracts.contracts
       (id, quote_id, project_id, project_title, family_id, specialist_id, status, total_cents,
        duration_weeks, started_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now() - interval '30 days', $10)
     ON CONFLICT (id) DO NOTHING`,
    [
      contractId,
      quoteId,
      id(projectKey),
      projectTitle,
      id('family'),
      id('quispe'),
      status,
      soles(total),
      weeks,
      status === 'completed' ? new Date(Date.now() - 86_400_000) : null,
    ],
  );
  for (const [position, stage] of stages.entries()) {
    await client.query(
      `INSERT INTO contracts.contract_stages
         (id, contract_id, position, name, week_from, week_to, amount_cents, status, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        id(`stage:${projectKey}:${position}`),
        contractId,
        position,
        stage.name,
        stage.from,
        stage.to,
        soles(stage.amount),
        stage.status,
        stage.status === 'approved' ? new Date(Date.now() - 86_400_000) : null,
      ],
    );
  }
  return contractId;
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

const expansion = {
  key: 'project:expansion',
  title: 'Ampliar 2.º piso, 40 m²',
};
await insertProject(expansion.key, {
  kind: 'expand',
  title: expansion.title,
  description: 'Queremos dos cuartos y un baño arriba. Las columnas ya están listas.',
  budgetMin: 50000,
  budgetMax: 60000,
  timing: 'within_3_months',
  estimatedDate: daysFromNow(45),
  status: 'open',
});
for (const key of ['quispe', 'salas', 'huaman']) {
  await insertMatch(expansion.key, key);
}
const expansionStages = [
  ['Cimientos y estructura', 1, 4, 20000],
  ['Muros y techo', 5, 8, 22000],
  ['Acabados y entrega', 9, 10, 16400],
];
await insertQuote(expansion.key, expansion.title, 'quispe', 'submitted', [
  {
    materials: 28600,
    labor: 22000,
    permits: 5700,
    extras: 1200,
    weeks: 10,
    scope: 'Estructura, muros, techo aligerado, instalaciones y acabados básicos del segundo piso.',
    stages: [
      ['Cimientos y estructura', 1, 4, 19100],
      ['Muros y techo', 5, 8, 22000],
      ['Acabados y entrega', 9, 10, 16400],
    ],
  },
  {
    materials: 29500,
    labor: 22000,
    permits: 5700,
    extras: 1200,
    weeks: 10,
    scope: 'Estructura, muros, techo aligerado, instalaciones y acabados básicos del segundo piso.',
    changeNote: 'se agregó una viga de amarre tras la visita.',
    stages: expansionStages,
  },
]);
await insertQuote(expansion.key, expansion.title, 'salas', 'submitted', [
  {
    materials: 31200,
    labor: 23500,
    permits: 9200,
    extras: 0,
    weeks: 8,
    scope:
      'Diseño de planos, trámite de licencia, construcción completa y acabados de calidad media.',
    stages: [
      ['Planos y estructura', 1, 3, 22000],
      ['Muros y techo', 4, 6, 24000],
      ['Acabados y entrega', 7, 8, 17900],
    ],
  },
]);
await insertQuote(expansion.key, expansion.title, 'huaman', 'submitted', [
  {
    materials: 28500,
    labor: 22500,
    permits: null,
    extras: null,
    weeks: 12,
    scope: 'Construcción del segundo piso con cuadrilla propia. Permisos a cargo de la familia.',
    stages: [
      ['Estructura', 1, 5, 18000],
      ['Muros y techo', 6, 9, 18000],
      ['Acabados', 10, 12, 15000],
    ],
  },
]);

const kitchen = { key: 'project:kitchen', title: 'Remodelar la cocina' };
await insertProject(kitchen.key, {
  kind: 'remodel',
  title: kitchen.title,
  description: 'Cambiar muebles, mayólicas y puntos de agua.',
  budgetMin: 15000,
  budgetMax: 20000,
  timing: 'asap',
  status: 'contracted',
});
await insertMatch(kitchen.key, 'quispe');
const kitchenQuote = await insertQuote(kitchen.key, kitchen.title, 'quispe', 'selected', [
  {
    materials: 9000,
    labor: 6000,
    permits: 0,
    extras: 500,
    weeks: 6,
    scope: 'Demolición, instalaciones de agua, mayólicas y muebles a medida.',
    stages: [
      ['Demolición e instalaciones', 1, 2, 5500],
      ['Mayólicas y muebles', 3, 5, 7000],
      ['Acabados y entrega', 6, 6, 3000],
    ],
  },
]);
const kitchenContract = await insertContract(
  kitchen.key,
  kitchen.title,
  kitchenQuote,
  'active',
  6,
  [
    { name: 'Demolición e instalaciones', from: 1, to: 2, amount: 5500, status: 'approved' },
    { name: 'Mayólicas y muebles', from: 3, to: 5, amount: 7000, status: 'submitted' },
    { name: 'Acabados y entrega', from: 6, to: 6, amount: 3000, status: 'pending' },
  ],
);
await client.query(
  `INSERT INTO contracts.progress_updates (id, contract_id, stage_id, author_id, message, photo_urls)
   VALUES ($1, $2, $3, $4, $5, '{}') ON CONFLICT (id) DO NOTHING`,
  [
    id('update:kitchen:1'),
    kitchenContract,
    id(`stage:${kitchen.key}:1`),
    id('quispe'),
    'Mayólicas y muebles instalados. Revisa y aprueba para continuar con los acabados.',
  ],
);

const facade = { key: 'project:facade', title: 'Reparar y pintar la fachada' };
await insertProject(facade.key, {
  kind: 'repair',
  title: facade.title,
  description: 'Resanar grietas y pintar la fachada.',
  budgetMin: 3000,
  budgetMax: 5000,
  timing: 'asap',
  status: 'contracted',
});
await insertMatch(facade.key, 'quispe');
const facadeQuote = await insertQuote(facade.key, facade.title, 'quispe', 'selected', [
  {
    materials: 1500,
    labor: 2000,
    permits: 0,
    extras: 0,
    weeks: 2,
    scope: 'Resane de grietas, imprimante y dos manos de pintura exterior.',
    stages: [
      ['Resane', 1, 1, 1500],
      ['Pintura y entrega', 2, 2, 2000],
    ],
  },
]);
const facadeContract = await insertContract(facade.key, facade.title, facadeQuote, 'completed', 2, [
  { name: 'Resane', from: 1, to: 1, amount: 1500, status: 'approved' },
  { name: 'Pintura y entrega', from: 2, to: 2, amount: 2000, status: 'approved' },
]);
await client.query(
  `INSERT INTO reputation.reviews
     (id, contract_id, author_id, subject_id, author_role, stars, tags, comment)
   VALUES ($1, $2, $3, $4, 'specialist', 5, $5, $6)
   ON CONFLICT (id) DO UPDATE SET comment = EXCLUDED.comment`,
  [
    id('review:facade:family'),
    facadeContract,
    id('quispe'),
    id('family'),
    ['Pagos a tiempo', 'Decisiones claras'],
    'Aprobó cada etapa a tiempo y decidió rápido los cambios.',
  ],
);

const terrace = { key: 'project:terrace', title: 'Techar la terraza' };
await insertProject(terrace.key, {
  kind: 'build',
  title: terrace.title,
  description: 'Techo liviano para la terraza, unos 25 m².',
  budgetMin: 8000,
  budgetMax: 12000,
  timing: 'within_3_months',
  estimatedDate: daysFromNow(30),
  status: 'open',
});
await client.query(
  `INSERT INTO marketplace.swipes (project_id, specialist_id, actor, decision)
   VALUES ($1, $2, 'family', 'like') ON CONFLICT DO NOTHING`,
  [id(terrace.key), id('quispe')],
);

await client.query('COMMIT');
await client.end();
process.stdout.write('seed: done\n');
