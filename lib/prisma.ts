import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SUPABASE_ROOT_CA } from "@/lib/supabase-ca";

/**
 * Queries go through node-postgres rather than Prisma's own engine for the
 * connection: the engine's TLS stopped opening connections to Supabase on
 * macOS 27, while Node's TLS works everywhere and lets us pin the CA.
 */
function createClient(): PrismaClient {
  const url = new URL(process.env.DATABASE_URL!);
  // `pgbouncer`, `connection_limit` and `pool_timeout` are Prisma-engine
  // options; node-postgres would read them as unknown settings.
  url.search = "";
  const adapter = new PrismaPg({
    connectionString: url.toString(),
    max: 3,
    ssl: { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true },
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? createClient();

// Always cache — prevents multiple instances when modules re-evaluate
globalForPrisma.prisma = prisma;
