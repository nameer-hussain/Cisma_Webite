"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

export type SliderEvent = {
  title: string;
  image: string; // file inside /public
  href: string; // internal, external ("https://...") or "mailto:..."
  tag?: string; // e.g. "Upcoming"
  date?: string; // e.g. "27 October 2026 · 16:00 CST"
  description?: string;
  cta?: string; // button text, e.g. "Register now"
};

const INTERVAL_MS = 4000;

function ActionLink({
  href,
  className,
  children,
  tabIndex,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
  tabIndex: number;
}) {
  const external = /^(https?:|mailto:)/.test(href);
  if (external) {
    const isWeb = href.startsWith("http");
    return (
      <a
        href={href}
        tabIndex={tabIndex}
        target={isWeb ? "_blank" : undefined}
        rel={isWeb ? "noopener noreferrer" : undefined}
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} tabIndex={tabIndex} className={className}>
      {children}
    </Link>
  );
}

export default function EventSlider({
  events,
  heading = "Latest Events",
}: {
  events: SliderEvent[];
  heading?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = events.length;

  const go = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count]
  );

  useEffect(() => {
    if (paused || count < 2) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, count]);

  return (
    <section className="bg-white py-14 md:py-20" aria-label={heading}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 text-center md:mb-10">
          <h2 className="font-heading text-3xl font-medium tracking-tight text-neutral-900 md:text-4xl">
            {heading}
          </h2>
          <div className="mx-auto mt-3 h-0.5 w-16 bg-cisma-gold" />
        </div>

        <div
          className="relative overflow-hidden rounded-2xl bg-cisma-navy shadow-xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
            setPaused(true);
          }}
          onTouchEnd={(e) => {
            if (touchX.current !== null) {
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
            }
            touchX.current = null;
            setPaused(false);
          }}
        >
          {/* All slides share one grid cell, so the height never jumps */}
          <div className="grid">
            {events.map((e, i) => {
              const active = i === index;
              return (
                <div
                  key={e.title}
                  aria-hidden={!active}
                  className={`relative col-start-1 row-start-1 grid transition-opacity duration-700 md:grid-cols-2 ${
                    active ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  {/* Text side */}
                  <div className="order-2 flex flex-col justify-center px-6 py-8 text-white md:order-1 md:px-12 md:py-14">
                    {e.tag && (
                      <span className="mb-4 w-fit rounded-full border border-cisma-gold/70 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cisma-gold">
                        {e.tag}
                      </span>
                    )}
                    <h3 className="font-heading text-2xl font-medium leading-snug md:text-4xl">
                      {e.title}
                    </h3>
                    {e.date && (
                      <p className="mt-4 text-sm font-semibold text-cisma-gold md:text-base">
                        {e.date}
                      </p>
                    )}
                    {e.description && (
                      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80">
                        {e.description}
                      </p>
                    )}
                    <ActionLink
                      href={e.href}
                      tabIndex={active ? 0 : -1}
                      className="mt-7 w-fit rounded-md bg-white px-6 py-3 text-sm font-bold text-cisma-navy transition-colors hover:bg-cisma-gold hover:text-white"
                    >
                      {e.cta || "Learn more"}
                    </ActionLink>
                  </div>

                  {/* Image side: never cropped, blurred copy fills the empty space */}
                  <ActionLink
                    href={e.href}
                    tabIndex={-1}
                    className="relative order-1 block h-72 overflow-hidden sm:h-96 md:order-2 md:h-auto md:min-h-[460px]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.image}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
                    />
                    <div className="absolute inset-0 bg-cisma-navy/30" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.image}
                      alt={e.title}
                      draggable={false}
                      className="relative z-10 mx-auto h-full w-full select-none object-contain p-4 md:p-8"
                    />
                  </ActionLink>
                </div>
              );
            })}
          </div>

          {/* Arrows */}
          {count > 1 && (
            <>
              <button
                onClick={() => go(index - 1)}
                aria-label="Previous event"
                className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-cisma-navy shadow transition-colors hover:bg-white md:flex"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <button
                onClick={() => go(index + 1)}
                aria-label="Next event"
                className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-cisma-navy shadow transition-colors hover:bg-white md:flex"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {count > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {events.map((e, i) => (
              <button
                key={e.title}
                onClick={() => go(i)}
                aria-label={`Show event ${i + 1}`}
                aria-current={i === index}
                className={`h-2.5 rounded-full transition-all ${
                  i === index
                    ? "w-8 bg-cisma-navy"
                    : "w-2.5 bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}