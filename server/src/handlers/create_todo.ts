
import { type CreateTodoInput, type Todo, type Context } from '../schema';

export declare function createTodo(input: CreateTodoInput, context: Context): Promise<Todo>;
