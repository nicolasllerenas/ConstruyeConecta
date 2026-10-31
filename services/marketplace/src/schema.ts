import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const marketplace = pgSchema('marketplace');

export const roleEnum = marketplace.enum('role', ['family', 'specialist']);
export const specialistKindEnum = marketplace.enum('specialist_kind', [
  'engineer',
  'architect',
  'master_builder',
  'technician',
]);
export const planEnum = marketplace.enum('plan', ['free', 'pro']);
export const projectKindEnum = marketplace.enum('project_kind', [
  'build',
  'expand',
  'remodel',
  'repair',
]);
export const projectTimingEnum = marketplace.enum('project_timing', [
  'asap',
  'within_3_months',
  'just_quoting',
]);
export const projectStatusEnum = marketplace.enum('project_status', [
  'open',
  'contracted',
  'closed',
]);
export const swipeActorEnum = marketplace.enum('swipe_actor', ['family', 'specialist']);
export const swipeDecisionEnum = marketplace.enum('swipe_decision', ['like', 'pass']);

export const profiles = marketplace.table('profiles', {
  userId: uuid('user_id').primaryKey(),
  role: roleEnum('role').notNull(),
  displayName: text('display_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  reference: text('reference'),
  district: text('district').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  radiusKm: integer('radius_km').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const specialistDetails = marketplace.table('specialist_details', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  kind: specialistKindEnum('kind').notNull(),
  bio: text('bio').notNull(),
  specialties: text('specialties').array().notNull(),
  visitFeeCents: integer('visit_fee_cents').notNull(),
  availability: text('availability').notNull(),
  avatarUrl: text('avatar_url'),
  verified: boolean('verified').notNull().default(false),
  plan: planEnum('plan').notNull().default('free'),
  planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),
  demo: boolean('demo').notNull().default(false),
  completedJobs: integer('completed_jobs').notNull().default(0),
});

export const portfolioItems = marketplace.table(
  'portfolio_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    specialistId: uuid('specialist_id')
      .notNull()
      .references(() => specialistDetails.userId, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    caption: text('caption').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('portfolio_specialist_idx').on(table.specialistId)],
);

export const projects = marketplace.table(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    kind: projectKindEnum('kind').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    photoUrls: text('photo_urls').array().notNull(),
    voiceNoteUrl: text('voice_note_url'),
    budgetMinCents: integer('budget_min_cents').notNull(),
    budgetMaxCents: integer('budget_max_cents').notNull(),
    timing: projectTimingEnum('timing').notNull(),
    district: text('district').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    radiusKm: integer('radius_km').notNull(),
    highlightedUntil: timestamp('highlighted_until', { withTimezone: true }),
    status: projectStatusEnum('status').notNull().default('open'),
    demo: boolean('demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('projects_family_idx').on(table.familyId),
    index('projects_status_idx').on(table.status),
  ],
);

export const swipes = marketplace.table(
  'swipes',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    specialistId: uuid('specialist_id')
      .notNull()
      .references(() => specialistDetails.userId, { onDelete: 'cascade' }),
    actor: swipeActorEnum('actor').notNull(),
    decision: swipeDecisionEnum('decision').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.specialistId, table.actor] })],
);

export const matches = marketplace.table(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    specialistId: uuid('specialist_id')
      .notNull()
      .references(() => specialistDetails.userId, { onDelete: 'cascade' }),
    familyId: uuid('family_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('matches_project_specialist').on(table.projectId, table.specialistId)],
);

export const rateLimits = marketplace.table(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    hits: integer('hits').notNull(),
  },
  (table) => [primaryKey({ columns: [table.key, table.windowStart] })],
);
