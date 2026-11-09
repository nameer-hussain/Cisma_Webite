'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CONF = 'cisma-2027'

type Row = { id: string; ref_no: number; title: string; status: string; created_at: string; submission_type_id: string | null }
type Conf = { submissions_open: boolean; submissions_deadline: string | null }

const STATUS: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Submitted', cls: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'Under review', cls: 'bg-amber-100 text-amber-800' },
  accepted_oral: { label: 'Accepted (oral)', cls: 'bg-green-100 text-green-800' },
  accepted_poster: { label: 'Accepted (poster)', cls: 'bg-green-100 text-green-800' },
  rejected: { label: 'Not accepted', cls: 'bg-gray-200 text-neutral-700' },
  withdrawn: { label: 'Withdrawn', cls: 'bg-gray-100 text-neutral-500' },
}
const refLabel = (n: number) => `CISMA2027-${String(n).padStart(4, '0')}`
const isOpen = (c: Conf | null) =>
  !!c && c.submissions_open && (!c.submissions_deadline || new Date().toISOString().slice(0, 10) <= c.submissions_deadline)

export default function MySubmissionsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [typeNames, setTypeNames] = useState<Record<string, string>>({})
  const [conf, setConf] = useState<Conf | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async (userId: string) => {
    const supabase = createClient()
    const [s, t, c] = await Promise.all([
      supabase
        .from('submissions')
        .select('id, ref_no, title, status, created_at, submission_type_id')
        .eq('submitter_id', userId)
        .eq('conference_slug', CONF)
        .order('created_at', { ascending: false }),
      supabase.from('submission_types').select('id, name').eq('conference_slug', CONF),
      supabase.from('conferences').select('submissions_open, submissions_deadline').eq('slug', CONF).maybeSingle(),
    ])
    if (s.error) setMsg(s.error.message)
    setRows((s.data ?? []) as Row[])
    setTypeNames(Object.fromEntries(((t.data ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name])))
    setConf((c.data ?? null) as Conf | null)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return router.replace('/login')
      setUid(u.user.id)
      await load(u.user.id)
      setReady(true)
    })()
  }, [router, load])

  async function withdraw(r: Row) {
    if (!window.confirm(`Withdraw "${r.title}"? You will not be able to undo this.`)) return
    const { error } = await createClient().from('submissions').update({ status: 'withdrawn' }).eq('id', r.id)
    if (error) return setMsg(error.message)
    await createClient().functions.invoke('send-status-email', { body: { submission_id: r.id } })
    setMsg('')
    await load(uid)
  }

  const open = isOpen(conf)

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-28">
        <Link href="/dashboard" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">&larr; Back to dashboard</Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900">My submissions</h1>
          {open && (
            <Link href="/submit" className="rounded-md bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700">+ New submission</Link>
          )}
        </div>
        {!open && ready && (
          <p className="mt-3 text-sm text-neutral-600">Abstract submissions are currently closed. You can still see your existing submissions below.</p>
        )}
        {msg && <p className="mt-4 text-sm text-red-600">{msg}</p>}

        {!ready ? (
          <p className="mt-10 text-neutral-500">Loading...</p>
        ) : (
          <div className="mt-8 space-y-3">
            {rows.map((r) => {
              const st = STATUS[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-neutral-700' }
              return (
                <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-neutral-500">
                        {refLabel(r.ref_no)}
                        {r.submission_type_id && typeNames[r.submission_type_id] && <> &middot; {typeNames[r.submission_type_id]}</>}
                      </p>
                      <p className="mt-1 font-semibold text-neutral-900">{r.title}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
                  </div>
                  {r.status === 'submitted' && (
                    <div className="mt-4 flex gap-2">
                      {open && (
                        <Link href={`/submit?id=${r.id}`} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Edit</Link>
                      )}
                      <button onClick={() => withdraw(r)} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Withdraw</button>
                    </div>
                  )}
                </div>
              )
            })}
            {!rows.length && <p className="text-neutral-500">You have not submitted anything yet.</p>}
          </div>
        )}
      </div>
    </main>
  )
}