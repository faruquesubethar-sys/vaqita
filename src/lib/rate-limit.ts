import "server-only";

import { headers } from "next/headers";

import { db } from "./db";

/**
 * Slows down password guessing.
 *
 * The admin panel lives at a known path, the source is readable, and a short
 * password is a few hours of guessing away from being found. None of that is
 * a problem on its own; all of it together is, and the thing that fixes it
 * cheaply is refusing to answer quickly.
 *
 * Counted in the database rather than in memory because the site runs on
 * serverless functions: an in-memory counter belongs to one instance, and an
 * attacker spreading requests across instances would never meet it.
 */

/** Failures tolerated inside the window before the key is refused. */
const LIMIT = 8;
/** How far back failures are counted, and how long a lockout lasts. */
const WINDOW_MINUTES = 15;

export type RateLimitVerdict = { blocked: false } | { blocked: true; minutes: number };

/** The caller's address, as far as the platform will say. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  // Vercel sets both; the first entry of x-forwarded-for is the client.
  const ip =
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return `ip:${ip}`;
}

/**
 * Whether any of these keys has spent its allowance.
 *
 * Several keys are checked at once — usually the address being tried and the
 * machine trying it — so one account cannot be ground down from many
 * machines, and one machine cannot work through many accounts.
 */
export async function checkRateLimit(keys: string[]): Promise<RateLimitVerdict> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);

  try {
    const count = await db.loginAttempt.count({
      where: { key: { in: keys }, createdAt: { gte: since } },
    });
    if (count < LIMIT) return { blocked: false };
    return { blocked: true, minutes: WINDOW_MINUTES };
  } catch (error) {
    // A rate limiter that fails closed locks everyone out of their own shop
    // over a database hiccup. Failing open loses the protection for the
    // length of the outage, which is the lesser of the two.
    console.error("[rate-limit] count failed:", error);
    return { blocked: false };
  }
}

/** Records one failure against every key, and tidies up behind itself. */
export async function recordFailure(keys: string[]): Promise<void> {
  try {
    await db.loginAttempt.createMany({ data: keys.map((key) => ({ key })) });

    // Opportunistic cleanup. Without it the table only ever grows, and this
    // shop has no scheduled jobs to prune it with.
    if (Math.random() < 0.05) {
      await db.loginAttempt.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
      });
    }
  } catch (error) {
    console.error("[rate-limit] record failed:", error);
  }
}

/** Clears the slate after a correct password. */
export async function clearFailures(keys: string[]): Promise<void> {
  try {
    await db.loginAttempt.deleteMany({ where: { key: { in: keys } } });
  } catch (error) {
    console.error("[rate-limit] clear failed:", error);
  }
}
