
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type GetTransactionsInput, type CreateUserInput } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

// Helper to create test user
const createTestUser = async (userData: Partial<CreateUserInput> = {}) => {
  const defaultUser: CreateUserInput = {
    username: 'testuser',
    email: 'test@example.com',
    full_name: 'Test User',
    phone_number: '1234567890',
    role: 'USER'
  };

  const result = await db.insert(usersTable)
    .values({ ...defaultUser, ...userData })
    .returning()
    .execute();

  return {
    ...result[0],
    balance: parseFloat(result[0].balance)
  };
};

// Helper to create test transaction
const createTestTransaction = async (transactionData: {
  user_id: number;
  type?: 'TOP_UP' | 'PAYMENT' | 'WITHDRAWAL';
  amount?: number;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  payment_method?: 'DANA' | 'BANK_TRANSFER' | 'CREDIT_CARD';
  description?: string | null;
  reference_id?: string | null;
}) => {
  const defaultTransaction = {
    type: 'TOP_UP' as const,
    amount: '100.00',
    payment_method: 'DANA' as const,
    status: 'SUCCESS' as const,
    description: null,
    reference_id: null
  };

  const result = await db.insert(transactionsTable)
    .values({
      ...defaultTransaction,
      ...transactionData,
      amount: transactionData.amount?.toString() || defaultTransaction.amount
    })
    .returning()
    .execute();

  return {
    ...result[0],
    amount: parseFloat(result[0].amount)
  };
};

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const input: GetTransactionsInput = {
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);
    expect(result).toEqual([]);
  });

  it('should return all transactions with default pagination', async () => {
    const user = await createTestUser();
    
    // Create multiple transactions
    await createTestTransaction({ user_id: user.id, type: 'TOP_UP', amount: 100 });
    await createTestTransaction({ user_id: user.id, type: 'PAYMENT', amount: 50 });
    await createTestTransaction({ user_id: user.id, type: 'WITHDRAWAL', amount: 25 });

    const input: GetTransactionsInput = {
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);
    
    expect(result).toHaveLength(3);
    expect(result[0].user_id).toBe(user.id);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter transactions by type', async () => {
    const user = await createTestUser();
    
    await createTestTransaction({ user_id: user.id, type: 'TOP_UP', amount: 100 });
    await createTestTransaction({ user_id: user.id, type: 'PAYMENT', amount: 50 });
    await createTestTransaction({ user_id: user.id, type: 'WITHDRAWAL', amount: 25 });

    const input: GetTransactionsInput = {
      type: 'TOP_UP',
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('TOP_UP');
    expect(result[0].amount).toBe(100);
  });

  it('should filter transactions by status', async () => {
    const user = await createTestUser();
    
    await createTestTransaction({ user_id: user.id, status: 'SUCCESS', amount: 100 });
    await createTestTransaction({ user_id: user.id, status: 'PENDING', amount: 50 });
    await createTestTransaction({ user_id: user.id, status: 'FAILED', amount: 25 });

    const input: GetTransactionsInput = {
      status: 'PENDING',
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('PENDING');
    expect(result[0].amount).toBe(50);
  });

  it('should filter transactions by user_id', async () => {
    const user1 = await createTestUser({ username: 'user1', email: 'user1@example.com' });
    const user2 = await createTestUser({ username: 'user2', email: 'user2@example.com' });
    
    await createTestTransaction({ user_id: user1.id, amount: 100 });
    await createTestTransaction({ user_id: user1.id, amount: 50 });
    await createTestTransaction({ user_id: user2.id, amount: 75 });

    const input: GetTransactionsInput = {
      user_id: user1.id,
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);
    
    expect(result).toHaveLength(2);
    expect(result[0].user_id).toBe(user1.id);
    expect(result[1].user_id).toBe(user1.id);
  });

  it('should filter with multiple conditions', async () => {
    const user = await createTestUser();
    
    await createTestTransaction({ user_id: user.id, type: 'TOP_UP', status: 'SUCCESS', amount: 100 });
    await createTestTransaction({ user_id: user.id, type: 'TOP_UP', status: 'PENDING', amount: 50 });
    await createTestTransaction({ user_id: user.id, type: 'PAYMENT', status: 'SUCCESS', amount: 75 });

    const input: GetTransactionsInput = {
      type: 'TOP_UP',
      status: 'SUCCESS',
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('TOP_UP');
    expect(result[0].status).toBe('SUCCESS');
    expect(result[0].amount).toBe(100);
  });

  it('should handle pagination correctly', async () => {
    const user = await createTestUser();
    
    // Create 5 transactions
    for (let i = 1; i <= 5; i++) {
      await createTestTransaction({ user_id: user.id, amount: i * 10 });
    }

    // Get first 2 transactions
    const firstPage = await getTransactions({
      limit: 2,
      offset: 0
    });

    expect(firstPage).toHaveLength(2);

    // Get next 2 transactions
    const secondPage = await getTransactions({
      limit: 2,
      offset: 2
    });

    expect(secondPage).toHaveLength(2);

    // Verify different transactions
    expect(firstPage[0].id).not.toBe(secondPage[0].id);
  });

  it('should order transactions by created_at descending', async () => {
    const user = await createTestUser();
    
    // Create transactions with slight delay to ensure different timestamps
    const first = await createTestTransaction({ user_id: user.id, amount: 100 });
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    const second = await createTestTransaction({ user_id: user.id, amount: 200 });

    const result = await getTransactions({
      limit: 50,
      offset: 0
    });

    expect(result).toHaveLength(2);
    // Most recent transaction should be first
    expect(result[0].id).toBe(second.id);
    expect(result[1].id).toBe(first.id);
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should convert numeric amounts correctly', async () => {
    const user = await createTestUser();
    await createTestTransaction({ user_id: user.id, amount: 123.45 });

    const result = await getTransactions({
      limit: 50,
      offset: 0
    });

    expect(result).toHaveLength(1);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].amount).toBe(123.45);
  });
});
