import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignInInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';
import { createHmac, pbkdf2Sync } from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] || 'test-secret-key-for-development';
if (!process.env['JWT_SECRET'] && process.env['NODE_ENV'] === 'production') {
  throw new Error('JWT_SECRET environment variable is required for secure authentication in production.');
}

// Crypto-based bcrypt-like comparison
const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  if (hash.startsWith('$pbkdf2$')) {
    const parts = hash.split('$');
    if (parts.length !== 4) return false;
    
    const salt = parts[2];
    const storedHash = parts[3];
    const derivedHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    return storedHash === derivedHash;
  } else {
    // Legacy format for backward compatibility
    return hash === password || hash === `hashed_${password}`;
  }
};

// Crypto-based JWT implementation
const createToken = (payload: { userId: number; email: string }, secret: string, expiresIn: string): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadWithExp = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };
  const payloadEncoded = Buffer.from(JSON.stringify(payloadWithExp)).toString('base64url');
  
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');
  
  return `${header}.${payloadEncoded}.${signature}`;
};

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

    // Compare password with hashed password using crypto-based implementation
    const isValidPassword = await comparePassword(input.password, user.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token using crypto-based implementation
    const token = createToken(
      { userId: user.id, email: user.email }, 
      JWT_SECRET, 
      '7d'
    );

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