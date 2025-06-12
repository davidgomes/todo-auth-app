import { initTRPC, TRPCError } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { createHmac } from 'crypto';

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

const JWT_SECRET = process.env['JWT_SECRET'] || 'test-secret-key-for-development';
if (!process.env['JWT_SECRET'] && process.env['NODE_ENV'] === 'production') {
  throw new Error('JWT_SECRET environment variable is required for secure authentication in production.');
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Custom error classes for JWT validation
class JsonWebTokenError extends Error {
  name = 'JsonWebTokenError';
}

class TokenExpiredError extends Error {
  name = 'TokenExpiredError';
}

// Crypto-based JWT verification function
function validateToken(token: string): { userId: number } | null {
  try {
    if (!JWT_SECRET) {
      throw new JsonWebTokenError('JWT_SECRET not available');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new JsonWebTokenError('Invalid token format');
    }

    const [header, payload, signature] = parts;
    
    // Verify signature
    const expectedSignature = createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      throw new JsonWebTokenError('Invalid signature');
    }

    // Decode payload
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    // Check expiration
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      throw new TokenExpiredError('Token expired');
    }
    
    if (decoded.userId && typeof decoded.userId === 'number') {
      return { userId: decoded.userId };
    }
    return null;
  } catch (error: unknown) {
    if (error instanceof JsonWebTokenError) {
      console.error('Invalid JWT token:', error.message);
    } else if (error instanceof TokenExpiredError) {
      console.error('JWT token expired:', error.message);
    } else {
      console.error('Token verification failed:', error);
    }
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