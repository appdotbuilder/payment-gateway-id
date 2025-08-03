
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserBalanceInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUserBalance = async (input: UpdateUserBalanceInput): Promise<User> => {
  try {
    // First, verify the user exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUsers.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Update the user's balance
    const result = await db.update(usersTable)
      .set({
        balance: input.amount.toString(), // Convert number to string for numeric column
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.user_id))
      .returning()
      .execute();

    // Convert numeric field back to number before returning
    const user = result[0];
    return {
      ...user,
      balance: parseFloat(user.balance) // Convert string back to number
    };
  } catch (error) {
    console.error('User balance update failed:', error);
    throw error;
  }
};
