"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { register, signIn, type AuthState } from "@/app/actions/auth";

function Submit({ label }: { label: string }) {
  // useFormStatus must be read from a child of the <form>, not the form itself.
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-8 w-full border border-brass bg-brass px-8 py-4 text-xs uppercase tracking-[0.24em] text-ink transition-colors duration-500 hover:bg-transparent hover:text-brass-lit disabled:opacity-60"
    >
      {pending ? "One moment…" : label}
    </button>
  );
}

const fieldClass =
  "w-full border-b border-bone/20 bg-transparent px-0 py-3 text-sm text-alabaster outline-none transition-colors placeholder:text-smoke focus:border-brass";

export function AuthForm({ mode }: { mode: "sign-in" | "register" }) {
  const action = mode === "sign-in" ? signIn : register;
  const [state, formAction] = useActionState<AuthState, FormData>(action, undefined);

  const isRegister = mode === "register";

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="eyebrow">{isRegister ? "Create an account" : "Welcome back"}</p>
      <h1 className="display mt-4 text-[clamp(2.25rem,5vw,3.5rem)] text-alabaster">
        {isRegister ? "Join the house." : "Sign in."}
      </h1>

      <form action={formAction} className="mt-12">
        {isRegister && (
          <label className="mb-7 block">
            <span className="eyebrow">Name</span>
            <input
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Your name"
              className={`mt-3 ${fieldClass}`}
            />
          </label>
        )}

        <label className="mb-7 block">
          <span className="eyebrow">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={`mt-3 ${fieldClass}`}
          />
        </label>

        <label className="block">
          <span className="eyebrow">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder="At least eight characters"
            className={`mt-3 ${fieldClass}`}
          />
        </label>

        {state?.error && (
          <p
            role="alert"
            className="mt-6 border-l-2 border-danger bg-danger/10 px-4 py-3 text-xs leading-relaxed text-bone"
          >
            {state.error}
          </p>
        )}

        <Submit label={isRegister ? "Create account" : "Sign in"} />
      </form>

      <p className="mt-8 text-center text-xs text-smoke">
        {isRegister ? "Already have an account? " : "No account yet? "}
        <Link
          href={isRegister ? "/sign-in" : "/register"}
          className="text-stone underline-offset-4 transition-colors hover:text-brass-lit hover:underline"
        >
          {isRegister ? "Sign in" : "Create one"}
        </Link>
      </p>

      {!isRegister && (
        <div className="mt-12 border-t border-bone/10 pt-6">
          <p className="text-[0.6875rem] leading-relaxed text-smoke">
            <span className="eyebrow block pb-2">Demo accounts</span>
            Customer — demo@vaqita.com / vaqita-demo
            <br />
            Admin — admin@vaqita.com / vaqita-admin
          </p>
        </div>
      )}
    </div>
  );
}
