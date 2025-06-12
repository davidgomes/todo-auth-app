
import { z } from 'zod';

// User schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const signUpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export type SignUpInput = z.infer<typeof signUpInputSchema>;

export const signInInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type SignInInput = z.infer<typeof signInInputSchema>;

export const authResponseSchema = z.object({
  user: z.object({
    id: z.number(),
    email: z.string()
  }),
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Todo schemas
export const todoSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  completed: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Todo = z.infer<typeof todoSchema>;

export const createTodoInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable()
});

export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;

export const updateTodoInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  completed: z.boolean().optional()
});

export type UpdateTodoInput = z.infer<typeof updateTodoInputSchema>;

export const deleteTodoInputSchema = z.object({
  id: z.number()
});

export type DeleteTodoInput = z.infer<typeof deleteTodoInputSchema>;

// Context schema for authenticated requests
export const contextSchema = z.object({
  userId: z.number().optional()
});

export type Context = z.infer<typeof contextSchema>;
