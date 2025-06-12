
import { initTRPC, TRPCError } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

import { 
  signUpInputSchema, 
  signInInputSchema, 
  createTodoInputSchema, 
  updateTodoInputSchema, 
  deleteTodoInputSchema,
  type Context 
} from './schema';
import { signUp } from './handlers/sign_up';
import { signIn } from './handlers/sign_in';
import { createTodo } from './handlers/create_todo';
import { getTodos } from './handlers/get_todos';
import { updateTodo } from './handlers/update_todo';
import { deleteTodo } from './handlers/delete_todo';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Simple token validation function (replace with proper JWT library in production)
function validateToken(token: string): { userId: number } | null {
  try {
    // This is a simple base64 decode - in production use proper JWT
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.userId && typeof decoded.userId === 'number') {
      return { userId: decoded.userId };
    }
    return null;
  } catch {
    return null;
  }
}

// Middleware for authentication
const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});

const protectedProcedure = publicProcedure.use(authMiddleware);

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Auth routes
  signUp: publicProcedure
    .input(signUpInputSchema)
    .mutation(({ input }) => signUp(input)),
  
  signIn: publicProcedure
    .input(signInInputSchema)
    .mutation(({ input }) => signIn(input)),
  
  // Todo routes (protected)
  createTodo: protectedProcedure
    .input(createTodoInputSchema)
    .mutation(({ input, ctx }) => createTodo(input, ctx)),
  
  getTodos: protectedProcedure
    .query(({ ctx }) => getTodos(ctx)),
  
  updateTodo: protectedProcedure
    .input(updateTodoInputSchema)
    .mutation(({ input, ctx }) => updateTodo(input, ctx)),
  
  deleteTodo: protectedProcedure
    .input(deleteTodoInputSchema)
    .mutation(({ input, ctx }) => deleteTodo(input, ctx)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext({ req }) {
      const token = req.headers.authorization?.replace('Bearer ', '');
      let userId: number | undefined;
      
      if (token) {
        const decoded = validateToken(token);
        if (decoded) {
          userId = decoded.userId;
        }
      }
      
      return { userId };
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
