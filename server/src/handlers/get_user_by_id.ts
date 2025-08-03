
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserById = async (id: number): Promise<User | null> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const user = results[0];
    return {
      ...user,
      balance: parseFloat(user.balance) // Convert numeric field to number
    };
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    throw error;
  }
};
