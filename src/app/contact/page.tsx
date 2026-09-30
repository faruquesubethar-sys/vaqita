import type { Metadata } from "next";

import { SwanMark } from "@/components/brand/swan-mark";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { CONTACT } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach VAQITA Mens Fashion Hub on WhatsApp or Instagram — sizing, availability and order questions.",
};

const CHANNELS = [
  {
    label: "WhatsApp",
    value: "Message us directly",
    href: CONTACT.whatsapp,
    note: "Fastest for sizing, availability and order questions. We reply in hours, not days.",
  },
  {
    label: "Instagram",
    value: CONTACT.instagramHandle,
    href: CONTACT.instagram,
    note: "New arrivals are posted here first. Drops usually sell through from the story.",
  },
];

export default function ContactPage() {
  return (
    <div className="shell pt-40 pb-20">
      <header className="border-b border-bone/10 pb-14">
        <p className="eyebrow">Get in touch</p>
        <h1 className="display mt-5 text-[clamp(3rem,8vw,7rem)] text-alabaster">
          <SplitText text="Contact us" />
        </h1>
        <p className="mt-7 max-w-xl text-[0.95rem] leading-relaxed text-stone">
          Every piece here is real stock in one shop, so there is a person on
          the other end of both of these. Ask about a size before you buy — on
          single pieces we cannot swap one for another.
        </p>
      </header>

      <div className="mt-16 grid gap-6 md:grid-cols-2">
        {CHANNELS.map((channel, i) => (
          <Reveal key={channel.label} delay={i * 120}>
            <a
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col justify-between border border-bone/12 p-8 transition-colors duration-500 hover:border-brass"
            >
              <div>
                <p className="eyebrow text-brass-lit">{channel.label}</p>
                <p className="display mt-3 text-3xl text-alabaster transition-colors duration-500 group-hover:text-brass-lit">
                  {channel.value}
                </p>
              </div>
              <p className="mt-8 text-sm leading-relaxed text-stone">
                {channel.note}
              </p>
              <span className="mt-8 inline-flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.2em] text-smoke transition-colors duration-500 group-hover:text-alabaster">
                Open
                <span
                  aria-hidden
                  className="transition-transform duration-500 group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </a>
          </Reveal>
        ))}
      </div>

      <Reveal delay={240}>
        <section className="mt-20 flex flex-col items-start gap-8 border-t border-bone/10 pt-14 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <SwanMark id="contact" className="h-12 w-auto" />
            <div>
              <p className="display text-xl tracking-[0.34em] text-alabaster">
                VAQITA
              </p>
              <p className="mt-1.5 text-[0.5625rem] uppercase tracking-[0.3em] text-stone">
                Mens Fashion Hub
              </p>
            </div>
          </div>

          <p className="max-w-sm text-xs leading-relaxed text-smoke">
            Sizing is taken flat off each garment rather than from a chart,
            because a size label from twenty years ago means very little. Ask
            and we will measure the actual piece.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
