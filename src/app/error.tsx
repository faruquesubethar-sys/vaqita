"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with your error reporter in production.
    console.error(error);
  }, [error]);

  return (
    <div className="shell flex min-h-[85vh] flex-col items-center justify-center gap-8 text-center">
      <p className="eyebrow text-danger">Something went wrong</p>
      <h1 className="display text-[clamp(2.5rem,7vw,5rem)] leading-[0.98] text-alabaster">
        A loose thread.
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-stone">
        We hit an unexpected error. Trying again usually resolves it.
      </p>
      <button
        type="button"
        onClick={reset}
        className="border border-brass bg-brass px-9 py-4 text-xs uppercase tracking-[0.22em] text-ink transition-colors duration-500 hover:bg-transparent hover:text-brass-lit"
      >
        Try again
      </button>
    </div>
  );
}
