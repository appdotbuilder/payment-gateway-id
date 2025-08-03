
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, usersTable } from '../db/schema';
import { type UpdateTransactionStatusInput, type CreateUserInput, type CreateTransactionInput } from '../schema';
import { updateTransactionStatus } from '../handlers/update_transaction_status';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async (): Promise<number> => {
  const result = await db.insert(usersTable)
    .values({
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      phone_number: '1234567890',
      role: 'USER',
      account_status: 'ACTIVE',
      balance: '1000.00'
    })
    .returning()
    .execute();
  
  return result[0].id;
};

// Helper function to create a test transaction
const createTestTransaction = async (userId: number, type: 'TOP_UP' | 'PAYMENT' | 'WITHDRAWAL' = 'TOP_UP', amount: number = 500): Promise<number> => {
  const result = await db.insert(transactionsTable)
    .values({
      user_id: userId,
      type,
      amount: amount.toString(),
      status: 'PENDING',
      payment_method: 'DANA',
      description: 'Test transaction',
      reference_id: 'REF123'
    })
    .returning()
    .execute();
  
  return result[0].id;
};

describe('updateTransactionStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update transaction status to SUCCESS', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    const input: UpdateTransactionStatusInput = {
      id: transactionId,
      status: 'SUCCESS'
    };

    const result = await updateTransactionStatus(input);

    expect(result.id).toEqual(transactionId);
    expect(result.status).toEqual('SUCCESS');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.amount).toBe('number');
  });

  it('should update user balance for successful TOP_UP transaction', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId, 'TOP_UP', 500);

    const input: UpdateTransactionStatusInput = {
      id: transactionId,
      status: 'SUCCESS'
    };

    await updateTransactionStatus(input);

    // Check if user balance increased
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(parseFloat(users[0].balance)).toEqual(1500.00); // 1000 + 500
  });

  it('should update user balance for successful PAYMENT transaction', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId, 'PAYMENT', 300);

    const input: UpdateTransactionStatusInput = {
      id: transactionId,
      status: 'SUCCESS'
    };

    await updateTransactionStatus(input);

    // Check if user balance decreased
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(parseFloat(users[0].balance)).toEqual(700.00); // 1000 - 300
  });

  it('should update user balance for successful WITHDRAWAL transaction', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId, 'WITHDRAWAL', 200);

    const input: UpdateTransactionStatusInput = {
      id: transactionId,
      status: 'SUCCESS'
    };

    await updateTransactionStatus(input);

    // Check if user balance decreased
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(parseFloat(users[0].balance)).toEqual(800.00); // 1000 - 200
  });

  it('should not update balance for FAILED transaction', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId, 'TOP_UP', 500);

    const input: UpdateTransactionStatusInput = {
      id: transactionId,
      status: 'FAILED'
    };

    await updateTransactionStatus(input);

    // Check if user balance remained unchanged
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(parseFloat(users[0].balance)).toEqual(1000.00); // Original balance
  });

  it('should throw error for insufficient balance on PAYMENT', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId, 'PAYMENT', 1500); // More than balance

    const input: UpdateTransactionStatusInput = {
      id: transactionId,
      status: 'SUCCESS'
    };

    await expect(updateTransactionStatus(input)).rejects.toThrow(/insufficient balance/i);
  });

  it('should throw error for non-existent transaction', async () => {
    const input: UpdateTransactionStatusInput = {
      id: 99999,
      status: 'SUCCESS'
    };

    await expect(updateTransactionStatus(input)).rejects.toThrow(/transaction.*not found/i);
  });

  it('should throw error when updating already processed transaction', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    // First update to SUCCESS
    await updateTransactionStatus({
      id: transactionId,
      status: 'SUCCESS'
    });

    // Try to update again
    const input: UpdateTransactionStatusInput = {
      id: transactionId,
      status: 'FAILED'
    };

    await expect(updateTransactionStatus(input)).rejects.toThrow(/already processed/i);
  });

  it('should save updated status to database', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    const input: UpdateTransactionStatusInput = {
      id: transactionId,
      status: 'CANCELLED'
    };

    await updateTransactionStatus(input);

    // Verify in database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].status).toEqual('CANCELLED');
    expect(transactions[0].updated_at).toBeInstanceOf(Date);
  });
});
