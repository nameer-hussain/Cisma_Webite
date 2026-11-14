'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CONF = 'cisma-2027'

type Author = { position: number; full_name: string; affiliation: string; email: string; is_presenting: boolean }
type Sub = {
  id: string; ref_no: number; track_id: string | null; topic_id: string | null
  title: string; abstract: string; keywords: string | null; file_path: string | null
  status: string; created_at: string; submission_authors: Author[]
}
type Assignment = { id: string; submission_id: string; reviewer_id: string }
type Review = {
  id: string; assignment_id: string; score_topic: number; score_research: number; score_design: number
  score_clarity: number; recommendation: string; comments: string | null
}
type Decision = { submission_id: string; decision: string; note: string | null; released: boolean }
type Reviewer = { id: string; full_name: string | null; email: string | null }
type Flow = 'new' | 'waiting' | 'ready' | 'decided'

const REC: Record<string, string> = { accept: 'Accept', accept_if_space: 'Accept if space', reject: 'Reject' }
const DEC = [
  { v: 'accepted_oral', l: 'Accepted (oral)' },
  { v: 'accepted_poster', l: 'Accepted (poster)' },
  { v: 'rejected', l: 'Not accepted' },
]
const decLabel = (v: string) => DEC.find((d) => d.v === v)?.l ?? v
const FLOW: { v: Flow; l: string }[] = [
  { v: 'new', l: 'No reviewer yet' },
  { v: 'waiting', l: 'Waiting for reports' },
  { v: 'ready', l: 'Ready to decide' },
  { v: 'decided', l: 'Decided' },
]
const refLabel = (n: number) => `CISMA2027-${String(n).padStart(4, '0')}`
const sorted = (a: Author[]) => [...a].sort((x, y) => x.position - y.position)
const avgOf = (r: Review) => ((r.score_topic + r.score_research + r.score_design + r.score_clarity) / 4).toFixed(2)
const inputClass =
  'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'

