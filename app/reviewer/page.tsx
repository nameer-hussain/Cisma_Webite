'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CONF = 'cisma-2027'

type Author = { position: number; full_name: string; affiliation: string; email: string; is_presenting: boolean }
type Sub = {
  id: string; ref_no: number; track_id: string | null; topic_id: string | null
  title: string; abstract: string; keywords: string | null; file_path: string | null
  status: string; submission_authors: Author[]
}
type Assignment = { id: string; submission_id: string; reviewer_id: string; created_at: string }
type Review = {
  id: string; assignment_id: string; score_topic: number; score_research: number; score_design: number
  score_clarity: number; recommendation: string; comments: string | null
}
type Form = { topic: string; research: string; design: string; clarity: string; rec: string; comments: string }

const EMPTY: Form = { topic: '', research: '', design: '', clarity: '', rec: '', comments: '' }
const RECS = [
  { v: 'accept', l: 'Accept' },
  { v: 'accept_if_space', l: 'Accept if space' },
  { v: 'reject', l: 'Reject' },
]
const refLabel = (n: number) => `CISMA2027-${String(n).padStart(4, '0')}`
const sorted = (a: Author[]) => [...a].sort((x, y) => x.position - y.position)
const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'

const fromReview = (r: Review | undefined): Form =>
  r
    ? {
        topic: String(r.score_topic), research: String(r.score_research), design: String(r.score_design),
        clarity: String(r.score_clarity), rec: r.recommendation, comments: r.comments ?? '',
      }
    : EMPTY

function Score({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-neutral-500">{label}</label>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose...</option>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <option key={n} value={String(n)}>{n}{n === 1 ? ' (poor)' : n === 6 ? ' (excellent)' : ''}</option>
        ))}
      </select>
    </div>
  )
}

