
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, todosTable } from '../db/schema';
import { type CreateTodoInput, type Context } from '../schema';
import { createTodo } from '../handlers/create_todo';
import { eq } from 'drizzle-orm';

// Test data
const testInput: CreateTodoInput = {
  title: 'Test Todo',
  description: 'A todo for testing'
};

const testInputWithNullDescription: CreateTodoInput = {
  title: 'Test Todo Without Description',
  description: null
};

let testUserId: number;
let testContext: Context;

describe('createTodo', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
    testContext = { userId: testUserId };
  });

  afterEach(resetDB);

  it('should create a todo', async () => {
    const result = await createTodo(testInput, testContext);

    expect(result.title).toEqual('Test Todo');
    expect(result.description).toEqual('A todo for testing');
    expect(result.user_id).toEqual(testUserId);
    expect(result.completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save todo to database', async () => {
    const result = await createTodo(testInput, testContext);

    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toEqual('Test Todo');
    expect(todos[0].description).toEqual('A todo for testing');
    expect(todos[0].user_id).toEqual(testUserId);
    expect(todos[0].completed).toEqual(false);
    expect(todos[0].created_at).toBeInstanceOf(Date);
    expect(todos[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create todo with null description', async () => {
    const result = await createTodo(testInputWithNullDescription, testContext);

    expect(result.title).toEqual('Test Todo Without Description');
    expect(result.description).toBeNull();
    expect(result.user_id).toEqual(testUserId);
    expect(result.completed).toEqual(false);
  });

  it('should throw error when user is not authenticated', async () => {
    const unauthenticatedContext: Context = { userId: undefined };

    await expect(createTodo(testInput, unauthenticatedContext))
      .rejects.toThrow(/authentication required/i);
  });
});
