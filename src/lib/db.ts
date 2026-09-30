import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client.ts";

/**
 * Prisma 7 connects through a driver adapter rather than a bundled engine.
 *
 * Postgres, not SQLite: the free hosting this shop runs on has no disk that
 * survives a deploy, so a database file would be destroyed every time the site
 * was updated. A managed Postgres is free at this size and is the one piece of
 * the stack that must not be disposable.
 */
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env");

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      // Serverless hosts open a connection per invocation and a free Postgres
      // tier has few to give. A small ceiling and a short idle timeout keep the
      // shop from locking itself out under a burst of traffic. Raise
      // DATABASE_POOL_MAX if you move to a plan with room for more.
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Next's dev server re-evaluates modules on every edit. Without caching the
// client on globalThis, each reload opens another connection and leaks handles.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
