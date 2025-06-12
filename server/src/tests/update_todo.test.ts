
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, todosTable } from '../db/schema';
import { type UpdateTodoInput, type Context } from '../schema';
import { updateTodo } from '../handlers/update_todo';
import { eq } from 'drizzle-orm';

describe('updateTodo', () => {
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
        title: 'Original Title',
        description: 'Original description',
        completed: false
      })
      .returning()
      .execute();

    testTodoId = todos[0].id;
  });

  it('should update todo title', async () => {
    const input: UpdateTodoInput = {
      id: testTodoId,
      title: 'Updated Title'
    };

    const context: Context = { userId: testUserId };

    const result = await updateTodo(input, context);

    expect(result.id).toEqual(testTodoId);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Original description');
    expect(result.completed).toEqual(false);
    expect(result.user_id).toEqual(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update todo description', async () => {
    const input: UpdateTodoInput = {
      id: testTodoId,
      description: 'Updated description'
    };

    const context: Context = { userId: testUserId };

    const result = await updateTodo(input, context);

    expect(result.title).toEqual('Original Title');
    expect(result.description).toEqual('Updated description');
    expect(result.completed).toEqual(false);
  });

  it('should update todo completion status', async () => {
    const input: UpdateTodoInput = {
      id: testTodoId,
      completed: true
    };

    const context: Context = { userId: testUserId };

    const result = await updateTodo(input, context);

    expect(result.title).toEqual('Original Title');
    expect(result.description).toEqual('Original description');
    expect(result.completed).toEqual(true);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateTodoInput = {
      id: testTodoId,
      title: 'New Title',
      description: 'New description',
      completed: true
    };

    const context: Context = { userId: testUserId };

    const result = await updateTodo(input, context);

    expect(result.title).toEqual('New Title');
    expect(result.description).toEqual('New description');
    expect(result.completed).toEqual(true);
  });

  it('should set description to null', async () => {
    const input: UpdateTodoInput = {
      id: testTodoId,
      description: null
    };

    const context: Context = { userId: testUserId };

    const result = await updateTodo(input, context);

    expect(result.description).toBeNull();
  });

  it('should update updated_at timestamp', async () => {
    const originalTodo = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodoId))
      .execute();

    const originalUpdatedAt = originalTodo[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateTodoInput = {
      id: testTodoId,
      title: 'Updated Title'
    };

    const context: Context = { userId: testUserId };

    const result = await updateTodo(input, context);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should save changes to database', async () => {
    const input: UpdateTodoInput = {
      id: testTodoId,
      title: 'Database Update Test',
      completed: true
    };

    const context: Context = { userId: testUserId };

    await updateTodo(input, context);

    // Verify changes persisted to database
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodoId))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toEqual('Database Update Test');
    expect(todos[0].completed).toEqual(true);
  });

  it('should throw error when user not authenticated', async () => {
    const input: UpdateTodoInput = {
      id: testTodoId,
      title: 'Updated Title'
    };

    const context: Context = { userId: undefined };

    await expect(updateTodo(input, context)).rejects.toThrow(/not authenticated/i);
  });

  it('should throw error when todo not found', async () => {
    const input: UpdateTodoInput = {
      id: 99999, // Non-existent todo ID
      title: 'Updated Title'
    };

    const context: Context = { userId: testUserId };

    await expect(updateTodo(input, context)).rejects.toThrow(/not found or access denied/i);
  });

  it('should throw error when user tries to update another users todo', async () => {
    const input: UpdateTodoInput = {
      id: testTodoId,
      title: 'Unauthorized Update'
    };

    const context: Context = { userId: otherUserId };

    await expect(updateTodo(input, context)).rejects.toThrow(/not found or access denied/i);
  });
});
