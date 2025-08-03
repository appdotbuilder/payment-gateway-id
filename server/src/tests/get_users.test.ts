
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user inputs
const testUser1: CreateUserInput = {
  username: 'testuser1',
  email: 'test1@example.com',
  full_name: 'Test User One',
  phone_number: '1234567890',
  role: 'USER'
};

const testUser2: CreateUserInput = {
  username: 'adminuser',
  email: 'admin@example.com',
  full_name: 'Admin User',
  phone_number: '0987654321',
  role: 'ADMIN'
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users with correct data types', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        username: testUser1.username,
        email: testUser1.email,
        full_name: testUser1.full_name,
        phone_number: testUser1.phone_number,
        role: testUser1.role,
        balance: '100.50' // Insert as string for numeric column
      },
      {
        username: testUser2.username,
        email: testUser2.email,
        full_name: testUser2.full_name,
        phone_number: testUser2.phone_number,
        role: testUser2.role,
        balance: '250.75' // Insert as string for numeric column
      }
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Verify first user
    const user1 = result.find(u => u.username === 'testuser1');
    expect(user1).toBeDefined();
    expect(user1!.email).toEqual('test1@example.com');
    expect(user1!.full_name).toEqual('Test User One');
    expect(user1!.phone_number).toEqual('1234567890');
    expect(user1!.role).toEqual('USER');
    expect(user1!.account_status).toEqual('ACTIVE');
    expect(user1!.balance).toEqual(100.50);
    expect(typeof user1!.balance).toEqual('number');
    expect(user1!.id).toBeDefined();
    expect(user1!.created_at).toBeInstanceOf(Date);
    expect(user1!.updated_at).toBeInstanceOf(Date);

    // Verify second user
    const user2 = result.find(u => u.username === 'adminuser');
    expect(user2).toBeDefined();
    expect(user2!.email).toEqual('admin@example.com');
    expect(user2!.full_name).toEqual('Admin User');
    expect(user2!.phone_number).toEqual('0987654321');
    expect(user2!.role).toEqual('ADMIN');
    expect(user2!.account_status).toEqual('ACTIVE');
    expect(user2!.balance).toEqual(250.75);
    expect(typeof user2!.balance).toEqual('number');
    expect(user2!.id).toBeDefined();
    expect(user2!.created_at).toBeInstanceOf(Date);
    expect(user2!.updated_at).toBeInstanceOf(Date);
  });

  it('should return users with different account statuses', async () => {
    // Create users with different statuses
    await db.insert(usersTable).values([
      {
        username: 'activeuser',
        email: 'active@example.com',
        full_name: 'Active User',
        phone_number: '1111111111',
        role: 'USER',
        account_status: 'ACTIVE',
        balance: '0.00'
      },
      {
        username: 'suspendeduser',
        email: 'suspended@example.com',
        full_name: 'Suspended User',
        phone_number: '2222222222',
        role: 'USER',
        account_status: 'SUSPENDED',
        balance: '50.00'
      },
      {
        username: 'blockeduser',
        email: 'blocked@example.com',
        full_name: 'Blocked User',
        phone_number: '3333333333',
        role: 'USER',
        account_status: 'BLOCKED',
        balance: '25.25'
      }
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);

    const activeUser = result.find(u => u.account_status === 'ACTIVE');
    const suspendedUser = result.find(u => u.account_status === 'SUSPENDED');
    const blockedUser = result.find(u => u.account_status === 'BLOCKED');

    expect(activeUser).toBeDefined();
    expect(activeUser!.balance).toEqual(0);
    expect(suspendedUser).toBeDefined();
    expect(suspendedUser!.balance).toEqual(50);
    expect(blockedUser).toBeDefined();
    expect(blockedUser!.balance).toEqual(25.25);
  });
});
