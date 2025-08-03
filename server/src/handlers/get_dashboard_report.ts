
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type GetReportInput, type ReportData } from '../schema';
import { and, eq, gte, lte, count, sum, sql } from 'drizzle-orm';

export const getDashboardReport = async (input: GetReportInput): Promise<ReportData> => {
  try {
    // Calculate date range based on period and optional dates
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (input.start_date && input.end_date) {
      startDate = new Date(input.start_date);
      endDate = new Date(input.end_date);
    } else {
      // Calculate period-based date range
      endDate = now;
      switch (input.period) {
        case 'DAILY':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'WEEKLY':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 6); // Last 7 days
          break;
        case 'MONTHLY':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    // Build date range conditions
    const dateConditions = and(
      gte(transactionsTable.created_at, startDate),
      lte(transactionsTable.created_at, endDate)
    );

    // Get transaction summaries by type
    const transactionSummaries = await db
      .select({
        type: transactionsTable.type,
        total_amount: sum(transactionsTable.amount),
        transaction_count: count(transactionsTable.id)
      })
      .from(transactionsTable)
      .where(and(dateConditions, eq(transactionsTable.status, 'SUCCESS')))
      .groupBy(transactionsTable.type)
      .execute();

    // Initialize totals
    let totalTopUp = 0;
    let totalPayments = 0;
    let totalWithdrawals = 0;
    let transactionCount = 0;

    // Process transaction summaries
    transactionSummaries.forEach(summary => {
      const amount = parseFloat(summary.total_amount || '0');
      const count = summary.transaction_count;

      transactionCount += count;

      switch (summary.type) {
        case 'TOP_UP':
          totalTopUp = amount;
          break;
        case 'PAYMENT':
          totalPayments = amount;
          break;
        case 'WITHDRAWAL':
          totalWithdrawals = amount;
          break;
      }
    });

    // Calculate net revenue (top-ups + payments - withdrawals)
    const netRevenue = totalTopUp + totalPayments - totalWithdrawals;

    // Count active users (users who made at least one successful transaction in the period)
    const activeUsersResult = await db
      .select({
        count: sql<string>`count(distinct ${transactionsTable.user_id})`
      })
      .from(transactionsTable)
      .where(and(dateConditions, eq(transactionsTable.status, 'SUCCESS')))
      .execute();

    const activeUsersCount = parseInt(activeUsersResult[0]?.count || '0');

    return {
      total_top_up: totalTopUp,
      total_payments: totalPayments,
      total_withdrawals: totalWithdrawals,
      transaction_count: transactionCount,
      net_revenue: netRevenue,
      active_users_count: activeUsersCount,
      period: input.period,
      start_date: startDate,
      end_date: endDate
    };
  } catch (error) {
    console.error('Dashboard report generation failed:', error);
    throw error;
  }
};
