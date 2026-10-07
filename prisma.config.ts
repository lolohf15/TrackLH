import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { SUPABASE_ROOT_CA } from "./lib/supabase-ca";

/**
 * Migrations run through node-postgres too, for the same reason as the app
 * (see lib/prisma.ts): Prisma's own engine can't open TLS to Supabase from
 * macOS 27. Experimental in Prisma 6. With this file present the CLI no
 * longer reads .env by itself, hence the dotenv import.
 */
export default defineConfig({
  experimental: { adapter: true },
  engine: "js",
  schema: "prisma/schema.prisma",
  async adapter() {
    const url = new URL(process.env.DATABASE_URL!);
    // Session mode on the same pooler: DDL and Prisma's migration lock need
    // a connection that stays theirs, which transaction mode (6543) is not.
    url.search = "";
    url.port = "5432";
    return new PrismaPg({
      connectionString: url.toString(),
      ssl: { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true },
    });
  },
});
