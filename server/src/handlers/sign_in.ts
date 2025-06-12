import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignInInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';
import { createHmac } from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

// Simple JWT-like implementation using Node.js crypto
function createToken(payload: { userId: number; email: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadWithExp = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };
  const payloadEncoded = Buffer.from(JSON.stringify(payloadWithExp)).toString('base64url');
  
  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');
  
  return `${header}.${payloadEncoded}.${signature}`;
}

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
    // Support both old format (direct password) and new format (hashed_password)
    const isValidPassword = user.password_hash === input.password || 
                           user.password_hash === `hashed_${input.password}`;
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT-like token
    const token = createToken({ userId: user.id, email: user.email });

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