import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Таблицы Better Auth (https://www.better-auth.com/docs/concepts/database#core-schema).
 * Описаны в Drizzle, поэтому живут в тех же миграциях, что и остальная схема.
 * Better Auth работает с датами как с Date — отсюда mode: 'date'.
 */

const authTimestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  ...authTimestamps,
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...authTimestamps,
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
);

/** Привязка пользователя к провайдеру входа (у нас — Google) */
export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    ...authTimestamps,
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
);

/** Временные значения: state OAuth-входа и т.п. */
export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...authTimestamps,
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);