export default function ReviewerPage() {
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [uid, setUid] = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [subs, setSubs] = useState<Record<string, Sub>>({})
  const [reviews, setReviews] = useState<Record<string, Review>>({})
  const [tracks, setTracks] = useState<Record<string, string>>({})
  const [forms, setForms] = useState<Record<string, Form>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async (userId: string) => {
    const supabase = createClient()
    const [a, s, r, t] = await Promise.all([
      supabase.from('review_assignments').select('id, submission_id, reviewer_id, created_at').eq('reviewer_id', userId).order('created_at'),
      supabase.from('submissions').select('*, submission_authors(*)').eq('conference_slug', CONF),
      supabase.from('reviews').select('*'),
      supabase.from('tracks').select('id, name').eq('conference_slug', CONF),
    ])
    if (a.error) setMsg({ type: 'err', text: a.error.message })
    const list = (a.data ?? []) as Assignment[]
    const revs = Object.fromEntries(((r.data ?? []) as Review[]).map((x) => [x.assignment_id, x]))
    setAssignments(list)
    setSubs(Object.fromEntries(((s.data ?? []) as Sub[]).map((x) => [x.id, x])))
    setReviews(revs)
    setTracks(Object.fromEntries(((t.data ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name])))
    setForms((prev) => {
      const next = { ...prev }
      for (const x of list) if (!next[x.id]) next[x.id] = fromReview(revs[x.id])
      return next
    })
  }, [])

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return router.replace('/login')
      const { data: me } = await supabase.from('profiles').select('role').eq('id', u.user.id).single()
      if (!['reviewer', 'admin'].includes(me?.role ?? '')) return setState('denied')
      setUid(u.user.id)
      await load(u.user.id)
      setState('ok')
    })()
  }, [router, load])

  const setField = (id: string, k: keyof Form, v: string) =>
    setForms((p) => ({ ...p, [id]: { ...(p[id] ?? EMPTY), [k]: v } }))

  async function save(a: Assignment) {
    const f = forms[a.id] ?? EMPTY
    if (!f.topic || !f.research || !f.design || !f.clarity || !f.rec)
      return setMsg({ type: 'err', text: 'Please give all four scores and a recommendation.' })
    const { error } = await createClient().rpc('submit_review', {
      p_assignment: a.id, p_topic: Number(f.topic), p_research: Number(f.research),
      p_design: Number(f.design), p_clarity: Number(f.clarity), p_recommendation: f.rec, p_comments: f.comments,
    })
    if (error) return setMsg({ type: 'err', text: error.message })
    const { data: em, error: emErr } = await createClient().functions.invoke('send-review-email', { body: { event: 'report_in', assignment_id: a.id } })
    const note = emErr ? ' The email to the examiner could not be sent.' : em?.ok ? ' The examiner was notified by email.' : ''
    setMsg({ type: 'ok', text: `Your report was saved.${note}` })
    await load(uid)
  }

  async function download(path: string) {
    const { data, error } = await createClient().storage.from('submissions').createSignedUrl(path, 60)
    if (error || !data) return setMsg({ type: 'err', text: error?.message ?? 'Could not open the file.' })
    window.open(data.signedUrl, '_blank')
  }

  if (state === 'loading') return <main className="bg-white"><div className="px-6 pt-28 text-center text-neutral-500">Loading...</div></main>
  if (state === 'denied')
    return (
      <main className="bg-white"><div className="mx-auto max-w-2xl px-6 pb-24 pt-28 text-center">
        <h1 className="font-heading text-3xl font-medium text-neutral-900">Access denied</h1>
        <p className="mt-4 text-neutral-600">This page is for reviewers.</p>
      </div></main>
    )

  const shown = assignments.filter((a) => subs[a.submission_id])
  const done = shown.filter((a) => reviews[a.id]).length

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/dashboard" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">&larr; Back to dashboard</Link>
        <h1 className="mt-4 font-heading text-4xl font-medium tracking-tight text-neutral-900">My reviews</h1>
        <p className="mt-2 text-sm text-neutral-600">{shown.length} assigned &middot; {done} report(s) submitted</p>
        {msg && <p className={`mt-3 text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

        <div className="mt-6 space-y-3">
          {shown.map((a) => {
            const s = subs[a.submission_id]
            const au = sorted(s.submission_authors ?? [])
            const rep = reviews[a.id]
            const f = forms[a.id] ?? EMPTY
            const isOpen = open === a.id
            const avg = [f.topic, f.research, f.design, f.clarity].every(Boolean)
              ? ([f.topic, f.research, f.design, f.clarity].reduce((x, y) => x + Number(y), 0) / 4).toFixed(2)
              : null
            return (
              <div key={a.id} className="rounded-2xl border border-gray-100 bg-white">
                <button onClick={() => setOpen(isOpen ? null : a.id)} className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-neutral-500">
                      {refLabel(s.ref_no)}{tracks[s.track_id ?? ''] && <> &middot; {tracks[s.track_id ?? '']}</>}
                    </span>
                    <span className="mt-1 block font-semibold text-neutral-900">{s.title}</span>
                    <span className="mt-1 block text-sm text-neutral-600">{au.map((x) => x.full_name).join(', ')}</span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${rep ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {rep ? 'Report submitted' : 'Report pending'}
                  </span>
                </button>

                {isOpen && (
                  <div className="space-y-6 border-t border-gray-100 p-5">
                    <div>
                      <p className="text-xs font-semibold text-neutral-500">Abstract</p>
                      <div className="mt-1 space-y-3 text-[15px] leading-relaxed text-neutral-700">
                        {s.abstract.split(/\n\s*\n/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                      </div>
                      {s.keywords && <p className="mt-2 text-sm text-neutral-600">Keywords: {s.keywords}</p>}
                      {s.file_path && (
                        <button onClick={() => download(s.file_path as string)} className="mt-3 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">Download Word file</button>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-500">Authors</p>
                      <ul className="mt-1 space-y-1 text-sm text-neutral-700">
                        {au.map((x) => (
                          <li key={x.position}>
                            {x.full_name}{x.is_presenting && <strong> (presenting)</strong>}, {x.affiliation}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="font-semibold text-neutral-900">Your report</p>
                      <p className="mt-1 text-xs text-neutral-500">Scores: 1 (poor) to 6 (excellent). Authors do not see your name or your report.</p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Score label="Appropriateness and importance of the topic" value={f.topic} onChange={(v) => setField(a.id, 'topic', v)} />
                        <Score label="Original research with a theoretical basis" value={f.research} onChange={(v) => setField(a.id, 'research', v)} />
                        <Score label="Research design or conceptual framework" value={f.design} onChange={(v) => setField(a.id, 'design', v)} />
                        <Score label="Organization and clarity of the abstract" value={f.clarity} onChange={(v) => setField(a.id, 'clarity', v)} />
                      </div>
                      {avg && <p className="mt-3 text-sm text-neutral-700">Overall score (average): <strong>{avg}</strong></p>}
                      <div className="mt-4">
                        <label className="mb-1 block text-xs text-neutral-500">Recommendation</label>
                        <select className={inputClass} value={f.rec} onChange={(e) => setField(a.id, 'rec', e.target.value)}>
                          <option value="">Choose...</option>
                          {RECS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                        </select>
                      </div>
                      <div className="mt-4">
                        <label className="mb-1 block text-xs text-neutral-500">Comments (for the examiner)</label>
                        <textarea className={inputClass} rows={5} value={f.comments} onChange={(e) => setField(a.id, 'comments', e.target.value)} />
                      </div>
                      <button onClick={() => save(a)} className="mt-4 rounded-md bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-neutral-700">
                        {rep ? 'Update report' : 'Submit report'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {!shown.length && <p className="text-neutral-500">No abstracts have been assigned to you yet.</p>}
        </div>
      </div>
    </main>
  )
}