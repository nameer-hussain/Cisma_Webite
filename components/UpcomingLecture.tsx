'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  countdown, lectureHref, lectureName, lectureShortDate, lectureSubtitle, lectureWhen, useUpcomingLectures,
} from '@/lib/lectureLive'

export default function UpcomingLecture() {
  const { lectures, counts, loading } = useUpcomingLectures(4)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  if (loading || lectures.length === 0) return null

  const [next, ...others] = lectures
  const total = counts[next.slug] ?? 0
  const cd = countdown(next, now)
  const open = next.registration_open !== false
  const subtitle = lectureSubtitle(next)

  return (
    <section className="bg-cisma-light py-14">
      <div className="mx-auto grid max-w-content items-center gap-10 px-6 md:grid-cols-2">
        <div className="text-center md:text-left">
          <p className="text-sm font-bold uppercase tracking-widest text-cisma-gold">Upcoming Lecture</p>
          <h2 className="mt-3 text-2xl font-bold text-cisma-navy md:text-4xl">{lectureName(next)}</h2>
          {subtitle && <p className="mt-4 text-lg text-neutral-700">{subtitle}</p>}
          <p className="mt-4 font-semibold text-cisma-blue">{lectureWhen(next)}</p>
          <p className="mt-1 text-neutral-600">Online webinar</p>

          {/* Live stats */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 md:justify-start">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              Live registration
            </div>
            <div className={`grid gap-3 text-center ${cd ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <p className="text-3xl font-bold tabular-nums text-cisma-navy">{total}</p>
                <p className="text-xs text-neutral-500">{total === 1 ? 'person registered' : 'people registered'}</p>
              </div>
              {cd && (
                <div>
                  <p className="text-2xl font-bold tabular-nums text-cisma-navy sm:text-3xl">{cd}</p>
                  <p className="text-xs text-neutral-500">{cd === 'Live now' ? 'happening now' : 'until the lecture'}</p>
                </div>
              )}
            </div>
          </div>

          <p className="mt-5 rounded-md border border-cisma-gold/40 bg-white px-4 py-3 text-sm text-neutral-700">
            Access to this lecture is for registered members only. Create a free account and register to receive the joining link.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
            {open && (
              <Link href={lectureHref(next)} className="rounded-md bg-cisma-navy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-cisma-blue">
                Register now
              </Link>
            )}
            <Link href={lectureHref(next)} className="rounded-md border border-cisma-navy px-6 py-3 text-sm font-bold text-cisma-navy transition-colors hover:bg-cisma-navy hover:text-white">
              Lecture details
            </Link>
          </div>
          {!open && <p className="mt-3 text-sm text-neutral-500">Registration for this lecture is closed.</p>}
        </div>

        {next.card_image && (
          <Link href={lectureHref(next)} className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={next.card_image} alt={`${lectureName(next)} poster`} className="mx-auto h-auto w-full max-w-md rounded-lg shadow-lg" />
          </Link>
        )}
      </div>

      {others.length > 0 && (
        <div className="mx-auto mt-12 max-w-content px-6">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-cisma-gold">Also coming up</p>
          <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
            {others.map((l) => (
              <li key={l.slug}>
                <Link href={lectureHref(l)} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-gray-50">
                  <span className="font-semibold text-cisma-navy">{lectureName(l)}</span>
                  <span className="text-right text-sm">
                    <span className="block font-semibold text-cisma-blue">{lectureShortDate(l)}</span>
                    <span className="block tabular-nums text-neutral-500">{counts[l.slug] ?? 0} registered</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}