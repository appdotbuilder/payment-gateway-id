
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN']);
export const accountStatusEnum = pgEnum('account_status', ['ACTIVE', 'SUSPENDED', 'BLOCKED']);
export const transactionTypeEnum = pgEnum('transaction_type', ['TOP_UP', 'PAYMENT', 'WITHDRAWAL']);
export const transactionStatusEnum = pgEnum('transaction_status', ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED']);
export const paymentMethodEnum = pgEnum('payment_method', ['DANA', 'BANK_TRANSFER', 'CREDIT_CARD']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  full_name: text('full_name').notNull(),
  phone_number: text('phone_number').notNull(),
  role: userRoleEnum('role').notNull().default('USER'),
  account_status: accountStatusEnum('account_status').notNull().default('ACTIVE'),
  balance: numeric('balance', { precision: 15, scale: 2 }).notNull().default('0.00'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  type: transactionTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  status: transactionStatusEnum('status').notNull().default('PENDING'),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  description: text('description'),
  reference_id: text('reference_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  transactions: many(transactionsTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  transactions: transactionsTable 
};
