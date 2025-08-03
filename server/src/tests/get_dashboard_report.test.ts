
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type GetReportInput } from '../schema';
import { getDashboardReport } from '../handlers/get_dashboard_report';

const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  phone_number: '1234567890',
  role: 'USER' as const
};

const testUser2 = {
  username: 'testuser2',
  email: 'test2@example.com',
  full_name: 'Test User 2',
  phone_number: '0987654321',
  role: 'USER' as const
};

describe('getDashboardReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate report with no transactions', async () => {
    const input: GetReportInput = {
      period: 'MONTHLY'
    };

    const result = await getDashboardReport(input);

    expect(result.total_top_up).toEqual(0);
    expect(result.total_payments).toEqual(0);
    expect(result.total_withdrawals).toEqual(0);
    expect(result.transaction_count).toEqual(0);
    expect(result.net_revenue).toEqual(0);
    expect(result.active_users_count).toEqual(0);
    expect(result.period).toEqual('MONTHLY');
    expect(result.start_date).toBeInstanceOf(Date);
    expect(result.end_date).toBeInstanceOf(Date);
  });

  it('should calculate totals for successful transactions', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser, testUser2])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create test transactions
    await db.insert(transactionsTable)
      .values([
        {
          user_id: user1Id,
          type: 'TOP_UP',
          amount: '100.00',
          status: 'SUCCESS',
          payment_method: 'DANA'
        },
        {
          user_id: user1Id,
          type: 'PAYMENT',
          amount: '50.00',
          status: 'SUCCESS',
          payment_method: 'DANA'
        },
        {
          user_id: user2Id,
          type: 'WITHDRAWAL',
          amount: '25.00',
          status: 'SUCCESS',
          payment_method: 'BANK_TRANSFER'
        },
        {
          user_id: user2Id,
          type: 'TOP_UP',
          amount: '200.00',
          status: 'FAILED',
          payment_method: 'DANA'
        }
      ])
      .execute();

    const input: GetReportInput = {
      period: 'MONTHLY'
    };

    const result = await getDashboardReport(input);

    expect(result.total_top_up).toEqual(100);
    expect(result.total_payments).toEqual(50);
    expect(result.total_withdrawals).toEqual(25);
    expect(result.transaction_count).toEqual(3); // Only successful transactions
    expect(result.net_revenue).toEqual(125); // 100 + 50 - 25
    expect(result.active_users_count).toEqual(2); // Both users had successful transactions
    expect(result.period).toEqual('MONTHLY');
  });

  it('should filter by custom date range', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values([testUser])
      .returning()
      .execute();

    const userId = users[0].id;

    // Create transaction outside date range
    const oldDate = new Date('2023-01-01');
    await db.execute(`
      INSERT INTO transactions (user_id, type, amount, status, payment_method, created_at)
      VALUES (${userId}, 'TOP_UP', '100.00', 'SUCCESS', 'DANA', '${oldDate.toISOString()}')
    `);

    // Create transaction within date range
    const recentDate = new Date();
    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          type: 'PAYMENT',
          amount: '50.00',
          status: 'SUCCESS',
          payment_method: 'DANA'
        }
      ])
      .execute();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);

    const input: GetReportInput = {
      period: 'DAILY',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    };

    const result = await getDashboardReport(input);

    expect(result.total_top_up).toEqual(0); // Old transaction filtered out
    expect(result.total_payments).toEqual(50); // Recent transaction included
    expect(result.transaction_count).toEqual(1);
    expect(result.active_users_count).toEqual(1);
  });

  it('should handle different report periods correctly', async () => {
    const weeklyInput: GetReportInput = {
      period: 'WEEKLY'
    };

    const result = await getDashboardReport(weeklyInput);

    expect(result.period).toEqual('WEEKLY');
    expect(result.start_date).toBeInstanceOf(Date);
    expect(result.end_date).toBeInstanceOf(Date);

    // Verify weekly period is roughly 7 days
    const daysDiff = Math.abs(result.end_date.getTime() - result.start_date.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThanOrEqual(6);
    expect(daysDiff).toBeLessThanOrEqual(7);
  });

  it('should only count successful transactions for active users', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values([testUser])
      .returning()
      .execute();

    const userId = users[0].id;

    // Create failed and pending transactions
    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          type: 'TOP_UP',
          amount: '100.00',
          status: 'FAILED',
          payment_method: 'DANA'
        },
        {
          user_id: userId,
          type: 'PAYMENT',
          amount: '50.00',
          status: 'PENDING',
          payment_method: 'DANA'
        }
      ])
      .execute();

    const input: GetReportInput = {
      period: 'MONTHLY'
    };

    const result = await getDashboardReport(input);

    expect(result.total_top_up).toEqual(0);
    expect(result.total_payments).toEqual(0);
    expect(result.transaction_count).toEqual(0);
    expect(result.active_users_count).toEqual(0); // No successful transactions
  });
});
