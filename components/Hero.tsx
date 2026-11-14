'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const SLIDES = [
  {
    src: '/hero/hero_milan_1.jpg',
    alt: 'Rooftop view of Milan with cathedral spires and the city skyline',
    place: 'Milan, Italy',
    href: '/conference-2027',
    // which part of the photo stays visible (x y). The cathedral sits in the lower-middle of this photo.
    position: 'center 58%',
  },
  {
    src: '/hero/hero_shangai_1.jpg',
    alt: 'The Shanghai skyline at sunrise above the Huangpu River',
    place: 'Shanghai, China',
    href: '/conference-2027',
    position: 'center 50%',
  },
]

const INTERVAL_MS = 6000

export default function Hero() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)

  // Respect the visitor's "reduce motion" setting
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Auto-advance. The timer restarts after every change, including a click on a dot.
  useEffect(() => {
    if (paused || reduced) return
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS)
    return () => clearTimeout(t)
  }, [index, paused, reduced])

  return (
    <section
      className="relative w-full overflow-hidden bg-cisma-navy"
      aria-roledescription="carousel"
      aria-label="CISMA 2027 locations"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[460px] sm:h-[560px] md:h-[700px]">
        {/* Slides: they sit on top of each other and cross-fade */}
        {SLIDES.map((s, i) => {
          const active = i === index
          return (
            <div
              key={s.src}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out motion-reduce:transition-none ${
                active ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.src}
                alt={s.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                style={{ objectPosition: s.position }}
                className={`h-full w-full object-cover transition-transform duration-[7000ms] ease-out motion-reduce:transform-none ${
                  active ? 'scale-100' : 'scale-105'
                }`}
              />
              {/* The whole photo is a link */}
              <Link
                href={s.href}
                tabIndex={active ? 0 : -1}
                aria-label={`CISMA 2027 conference, ${s.place}`}
                className="absolute inset-0 z-[5]"
              />
            </div>
          )
        })}

        {/* Dark gradient so the white text is easy to read on bright photos */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/30 via-transparent via-45% to-black/60" />

        {/* Text content */}
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-end px-4 pb-14 text-center font-sans-ui md:pb-20">
          <h1 className="mb-3 text-3xl font-bold text-white drop-shadow sm:text-4xl md:text-6xl">
            Welcome to CISMA 2027 !
          </h1>
          <p className="text-base text-white/90 drop-shadow sm:text-lg md:text-xl">
            Join CISMA Community for Regular Events !
          </p>
          <Link
            href="/conference-2027"
            className="pointer-events-auto mt-5 inline-block rounded-md bg-white px-6 py-3 text-sm font-bold text-neutral-900 shadow-lg transition hover:bg-neutral-100"
          >
            Explore the 2027 conference →
          </Link>
        </div>

        {/* Place name of the current photo */}
        <p className="absolute bottom-6 left-6 z-20 hidden text-xs font-semibold uppercase tracking-widest text-white/80 md:block">
          {SLIDES[index].place}
        </p>

        {/* Dots */}
        <div className="absolute bottom-5 right-5 z-20 flex gap-2 md:bottom-6 md:right-8">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}: ${s.place}`}
              aria-current={i === index}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-7 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scroll-down arrow */}
      <div className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 translate-y-1/2">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-cisma-navy shadow-md">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="white">
            <path d="M5 7l5 6 5-6z" />
          </svg>
        </div>
      </div>
    </section>
  )
}