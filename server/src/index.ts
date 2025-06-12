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

// Try to import external library, fall back to crypto if not available
let jwt: any;

try {
  jwt = require('jsonwebtoken');
} catch {
  // Fallback implementation using Node.js crypto
  jwt = {
    verify(token: string, secret: string): any {
      if (!secret) {
        throw new Error('JWT_SECRET is required for token verification');
      }
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        const error = new Error('Invalid token format');
        (error as any).name = 'JsonWebTokenError';
        throw error;
      }

      const [header, payload, signature] = parts;
      
      // Verify signature
      const expectedSignature = createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');
      
      if (signature !== expectedSignature) {
        const error = new Error('Invalid signature');
        (error as any).name = 'JsonWebTokenError';
        throw error;
      }

      // Decode payload
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
      
      // Check expiration
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        const error = new Error('Token expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      }

      return decoded;
    }
  };
}

// Enforce JWT_SECRET as environment variable - no fallback in production
const JWT_SECRET = process.env['JWT_SECRET'];
if (!JWT_SECRET) {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('JWT_SECRET environment variable is required for secure authentication in production');
  } else {
    console.warn('JWT_SECRET not set, using fallback for development');
  }
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// JWT token validation function using jwt.verify (external library or fallback)
function validateToken(token: string): { userId: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET || 'fallback-secret-key-change-in-production') as any;
    
    if (decoded.userId && typeof decoded.userId === 'number') {
      return { userId: decoded.userId };
    }
    return null;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error) {
      const jwtError = error as { name: string; message: string };
      if (jwtError.name === 'JsonWebTokenError') {
        console.error('Invalid JWT token:', jwtError.message);
      } else if (jwtError.name === 'TokenExpiredError') {
        console.error('JWT token expired:', jwtError.message);
      } else {
        console.error('Token verification failed:', error);
      }
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