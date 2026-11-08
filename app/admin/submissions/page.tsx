'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CONF = 'cisma-2027'

type Author = { position: number; full_name: string; affiliation: string; email: string; is_presenting: boolean }
type Sub = {
  id: string; ref_no: number; submission_type_id: string | null; track_id: string | null; topic_id: string | null
  title: string; abstract: string; keywords: string | null; file_path: string | null
  status: string; created_at: string; submission_authors: Author[]
}

const STATUSES = [
  { v: 'submitted', l: 'Submitted' },
  { v: 'under_review', l: 'Under review' },
  { v: 'accepted_oral', l: 'Accepted (oral)' },
  { v: 'accepted_poster', l: 'Accepted (poster)' },
  { v: 'rejected', l: 'Not accepted' },
  { v: 'withdrawn', l: 'Withdrawn' },
]
const statusLabel = (v: string) => STATUSES.find((s) => s.v === v)?.l ?? v
const refLabel = (n: number) => `CISMA2027-${String(n).padStart(4, '0')}`
const inputClass =
  'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'
const sorted = (a: Author[]) => [...a].sort((x, y) => x.position - y.position)

function csvCell(v: string | number | null | undefined) {
  const s = String(v ?? '').replace(/\r?\n/g, ' ')
  return `"${s.replace(/"/g, '""')}"`
}

