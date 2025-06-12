
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignUpInput } from '../schema';
import { signUp } from '../handlers/sign_up';
import { eq } from 'drizzle-orm';

const testInput: SignUpInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('signUp', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user account', async () => {
    const result = await signUp(testInput);

    // Validate response structure
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.id).toBeDefined();
    expect(typeof result.user.id).toBe('number');
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
  });

  it('should save user to database', async () => {
    const result = await signUp(testInput);

    // Query database to verify user was created
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].password_hash).toEqual('hashed_password123');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should prevent duplicate email addresses', async () => {
    // Create first user
    await signUp(testInput);

    // Attempt to create second user with same email
    await expect(signUp(testInput)).rejects.toThrow(/unique/i);
  });

  it('should handle different email formats', async () => {
    const differentEmailInput: SignUpInput = {
      email: 'user.name+tag@domain.co.uk',
      password: 'securepass456'
    };

    const result = await signUp(differentEmailInput);

    expect(result.user.email).toEqual('user.name+tag@domain.co.uk');
    expect(result.user.id).toBeDefined();
    expect(result.token).toBeDefined();
  });
});
