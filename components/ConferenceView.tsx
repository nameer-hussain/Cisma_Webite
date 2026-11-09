'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PageView from '@/components/PageView'

type Conf = {
  slug: string; name: string; theme: string | null; description: string
  start_date: string | null; end_date: string | null
  venue: string | null; city: string | null; country: string | null
  hosts: string | null; contact_email: string | null; platform_email: string | null
  submission_guidelines: string; publication_info: string; published: boolean
  hero_image: string | null
  submissions_open: boolean; submissions_deadline: string | null
}
type Deadline = { id: string; label: string; due_date: string }
type Track = { id: string; name: string; description: string; sort_order: number }
type Topic = { id: string; track_id: string; title: string; sort_order: number }
type SubType = { id: string; category: string; name: string; description: string; sort_order: number }
type Keynote = { slug: string; speaker_name: string; title: string | null; photo: string | null; bio: string | null }

const NAVY = '#2a4f87'
const ACCENTS = ['#2a4f87', '#4f8f9c', '#7aa37f']
const LOGOS = [
  { src: '/logos/logo-cattolica.png', alt: 'Università Cattolica del Sacro Cuore' },
  { src: '/logos/logo-sisu.png', alt: 'Shanghai International Studies University' },
]

const utc = (s: string) => new Date(`${s}T00:00:00Z`)
const fmt = (s: string, o: Intl.DateTimeFormatOptions) => utc(s).toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' })
const fullDate = (s: string) => fmt(s, { day: 'numeric', month: 'long', year: 'numeric' })
const daysUntil = (s: string) => Math.ceil((utc(s).getTime() - Date.now()) / 86400000)
const paragraphs = (s: string) => s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

function dateRange(a: string | null, b: string | null) {
  if (!a) return ''
  if (!b || a === b) return fullDate(a)
  const x = utc(a)
  const y = utc(b)
  if (x.getUTCFullYear() === y.getUTCFullYear() && x.getUTCMonth() === y.getUTCMonth()) {
    return `${x.getUTCDate()}\u2013${fullDate(b)}`
  }
  return `${fmt(a, { day: 'numeric', month: 'long' })} \u2013 ${fullDate(b)}`
}

