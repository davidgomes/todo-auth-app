
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, todosTable } from '../db/schema';
import { type Context } from '../schema';
import { getTodos } from '../handlers/get_todos';

describe('getTodos', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no userId in context', async () => {
    const context: Context = {};
    const result = await getTodos(context);
    
    expect(result).toEqual([]);
  });

  it('should return todos for authenticated user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test todos
    await db.insert(todosTable)
      .values([
        {
          user_id: userId,
          title: 'First Todo',
          description: 'First todo description',
          completed: false
        },
        {
          user_id: userId,
          title: 'Second Todo',
          description: null,
          completed: true
        }
      ])
      .execute();

    const context: Context = { userId };
    const result = await getTodos(context);

    expect(result).toHaveLength(2);
    
    // Check first todo
    expect(result[0].title).toEqual('First Todo');
    expect(result[0].description).toEqual('First todo description');
    expect(result[0].completed).toBe(false);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Check second todo
    expect(result[1].title).toEqual('Second Todo');
    expect(result[1].description).toBeNull();
    expect(result[1].completed).toBe(true);
    expect(result[1].user_id).toEqual(userId);
  });

  it('should return empty array for user with no todos', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const context: Context = { userId };
    const result = await getTodos(context);

    expect(result).toEqual([]);
  });

  it('should only return todos for the authenticated user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create todos for both users
    await db.insert(todosTable)
      .values([
        {
          user_id: user1Id,
          title: 'User 1 Todo',
          description: 'Todo for user 1',
          completed: false
        },
        {
          user_id: user2Id,
          title: 'User 2 Todo',
          description: 'Todo for user 2',
          completed: false
        }
      ])
      .execute();

    // Get todos for user 1
    const context: Context = { userId: user1Id };
    const result = await getTodos(context);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User 1 Todo');
    expect(result[0].user_id).toEqual(user1Id);
  });
});
