
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserBalanceInput } from '../schema';
import { updateUserBalance } from '../handlers/update_user_balance';
import { eq } from 'drizzle-orm';

// Test input for balance update
const testBalanceInput: UpdateUserBalanceInput = {
  user_id: 1,
  amount: 150.75
};

describe('updateUserBalance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user balance', async () => {
    // Create a user directly in database for testing
    const createdUsers = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: '1234567890',
        role: 'USER',
        account_status: 'ACTIVE',
        balance: '0.00'
      })
      .returning()
      .execute();

    const createdUser = createdUsers[0];

    // Update the balance
    const result = await updateUserBalance({
      user_id: createdUser.id,
      amount: 150.75
    });

    // Verify the response
    expect(result.id).toEqual(createdUser.id);
    expect(result.balance).toEqual(150.75);
    expect(typeof result.balance).toBe('number');
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated balance to database', async () => {
    // Create a user directly in database
    const createdUsers = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        full_name: 'Test User 2',
        phone_number: '1234567891',
        role: 'USER',
        account_status: 'ACTIVE',
        balance: '0.00'
      })
      .returning()
      .execute();

    const createdUser = createdUsers[0];

    // Update the balance
    await updateUserBalance({
      user_id: createdUser.id,
      amount: 250.50
    });

    // Query database to verify the update
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(parseFloat(users[0].balance)).toEqual(250.50);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle zero balance update', async () => {
    // Create a user directly in database
    const createdUsers = await db.insert(usersTable)
      .values({
        username: 'testuser3',
        email: 'test3@example.com',
        full_name: 'Test User 3',
        phone_number: '1234567892',
        role: 'USER',
        account_status: 'ACTIVE',
        balance: '100.00'
      })
      .returning()
      .execute();

    const createdUser = createdUsers[0];

    // Update balance to zero
    const result = await updateUserBalance({
      user_id: createdUser.id,
      amount: 0
    });

    expect(result.balance).toEqual(0);
    expect(typeof result.balance).toBe('number');
  });

  it('should handle large balance amounts', async () => {
    // Create a user directly in database
    const createdUsers = await db.insert(usersTable)
      .values({
        username: 'testuser4',
        email: 'test4@example.com',
        full_name: 'Test User 4',
        phone_number: '1234567893',
        role: 'USER',
        account_status: 'ACTIVE',
        balance: '0.00'
      })
      .returning()
      .execute();

    const createdUser = createdUsers[0];

    // Update with large amount
    const largeAmount = 999999.99;
    const result = await updateUserBalance({
      user_id: createdUser.id,
      amount: largeAmount
    });

    expect(result.balance).toEqual(largeAmount);
    expect(typeof result.balance).toBe('number');
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;

    await expect(updateUserBalance({
      user_id: nonExistentUserId,
      amount: 100
    })).rejects.toThrow(/user with id.*not found/i);
  });

  it('should update timestamp when balance changes', async () => {
    // Create a user directly in database
    const createdUsers = await db.insert(usersTable)
      .values({
        username: 'testuser5',
        email: 'test5@example.com',
        full_name: 'Test User 5',
        phone_number: '1234567894',
        role: 'USER',
        account_status: 'ACTIVE',
        balance: '0.00'
      })
      .returning()
      .execute();

    const createdUser = createdUsers[0];
    const originalUpdatedAt = createdUser.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update the balance
    const result = await updateUserBalance({
      user_id: createdUser.id,
      amount: 100
    });

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
