'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Lec = {
  slug: string
  certificates_open: boolean
  apply_deadline: string | null
  registrations: number
  certificates: number
  has_row: boolean
}
type Cert = {
  id: string
  certificate_code: string
  user_id: string
  lecture_slug: string
  full_name: string
  institution: string | null
  issued_at: string
  name_locked: boolean
}

const NAME_PATTERN = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'\-]*$/

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function AdminCertificatesPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [lectures, setLectures] = useState<Lec[]>([])
  const [certs, setCerts] = useState<Cert[]>([])
  const [emails, setEmails] = useState<Record<string, string>>({})
  const [deadlines, setDeadlines] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [editId, setEditId] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const loadAll = useCallback(async () => {
    const supabase = createClient()
    const [l, c, p] = await Promise.all([
      supabase.rpc('admin_list_certificate_lectures'),
      supabase.from('certificates').select('*').order('issued_at', { ascending: false }),
      supabase.from('profiles').select('id, email'),
    ])
    if (l.error) setMsg({ type: 'err', text: l.error.message })
    else if (c.error) setMsg({ type: 'err', text: c.error.message })
    const lecs = (l.data ?? []) as Lec[]
    setLectures(lecs)
    setDeadlines(Object.fromEntries(lecs.map((x) => [x.slug, toLocalInput(x.apply_deadline)])))
    setCerts((c.data ?? []) as Cert[])
    const map: Record<string, string> = {}
    ;((p.data ?? []) as { id: string; email: string | null }[]).forEach((x) => (map[x.id] = x.email ?? ''))
    setEmails(map)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    async function init() {
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
      await loadAll()
      setStatus('ok')
    }
    init()
  }, [router, loadAll])

  async function setOpen(l: Lec, open: boolean) {
    setBusy(l.slug)
    setMsg(null)
    const supabase = createClient()
    const dl = deadlines[l.slug]
    const { error } = await supabase.rpc('admin_set_certificates_open', {
      p_slug: l.slug,
      p_open: open,
      p_deadline: dl ? new Date(dl).toISOString() : null,
    })
    setBusy('')
    if (error) return setMsg({ type: 'err', text: error.message })
    setMsg({ type: 'ok', text: `${l.slug}: certificates ${open ? 'opened' : 'closed'}.` })
    await loadAll()
  }

  async function fixName(c: Cert) {
    const cleaned = nameInput.trim().replace(/\s+/g, ' ')
    if (cleaned.length < 2 || cleaned.length > 80)
      return setMsg({ type: 'err', text: 'Name must be 2 to 80 characters.' })
    if (!NAME_PATTERN.test(cleaned))
      return setMsg({
        type: 'err',
        text: 'English letters only (spaces, dots, hyphens, apostrophes are fine).',
      })
    if (!window.confirm(`Change the name on ${c.certificate_code} from "${c.full_name}" to "${cleaned}"?`))
      return
    setBusy(c.id)
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.rpc('admin_fix_certificate_name', { p_id: c.id, p_name: cleaned })
    setBusy('')
    if (error) return setMsg({ type: 'err', text: error.message })
    setEditId('')
    setMsg({ type: 'ok', text: 'Name updated.' })
    await loadAll()
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return certs
      .filter((c) => filter === 'all' || c.lecture_slug === filter)
      .filter(
        (c) =>
          !q ||
          [c.certificate_code, c.full_name, c.institution, emails[c.user_id], c.lecture_slug]
            .join(' ')
            .toLowerCase()
            .includes(q)
      )
  }, [certs, filter, query, emails])

  function downloadCSV() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const head = ['certificate_code', 'lecture_slug', 'full_name', 'email', 'institution', 'issued_at', 'name_locked']
    const lines = shown.map((c) =>
      [c.certificate_code, c.lecture_slug, c.full_name, emails[c.user_id], c.institution, c.issued_at, c.name_locked]
        .map(esc)
        .join(',')
    )
    const blob = new Blob(['\uFEFF' + [head.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'certificates.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (status === 'loading')
    return (
      <main className="bg-white">
        <div className="px-6 pt-28 text-center text-neutral-500">Loading...</div>
      </main>
    )
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
        <h1 className="mt-4 font-heading text-4xl font-medium tracking-tight text-neutral-900">Certificates</h1>

        {msg && (
          <p className={`mt-4 text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>
        )}

        <h2 className="mt-8 text-xl font-semibold text-neutral-900">Applications by lecture</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {lectures.map((l) => (
            <div key={l.slug} className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-neutral-900">{l.slug}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    l.certificates_open ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-neutral-600'
                  }`}
                >
                  {l.certificates_open ? 'Open' : 'Closed'}
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                {l.registrations} registrations · {l.certificates} certificates issued
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="text-xs text-neutral-500">
                  Deadline (optional)
                  <input
                    type="datetime-local"
                    value={deadlines[l.slug] ?? ''}
                    onChange={(e) => setDeadlines((d) => ({ ...d, [l.slug]: e.target.value }))}
                    className="ml-2 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                </label>
                <button
                  onClick={() => setOpen(l, !l.certificates_open)}
                  disabled={busy === l.slug}
                  className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-40"
                >
                  {l.certificates_open ? 'Close applications' : 'Open applications'}
                </button>
                {l.certificates_open && (
                  <button
                    onClick={() => setOpen(l, true)}
                    disabled={busy === l.slug}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm text-neutral-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Save deadline
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-xl font-semibold text-neutral-900">Issued certificates</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All lectures</option>
            {lectures.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.slug}
              </option>
            ))}
          </select>
          <input
            className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue"
            placeholder="Search by name, email, code or institution"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={downloadCSV}
            disabled={!shown.length}
            className="rounded-md border border-black bg-white px-4 py-2 text-sm font-bold text-black hover:bg-black hover:text-white disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>
        <p className="mt-4 text-sm text-neutral-500">
          Showing {shown.length} of {certs.length}
        </p>

        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-gray-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Lecture</th>
                <th className="px-4 py-3 font-medium">Name on certificate</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Fix name</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-700">{c.certificate_code}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-700">{c.lecture_slug}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{c.full_name}</td>
                  <td className="px-4 py-3 text-neutral-700">{emails[c.user_id]}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        c.name_locked ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.name_locked ? 'Name locked' : 'Name not set'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editId === c.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          maxLength={80}
                          className="w-56 rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => fixName(c)}
                          disabled={busy === c.id}
                          className="rounded-md bg-black px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditId('')} className="text-sm text-neutral-500 hover:underline">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditId(c.id)
                          setNameInput(c.full_name)
                        }}
                        className="text-sm text-cisma-blue hover:underline"
                      >
                        Edit name
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="px-4 py-6 text-center text-neutral-500">No certificates found.</p>}
        </div>
      </div>
    </main>
  )
}