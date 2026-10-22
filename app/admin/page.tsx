'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Row = Record<string, any>
type Tab = 'registrations' | 'accounts'

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

export default function AdminPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('registrations')
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

  const rows = tab === 'accounts' ? profiles : regs
  const cols = rows[0]
    ? Object.keys(rows[0]).filter((c) => c !== 'id' && c !== 'user_id')
    : []
  const q = query.trim().toLowerCase()
  const filtered = q ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q)) : rows

  const tabClass = (active: boolean) =>
    `rounded-md px-4 py-2 text-sm font-bold transition-colors ${
      active
        ? 'bg-cisma-navy text-white'
        : 'border border-gray-300 text-neutral-600 hover:bg-gray-50'
    }`

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
        <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900 md:text-5xl">
          Admin Dashboard
        </h1>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-neutral-500">Total accounts</p>
            <p className="mt-1 text-3xl font-semibold text-cisma-navy">{profiles.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-neutral-500">Lecture registrations</p>
            <p className="mt-1 text-3xl font-semibold text-cisma-navy">{regs.length}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setTab('registrations')}
            className={tabClass(tab === 'registrations')}
          >
            Lecture registrations
          </button>
          <button onClick={() => setTab('accounts')} className={tabClass(tab === 'accounts')}>
            Accounts
          </button>
          <input
            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={() => downloadCSV(`${tab}.csv`, filtered, cols)}
            disabled={!filtered.length}
            className="rounded-md border border-cisma-navy px-4 py-2 text-sm font-bold text-cisma-navy transition-colors hover:bg-cisma-navy hover:text-white disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>

        <p className="mt-4 text-sm text-neutral-500">
          Showing {filtered.length} of {rows.length}
        </p>

        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
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
    </main>
  )
}