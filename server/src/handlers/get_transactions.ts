
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetTransactionsInput, type Transaction } from '../schema';
import { eq, and, desc, type SQL } from 'drizzle-orm';

export const getTransactions = async (input: GetTransactionsInput): Promise<Transaction[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (input.type !== undefined) {
      conditions.push(eq(transactionsTable.type, input.type));
    }

    if (input.status !== undefined) {
      conditions.push(eq(transactionsTable.status, input.status));
    }

    if (input.user_id !== undefined) {
      conditions.push(eq(transactionsTable.user_id, input.user_id));
    }

    // Build the final query
    const baseQuery = db.select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.created_at))
      .limit(input.limit)
      .offset(input.offset);

    // Apply where conditions if any exist
    const finalQuery = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const results = await finalQuery.execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Get transactions failed:', error);
    throw error;
  }
};
