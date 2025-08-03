
import { db } from '../db';
import { transactionsTable, usersTable } from '../db/schema';
import { type UpdateTransactionStatusInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTransactionStatus = async (input: UpdateTransactionStatusInput): Promise<Transaction> => {
  try {
    // Start a database transaction for atomic operations
    return await db.transaction(async (tx) => {
      // First, get the current transaction details
      const existingTransactions = await tx.select()
        .from(transactionsTable)
        .where(eq(transactionsTable.id, input.id))
        .execute();

      if (existingTransactions.length === 0) {
        throw new Error(`Transaction with ID ${input.id} not found`);
      }

      const existingTransaction = existingTransactions[0];

      // Prevent updating already processed transactions
      if (existingTransaction.status === 'SUCCESS' || existingTransaction.status === 'FAILED') {
        throw new Error(`Cannot update transaction ${input.id}: already processed with status ${existingTransaction.status}`);
      }

      // Update the transaction status
      const updatedTransactions = await tx.update(transactionsTable)
        .set({
          status: input.status,
          updated_at: new Date()
        })
        .where(eq(transactionsTable.id, input.id))
        .returning()
        .execute();

      const updatedTransaction = updatedTransactions[0];

      // Handle balance updates for successful transactions
      if (input.status === 'SUCCESS') {
        const amount = parseFloat(existingTransaction.amount);
        let balanceChange = 0;

        // Calculate balance change based on transaction type
        switch (existingTransaction.type) {
          case 'TOP_UP':
            balanceChange = amount; // Add to balance
            break;
          case 'PAYMENT':
          case 'WITHDRAWAL':
            balanceChange = -amount; // Subtract from balance
            break;
        }

        // Update user balance if there's a change needed
        if (balanceChange !== 0) {
          // Get current user balance to validate withdrawal/payment operations
          const users = await tx.select()
            .from(usersTable)
            .where(eq(usersTable.id, existingTransaction.user_id))
            .execute();

          if (users.length === 0) {
            throw new Error(`User with ID ${existingTransaction.user_id} not found`);
          }

          const currentBalance = parseFloat(users[0].balance);

          // Check if user has sufficient balance for payments/withdrawals
          if (balanceChange < 0 && currentBalance + balanceChange < 0) {
            throw new Error(`Insufficient balance for transaction ${input.id}`);
          }

          // Update the user's balance
          await tx.update(usersTable)
            .set({
              balance: (currentBalance + balanceChange).toString(),
              updated_at: new Date()
            })
            .where(eq(usersTable.id, existingTransaction.user_id))
            .execute();
        }
      }

      // Return the updated transaction with numeric conversion
      return {
        ...updatedTransaction,
        amount: parseFloat(updatedTransaction.amount)
      };
    });
  } catch (error) {
    console.error('Transaction status update failed:', error);
    throw error;
  }
};
