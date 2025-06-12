
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignInInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const signIn = async (input: SignInInput): Promise<AuthResponse> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Verify password (in real app, use bcrypt.compare)
    if (user.password_hash !== input.password) {
      throw new Error('Invalid credentials');
    }

    // Generate token (in real app, use JWT)
    const token = `token_${user.id}_${Date.now()}`;

    return {
      user: {
        id: user.id,
        email: user.email
      },
      token
    };
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
};
