import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Recurring transactions table (must be defined first due to foreign key)
export const recurringTransactions = sqliteTable('recurring_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // 'income' or 'expense'
  amount: real('amount').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  frequency: text('frequency').notNull(), // 'daily', 'weekly', 'monthly', 'yearly'
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  lastGenerated: text('last_generated'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

// Transactions table
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // 'income' or 'expense'
  amount: real('amount').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  date: text('date').notNull(),
  recurringId: integer('recurring_id').references(() => recurringTransactions.id),
  createdAt: text('created_at').notNull(),
});

// Budgets table
export const budgets = sqliteTable('budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull().unique(),
  limit: real('limit').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});