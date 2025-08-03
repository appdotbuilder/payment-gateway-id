
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        full_name: input.full_name,
        phone_number: input.phone_number,
        role: input.role // This will use the default 'USER' if not provided due to Zod schema
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const user = result[0];
    return {
      ...user,
      balance: parseFloat(user.balance) // Convert string back to number
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