function Countdown({ start }: { start: string }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (now === null) return null
  const ms = utc(start).getTime() - now
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  const parts = [
    { v: Math.floor(s / 86400), l: 'days' },
    { v: Math.floor((s % 86400) / 3600), l: 'hours' },
    { v: Math.floor((s % 3600) / 60), l: 'minutes' },
    { v: s % 60, l: 'seconds' },
  ]
  return (
    <div className="mt-8 flex justify-center gap-3" aria-label="Time until the conference starts">
      {parts.map((p) => (
        <div key={p.l} className="min-w-[72px] rounded-lg bg-white/15 px-3 py-3 text-center backdrop-blur-sm">
          <div className="text-3xl font-semibold tabular-nums text-white md:text-4xl">{String(p.v).padStart(2, '0')}</div>
          <div className="mt-1 text-xs text-white/80">{p.l}</div>
        </div>
      ))}
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 py-12">
      <h2 className="font-heading text-3xl font-medium tracking-tight text-neutral-900 md:text-4xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  )
}

export default function ConferenceView({ slug }: { slug: string }) {
  const [state, setState] = useState<'loading' | 'missing' | 'ok'>('loading')
  const [conf, setConf] = useState<Conf | null>(null)
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [types, setTypes] = useState<SubType[]>([])
  const [keynotes, setKeynotes] = useState<Keynote[]>([])
  const [badLogos, setBadLogos] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    ;(async () => {
      const { data: c } = await supabase.from('conferences').select('*').eq('slug', slug).maybeSingle()
      if (cancelled) return
      if (!c) return setState('missing')
      const [d, t, tp, st, kn] = await Promise.all([
        supabase.from('deadlines').select('id,label,due_date').eq('conference_slug', slug).order('due_date'),
        supabase.from('tracks').select('id,name,description,sort_order').eq('conference_slug', slug).order('sort_order'),
        supabase.from('topics').select('id,track_id,title,sort_order').order('sort_order'),
        supabase.from('submission_types').select('id,category,name,description,sort_order').eq('conference_slug', slug).order('sort_order'),
        supabase.from('keynotes').select('slug,speaker_name,title,photo,bio').eq('conference_slug', slug).eq('published', true).order('sort_order'),
      ])
      if (cancelled) return
      const trackList = (t.data ?? []) as Track[]
      const ids = new Set(trackList.map((x) => x.id))
      setConf(c as Conf)
      setDeadlines((d.data ?? []) as Deadline[])
      setTracks(trackList)
      setTopics(((tp.data ?? []) as Topic[]).filter((x) => ids.has(x.track_id)))
      setTypes((st.data ?? []) as SubType[])
      setKeynotes((kn.data ?? []) as Keynote[])
      setState('ok')
    })()
    return () => { cancelled = true }
  }, [slug])

  if (state === 'loading') return <p className="pt-40 text-center text-neutral-500">Loading...</p>
  if (state === 'missing' || !conf)
    return <p className="mx-auto max-w-xl px-6 pt-40 text-center text-neutral-600">Conference information will be available soon.</p>

  const year = slug.split('-').pop()
  const place = [conf.city, conf.country].filter(Boolean).join(', ')
  const nextDeadline = deadlines.find((d) => daysUntil(d.due_date) >= 0)
  const categories = Array.from(new Set(types.map((t) => t.category)))
  const showLogos = badLogos.length < LOGOS.length
  const submissionsOpen =
    conf.submissions_open && (!conf.submissions_deadline || new Date().toISOString().slice(0, 10) <= conf.submissions_deadline)

  const nav = [
    conf.description && { id: 'about', label: 'About' },
    { id: 'committee', label: 'Organizing committee' },
    deadlines.length > 0 && { id: 'dates', label: 'Important dates' },
    tracks.length > 0 && { id: 'topics', label: 'Topics' },
    (types.length > 0 || conf.submission_guidelines) && { id: 'submissions', label: 'Submissions' },
    conf.publication_info && { id: 'publication', label: 'Publication' },
    (conf.contact_email || conf.platform_email) && { id: 'contact', label: 'Contact' },
  ].filter(Boolean) as { id: string; label: string }[]

  const facts = [
    conf.start_date && { label: 'When', value: dateRange(conf.start_date, conf.end_date) },
    (conf.venue || place) && { label: 'Where', value: conf.venue || place, sub: conf.venue ? place : '' },
    nextDeadline && {
      label: 'Next deadline',
      value: nextDeadline.label,
      sub: `${fullDate(nextDeadline.due_date)} (${daysUntil(nextDeadline.due_date)} days left)`,
    },
  ].filter(Boolean) as { label: string; value: string; sub?: string }[]

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section
        className="relative isolate overflow-hidden pb-16 pt-40 md:pt-48"
        style={conf.hero_image ? undefined : { backgroundImage: 'linear-gradient(135deg,#cfe3d1 0%,#6ea3ae 45%,#2a4f87 100%)' }}
      >
        {conf.hero_image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={conf.hero_image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/45 to-[#13294d]/80" />
          </>
        )}
        <div className="mx-auto max-w-4xl px-6 text-center">
          {!conf.published && (
            <p className="mx-auto mb-8 max-w-xl rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Preview only. This conference is not published, so visitors cannot see this page yet.
            </p>
          )}
          <h1 className="font-heading text-4xl font-medium leading-tight tracking-tight text-white drop-shadow md:text-6xl">{conf.name}</h1>
          {conf.theme && <p className="mx-auto mt-5 max-w-3xl text-xl leading-snug text-white/95 md:text-2xl">{conf.theme}</p>}
          <p className="mt-6 text-lg text-white/90">
            {dateRange(conf.start_date, conf.end_date)}
            {place && <span> &middot; {place}</span>}
          </p>
          {conf.start_date && <Countdown start={conf.start_date} />}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {submissionsOpen && (
              <Link href="/submit" className="rounded-md bg-white px-6 py-3 text-sm font-bold text-neutral-900 hover:bg-neutral-100">Submit your abstract</Link>
            )}
            <a
              href="#submissions"
              className={submissionsOpen
                ? 'rounded-md border border-white/70 px-6 py-3 text-sm font-bold text-white hover:bg-white/10'
                : 'rounded-md bg-white px-6 py-3 text-sm font-bold text-neutral-900 hover:bg-neutral-100'}
            >
              How to submit
            </a>
            {keynotes.length > 0 && (
              <Link href={`/keynote-${year}`} className="rounded-md border border-white/70 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">Meet the keynotes</Link>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Key facts ---------- */}
      {facts.length > 0 && (
        <div className="relative z-10 mx-auto -mt-8 max-w-4xl px-6">
          <dl className="grid divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-lg md:grid-cols-3 md:divide-x md:divide-y-0">
            {facts.map((f) => (
              <div key={f.label} className="px-6 py-5">
                <dt className="text-xs text-neutral-500">{f.label}</dt>
                <dd className="mt-1 font-semibold text-neutral-900">{f.value}</dd>
                {f.sub && <dd className="mt-0.5 text-sm text-neutral-600">{f.sub}</dd>}
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-6">
        {nav.length > 1 && (
          <nav className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold" aria-label="Sections">
            {nav.map((n) => <a key={n.id} href={`#${n.id}`} className="text-cisma-blue hover:underline">{n.label}</a>)}
          </nav>
        )}

        {/* ---------- About ---------- */}
        {conf.description && (
          <Section id="about" title="About the conference">
            <div className="space-y-4 text-[16px] leading-8 text-neutral-700">
              {paragraphs(conf.description).map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {conf.hosts && <p className="mt-6 text-sm text-neutral-500">Hosted by {conf.hosts}</p>}
            {showLogos && (
              <div className="mt-6 flex flex-wrap items-center gap-8">
                {LOGOS.map((l) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={l.src}
                    src={l.src}
                    alt={l.alt}
                    className={`h-14 w-auto object-contain ${badLogos.includes(l.src) ? 'hidden' : ''}`}
                    onError={() => setBadLogos((b) => (b.includes(l.src) ? b : [...b, l.src]))}
                  />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ---------- Organizing committee ---------- */}
        <div id="committee" className="scroll-mt-28">
          <PageView slug={`keynote-${year}-extra`} />
        </div>

        {/* ---------- Dates ---------- */}
        {deadlines.length > 0 && (
          <Section id="dates" title="Important dates">
            <ol className="ml-2 border-l-2 border-gray-200">
              {deadlines.map((d) => {
                const left = daysUntil(d.due_date)
                const past = left < 0
                const isNext = nextDeadline?.id === d.id
                return (
                  <li key={d.id} className="relative pb-7 pl-8 last:pb-0">
                    <span
                      className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: past ? '#c4c9d1' : isNext ? NAVY : '#8fb4bc' }}
                    />
                    <p className={`font-semibold ${past ? 'text-neutral-400' : 'text-neutral-900'}`}>{d.label}</p>
                    <p className={past ? 'text-neutral-400' : 'text-neutral-700'}>{fullDate(d.due_date)}</p>
                    {isNext && (
                      <p className="mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: NAVY }}>
                        Next &middot; {left === 0 ? 'today' : `${left} days left`}
                      </p>
                    )}
                    {past && <p className="mt-1 text-xs text-neutral-400">Closed</p>}
                  </li>
                )
              })}
            </ol>
          </Section>
        )}

        {/* ---------- Topics ---------- */}
        {tracks.length > 0 && (
          <Section id="topics" title="Topics">
            <div className="grid items-start gap-5 md:grid-cols-3">
              {tracks.map((t, i) => {
                const own = topics.filter((x) => x.track_id === t.id)
                return (
                  <details key={t.id} className="group rounded-2xl border border-gray-100 bg-white shadow-sm" style={{ borderTop: `4px solid ${ACCENTS[i % ACCENTS.length]}` }}>
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-5">
                      <span>
                        <span className="block font-semibold leading-snug text-neutral-900">{t.name}</span>
                        <span className="mt-1 block text-sm text-neutral-500">{own.length} topics</span>
                      </span>
                      <span className="mt-1 text-neutral-400 transition-transform group-open:rotate-180" aria-hidden="true">&#9662;</span>
                    </summary>
                    <div className="px-5 pb-5">
                      {t.description && <p className="mb-3 text-sm text-neutral-600">{t.description}</p>}
                      <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-neutral-700">
                        {own.map((tp) => <li key={tp.id}>{tp.title}</li>)}
                      </ul>
                    </div>
                  </details>
                )
              })}
            </div>
          </Section>
        )}

        {/* ---------- Submissions ---------- */}
        {(types.length > 0 || conf.submission_guidelines) && (
          <Section id="submissions" title="Submissions">
            <div className="grid gap-5 md:grid-cols-3">
              {categories.map((cat, i) => (
                <div key={cat} className="rounded-2xl border border-gray-100 bg-white p-5" style={{ borderTop: `4px solid ${ACCENTS[i % ACCENTS.length]}` }}>
                  <h3 className="font-semibold text-neutral-900">{cat}</h3>
                  <ul className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-700">
                    {types.filter((t) => t.category === cat).map((t) => (
                      <li key={t.id}>
                        {t.name !== cat && <span className="font-semibold text-neutral-900">{t.name}. </span>}
                        {t.description}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {conf.submission_guidelines && (
              <div className="mt-6 rounded-2xl bg-slate-50 p-6">
                <h3 className="font-semibold text-neutral-900">Guidelines</h3>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-neutral-700">
                  {paragraphs(conf.submission_guidelines).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* ---------- Publication ---------- */}
        {conf.publication_info && (
          <Section id="publication" title="Publication opportunities">
            <div className="space-y-3 text-[16px] leading-8 text-neutral-700">
              {paragraphs(conf.publication_info).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </Section>
        )}

        {/* ---------- Contact ---------- */}
        {(conf.contact_email || conf.platform_email) && (
          <Section id="contact" title="Contact">
            <ul className="space-y-2 text-[16px] text-neutral-700">
              {conf.contact_email && (
                <li>
                  Conference contact:{' '}
                  <a href={`mailto:${conf.contact_email}`} className="font-semibold text-cisma-blue hover:underline">{conf.contact_email}</a>
                </li>
              )}
              {conf.platform_email && (
                <li>
                  CISMA Platform:{' '}
                  <a href={`mailto:${conf.platform_email}`} className="font-semibold text-cisma-blue hover:underline">{conf.platform_email}</a>
                </li>
              )}
            </ul>
          </Section>
        )}
      </div>
    </>
  )
}