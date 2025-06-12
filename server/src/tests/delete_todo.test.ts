
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, todosTable } from '../db/schema';
import { type DeleteTodoInput, type Context } from '../schema';
import { deleteTodo } from '../handlers/delete_todo';
import { eq } from 'drizzle-orm';

describe('deleteTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;
  let testTodoId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hashedpassword123'
        },
        {
          email: 'other@example.com',
          password_hash: 'hashedpassword456'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test todo
    const todos = await db.insert(todosTable)
      .values({
        user_id: testUserId,
        title: 'Test Todo',
        description: 'A todo for testing deletion'
      })
      .returning()
      .execute();

    testTodoId = todos[0].id;
  });

  it('should delete a todo successfully', async () => {
    const input: DeleteTodoInput = {
      id: testTodoId
    };

    const context: Context = {
      userId: testUserId
    };

    const result = await deleteTodo(input, context);

    expect(result.success).toBe(true);

    // Verify todo was deleted from database
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodoId))
      .execute();

    expect(todos).toHaveLength(0);
  });

  it('should return success false when todo does not exist', async () => {
    const input: DeleteTodoInput = {
      id: 99999 // Non-existent todo ID
    };

    const context: Context = {
      userId: testUserId
    };

    const result = await deleteTodo(input, context);

    expect(result.success).toBe(false);
  });

  it('should not delete todo belonging to different user', async () => {
    const input: DeleteTodoInput = {
      id: testTodoId
    };

    const context: Context = {
      userId: otherUserId // Different user trying to delete
    };

    const result = await deleteTodo(input, context);

    expect(result.success).toBe(false);

    // Verify todo still exists in database
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodoId))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Test Todo');
  });

  it('should throw error when user is not authenticated', async () => {
    const input: DeleteTodoInput = {
      id: testTodoId
    };

    const context: Context = {
      userId: undefined // No authentication
    };

    await expect(deleteTodo(input, context)).rejects.toThrow(/authentication required/i);
  });
});