export default function AdminSubmissionsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [list, setList] = useState<Sub[]>([])
  const [types, setTypes] = useState<Record<string, string>>({})
  const [tracks, setTracks] = useState<Record<string, string>>({})
  const [topics, setTopics] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [fStatus, setFStatus] = useState('')
  const [fType, setFType] = useState('')
  const [fTrack, setFTrack] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [s, t, tr, tp] = await Promise.all([
      supabase.from('submissions').select('*, submission_authors(*)').eq('conference_slug', CONF).order('ref_no'),
      supabase.from('submission_types').select('id, name').eq('conference_slug', CONF),
      supabase.from('tracks').select('id, name').eq('conference_slug', CONF),
      supabase.from('topics').select('id, title'),
    ])
    if (s.error) setMsg({ type: 'err', text: s.error.message })
    setList((s.data ?? []) as Sub[])
    const map = (rows: { id: string; name?: string; title?: string }[] | null) =>
      Object.fromEntries((rows ?? []).map((x) => [x.id, (x.name ?? x.title) as string]))
    setTypes(map(t.data))
    setTracks(map(tr.data))
    setTopics(map(tp.data))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return router.replace('/login')
      const { data: me } = await supabase.from('profiles').select('role').eq('id', u.user.id).single()
      if (me?.role !== 'admin') return setStatus('denied')
      await load()
      setStatus('ok')
    })()
  }, [router, load])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return list.filter((s) => {
      if (fStatus && s.status !== fStatus) return false
      if (fType && s.submission_type_id !== fType) return false
      if (fTrack && s.track_id !== fTrack) return false
      if (!needle) return true
      const hay = [s.title, refLabel(s.ref_no), ...s.submission_authors.map((a) => `${a.full_name} ${a.affiliation} ${a.email}`)]
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [list, fStatus, fType, fTrack, q])

  async function setSubStatus(s: Sub, value: string) {
    const { error } = await createClient().from('submissions').update({ status: value }).eq('id', s.id)
    if (error) return setMsg({ type: 'err', text: error.message })
    setMsg({ type: 'ok', text: `${refLabel(s.ref_no)} set to ${statusLabel(value)}.` })
    await load()
  }

  async function download(path: string) {
    const { data, error } = await createClient().storage.from('submissions').createSignedUrl(path, 60)
    if (error || !data) return setMsg({ type: 'err', text: error?.message ?? 'Could not open the file.' })
    window.open(data.signedUrl, '_blank')
  }

  function exportCsv() {
    const head = ['Reference', 'Title', 'Status', 'Type', 'Track', 'Topic', 'Presenting author', 'Authors', 'Affiliations', 'Emails', 'Keywords', 'Abstract', 'Submitted at']
    const lines = shown.map((s) => {
      const au = sorted(s.submission_authors)
      return [
        refLabel(s.ref_no), s.title, statusLabel(s.status),
        types[s.submission_type_id ?? ''] ?? '', tracks[s.track_id ?? ''] ?? '', topics[s.topic_id ?? ''] ?? '',
        au.find((a) => a.is_presenting)?.full_name ?? '',
        au.map((a) => a.full_name).join('; '), au.map((a) => a.affiliation).join('; '), au.map((a) => a.email).join('; '),
        s.keywords ?? '', s.abstract, new Date(s.created_at).toISOString().slice(0, 16).replace('T', ' '),
      ].map(csvCell).join(',')
    })
    const blob = new Blob(['\ufeff' + [head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cisma-2027-submissions.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (status === 'loading') return <main className="bg-white"><div className="px-6 pt-28 text-center text-neutral-500">Loading...</div></main>
  if (status === 'denied')
    return (
      <main className="bg-white"><div className="mx-auto max-w-2xl px-6 pb-24 pt-28 text-center">
        <h1 className="font-heading text-3xl font-medium text-neutral-900">Access denied</h1>
        <p className="mt-4 text-neutral-600">You do not have permission to view this page.</p>
      </div></main>
    )

  const counts = STATUSES.map((s) => ({ ...s, n: list.filter((x) => x.status === s.v).length })).filter((s) => s.n > 0)

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/admin" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">&larr; Back to dashboard</Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900">Submissions</h1>
          <button onClick={exportCsv} className="rounded-md bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700">Download CSV</button>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          {list.length} total{counts.length > 0 && <> &middot; {counts.map((c) => `${c.n} ${c.l.toLowerCase()}`).join(', ')}</>}
        </p>
        {msg && <p className={`mt-3 text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <input className={inputClass + ' min-w-[220px] flex-1'} placeholder="Search title, author, affiliation, email or reference" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={inputClass} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          <select className={inputClass} value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="">All types</option>
            {Object.entries(types).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
          </select>
          <select className={inputClass} value={fTrack} onChange={(e) => setFTrack(e.target.value)}>
            <option value="">All tracks</option>
            {Object.entries(tracks).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
          </select>
        </div>

        <div className="mt-6 space-y-3">
          {shown.map((s) => {
            const au = sorted(s.submission_authors)
            const isOpen = open === s.id
            return (
              <div key={s.id} className="rounded-2xl border border-gray-100 bg-white">
                <button onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-neutral-500">
                      {refLabel(s.ref_no)}
                      {types[s.submission_type_id ?? ''] && <> &middot; {types[s.submission_type_id ?? '']}</>}
                      {tracks[s.track_id ?? ''] && <> &middot; {tracks[s.track_id ?? '']}</>}
                    </span>
                    <span className="mt-1 block font-semibold text-neutral-900">{s.title}</span>
                    <span className="mt-1 block text-sm text-neutral-600">{au.map((a) => a.full_name).join(', ')}</span>
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-neutral-700">{statusLabel(s.status)}</span>
                </button>

                {isOpen && (
                  <div className="space-y-5 border-t border-gray-100 p-5">
                    <div>
                      <p className="text-xs font-semibold text-neutral-500">Abstract</p>
                      <div className="mt-1 space-y-3 text-[15px] leading-relaxed text-neutral-700">
                        {s.abstract.split(/\n\s*\n/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                      </div>
                      {s.keywords && <p className="mt-2 text-sm text-neutral-600">Keywords: {s.keywords}</p>}
                      {topics[s.topic_id ?? ''] && <p className="mt-1 text-sm text-neutral-600">Topic: {topics[s.topic_id ?? '']}</p>}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-500">Authors</p>
                      <ul className="mt-1 space-y-1 text-sm text-neutral-700">
                        {au.map((a) => (
                          <li key={a.position}>
                            {a.full_name}{a.is_presenting && <strong> (presenting)</strong>}, {a.affiliation},{' '}
                            <a href={`mailto:${a.email}`} className="text-cisma-blue hover:underline">{a.email}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="text-sm text-neutral-600">Status</label>
                      <select className={inputClass} value={s.status} onChange={(e) => setSubStatus(s, e.target.value)}>
                        {STATUSES.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
                      </select>
                      {s.file_path && (
                        <button onClick={() => download(s.file_path as string)} className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">Download Word file</button>
                      )}
                      <span className="text-xs text-neutral-400">Submitted {new Date(s.created_at).toLocaleString('en-GB')}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {!shown.length && <p className="text-neutral-500">{list.length ? 'No submissions match these filters.' : 'No submissions yet.'}</p>}
        </div>
      </div>
    </main>
  )
}