'use client'

import Link from 'next/link'
import { lectureHref, lectureName, lectureShortDate, useUpcomingLectures } from '@/lib/lectureLive'

/** Slim headline strip: a fixed "Upcoming lecture" label and the lecture headlines scrolling beside it. */
export default function LectureTicker() {
  const { lectures, loading } = useUpcomingLectures(4)
  if (loading || lectures.length === 0) return null

  // the list is shown twice so the loop has no gap
  const row = (suffix: string) =>
    lectures.map((l) => (
      <Link key={l.slug + suffix} href={lectureHref(l)} className="mx-10 inline-flex items-center gap-3 whitespace-nowrap hover:underline">
        <span className="h-1.5 w-1.5 rounded-full bg-cisma-gold" aria-hidden />
        <span className="font-semibold">{lectureName(l)}</span>
        <span className="text-white/70">{lectureShortDate(l)}</span>
        {l.registration_open !== false && <span className="font-semibold text-cisma-gold">Register now →</span>}
      </Link>
    ))

  return (
    <div className="mt-6 flex items-stretch overflow-hidden bg-cisma-navy text-sm text-white" role="region" aria-label="Upcoming lectures">
      <style>{`
        @keyframes cisma-ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .cisma-ticker-track { display: inline-flex; width: max-content; animation: cisma-ticker 45s linear infinite; }
        .cisma-ticker-wrap:hover .cisma-ticker-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .cisma-ticker-track { animation: none; } }
      `}</style>

      <div className="relative z-10 flex shrink-0 items-center gap-2 bg-cisma-gold px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-900 sm:px-6">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neutral-900 opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-neutral-900" />
        </span>
        Upcoming lecture
      </div>

      <div className="cisma-ticker-wrap relative flex-1 overflow-hidden py-3">
        <div className="cisma-ticker-track">
          <div className="inline-flex">{row('a')}</div>
          <div className="inline-flex" aria-hidden>{row('b')}</div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-cisma-navy to-transparent" />
      </div>
    </div>
  )
}