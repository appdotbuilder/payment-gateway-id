
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type GetUserTransactionsInput, type CreateUserInput, type CreateTransactionInput } from '../schema';
import { getUserTransactions } from '../handlers/get_user_transactions';
import { eq } from 'drizzle-orm';

// Test helper to create a user
const createTestUser = async (userData: CreateUserInput) => {
  const result = await db.insert(usersTable)
    .values({
      username: userData.username,
      email: userData.email,
      full_name: userData.full_name,
      phone_number: userData.phone_number,
      role: userData.role || 'USER'
    })
    .returning()
    .execute();
  
  return {
    ...result[0],
    balance: parseFloat(result[0].balance)
  };
};

// Test helper to create a transaction
const createTestTransaction = async (transactionData: CreateTransactionInput) => {
  const result = await db.insert(transactionsTable)
    .values({
      user_id: transactionData.user_id,
      type: transactionData.type,
      amount: transactionData.amount.toString(),
      payment_method: transactionData.payment_method,
      description: transactionData.description || null,
      reference_id: transactionData.reference_id || null
    })
    .returning()
    .execute();
  
  return {
    ...result[0],
    amount: parseFloat(result[0].amount)
  };
};

const testUserInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  phone_number: '1234567890',
  role: 'USER'
};

describe('getUserTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get transactions for a user with default pagination', async () => {
    // Create test user
    const user = await createTestUser(testUserInput);

    // Create test transactions
    await createTestTransaction({
      user_id: user.id,
      type: 'TOP_UP',
      amount: 100.00,
      payment_method: 'DANA'
    });

    await createTestTransaction({
      user_id: user.id,
      type: 'PAYMENT',
      amount: 50.00,
      payment_method: 'CREDIT_CARD'
    });

    const input: GetUserTransactionsInput = {
      user_id: user.id,
      limit: 50,
      offset: 0
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[1].user_id).toEqual(user.id);
    
    // Verify numeric conversion
    expect(typeof result[0].amount).toBe('number');
    expect(typeof result[1].amount).toBe('number');
    
    // Should be ordered by created_at desc (newest first)
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should filter transactions by type', async () => {
    // Create test user
    const user = await createTestUser(testUserInput);

    // Create transactions of different types
    await createTestTransaction({
      user_id: user.id,
      type: 'TOP_UP',
      amount: 100.00,
      payment_method: 'DANA'
    });

    await createTestTransaction({
      user_id: user.id,
      type: 'PAYMENT',
      amount: 50.00,
      payment_method: 'CREDIT_CARD'
    });

    const input: GetUserTransactionsInput = {
      user_id: user.id,
      type: 'TOP_UP',
      limit: 50,
      offset: 0
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].type).toEqual('TOP_UP');
    expect(result[0].amount).toEqual(100.00);
  });

  it('should filter transactions by status', async () => {
    // Create test user
    const user = await createTestUser(testUserInput);

    // Create transactions with different statuses
    const transaction1 = await createTestTransaction({
      user_id: user.id,
      type: 'TOP_UP',
      amount: 100.00,
      payment_method: 'DANA'
    });

    // Update one transaction to SUCCESS status
    await db.update(transactionsTable)
      .set({ status: 'SUCCESS' })
      .where(eq(transactionsTable.id, transaction1.id))
      .execute();

    await createTestTransaction({
      user_id: user.id,
      type: 'PAYMENT',
      amount: 50.00,
      payment_method: 'CREDIT_CARD'
    });

    const input: GetUserTransactionsInput = {
      user_id: user.id,
      status: 'SUCCESS',
      limit: 50,
      offset: 0
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('SUCCESS');
    expect(result[0].amount).toEqual(100.00);
  });

  it('should apply pagination correctly', async () => {
    // Create test user
    const user = await createTestUser(testUserInput);

    // Create multiple transactions
    for (let i = 0; i < 5; i++) {
      await createTestTransaction({
        user_id: user.id,
        type: 'TOP_UP',
        amount: 10.00 * (i + 1),
        payment_method: 'DANA'
      });
    }

    const input: GetUserTransactionsInput = {
      user_id: user.id,
      limit: 2,
      offset: 1
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(2);
    
    // Verify we got the correct page (should skip the first newest transaction)
    expect(result[0].user_id).toEqual(user.id);
    expect(result[1].user_id).toEqual(user.id);
  });

  it('should return empty array for user with no transactions', async () => {
    // Create test user
    const user = await createTestUser(testUserInput);

    const input: GetUserTransactionsInput = {
      user_id: user.id,
      limit: 50,
      offset: 0
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(0);
  });

  it('should not return transactions from other users', async () => {
    // Create two test users
    const user1 = await createTestUser(testUserInput);
    const user2 = await createTestUser({
      ...testUserInput,
      username: 'testuser2',
      email: 'test2@example.com'
    });

    // Create transactions for both users
    await createTestTransaction({
      user_id: user1.id,
      type: 'TOP_UP',
      amount: 100.00,
      payment_method: 'DANA'
    });

    await createTestTransaction({
      user_id: user2.id,
      type: 'PAYMENT',
      amount: 50.00,
      payment_method: 'CREDIT_CARD'
    });

    const input: GetUserTransactionsInput = {
      user_id: user1.id,
      limit: 50,
      offset: 0
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1.id);
    expect(result[0].type).toEqual('TOP_UP');
  });

  it('should combine type and status filters', async () => {
    // Create test user
    const user = await createTestUser(testUserInput);

    // Create various transactions
    const transaction1 = await createTestTransaction({
      user_id: user.id,
      type: 'TOP_UP',
      amount: 100.00,
      payment_method: 'DANA'
    });

    await createTestTransaction({
      user_id: user.id,
      type: 'PAYMENT',
      amount: 50.00,
      payment_method: 'CREDIT_CARD'
    });

    // Update first transaction to SUCCESS
    await db.update(transactionsTable)
      .set({ status: 'SUCCESS' })
      .where(eq(transactionsTable.id, transaction1.id))
      .execute();

    const input: GetUserTransactionsInput = {
      user_id: user.id,
      type: 'TOP_UP',
      status: 'SUCCESS',
      limit: 50,
      offset: 0
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].type).toEqual('TOP_UP');
    expect(result[0].status).toEqual('SUCCESS');
    expect(result[0].amount).toEqual(100.00);
  });
});
