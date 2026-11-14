'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CONF = 'cisma-2027'

type Track = { id: string; name: string }
type Person = { id: string; full_name: string | null; email: string | null }
type Sub = { id: string; ref_no: number; title: string; status: string }
type Decision = { submission_id: string; decision: string; released: boolean }

const DEC: Record<string, string> = { accepted_oral: 'Accepted (oral)', accepted_poster: 'Accepted (poster)', rejected: 'Not accepted' }
const refLabel = (n: number) => `CISMA2027-${String(n).padStart(4, '0')}`
const inputClass =
  'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'

export default function AdminExaminersPage() {
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [tracks, setTracks] = useState<Track[]>([])
  const [map, setMap] = useState<Record<string, string>>({})
  const [sel, setSel] = useState<Record<string, string>>({})
  const [examiners, setExaminers] = useState<Person[]>([])
  const [reviewers, setReviewers] = useState<Person[]>([])
  const [subs, setSubs] = useState<Record<string, Sub>>({})
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [t, te, ex, rv, s, d] = await Promise.all([
      supabase.from('tracks').select('id, name').eq('conference_slug', CONF).order('sort_order'),
      supabase.from('track_examiners').select('track_id, examiner_id'),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'examiner').order('full_name'),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'reviewer').order('full_name'),
      supabase.from('submissions').select('id, ref_no, title, status').eq('conference_slug', CONF),
      supabase.from('submission_decisions').select('submission_id, decision, released'),
    ])
    if (t.error) setMsg({ type: 'err', text: t.error.message })
    const m = Object.fromEntries(((te.data ?? []) as { track_id: string; examiner_id: string }[]).map((x) => [x.track_id, x.examiner_id]))
    setTracks((t.data ?? []) as Track[])
    setMap(m)
    setSel((prev) => ({ ...m, ...prev }))
    setExaminers((ex.data ?? []) as Person[])
    setReviewers((rv.data ?? []) as Person[])
    setSubs(Object.fromEntries(((s.data ?? []) as Sub[]).map((x) => [x.id, x])))
    setDecisions((d.data ?? []) as Decision[])
  }, [])

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return router.replace('/login')
      const { data: me } = await supabase.from('profiles').select('role').eq('id', u.user.id).single()
      if (me?.role !== 'admin') return setState('denied')
      await load()
      setState('ok')
    })()
  }, [router, load])

  async function saveTrack(trackId: string) {
    const supabase = createClient()
    const examinerId = sel[trackId] ?? ''
    const { error } = examinerId
      ? await supabase.from('track_examiners').upsert({ track_id: trackId, examiner_id: examinerId }, { onConflict: 'track_id' })
      : await supabase.from('track_examiners').delete().eq('track_id', trackId)
    if (error) return setMsg({ type: 'err', text: error.message })
    setMsg({ type: 'ok', text: 'Saved.' })
    await load()
  }

  async function releaseOne(id: string): Promise<string | null> {
    const supabase = createClient()
    const { error } = await supabase.rpc('release_decision', { p_submission: id })
    if (error) return error.message
    // Sends the email when decision emails are on (DECISION_EMAILS secret). Errors here do not block the release.
    await supabase.functions.invoke('send-status-email', { body: { submission_id: id } })
    return null
  }

  async function release(id: string) {
    const s = subs[id]
    if (!window.confirm(`Release the decision for ${s ? refLabel(s.ref_no) : 'this abstract'}? The author will see it at once.`)) return
    setBusy(true)
    const err = await releaseOne(id)
    setBusy(false)
    setMsg(err ? { type: 'err', text: err } : { type: 'ok', text: 'Decision released.' })
    await load()
  }

  async function releaseAll() {
    const pending = decisions.filter((d) => !d.released)
    if (!pending.length) return
    if (!window.confirm(`Release ${pending.length} decision(s)? Authors will see them at once.`)) return
    setBusy(true)
    let failed = 0
    for (const d of pending) if (await releaseOne(d.submission_id)) failed++
    setBusy(false)
    setMsg(failed
      ? { type: 'err', text: `${pending.length - failed} released, ${failed} failed.` }
      : { type: 'ok', text: `${pending.length} decision(s) released.` })
    await load()
  }

  if (state === 'loading') return <main className="bg-white"><div className="px-6 pt-28 text-center text-neutral-500">Loading...</div></main>
  if (state === 'denied')
    return (
      <main className="bg-white"><div className="mx-auto max-w-2xl px-6 pb-24 pt-28 text-center">
        <h1 className="font-heading text-3xl font-medium text-neutral-900">Access denied</h1>
        <p className="mt-4 text-neutral-600">You do not have permission to view this page.</p>
      </div></main>
    )

  const pending = decisions.filter((d) => !d.released)
  const released = decisions.filter((d) => d.released)

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/admin" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">&larr; Back to dashboard</Link>
        <h1 className="mt-4 font-heading text-4xl font-medium tracking-tight text-neutral-900">Section editors and decisions</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Give each track to a section editor. New abstracts of that track go to that section editor. {examiners.length} section editor(s), {reviewers.length} reviewer(s).
          To make someone a section editor or reviewer, change their role in Users.
        </p>
        {msg && <p className={`mt-3 text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

        <h2 className="mt-8 text-lg font-semibold text-neutral-900">Tracks</h2>
        <div className="mt-3 space-y-3">
          {tracks.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
              <p className="min-w-0 flex-1 font-semibold text-neutral-900">{t.name}</p>
              <select className={inputClass} value={sel[t.id] ?? ''} onChange={(e) => setSel({ ...sel, [t.id]: e.target.value })}>
                <option value="">No section editor</option>
                {examiners.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
              <button onClick={() => saveTrack(t.id)} disabled={(sel[t.id] ?? '') === (map[t.id] ?? '')}
                className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white disabled:opacity-30">Save</button>
            </div>
          ))}
          {!tracks.length && <p className="text-sm text-neutral-500">No tracks found.</p>}
          {tracks.some((t) => !map[t.id]) && <p className="text-sm text-amber-700">A track without a section editor: its abstracts are seen only by the admin.</p>}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">Decisions waiting for release</h2>
          <button onClick={releaseAll} disabled={busy || !pending.length}
            className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white disabled:opacity-30">Release all ({pending.length})</button>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Releasing sets the abstract status and the author sees it at once. Do not release before the notification date (28 Feb 2027).
          The author also gets an email.
        </p>
        <div className="mt-3 space-y-2">
          {pending.map((d) => {
            const s = subs[d.submission_id]
            return (
              <div key={d.submission_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-neutral-500">{s ? refLabel(s.ref_no) : ''}</p>
                  <p className="font-semibold text-neutral-900">{s?.title ?? d.submission_id}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-neutral-700">{DEC[d.decision] ?? d.decision}</span>
                <button onClick={() => release(d.submission_id)} disabled={busy} className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-30">Release</button>
              </div>
            )
          })}
          {!pending.length && <p className="text-sm text-neutral-500">Nothing waiting.</p>}
        </div>
        {released.length > 0 && <p className="mt-4 text-sm text-neutral-500">{released.length} decision(s) already released.</p>}
      </div>
    </main>
  )
}