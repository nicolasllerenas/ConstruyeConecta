import type { PublicReview, QuoteView, SpecialistCard } from '@cc/contracts';

type Stage = [name: string, weekFrom: number, weekTo: number, soles: number];

interface DemoOffer {
  specialist: Omit<
    SpecialistCard,
    'reviewCount' | 'rating' | 'portfolio' | 'affinity' | 'reasons' | 'demo'
  >;
  reviews: [stars: number, tags: string[], comment: string][];
  materials: number;
  labor: number;
  permits: number | null;
  extras: number | null;
  weeks: number;
  scope: string;
  previousTotal?: number;
  changeNote?: string;
  stages: Stage[];
}

const OFFERS: DemoOffer[] = [
  {
    specialist: {
      id: 'demo-quispe',
      displayName: 'Ing. Carlos Quispe',
      kind: 'engineer',
      bio: 'Ingeniero civil con experiencia en ampliaciones de vivienda y refuerzo de estructuras en Lima.',
      specialties: ['Ampliaciones', 'Estructuras', 'Planos y permisos'],
      district: 'Surquillo',
      level: 'gold',
      distanceKm: 3.2,
      visitFeeCents: 8000,
      availability: 'Lun a sáb, 8:00 a 18:00',
      avatarUrl: null,
      credential: 'Ingeniero civil colegiado (CIP)',
      yearsExperience: 12,
      verified: true,
      pro: true,
      completedJobs: 214,
    },
    reviews: [
      [
        5,
        ['Respetó el presupuesto'],
        'Explicó cada partida sin tecnicismos y no hubo gastos sorpresa.',
      ],
      [5, ['Cumplió el plazo'], 'Terminó la ampliación en las semanas que prometió.'],
      [4, ['Puntual'], 'Buen trabajo. Nos avisó antes de cada cambio en el presupuesto.'],
      [5, ['Buena comunicación'], 'Nos mandaba fotos del avance antes de cada pago.'],
    ],
    materials: 29500,
    labor: 22000,
    permits: 5700,
    extras: 1200,
    weeks: 10,
    scope: 'Estructura, muros, techo aligerado, instalaciones y acabados básicos del segundo piso.',
    previousTotal: 57500,
    changeNote: 'se agregó una viga de amarre tras la visita.',
    stages: [
      ['Cimientos y estructura', 1, 4, 20000],
      ['Muros y techo', 5, 8, 22000],
      ['Acabados y entrega', 9, 10, 16400],
    ],
  },
  {
    specialist: {
      id: 'demo-salas',
      displayName: 'Arq. Diego Salas',
      kind: 'architect',
      bio: 'Arquitecto dedicado a remodelaciones integrales, planos y acabados para hogares familiares.',
      specialties: ['Remodelaciones', 'Planos y permisos', 'Acabados'],
      district: 'Miraflores',
      level: 'silver',
      distanceKm: 4.6,
      visitFeeCents: 10000,
      availability: 'Lun a vie, 9:00 a 17:00',
      avatarUrl: null,
      credential: 'Arquitecto colegiado (CAP)',
      yearsExperience: 9,
      verified: true,
      pro: false,
      completedJobs: 63,
    },
    reviews: [
      [5, ['Buena comunicación'], 'Los planos y la licencia salieron sin problemas.'],
      [4, ['Trabajo limpio'], 'Diseño muy cuidado, aunque fue la opción más cara.'],
      [5, ['Cumplió el plazo'], 'Entregó antes de lo previsto y con todo incluido.'],
    ],
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
  {
    specialist: {
      id: 'demo-huaman',
      displayName: 'Mtro. Julio Huamán',
      kind: 'master_builder',
      bio: 'Maestro de obra con cuadrilla propia para albañilería, techos y vaciado de columnas.',
      specialties: ['Ampliaciones', 'Techos', 'Construcción nueva'],
      district: 'San Juan de Miraflores',
      level: 'silver',
      distanceKm: 5.1,
      visitFeeCents: 5000,
      availability: 'Lun a sáb, 7:00 a 17:00',
      avatarUrl: null,
      credential: 'Maestro de obra certificado por SENCICO',
      yearsExperience: 20,
      verified: true,
      pro: false,
      completedJobs: 152,
    },
    reviews: [
      [4, ['Puntual'], 'Cuadrilla rápida, pero los permisos corrieron por nuestra cuenta.'],
      [5, ['Cumplió el plazo'], 'Techó el segundo piso antes de las lluvias.'],
      [
        4,
        ['Buena comunicación'],
        'Precio justo. Hubo un adicional que no estaba en la cotización.',
      ],
      [5, ['Trabajo limpio'], 'Trato directo y trabajo ordenado.'],
    ],
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
];

const cents = (soles: number) => soles * 100;
const DAY_MS = 86_400_000;

export const DEMO_SPECIALISTS: SpecialistCard[] = OFFERS.map(({ specialist, reviews }) => ({
  ...specialist,
  rating: reviews.reduce((sum, [stars]) => sum + stars, 0) / reviews.length,
  reviewCount: reviews.length,
  portfolio: [],
  affinity: null,
  reasons: [],
  demo: true,
}));

export const DEMO_REVIEWS: Record<string, PublicReview[]> = Object.fromEntries(
  OFFERS.map(({ specialist, reviews }) => [
    specialist.id,
    reviews.map(([stars, tags, comment], index) => ({
      id: `${specialist.id}-review-${index}`,
      stars,
      tags,
      comment,
      authorRole: 'family' as const,
      createdAt: new Date(Date.now() - (40 + index * 9) * DAY_MS).toISOString(),
    })),
  ]),
);

export function demoQuotes(projectTitle: string): QuoteView[] {
  return OFFERS.map((offer, index) => {
    const totalCents = cents(
      offer.materials + offer.labor + (offer.permits ?? 0) + (offer.extras ?? 0),
    );
    return {
      id: `demo-quote-${index}`,
      matchId: `demo-match-${index}`,
      projectId: 'demo-project',
      projectTitle,
      familyId: 'demo-family',
      specialistId: offer.specialist.id,
      status: 'submitted',
      adjustmentMessage: null,
      previousTotalCents: offer.previousTotal ? cents(offer.previousTotal) : null,
      contractId: null,
      current: {
        id: `demo-version-${index}`,
        version: offer.previousTotal ? 2 : 1,
        materialsCents: cents(offer.materials),
        laborCents: cents(offer.labor),
        permitsCents: offer.permits === null ? null : cents(offer.permits),
        extrasCents: offer.extras === null ? null : cents(offer.extras),
        totalCents,
        durationWeeks: offer.weeks,
        scope: offer.scope,
        changeNote: offer.changeNote ?? null,
        stages: offer.stages.map(([name, weekFrom, weekTo, soles], position) => ({
          id: `demo-stage-${index}-${position}`,
          name,
          weekFrom,
          weekTo,
          amountCents: cents(soles),
        })),
        createdAt: new Date().toISOString(),
      },
    };
  });
}
