import {
  index,
  integer,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const reputation = pgSchema('reputation');

export const authorRoleEnum = reputation.enum('author_role', ['family', 'specialist']);

export const reviews = reputation.table(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id').notNull(),
    authorId: uuid('author_id').notNull(),
    subjectId: uuid('subject_id').notNull(),
    authorRole: authorRoleEnum('author_role').notNull(),
    stars: smallint('stars').notNull(),
    tags: text('tags').array().notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('reviews_contract_author').on(table.contractId, table.authorId),
    index('reviews_subject_idx').on(table.subjectId),
  ],
);

export const rateLimits = reputation.table(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    hits: integer('hits').notNull(),
  },
  (table) => [primaryKey({ columns: [table.key, table.windowStart] })],
);
