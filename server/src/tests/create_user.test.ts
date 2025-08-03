
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, createUserInputSchema } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  username: 'testuser123',
  email: 'test@example.com',
  full_name: 'Test User',
  phone_number: '1234567890',
  role: 'USER'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser123');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.phone_number).toEqual('1234567890');
    expect(result.role).toEqual('USER');
    expect(result.account_status).toEqual('ACTIVE');
    expect(result.balance).toEqual(0);
    expect(typeof result.balance).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with default role when not specified', async () => {
    // Parse the input without role to let Zod apply the default
    const rawInput = {
      username: 'testuser456',
      email: 'test2@example.com',
      full_name: 'Test User 2',
      phone_number: '0987654321'
    };
    
    const parsedInput = createUserInputSchema.parse(rawInput);
    const result = await createUser(parsedInput);

    expect(result.role).toEqual('USER');
    expect(result.username).toEqual('testuser456');
  });

  it('should create an admin user when role is specified', async () => {
    const adminInput: CreateUserInput = {
      ...testInput,
      username: 'admin123',
      email: 'admin@example.com',
      role: 'ADMIN'
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('ADMIN');
    expect(result.username).toEqual('admin123');
    expect(result.email).toEqual('admin@example.com');
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser123');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].phone_number).toEqual('1234567890');
    expect(users[0].role).toEqual('USER');
    expect(users[0].account_status).toEqual('ACTIVE');
    expect(parseFloat(users[0].balance)).toEqual(0);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate username', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create user with same username but different email
    const duplicateUsernameInput: CreateUserInput = {
      ...testInput,
      email: 'different@example.com'
    };

    await expect(createUser(duplicateUsernameInput))
      .rejects.toThrow(/unique constraint/i);
  });

  it('should reject duplicate email', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create user with same email but different username
    const duplicateEmailInput: CreateUserInput = {
      ...testInput,
      username: 'differentuser'
    };

    await expect(createUser(duplicateEmailInput))
      .rejects.toThrow(/unique constraint/i);
  });

  it('should handle minimum length validations', async () => {
    const validInput: CreateUserInput = {
      username: 'abc', // minimum 3 characters
      email: 'a@b.co',
      full_name: 'A', // minimum 1 character
      phone_number: '1234567890', // minimum 10 characters
      role: 'USER'
    };

    const result = await createUser(validInput);

    expect(result.username).toEqual('abc');
    expect(result.full_name).toEqual('A');
    expect(result.phone_number).toEqual('1234567890');
  });
});
