
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type Todo, type Context } from '../schema';
import { eq } from 'drizzle-orm';

export const getTodos = async (context: Context): Promise<Todo[]> => {
  try {
    // If no user ID in context, return empty array
    if (!context.userId) {
      return [];
    }

    // Query todos for the authenticated user
    const results = await db.select()
      .from(todosTable)
      .where(eq(todosTable.user_id, context.userId))
      .execute();

    return results;
  } catch (error) {
    console.error('Get todos failed:', error);
    throw error;
  }
};
