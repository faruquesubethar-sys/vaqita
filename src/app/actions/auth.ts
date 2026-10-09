"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";
import {
  checkRateLimit,
  clearFailures,
  clientKey,
  recordFailure,
} from "@/lib/rate-limit";

export type AuthState = { error?: string } | undefined;

const credentials = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least eight characters."),
});

const registration = credentials.extend({
  name: z.string().trim().min(1, "Tell us your name.").max(80),
});

/**
 * `prevState` is required by useActionState even though it is unused — the
 * hook always passes the previous state as the first argument.
 */
export async function signIn(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const email = parsed.data.email.toLowerCase();
  const keys = [`email:${email}`, await clientKey()];

  // Checked before the password is even looked at, so a refused attempt costs
  // an attacker a round trip and tells them nothing.
  const limit = await checkRateLimit(keys);
  if (limit.blocked) {
    return {
      error: `Too many attempts. Wait ${limit.minutes} minutes and try again.`,
    };
  }

  const user = await db.user.findUnique({ where: { email } });

  // Deliberately identical message for "no such user" and "wrong password".
  // Distinguishing them tells an attacker which addresses are registered.
  const invalid = { error: "That email and password don't match." };
  if (!user) {
    await recordFailure(keys);
    return invalid;
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    await recordFailure(keys);
    return invalid;
  }

  await clearFailures(keys);
  await createSession(user.id);
  redirect(user.role === "ADMIN" ? "/admin" : "/account");
}

export async function register(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registration.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account already exists for that email." };
  }

  const user = await db.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  await createSession(user.id);
  redirect("/account");
}

export async function signOut() {
  await destroySession();
  redirect("/");
}
