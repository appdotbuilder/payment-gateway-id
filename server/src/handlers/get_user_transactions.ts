
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetUserTransactionsInput, type Transaction } from '../schema';
import { eq, and, desc, type SQL } from 'drizzle-orm';

export const getUserTransactions = async (input: GetUserTransactionsInput): Promise<Transaction[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(transactionsTable.user_id, input.user_id));

    // Add optional filters
    if (input.type) {
      conditions.push(eq(transactionsTable.type, input.type));
    }

    if (input.status) {
      conditions.push(eq(transactionsTable.status, input.status));
    }

    // Build and execute query directly
    const results = await db.select()
      .from(transactionsTable)
      .where(and(...conditions))
      .orderBy(desc(transactionsTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Get user transactions failed:', error);
    throw error;
  }
};
