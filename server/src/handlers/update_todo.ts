
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type UpdateTodoInput, type Todo, type Context } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateTodo = async (input: UpdateTodoInput, context: Context): Promise<Todo> => {
  if (!context.userId) {
    throw new Error('User not authenticated');
  }

  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof todosTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.completed !== undefined) {
      updateData.completed = input.completed;
    }

    // Update todo with user ownership check
    const result = await db.update(todosTable)
      .set(updateData)
      .where(and(
        eq(todosTable.id, input.id),
        eq(todosTable.user_id, context.userId)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Todo not found or access denied');
    }

    return result[0];
  } catch (error) {
    console.error('Todo update failed:', error);
    throw error;
  }
};
