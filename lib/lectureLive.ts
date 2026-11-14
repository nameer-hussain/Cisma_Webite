'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Page where people register / read the details of one lecture.
 *  If this gives a 404, open any lecture on the site, look at the address bar and copy that pattern here. */
export const lectureHref = (l: { slug: string }) => `/lectures/${l.slug}`

export type Lecture = {
  slug: string
  card_title: string | null
  speaker_name: string | null
  title: string | null
  slider_description: string | null
  hero_subtitle: string | null
  card_image: string | null
  lecture_date: string | null // 'YYYY-MM-DD'
  date_text: string | null
  cert_time: string | null
  registration_open: boolean | null
  startsAt: number | null // ms, worked out from lecture_date + time
  hasTime: boolean
}

const OFFSETS: Record<string, number> = { CST: 8, PKT: 5, UTC: 0, GMT: 0 }
const POLL_MS = 20000
const KEEP_AFTER_START_MS = 4 * 3600 * 1000 // hide automatically 4 hours after the start

/** lecture_date + the time written in date_text / cert_time ("17:00 CST", "1:00 PM PKT") */
function startOf(date: string | null, ...texts: (string | null)[]) {
  if (!date) return { startsAt: null as number | null, hasTime: false }
  for (const raw of texts) {
    if (!raw) continue
    const m = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
    if (!m) continue
    let h = parseInt(m[1], 10)
    const min = m[2]
    if (m[3]) {
      const pm = m[3].toUpperCase() === 'PM'
      if (pm && h < 12) h += 12
      if (!pm && h === 12) h = 0
    }
    const tz = (raw.match(/\b(CST|PKT|UTC|GMT)\b/i)?.[1] ?? 'CST').toUpperCase()
    const off = OFFSETS[tz]
    const sign = off >= 0 ? '+' : '-'
    const iso = `${date}T${String(h).padStart(2, '0')}:${min}:00${sign}${String(Math.abs(off)).padStart(2, '0')}:00`
    const t = Date.parse(iso)
    if (!Number.isNaN(t)) return { startsAt: t, hasTime: true }
  }
  const t = Date.parse(`${date}T23:59:00+08:00`)
  return { startsAt: Number.isNaN(t) ? null : t, hasTime: false }
}

/** Upcoming lectures (nearest first) with live registration counts, refreshed every 20 seconds. */
export function useUpcomingLectures(limit = 4) {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let alive = true

    async function refresh() {
      const { data } = await supabase
        .from('lectures')
        .select('slug, card_title, speaker_name, title, slider_description, hero_subtitle, card_image, lecture_date, date_text, cert_time, registration_open')
        .eq('status', 'upcoming')
        .order('lecture_date', { ascending: true, nullsFirst: false })
        .limit(limit + 2)
      if (!alive) return
      const now = Date.now()
      const list = ((data ?? []) as Omit<Lecture, 'startsAt' | 'hasTime'>[])
        .map((r) => ({ ...r, ...startOf(r.lecture_date, r.date_text, r.cert_time) }))
        .filter((l) => l.startsAt === null || l.startsAt + KEEP_AFTER_START_MS > now)
        .slice(0, limit)
      setLectures(list)
      if (list.length) {
        const { data: c } = await supabase.rpc('lecture_registration_counts', { p_slugs: list.map((l) => l.slug) })
        if (!alive) return
        const map: Record<string, number> = {}
        ;((c ?? []) as { slug: string; total: number }[]).forEach((row) => { map[row.slug] = row.total })
        setCounts(map)
      }
      setLoading(false)
    }

    refresh()
    const timer = setInterval(() => { if (!document.hidden) refresh() }, POLL_MS)
    const onVisible = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [limit])

  return { lectures, counts, loading }
}

export const lectureName = (l: Lecture) =>
  l.card_title || [l.title, l.speaker_name].filter(Boolean).join(': ')

export const lectureSubtitle = (l: Lecture) => l.slider_description || l.hero_subtitle || (l.card_title ? l.title : null)

function part(ms: number, tz: string, o: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...o }).format(new Date(ms))
}

/** "17 November 2026 · 17:00 China Standard Time (14:00 Pakistan, 09:00 UTC)"; falls back to the text in the table */
export function lectureWhen(l: Lecture) {
  if (l.startsAt !== null && l.hasTime) {
    const t = (tz: string) => part(l.startsAt!, tz, { hour: '2-digit', minute: '2-digit', hour12: false })
    const d = part(l.startsAt, 'Asia/Shanghai', { day: 'numeric', month: 'long', year: 'numeric' })
    return `${d} · ${t('Asia/Shanghai')} China Standard Time (${t('Asia/Karachi')} Pakistan, ${t('UTC')} UTC)`
  }
  return l.date_text || l.lecture_date || ''
}

/** short date for lists / ticker: "17 November 2026" */
export function lectureShortDate(l: Lecture) {
  if (l.startsAt !== null) return part(l.startsAt, 'Asia/Shanghai', { day: 'numeric', month: 'long', year: 'numeric' })
  return l.date_text || ''
}

/** "6 days 3 h", "5 h 20 min", "Live now" */
export function countdown(l: Lecture, now = Date.now()) {
  if (l.startsAt === null) return ''
  const ms = l.startsAt - now
  if (ms <= 0) return 'Live now'
  const mins = Math.floor(ms / 60000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (!l.hasTime) return d > 0 ? `${d} day${d === 1 ? '' : 's'}` : 'Today'
  if (d > 0) return `${d} day${d === 1 ? '' : 's'} ${h} h`
  if (h > 0) return `${h} h ${m} min`
  return `${m} min`
}

/** Live number of registrations for one lecture (refreshes every 20 seconds). */
export function useRegistrationCount(slug: string) {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    const supabase = createClient()
    let alive = true
    async function load() {
      const { data } = await supabase.rpc('lecture_registration_counts', { p_slugs: [slug] })
      if (!alive) return
      const row = ((data ?? []) as { slug: string; total: number }[])[0]
      setCount(row ? row.total : 0)
    }
    load()
    const timer = setInterval(() => { if (!document.hidden) load() }, POLL_MS)
    return () => { alive = false; clearInterval(timer) }
  }, [slug])
  return count
}