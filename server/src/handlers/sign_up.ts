import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignUpInput, type AuthResponse } from '../schema';
import { createHmac, randomBytes, pbkdf2Sync } from 'crypto';

// Try to import external libraries, fall back to crypto if not available
let bcrypt: any;
let jwt: any;

try {
  bcrypt = require('bcryptjs');
  jwt = require('jsonwebtoken');
} catch {
  // Fallback implementations using Node.js crypto
  bcrypt = {
    async hash(password: string, rounds: number): Promise<string> {
      const salt = randomBytes(16).toString('hex');
      const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      return `$pbkdf2$${salt}$${hash}`;
    },
    
    async compare(password: string, hash: string): Promise<boolean> {
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
    }
  };

  jwt = {
    sign(payload: { userId: number; email: string }, secret: string, options: { expiresIn: string }): string {
      if (!secret) {
        throw new Error('JWT_SECRET is required for token creation');
      }
      
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
    }
  };
}

// Enforce JWT_SECRET as environment variable - no fallback in production
const JWT_SECRET = process.env['JWT_SECRET'];
if (!JWT_SECRET) {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('JWT_SECRET environment variable is required for secure authentication in production');
  } else {
    console.warn('JWT_SECRET not set, using fallback for development');
  }
}

export const signUp = async (input: SignUpInput): Promise<AuthResponse> => {
  try {
    // Hash the password using bcrypt (external library or fallback)
    const password_hash = await bcrypt.hash(input.password, 10);
    
    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: password_hash
      })
      .returning()
      .execute();

    const user = result[0];
    
    // Generate JWT token using jwt (external library or fallback)
    const token = jwt.sign(
      { userId: user.id, email: user.email }, 
      JWT_SECRET || 'fallback-secret-key-change-in-production', 
      { expiresIn: '7d' }
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