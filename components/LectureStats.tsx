'use client'

import { useEffect, useState } from 'react'
import { countdown, useRegistrationCount, useUpcomingLectures } from '@/lib/lectureLive'

/** Live registration box for one lecture. Put it at the top of the registration box on the lecture page. */
export default function LectureStats({ slug }: { slug: string }) {
  const total = useRegistrationCount(slug)
  const { lectures } = useUpcomingLectures(10)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  if (total === null) return null
  const lec = lectures.find((l) => l.slug === slug)
  const cd = lec ? countdown(lec, now) : ''

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
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
  )
}