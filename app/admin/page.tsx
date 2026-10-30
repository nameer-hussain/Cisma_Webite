'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Row = Record<string, any>
type View = 'home' | 'lectures' | 'registrations' | 'members'

// Lectures ke naam. Naya lecture aaye to yahan aik entry add kar dein.
// Jo slug yahan na ho wo bhi dikhega (slug ke naam se).
const LECTURES: Record<string, { speaker: string; topic: string; date: string }> = {
  'paul-baker-14': {
    speaker: 'Prof. Paul Baker',
    topic:
      'Surprise Words and Core Words: Using Vibe Coding to Identify Collocational Divergence Across Corpora',
    date: '27 October 2026',
  },
  'elizabeth-hanks-15': {
    speaker: 'Dr. Elizabeth Hanks',
    topic: 'Designing and evaluating a corpus of conversation: lessons learned',
    date: '17 November 2026',
  },
}

function lectureNumber(slug: string) {
  const m = slug.match(/-(\d+)$/)
  return m ? parseInt(m[1], 10) : 0
}

function toCSV(rows: Row[], cols: string[]) {
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}

function downloadCSV(name: string, rows: Row[], cols: string[]) {
  const blob = new Blob(['\uFEFF' + toCSV(rows, cols)], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

function sortNewest(rows: Row[]) {
  return [...rows].sort((a, b) =>
    String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
  )
}

function formatCell(col: string, value: any) {
  if (value === null || value === undefined) return ''
  if (col.endsWith('_at')) {
    const d = new Date(value)
    return isNaN(d.getTime()) ? String(value) : d.toLocaleString()
  }
  return String(value)
}

// Card ka common design
function AdminCard({
  tag,
  title,
  description,
  stat,
  onClick,
  href,
  label = 'Open ->',
}: {
  tag: string
  title: string
  description?: string
  stat?: string
  onClick?: () => void
  href?: string
  label?: string
}) {
  const button =
    'mt-6 inline-block rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-neutral-700'
  return (
    <div className="flex flex-col rounded-[28px] border border-gray-100 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-600">
        {tag}
      </span>
      <h2 className="mt-3 font-heading text-2xl font-semibold leading-tight text-neutral-900">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{description}</p>
      )}
      {stat && <p className="mt-3 text-sm font-semibold text-neutral-900">{stat}</p>}
      <div className="mt-auto">
        {href ? (
          <Link href={href} className={button}>
            {label}
          </Link>
        ) : (
          <button onClick={onClick} className={button}>
            {label}
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('home')
  const [lecture, setLecture] = useState('')
  const [profiles, setProfiles] = useState<Row[]>([])
  const [regs, setRegs] = useState<Row[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.replace('/login')
        return
      }

      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single()

      if (me?.role !== 'admin') {
        setStatus('denied')
        return
      }

      const [p, r] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('lecture_registrations').select('*'),
      ])

      if (p.error) setError(p.error.message)
      else if (r.error) setError(r.error.message)

      setProfiles(sortNewest(p.data ?? []))
      setRegs(sortNewest(r.data ?? []))
      setStatus('ok')
    }

    load()
  }, [router])

  // Saare lectures: jo LECTURES mein hain + jin ki registrations hain. Naye lecture pehle.
  const lectureList = useMemo(() => {
    const counts = new Map<string, number>()
    regs.forEach((r) => {
      if (r.lecture_slug) counts.set(r.lecture_slug, (counts.get(r.lecture_slug) ?? 0) + 1)
    })
    Object.keys(LECTURES).forEach((slug) => {
      if (!counts.has(slug)) counts.set(slug, 0)
    })
    return [...counts.entries()]
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => lectureNumber(b.slug) - lectureNumber(a.slug))
  }, [regs])

  if (status === 'loading') {
    return (
      <main className="bg-white">
        <div className="mx-auto max-w-2xl px-6 pb-24 pt-20 text-center text-neutral-500 md:pt-28">
          Loading...
        </div>
      </main>
    )
  }

  if (status === 'denied') {
    return (
      <main className="bg-white">
        <div className="mx-auto max-w-2xl px-6 pb-24 pt-20 text-center md:pt-28">
          <h1 className="font-heading text-3xl font-medium text-neutral-900">Access denied</h1>
          <p className="mt-4 text-neutral-600">You do not have permission to view this page.</p>
        </div>
      </main>
    )
  }

  // Table ka data
  const rows: Row[] =
    view === 'members' ? profiles : view === 'registrations' ? regs.filter((r) => r.lecture_slug === lecture) : []
  const cols = rows[0]
    ? Object.keys(rows[0]).filter((c) => c !== 'id' && c !== 'user_id')
    : []
  const q = query.trim().toLowerCase()
  const filtered = q ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q)) : rows

  function go(next: View, slug = '') {
    setView(next)
    setLecture(slug)
    setQuery('')
  }

  const backButton = (label: string, target: View) => (
    <button
      onClick={() => go(target)}
      className="mb-6 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
    >
      &larr; {label}
    </button>
  )

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
        <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900 md:text-5xl">
          Admin Dashboard
        </h1>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {/* HOME: main cards */}
        {view === 'home' && (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AdminCard
              tag="Registrations"
              title="Lecture Registrations"
              description="Choose a lecture and review everyone who registered for it. Search and download as CSV."
              stat={`${regs.length} registrations in total`}
              onClick={() => go('lectures')}
            />
            <AdminCard
              tag="Accounts"
              title="Members"
              description="See everyone who has created an account on the website. Search and download as CSV."
              stat={`${profiles.length} accounts`}
              onClick={() => go('members')}
            />
            <AdminCard
              tag="Content"
              title="Manage Podcast"
              description="Add, edit and manage CISMA Podcast episodes."
              href="/admin/podcast"
            />
          </div>
        )}

        {/* LECTURES: har lecture ka card */}
        {view === 'lectures' && (
          <div className="mt-8">
            {backButton('Back to dashboard', 'home')}
            <p className="mb-6 text-neutral-600">
              Which lecture&apos;s registrations do you want to see?
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lectureList.map((l) => {
                const info = LECTURES[l.slug]
                const n = lectureNumber(l.slug)
                return (
                  <AdminCard
                    key={l.slug}
                    tag={n ? `Lecture ${n}` : 'Lecture'}
                    title={info ? info.speaker : l.slug}
                    description={info?.topic}
                    stat={`${l.count} registration${l.count === 1 ? '' : 's'}${
                      info ? ` · ${info.date}` : ''
                    }`}
                    onClick={() => go('registrations', l.slug)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* TABLE: registrations ya members */}
        {(view === 'registrations' || view === 'members') && (
          <div className="mt-8">
            {view === 'registrations'
              ? backButton('Back to lectures', 'lectures')
              : backButton('Back to dashboard', 'home')}

            <h2 className="font-heading text-2xl font-semibold text-neutral-900">
              {view === 'members'
                ? 'Members'
                : `${LECTURES[lecture]?.speaker ?? lecture} · Registrations`}
            </h2>
            {view === 'registrations' && LECTURES[lecture] && (
              <p className="mt-1 text-sm text-neutral-600">{LECTURES[lecture].topic}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <input
                className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                onClick={() =>
                  downloadCSV(
                    view === 'members' ? 'members.csv' : `${lecture}-registrations.csv`,
                    filtered,
                    cols
                  )
                }
                disabled={!filtered.length}
                className="rounded-md border border-black bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
              >
                Download CSV
              </button>
            </div>

            <p className="mt-4 text-sm text-neutral-500">
              Showing {filtered.length} of {rows.length}
            </p>

            <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-left text-[14px]">
                <thead className="bg-gray-50 text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    {cols.map((c) => (
                      <th key={c} className="whitespace-nowrap px-4 py-3 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id ?? i} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-neutral-500">{i + 1}</td>
                      {cols.map((c) => (
                        <td key={c} className="whitespace-nowrap px-4 py-3 text-neutral-800">
                          {formatCell(c, r[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <p className="px-4 py-6 text-center text-neutral-500">No records found.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}