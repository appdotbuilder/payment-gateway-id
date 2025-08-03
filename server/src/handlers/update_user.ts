
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // Check if user exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUsers.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.username !== undefined) {
      updateData.username = input.username;
    }
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }
    if (input.phone_number !== undefined) {
      updateData.phone_number = input.phone_number;
    }
    if (input.account_status !== undefined) {
      updateData.account_status = input.account_status;
    }

    // Update user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const user = result[0];
    return {
      ...user,
      balance: parseFloat(user.balance)
    };
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};
