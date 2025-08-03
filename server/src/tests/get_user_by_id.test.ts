
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';

const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  phone_number: '1234567890',
  role: 'USER'
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create a test user first
    const insertResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        full_name: testUser.full_name,
        phone_number: testUser.phone_number,
        role: testUser.role,
        balance: '100.50' // Insert as string for numeric column
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];
    
    // Test the handler
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdUser.id);
    expect(result!.username).toBe('testuser');
    expect(result!.email).toBe('test@example.com');
    expect(result!.full_name).toBe('Test User');
    expect(result!.phone_number).toBe('1234567890');
    expect(result!.role).toBe('USER');
    expect(result!.account_status).toBe('ACTIVE');
    expect(result!.balance).toBe(100.50); // Should be converted to number
    expect(typeof result!.balance).toBe('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const result = await getUserById(999);
    
    expect(result).toBeNull();
  });

  it('should handle zero balance correctly', async () => {
    // Create user with zero balance
    const insertResult = await db.insert(usersTable)
      .values({
        username: 'zerouser',
        email: 'zero@example.com',
        full_name: 'Zero User',
        phone_number: '0987654321',
        role: 'USER',
        balance: '0.00'
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.balance).toBe(0);
    expect(typeof result!.balance).toBe('number');
  });

  it('should return user with admin role', async () => {
    // Create admin user
    const insertResult = await db.insert(usersTable)
      .values({
        username: 'adminuser',
        email: 'admin@example.com',
        full_name: 'Admin User',
        phone_number: '5555555555',
        role: 'ADMIN',
        balance: '250.75'
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.role).toBe('ADMIN');
    expect(result!.balance).toBe(250.75);
  });
});
