
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignInInput } from '../schema';
import { signIn } from '../handlers/sign_in';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'password123'
};

const testInput: SignInInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('signIn', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should sign in user with valid credentials', async () => {
    // Create test user
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
  });

  it('should throw error for non-existent user', async () => {
    await expect(signIn(testInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should throw error for wrong password', async () => {
    // Create test user
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
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const wrongEmailInput: SignInInput = {
      email: 'wrong@example.com',
      password: 'password123'
    };

    await expect(signIn(wrongEmailInput)).rejects.toThrow(/invalid credentials/i);
  });
});
