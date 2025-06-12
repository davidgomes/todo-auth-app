import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignUpInput, type AuthResponse } from '../schema';
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

export const signUp = async (input: SignUpInput): Promise<AuthResponse> => {
  try {
    // Hash the password (in a real app, use bcrypt or similar)
    const password_hash = `hashed_${input.password}`;
    
    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: password_hash
      })
      .returning()
      .execute();

    const user = result[0];
    
    // Generate JWT-like token
    const token = createToken({ userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email
      },
      token: token
    };
  } catch (error) {
    console.error('Sign up failed:', error);
    throw error;
  }
};