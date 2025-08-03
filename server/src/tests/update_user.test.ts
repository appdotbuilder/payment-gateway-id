
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Helper to create a test user
const createTestUser = async (): Promise<number> => {
  const testUser: CreateUserInput = {
    username: 'testuser',
    email: 'test@example.com',
    full_name: 'Test User',
    phone_number: '1234567890',
    role: 'USER'
  };

  const result = await db.insert(usersTable)
    .values({
      username: testUser.username,
      email: testUser.email,
      full_name: testUser.full_name,
      phone_number: testUser.phone_number,
      role: testUser.role,
      balance: '100.00'
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user fields', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'updateduser',
      email: 'updated@example.com',
      full_name: 'Updated User',
      phone_number: '9876543210',
      account_status: 'SUSPENDED'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('updateduser');
    expect(result.email).toEqual('updated@example.com');
    expect(result.full_name).toEqual('Updated User');
    expect(result.phone_number).toEqual('9876543210');
    expect(result.account_status).toEqual('SUSPENDED');
    expect(result.role).toEqual('USER'); // Should remain unchanged
    expect(result.balance).toEqual(100.00); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'partialupdate',
      account_status: 'BLOCKED'
    };

    const result = await updateUser(updateInput);

    expect(result.username).toEqual('partialupdate');
    expect(result.account_status).toEqual('BLOCKED');
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
    expect(result.phone_number).toEqual('1234567890'); // Should remain unchanged
  });

  it('should save changes to database', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'dbtest',
      email: 'dbtest@example.com'
    };

    await updateUser(updateInput);

    // Verify changes in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('dbtest');
    expect(users[0].email).toEqual('dbtest@example.com');
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999,
      username: 'nonexistent'
    };

    expect(updateUser(updateInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should preserve numeric balance type', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'balancetest'
    };

    const result = await updateUser(updateInput);

    expect(typeof result.balance).toBe('number');
    expect(result.balance).toEqual(100.00);
  });

  it('should update account status for admin operations', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      account_status: 'SUSPENDED'
    };

    const result = await updateUser(updateInput);

    expect(result.account_status).toEqual('SUSPENDED');
    
    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users[0].account_status).toEqual('SUSPENDED');
  });
});
