
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignInInput } from '../schema';
import { signIn } from '../handlers/sign_in';
import { pbkdf2Sync, randomBytes } from 'crypto';

const testInput: SignInInput = {
  email: 'test@example.com',
  password: 'password123'
};

// Helper function to create secure password hash (matching sign_up implementation)
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `$pbkdf2$${salt}$${hash}`;
}

describe('signIn', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should sign in user with valid credentials', async () => {
    // Create test user with properly hashed password
    const hashedPassword = hashPassword('password123');
    const testUser = {
      email: 'test@example.com',
      password_hash: hashedPassword
    };

    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await signIn(testInput);

    // Validate response structure
    expect(result.user).toBeDefined();
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.id).toBeDefined();
    expect(typeof result.user.id).toBe('number');
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
    
    // Verify token structure (JWT should have 3 parts separated by dots)
    const tokenParts = result.token.split('.');
    expect(tokenParts).toHaveLength(3);
  });

  it('should throw error for non-existent user', async () => {
    await expect(signIn(testInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should throw error for wrong password', async () => {
    // Create test user with properly hashed password
    const hashedPassword = hashPassword('password123');
    const testUser = {
      email: 'test@example.com',
      password_hash: hashedPassword
    };

    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const wrongPasswordInput: SignInInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    await expect(signIn(wrongPasswordInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should throw error for wrong email', async () => {
    // Create test user with properly hashed password
    const hashedPassword = hashPassword('password123');
    const testUser = {
      email: 'test@example.com',
      password_hash: hashedPassword
    };

    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const wrongEmailInput: SignInInput = {
      email: 'wrong@example.com',
      password: 'password123'
    };

    await expect(signIn(wrongEmailInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should handle secure password verification correctly', async () => {
    // Create test user with properly hashed password
    const hashedPassword = hashPassword('testpassword456');
    const testUser = {
      email: 'crypto@example.com',
      password_hash: hashedPassword
    };

    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const validInput: SignInInput = {
      email: 'crypto@example.com',
      password: 'testpassword456'
    };

    const result = await signIn(validInput);
    expect(result.user.email).toEqual('crypto@example.com');
    expect(result.token).toBeDefined();
  });

  it('should maintain backward compatibility with legacy hashes', async () => {
    // Create test user with legacy hash format
    const testUser = {
      email: 'legacy@example.com',
      password_hash: 'hashed_legacypass'
    };

    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const validInput: SignInInput = {
      email: 'legacy@example.com',
      password: 'legacypass'
    };

    const result = await signIn(validInput);
    expect(result.user.email).toEqual('legacy@example.com');
    expect(result.token).toBeDefined();
  });
});
