import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell flex min-h-[85vh] flex-col items-center justify-center gap-8 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display text-[clamp(3rem,9vw,7rem)] leading-[0.95] text-alabaster">
        This one got away.
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-stone">
        The page you asked for isn&rsquo;t here. It may have been retired, or the
        address may be slightly off.
      </p>
      <Link
        href="/collections"
        className="border border-bone/25 px-9 py-4 text-xs uppercase tracking-[0.22em] text-alabaster transition-colors hover:border-brass hover:text-brass-lit"
      >
        Browse the collection
      </Link>
    </div>
  );
}
