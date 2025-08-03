
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['USER', 'ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Account status enum
export const accountStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED']);
export type AccountStatus = z.infer<typeof accountStatusSchema>;

// Transaction type enum
export const transactionTypeSchema = z.enum(['TOP_UP', 'PAYMENT', 'WITHDRAWAL']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

// Transaction status enum
export const transactionStatusSchema = z.enum(['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED']);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

// Payment method enum
export const paymentMethodSchema = z.enum(['DANA', 'BANK_TRANSFER', 'CREDIT_CARD']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  full_name: z.string(),
  phone_number: z.string(),
  role: userRoleSchema,
  account_status: accountStatusSchema,
  balance: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: transactionTypeSchema,
  amount: z.number(),
  status: transactionStatusSchema,
  payment_method: paymentMethodSchema,
  description: z.string().nullable(),
  reference_id: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Input schemas for user operations
export const createUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  full_name: z.string().min(1).max(100),
  phone_number: z.string().min(10).max(15),
  role: userRoleSchema.optional().default('USER')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  full_name: z.string().min(1).max(100).optional(),
  phone_number: z.string().min(10).max(15).optional(),
  account_status: accountStatusSchema.optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const updateUserBalanceInputSchema = z.object({
  user_id: z.number(),
  amount: z.number()
});

export type UpdateUserBalanceInput = z.infer<typeof updateUserBalanceInputSchema>;

// Input schemas for transaction operations
export const createTransactionInputSchema = z.object({
  user_id: z.number(),
  type: transactionTypeSchema,
  amount: z.number().positive(),
  payment_method: paymentMethodSchema,
  description: z.string().nullable().optional(),
  reference_id: z.string().nullable().optional()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const updateTransactionStatusInputSchema = z.object({
  id: z.number(),
  status: transactionStatusSchema
});

export type UpdateTransactionStatusInput = z.infer<typeof updateTransactionStatusInputSchema>;

// Query schemas
export const getUserTransactionsInputSchema = z.object({
  user_id: z.number(),
  type: transactionTypeSchema.optional(),
  status: transactionStatusSchema.optional(),
  limit: z.number().int().positive().optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0)
});

export type GetUserTransactionsInput = z.infer<typeof getUserTransactionsInputSchema>;

export const getTransactionsInputSchema = z.object({
  type: transactionTypeSchema.optional(),
  status: transactionStatusSchema.optional(),
  user_id: z.number().optional(),
  limit: z.number().int().positive().optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0)
});

export type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

// Report schemas
export const reportPeriodSchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);
export type ReportPeriod = z.infer<typeof reportPeriodSchema>;

export const getReportInputSchema = z.object({
  period: reportPeriodSchema,
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
});

export type GetReportInput = z.infer<typeof getReportInputSchema>;

export const reportDataSchema = z.object({
  total_top_up: z.number(),
  total_payments: z.number(),
  total_withdrawals: z.number(),
  transaction_count: z.number(),
  net_revenue: z.number(),
  active_users_count: z.number(),
  period: reportPeriodSchema,
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type ReportData = z.infer<typeof reportDataSchema>;
