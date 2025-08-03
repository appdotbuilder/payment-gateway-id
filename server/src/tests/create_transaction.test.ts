
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, usersTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  phone_number: '1234567890',
  role: 'USER' as const,
  account_status: 'ACTIVE' as const,
  balance: '1000.00' // String for numeric column
};

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;

  beforeEach(async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = users[0].id;
  });

  it('should create a top-up transaction', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'TOP_UP',
      amount: 500.00,
      payment_method: 'DANA',
      description: 'Top up account',
      reference_id: 'REF123'
    };

    const result = await createTransaction(input);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.type).toEqual('TOP_UP');
    expect(result.amount).toEqual(500.00);
    expect(result.payment_method).toEqual('DANA');
    expect(result.description).toEqual('Top up account');
    expect(result.reference_id).toEqual('REF123');
    expect(result.status).toEqual('PENDING');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a payment transaction with sufficient balance', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'PAYMENT',
      amount: 100.00,
      payment_method: 'BANK_TRANSFER',
      description: 'Payment for service',
      reference_id: 'PAY456'
    };

    const result = await createTransaction(input);

    expect(result.user_id).toEqual(userId);
    expect(result.type).toEqual('PAYMENT');
    expect(result.amount).toEqual(100.00);
    expect(result.payment_method).toEqual('BANK_TRANSFER');
    expect(result.status).toEqual('PENDING');
  });

  it('should create a withdrawal transaction with sufficient balance', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'WITHDRAWAL',
      amount: 200.00,
      payment_method: 'CREDIT_CARD',
      description: 'Withdraw funds',
      reference_id: null
    };

    const result = await createTransaction(input);

    expect(result.user_id).toEqual(userId);
    expect(result.type).toEqual('WITHDRAWAL');
    expect(result.amount).toEqual(200.00);
    expect(result.payment_method).toEqual('CREDIT_CARD');
    expect(result.description).toEqual('Withdraw funds');
    expect(result.reference_id).toBeNull();
    expect(result.status).toEqual('PENDING');
  });

  it('should save transaction to database', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'TOP_UP',
      amount: 300.00,
      payment_method: 'DANA',
      description: 'Test transaction',
      reference_id: 'TEST789'
    };

    const result = await createTransaction(input);

    // Query using proper drizzle syntax
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(userId);
    expect(transactions[0].type).toEqual('TOP_UP');
    expect(parseFloat(transactions[0].amount)).toEqual(300.00);
    expect(transactions[0].payment_method).toEqual('DANA');
    expect(transactions[0].description).toEqual('Test transaction');
    expect(transactions[0].reference_id).toEqual('TEST789');
    expect(transactions[0].status).toEqual('PENDING');
    expect(transactions[0].created_at).toBeInstanceOf(Date);
  });

  it('should create transaction with minimal fields', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'TOP_UP',
      amount: 150.00,
      payment_method: 'DANA'
    };

    const result = await createTransaction(input);

    expect(result.user_id).toEqual(userId);
    expect(result.type).toEqual('TOP_UP');
    expect(result.amount).toEqual(150.00);
    expect(result.payment_method).toEqual('DANA');
    expect(result.description).toBeNull();
    expect(result.reference_id).toBeNull();
    expect(result.status).toEqual('PENDING');
  });

  it('should throw error for non-existent user', async () => {
    const input: CreateTransactionInput = {
      user_id: 99999, // Non-existent user ID
      type: 'TOP_UP',
      amount: 100.00,
      payment_method: 'DANA'
    };

    await expect(createTransaction(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for payment with insufficient balance', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'PAYMENT',
      amount: 1500.00, // More than user's balance of 1000.00
      payment_method: 'BANK_TRANSFER'
    };

    await expect(createTransaction(input)).rejects.toThrow(/insufficient balance/i);
  });

  it('should throw error for withdrawal with insufficient balance', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'WITHDRAWAL',
      amount: 2000.00, // More than user's balance of 1000.00
      payment_method: 'CREDIT_CARD'
    };

    await expect(createTransaction(input)).rejects.toThrow(/insufficient balance/i);
  });

  it('should allow payment with exact balance', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'PAYMENT',
      amount: 1000.00, // Exact balance
      payment_method: 'BANK_TRANSFER'
    };

    const result = await createTransaction(input);

    expect(result.amount).toEqual(1000.00);
    expect(result.type).toEqual('PAYMENT');
    expect(result.status).toEqual('PENDING');
  });
});
