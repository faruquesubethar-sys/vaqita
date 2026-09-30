"use client";

import { useEffect, useRef, useState } from "react";

import { SwanMark } from "./swan-mark";

/**
 * Whether this page load should show the intro.
 *
 * Module scope, so it survives a strict-mode remount but resets on a real
 * navigation — which is exactly the lifetime "once per page load" needs.
 */
let decision: boolean | null = null;

/**
 * The curtain the shop opens behind.
 *
 * Runs before anything else is visible: the mark draws itself, the name
 * arrives a letter at a time, a gold rule sweeps across, and the whole thing
 * lifts to reveal the site.
 *
 * Three things it deliberately does not do:
 *
 * It does not block the page. The site renders underneath the whole time, so
 * the intro is covering a page that is already there rather than delaying it.
 * If the animation fails for any reason, the visitor still has a working shop
 * behind it.
 *
 * It does not run twice. A grand entrance is a welcome the first time and an
 * obstacle by the third, so it plays once per browsing session — a visitor
 * moving between the catalogue and a product never sees it again.
 *
 * It does not run for anyone who has asked for less motion.
 */
export function Intro() {
  // Starts null so the server and the first client render agree; the decision
  // needs sessionStorage, which only exists in the browser.
  const [phase, setPhase] = useState<"unknown" | "playing" | "leaving" | "done">(
    "unknown",
  );
  const timers = useRef<number[]>([]);

  useEffect(() => {
    // Decided once per page load, not once per effect run.
    //
    // React's strict mode runs an effect, tears it down and runs it again.
    // Reading and writing sessionStorage inside the effect therefore had the
    // second run find the flag the first run had just written, conclude the
    // intro had already been seen, and skip it — so it never played at all in
    // development, and would have misbehaved in production too.
    if (decision === null) {
      let seen = false;
      try {
        seen = sessionStorage.getItem("vq_intro") === "1";
      } catch {
        // Private browsing can throw on access. Treat it as a first visit;
        // the worst case is one extra animation, not a broken page.
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      decision = !seen && !reduced;

      try {
        sessionStorage.setItem("vq_intro", "1");
      } catch {
        /* nothing to do */
      }
    }

    if (!decision) {
      setPhase("done");
      return;
    }

    // Lock scrolling only while the curtain is actually up.
    document.documentElement.style.overflow = "hidden";
    setPhase("playing");

    timers.current.push(window.setTimeout(() => setPhase("leaving"), 2600));
    timers.current.push(
      window.setTimeout(() => {
        setPhase("done");
        document.documentElement.style.overflow = "";
      }, 3500),
    );

    return () => {
      timers.current.forEach(window.clearTimeout);
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (phase === "done" || phase === "unknown") return null;

  return (
    <div
      aria-hidden
      className={`vq-intro${phase === "leaving" ? " vq-intro--leaving" : ""}`}
    >
      <div className="vq-intro__inner">
        <div className="vq-intro__mark">
          <SwanMark className="h-full w-full" />
        </div>

        <div className="vq-intro__word">
          {"VAQITA".split("").map((letter, i) => (
            <span
              key={i}
              className="vq-intro__letter"
              style={{ animationDelay: `${420 + i * 85}ms` }}
            >
              {letter}
            </span>
          ))}
        </div>

        <span className="vq-intro__rule" />
        <p className="vq-intro__sub">Mens Fashion Hub</p>
      </div>

      <style>{`
        .vq-intro {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: grid;
          place-items: center;
          background:
            radial-gradient(120% 90% at 50% 40%, #1b1c20 0%, #0b0b0c 60%, #000 100%);
          /* Two layers, so the curtain can split rather than simply fade. */
          clip-path: inset(0 0 0 0);
          transition: clip-path 900ms cubic-bezier(0.76, 0, 0.24, 1);
        }
        .vq-intro--leaving {
          clip-path: inset(0 0 100% 0);
        }
        .vq-intro__inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
          padding: 0 1rem;
        }
        .vq-intro__mark {
          width: clamp(64px, 12vw, 104px);
          height: clamp(64px, 12vw, 104px);
          opacity: 0;
          transform: scale(0.6) rotate(-14deg);
          animation: vq-mark 1100ms cubic-bezier(0.16, 1, 0.3, 1) 60ms forwards;
        }
        @keyframes vq-mark {
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        .vq-intro__word {
          display: flex;
          /* The tracking is the point: it is the shop's name, given room. */
          gap: clamp(0.18em, 1.4vw, 0.34em);
          font-family: var(--font-display), serif;
          font-size: clamp(2.4rem, 11vw, 6.5rem);
          line-height: 1;
          color: #f4f1ea;
          padding-left: clamp(0.18em, 1.4vw, 0.34em);
        }
        .vq-intro__letter {
          display: inline-block;
          opacity: 0;
          transform: translateY(0.5em);
          animation: vq-letter 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes vq-letter {
          to { opacity: 1; transform: translateY(0); }
        }
        .vq-intro__rule {
          display: block;
          height: 1px;
          width: min(340px, 62vw);
          background: linear-gradient(90deg, transparent, #b08d57, transparent);
          transform: scaleX(0);
          animation: vq-rule 900ms cubic-bezier(0.16, 1, 0.3, 1) 1180ms forwards;
        }
        @keyframes vq-rule { to { transform: scaleX(1); } }
        .vq-intro__sub {
          margin: 0;
          font-size: 0.6875rem;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: #8b8b86;
          opacity: 0;
          animation: vq-sub 800ms ease forwards 1400ms;
        }
        @keyframes vq-sub { to { opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .vq-intro { display: none; }
        }
      `}</style>
    </div>
  );
}

export default Intro;
