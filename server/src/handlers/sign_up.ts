import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignUpInput, type AuthResponse } from '../schema';
import { createHmac, randomBytes, pbkdf2Sync } from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] || 'test-secret-key-for-development';
if (!process.env['JWT_SECRET'] && process.env['NODE_ENV'] === 'production') {
  throw new Error('JWT_SECRET environment variable is required for secure authentication in production.');
}

// Crypto-based bcrypt-like implementation
const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `$pbkdf2$${salt}$${hash}`;
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

export const signUp = async (input: SignUpInput): Promise<AuthResponse> => {
  try {
    // Hash the password using crypto-based implementation
    const password_hash = await hashPassword(input.password);
    
    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: password_hash
      })
      .returning()
      .execute();

    const user = result[0];
    
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
      token: token
    };
  } catch (error) {
    console.error('Sign up failed:', error);
    throw error;
  }
};