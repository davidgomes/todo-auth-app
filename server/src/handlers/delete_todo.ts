
import { type DeleteTodoInput, type Context } from '../schema';

export declare function deleteTodo(input: DeleteTodoInput, context: Context): Promise<{ success: boolean }>;
