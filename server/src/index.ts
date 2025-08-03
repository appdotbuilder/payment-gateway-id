
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createUserInputSchema,
  updateUserInputSchema,
  updateUserBalanceInputSchema,
  createTransactionInputSchema,
  getUserTransactionsInputSchema,
  getTransactionsInputSchema,
  updateTransactionStatusInputSchema,
  getReportInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { getUserById } from './handlers/get_user_by_id';
import { updateUser } from './handlers/update_user';
import { updateUserBalance } from './handlers/update_user_balance';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { getUserTransactions } from './handlers/get_user_transactions';
import { updateTransactionStatus } from './handlers/update_transaction_status';
import { getDashboardReport } from './handlers/get_dashboard_report';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  getUserById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  updateUserBalance: publicProcedure
    .input(updateUserBalanceInputSchema)
    .mutation(({ input }) => updateUserBalance(input)),

  // Transaction management
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getTransactions: publicProcedure
    .input(getTransactionsInputSchema)
    .query(({ input }) => getTransactions(input)),

  getUserTransactions: publicProcedure
    .input(getUserTransactionsInputSchema)
    .query(({ input }) => getUserTransactions(input)),

  updateTransactionStatus: publicProcedure
    .input(updateTransactionStatusInputSchema)
    .mutation(({ input }) => updateTransactionStatus(input)),

  // Reports and analytics
  getDashboardReport: publicProcedure
    .input(getReportInputSchema)
    .query(({ input }) => getDashboardReport(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Payment Gateway TRPC server listening at port: ${port}`);
}

start();
