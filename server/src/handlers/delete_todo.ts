
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type DeleteTodoInput, type Context } from '../schema';
import { eq, and } from 'drizzle-orm';

export const deleteTodo = async (input: DeleteTodoInput, context: Context): Promise<{ success: boolean }> => {
  try {
    if (!context.userId) {
      throw new Error('Authentication required');
    }

    // Delete todo if it exists and belongs to the authenticated user
    const result = await db.delete(todosTable)
      .where(and(
        eq(todosTable.id, input.id),
        eq(todosTable.user_id, context.userId)
      ))
      .returning()
      .execute();

    // Return success true if a todo was deleted, false if no todo was found/deleted
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Todo deletion failed:', error);
    throw error;
  }
};
