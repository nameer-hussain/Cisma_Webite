'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Log = {
  id: number
  actor_id: string | null
  action: string
  target_id: string | null
  old_value: string | null
  new_value: string | null
  created_at: string
}
type Person = { id: string; email: string | null; full_name: string | null }

export default function AuditLogPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [logs, setLogs] = useState<Log[]>([])
  const [people, setPeople] = useState<Record<string, Person>>({})
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) {
        router.replace('/login')
        return
      }
      const { data: ok } = await supabase.rpc('is_admin')
      if (!ok) {
        setStatus('denied')
        return
      }
      const [l, p] = await Promise.all([
        supabase.from('audit_log').select('*').order('id', { ascending: false }).limit(500),
        supabase.from('profiles').select('id, email, full_name'),
      ])
      if (l.error) setError(l.error.message)
      setLogs((l.data ?? []) as Log[])
      const map: Record<string, Person> = {}
      ;((p.data ?? []) as Person[]).forEach((x) => (map[x.id] = x))
      setPeople(map)
      setStatus('ok')
    }
    load()
  }, [router])

  const who = (id: string | null) => (id ? people[id]?.email ?? id : '-')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((r) =>
      [r.action, who(r.actor_id), who(r.target_id), r.old_value, r.new_value]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, people, query])

  if (status === 'loading')
    return <main className="bg-white"><div className="px-6 pt-28 text-center text-neutral-500">Loading...</div></main>
  if (status === 'denied')
    return (
      <main className="bg-white">
        <div className="mx-auto max-w-2xl px-6 pb-24 pt-28 text-center">
          <h1 className="font-heading text-3xl font-medium text-neutral-900">Access denied</h1>
          <p className="mt-4 text-neutral-600">You do not have permission to view this page.</p>
        </div>
      </main>
    )

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/admin" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">
          &larr; Back to dashboard
        </Link>
        <h1 className="mt-4 font-heading text-4xl font-medium tracking-tight text-neutral-900">Audit Log</h1>
        <p className="mt-2 text-neutral-600">Latest 500 admin actions. Entries cannot be edited or deleted.</p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <input
          className="mt-6 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue"
          placeholder="Search by person, action or role..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="mt-4 text-sm text-neutral-500">Showing {shown.length} of {logs.length}</p>

        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-gray-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Done by</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-neutral-800">{who(r.actor_id)}</td>
                  <td className="px-4 py-3 text-neutral-800">{r.action.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-neutral-800">{who(r.target_id)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-800">
                    {r.old_value ?? '-'} &rarr; {r.new_value ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="px-4 py-6 text-center text-neutral-500">No entries yet.</p>}
        </div>
      </div>
    </main>
  )
}