
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type CreateTodoInput, type Todo, type Context } from '../schema';

export const createTodo = async (input: CreateTodoInput, context: Context): Promise<Todo> => {
  if (!context.userId) {
    throw new Error('User authentication required');
  }

  try {
    const result = await db.insert(todosTable)
      .values({
        user_id: context.userId,
        title: input.title,
        description: input.description,
        completed: false // Default value
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Todo creation failed:', error);
    throw error;
  }
};
