'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type User = {
  id: string
  email: string | null
  full_name: string | null
  role: string
  created_at: string
}

const ROLES = ['admin', 'editor', 'manager', 'member']

const BADGE: Record<string, string> = {
  admin: 'bg-rose-50 text-rose-700',
  manager: 'bg-amber-50 text-amber-700',
  editor: 'bg-sky-50 text-sky-700',
  member: 'bg-slate-100 text-slate-600',
}

export default function UsersAndRolesPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [me, setMe] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState('')
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const fetchUsers = useCallback(async (term: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('admin_list_users', { search: term })
    if (error) {
      setMessage({ type: 'err', text: error.message })
      return
    }
    setUsers((data ?? []) as User[])
  }, [])

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.replace('/login')
        return
      }
      setMe(data.user.id)
      const { data: ok } = await supabase.rpc('is_admin')
      if (!ok) {
        setStatus('denied')
        return
      }
      await fetchUsers('')
      setStatus('ok')
    }
    init()
  }, [router, fetchUsers])

  async function updateRole(u: User) {
    const next = draft[u.id] ?? u.role
    if (next === u.role) return
    setSaving(u.id)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.rpc('admin_set_role', { target: u.id, new_role: next })
    setSaving('')
    if (error) {
      setMessage({ type: 'err', text: error.message })
      return
    }
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: next } : x)))
    setMessage({ type: 'ok', text: `${u.email ?? u.id} is now ${next}.` })
  }

  if (status === 'loading') {
    return <main className="bg-white"><div className="px-6 pt-28 text-center text-neutral-500">Loading...</div></main>
  }
  if (status === 'denied') {
    return (
      <main className="bg-white">
        <div className="mx-auto max-w-2xl px-6 pb-24 pt-28 text-center">
          <h1 className="font-heading text-3xl font-medium text-neutral-900">Access denied</h1>
          <p className="mt-4 text-neutral-600">You do not have permission to view this page.</p>
        </div>
      </main>
    )
  }

  const counts = ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = users.filter((u) => u.role === r).length
    return acc
  }, {})
  const shown = filter === 'all' ? users : users.filter((u) => u.role === filter)

  const tile = (key: string, label: string, n: number) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`rounded-2xl border p-5 text-left transition-colors ${
        filter === key
          ? 'border-black bg-black text-white'
          : 'border-gray-100 bg-white text-neutral-900 hover:border-gray-300'
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{n}</p>
    </button>
  )

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/admin" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">
          &larr; Back to dashboard
        </Link>
        <h1 className="mt-4 font-heading text-4xl font-medium tracking-tight text-neutral-900">
          Users and Roles
        </h1>
        <p className="mt-2 text-neutral-600">Change a member&apos;s role without touching any code.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          {tile('all', 'All roles', users.length)}
          {ROLES.map((r) => tile(r, r, counts[r] ?? 0))}
        </div>

        <form
          className="mt-6 flex gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(query)
            fetchUsers(query)
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue"
            placeholder="Search by name, email, or user ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="rounded-md bg-black px-5 py-2 text-sm font-bold text-white hover:bg-neutral-700">
            Search
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm ${message.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}

        <p className="mt-4 text-sm text-neutral-500">
          Showing {shown.length} of {users.length}
          {search ? ` for "${search}"` : ''}
        </p>

        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-gray-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Full name</th>
                <th className="px-4 py-3 font-medium">Current role</th>
                <th className="px-4 py-3 font-medium">Change role</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const isMe = u.id === me
                const value = draft[u.id] ?? u.role
                return (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{u.email}</div>
                      <div className="text-xs text-neutral-400">{u.id}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{u.full_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          BADGE[u.role] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isMe ? (
                        <span className="text-xs text-neutral-400">You (cannot change own role)</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={value}
                            onChange={(e) => setDraft((d) => ({ ...d, [u.id]: e.target.value }))}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm capitalize"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => updateRole(u)}
                            disabled={saving === u.id || value === u.role}
                            className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-40"
                          >
                            {saving === u.id ? 'Saving...' : 'Update'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!shown.length && <p className="px-4 py-6 text-center text-neutral-500">No users found.</p>}
        </div>
      </div>
    </main>
  )
}