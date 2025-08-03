
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export const getUsers = async (): Promise<User[]> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(user => ({
      ...user,
      balance: parseFloat(user.balance) // Convert string back to number
    }));
  } catch (error) {
    console.error('Get users failed:', error);
    throw error;
  }
};
