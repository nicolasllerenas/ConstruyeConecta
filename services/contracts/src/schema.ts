import type { QuoteStageInput } from '@cc/contracts';
import {
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const contractsSchema = pgSchema('contracts');

export const quoteStatusEnum = contractsSchema.enum('quote_status', [
  'submitted',
  'adjustment_requested',
  'selected',
  'rejected',
]);
export const contractStatusEnum = contractsSchema.enum('contract_status', ['active', 'completed']);
export const stageStatusEnum = contractsSchema.enum('stage_status', [
  'pending',
  'in_progress',
  'submitted',
  'approved',
]);

export const quotes = contractsSchema.table(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id').notNull().unique(),
    projectId: uuid('project_id').notNull(),
    projectTitle: text('project_title').notNull(),
    familyId: uuid('family_id').notNull(),
    specialistId: uuid('specialist_id').notNull(),
    status: quoteStatusEnum('status').notNull().default('submitted'),
    adjustmentMessage: text('adjustment_message'),
    currentVersion: integer('current_version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('quotes_project_idx').on(table.projectId),
    index('quotes_specialist_idx').on(table.specialistId),
  ],
);

export const quoteVersions = contractsSchema.table(
  'quote_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quotes.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    materialsCents: integer('materials_cents').notNull(),
    laborCents: integer('labor_cents').notNull(),
    permitsCents: integer('permits_cents'),
    extrasCents: integer('extras_cents'),
    durationWeeks: integer('duration_weeks').notNull(),
    scope: text('scope').notNull(),
    changeNote: text('change_note'),
    stages: jsonb('stages').$type<QuoteStageInput[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('quote_versions_quote_version').on(table.quoteId, table.version)],
);

export const contracts = contractsSchema.table('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id')
    .notNull()
    .unique()
    .references(() => quotes.id),
  projectId: uuid('project_id').notNull().unique(),
  projectTitle: text('project_title').notNull(),
  familyId: uuid('family_id').notNull(),
  specialistId: uuid('specialist_id').notNull(),
  status: contractStatusEnum('status').notNull().default('active'),
  totalCents: integer('total_cents').notNull(),
  durationWeeks: integer('duration_weeks').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const contractStages = contractsSchema.table(
  'contract_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => contracts.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    weekFrom: integer('week_from').notNull(),
    weekTo: integer('week_to').notNull(),
    amountCents: integer('amount_cents').notNull(),
    status: stageStatusEnum('status').notNull().default('pending'),
    rejectionMessage: text('rejection_message'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
  },
  (table) => [unique('contract_stages_position').on(table.contractId, table.position)],
);

export const progressUpdates = contractsSchema.table(
  'progress_updates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => contracts.id, { onDelete: 'cascade' }),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => contractStages.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').notNull(),
    message: text('message').notNull(),
    photoUrls: text('photo_urls').array().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('progress_contract_idx').on(table.contractId)],
);

export const rateLimits = contractsSchema.table(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    hits: integer('hits').notNull(),
  },
  (table) => [primaryKey({ columns: [table.key, table.windowStart] })],
);