export default function ExaminerPage() {
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [subs, setSubs] = useState<Sub[]>([])
  const [tracks, setTracks] = useState<Record<string, string>>({})
  const [myTracks, setMyTracks] = useState<string[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [pick, setPick] = useState<Record<string, string>>({})
  const [dform, setDform] = useState<Record<string, { decision: string; note: string }>>({})
  const [fFlow, setFFlow] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async (userId: string) => {
    const supabase = createClient()
    const [s, t, te, a, r, d, rv] = await Promise.all([
      supabase.from('submissions').select('*, submission_authors(*)').eq('conference_slug', CONF).order('ref_no'),
      supabase.from('tracks').select('id, name').eq('conference_slug', CONF),
      supabase.from('track_examiners').select('track_id, examiner_id'),
      supabase.from('review_assignments').select('id, submission_id, reviewer_id'),
      supabase.from('reviews').select('*'),
      supabase.from('submission_decisions').select('submission_id, decision, note, released'),
      supabase.rpc('list_reviewers'),
    ])
    if (s.error) setMsg({ type: 'err', text: s.error.message })
    const decs = (d.data ?? []) as Decision[]
    setSubs((s.data ?? []) as Sub[])
    setTracks(Object.fromEntries(((t.data ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name])))
    setMyTracks(((te.data ?? []) as { track_id: string; examiner_id: string }[]).filter((x) => x.examiner_id === userId).map((x) => x.track_id))
    setAssignments((a.data ?? []) as Assignment[])
    setReviews((r.data ?? []) as Review[])
    setDecisions(decs)
    setReviewers((rv.data ?? []) as Reviewer[])
    setDform((prev) => {
      const next = { ...prev }
      for (const x of decs) if (!next[x.submission_id]) next[x.submission_id] = { decision: x.decision, note: x.note ?? '' }
      return next
    })
  }, [])

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return router.replace('/login')
      const { data: me } = await supabase.from('profiles').select('role').eq('id', u.user.id).single()
      if (!['examiner', 'admin'].includes(me?.role ?? '')) return setState('denied')
      await load(u.user.id)
      setState('ok')
    })()
  }, [router, load])

  const reviewerName = (id: string) => {
    const r = reviewers.find((x) => x.id === id)
    return r ? (r.full_name || r.email || id) : 'Reviewer'
  }
  const reviewOf = (assignmentId: string) => reviews.find((r) => r.assignment_id === assignmentId)
  const decisionOf = (subId: string) => decisions.find((d) => d.submission_id === subId)

  function flowOf(s: Sub): Flow {
    if (decisionOf(s.id)) return 'decided'
    const as = assignments.filter((a) => a.submission_id === s.id)
    if (!as.length) return 'new'
    return as.every((a) => reviewOf(a.id)) ? 'ready' : 'waiting'
  }

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return subs.filter((s) => {
      if (fFlow && flowOf(s) !== fFlow) return false
      if (!needle) return true
      return [s.title, refLabel(s.ref_no), ...(s.submission_authors ?? []).map((a) => `${a.full_name} ${a.affiliation}`)]
        .join(' ').toLowerCase().includes(needle)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs, assignments, reviews, decisions, fFlow, q])

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string, userId?: string) {
    const { error } = await fn()
    if (error) return setMsg({ type: 'err', text: error.message })
    setMsg({ type: 'ok', text: ok })
    const supabase = createClient()
    const { data: u } = await supabase.auth.getUser()
    await load(userId ?? u.user?.id ?? '')
  }

  const assign = async (s: Sub) => {
    const rid = pick[s.id]
    if (!rid) return setMsg({ type: 'err', text: 'Choose a reviewer first.' })
    const supabase = createClient()
    const { data, error } = await supabase.rpc('assign_reviewer', { p_submission: s.id, p_reviewer: rid })
    if (error) return setMsg({ type: 'err', text: error.message })
    let note = ''
    if (data) {
      const { data: em, error: emErr } = await supabase.functions.invoke('send-review-email', { body: { event: 'assigned', assignment_id: data } })
      note = emErr ? ' The email to the reviewer could not be sent.' : em?.ok ? ' Email sent to the reviewer.' : ''
    }
    setMsg({ type: 'ok', text: `Reviewer assigned.${note}` })
    const { data: u } = await supabase.auth.getUser()
    await load(u.user?.id ?? '')
  }
  const unassign = (a: Assignment) => {
    if (!window.confirm('Take this abstract back from the reviewer?')) return
    return run(() => createClient().rpc('unassign_reviewer', { p_assignment: a.id }), 'Reviewer removed.')
  }
  const decide = (s: Sub) => {
    const f = dform[s.id]
    if (!f?.decision) return setMsg({ type: 'err', text: 'Choose a decision first.' })
    if (!window.confirm(`Save the decision "${decLabel(f.decision)}" for ${refLabel(s.ref_no)}?`)) return
    return run(() => createClient().rpc('set_decision', { p_submission: s.id, p_decision: f.decision, p_note: f.note }), 'Decision saved. The author will not see it until the admin releases it.')
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
        <p className="mt-4 text-neutral-600">This page is for section editors.</p>
      </div></main>
    )

  const counts = FLOW.map((f) => ({ ...f, n: subs.filter((s) => flowOf(s) === f.v).length }))

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/dashboard" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">&larr; Back to dashboard</Link>
        <h1 className="mt-4 font-heading text-4xl font-medium tracking-tight text-neutral-900">Section editor</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {myTracks.length > 0 ? <>Your track(s): {myTracks.map((t) => tracks[t] ?? t).join(', ')}</> : 'No track is assigned to you yet. Please contact the admin.'}
        </p>
        <p className="mt-1 text-sm text-neutral-600">{subs.length} abstract(s) &middot; {counts.map((c) => `${c.n} ${c.l.toLowerCase()}`).join(', ')}</p>
        {msg && <p className={`mt-3 text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <input className={inputClass + ' min-w-[220px] flex-1'} placeholder="Search title, author or reference" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={inputClass} value={fFlow} onChange={(e) => setFFlow(e.target.value)}>
            <option value="">All abstracts</option>
            {FLOW.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
          </select>
        </div>

        <div className="mt-6 space-y-3">
          {shown.map((s) => {
            const au = sorted(s.submission_authors ?? [])
            const as = assignments.filter((a) => a.submission_id === s.id)
            const dec = decisionOf(s.id)
            const flow = flowOf(s)
            const withdrawn = s.status === 'withdrawn'
            const isOpen = open === s.id
            const free = reviewers.filter((r) => !as.some((a) => a.reviewer_id === r.id))
            const df = dform[s.id] ?? { decision: '', note: '' }
            const got = as.filter((a) => reviewOf(a.id)).length
            return (
              <div key={s.id} className="rounded-2xl border border-gray-100 bg-white">
                <button onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-neutral-500">
                      {refLabel(s.ref_no)}{tracks[s.track_id ?? ''] && <> &middot; {tracks[s.track_id ?? '']}</>}
                    </span>
                    <span className="mt-1 block font-semibold text-neutral-900">{s.title}</span>
                    <span className="mt-1 block text-sm text-neutral-600">{au.map((a) => a.full_name).join(', ')}</span>
                  </span>
                  <span className="text-right">
                    <span className="block rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-neutral-700">
                      {withdrawn ? 'Withdrawn' : FLOW.find((f) => f.v === flow)?.l}
                    </span>
                    <span className="mt-1 block text-xs text-neutral-500">{got} of {as.length} report(s)</span>
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
                        {au.map((a) => (
                          <li key={a.position}>{a.full_name}{a.is_presenting && <strong> (presenting)</strong>}, {a.affiliation}, {a.email}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-neutral-500">Reviewers</p>
                      <div className="mt-2 space-y-3">
                        {as.map((a) => {
                          const r = reviewOf(a.id)
                          return (
                            <div key={a.id} className="rounded-xl border border-gray-100 bg-slate-50 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-neutral-900">{reviewerName(a.reviewer_id)}</p>
                                {r ? (
                                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">Report in</span>
                                ) : (
                                  <span className="flex items-center gap-2">
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Waiting</span>
                                    {!dec && <button onClick={() => unassign(a)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Remove</button>}
                                  </span>
                                )}
                              </div>
                              {r && (
                                <div className="mt-3 text-sm text-neutral-700">
                                  <p>
                                    Topic {r.score_topic} &middot; Research {r.score_research} &middot; Design {r.score_design} &middot; Clarity {r.score_clarity}
                                    {' '}&middot; <strong>Average {avgOf(r)}</strong>
                                  </p>
                                  <p className="mt-1">Recommendation: <strong>{REC[r.recommendation] ?? r.recommendation}</strong></p>
                                  {r.comments && <p className="mt-2 whitespace-pre-line text-neutral-600">{r.comments}</p>}
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {!as.length && <p className="text-sm text-neutral-500">No reviewer yet.</p>}
                      </div>
                      {!dec && !withdrawn && (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <select className={inputClass} value={pick[s.id] ?? ''} onChange={(e) => setPick({ ...pick, [s.id]: e.target.value })}>
                            <option value="">Choose a reviewer...</option>
                            {free.map((r) => <option key={r.id} value={r.id}>{r.full_name || r.email}</option>)}
                          </select>
                          <button onClick={() => assign(s)} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Send to reviewer</button>
                          {!reviewers.length && <span className="text-xs text-neutral-500">No reviewer accounts yet.</span>}
                        </div>
                      )}
                    </div>

                    {!withdrawn && (
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="font-semibold text-neutral-900">Final decision</p>
                        {dec?.released ? (
                          <p className="mt-2 text-sm text-neutral-700">Released to the author: <strong>{decLabel(dec.decision)}</strong></p>
                        ) : (
                          <>
                            <p className="mt-1 text-xs text-neutral-500">The author cannot see this until the admin releases decisions.</p>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <select className={inputClass} value={df.decision} onChange={(e) => setDform({ ...dform, [s.id]: { ...df, decision: e.target.value } })}>
                                <option value="">Choose...</option>
                                {DEC.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                              </select>
                            </div>
                            <textarea className={inputClass + ' mt-3 w-full'} rows={3} placeholder="Note (optional, for the admin)" value={df.note}
                              onChange={(e) => setDform({ ...dform, [s.id]: { ...df, note: e.target.value } })} />
                            <button onClick={() => decide(s)} disabled={got === 0} className="mt-3 rounded-md bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-40">
                              {dec ? 'Update decision' : 'Save decision'}
                            </button>
                            {got === 0 && <p className="mt-2 text-xs text-neutral-500">You can decide after at least one report is in.</p>}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {!shown.length && <p className="text-neutral-500">{subs.length ? 'No abstracts match this filter.' : 'No abstracts in your track yet.'}</p>}
        </div>
      </div>
    </main>
  )
}