'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type M = {
  id?: string
  label: string
  href: string
  parent: string | null
  sort_order: number
  visible: boolean
  kind: 'link' | 'dropdown'
  key: string | null
}

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'
const keyify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)
const DIRECT = ['about', 'privacy-policy', 'memory', 'cisma-attendee-guide-2026']

export default function AdminMenuPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [list, setList] = useState<M[]>([])
  const [edit, setEdit] = useState<M | null>(null)
  const [pages, setPages] = useState<{ slug: string; title: string }[]>([])
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [m, p] = await Promise.all([
      supabase.from('menu_items').select('*').order('sort_order'),
      supabase.from('pages').select('slug, title').order('title'),
    ])
    if (m.error) setMsg({ type: 'err', text: m.error.message })
    setList((m.data ?? []) as M[])
    setPages((p.data ?? []) as { slug: string; title: string }[])
  }, [])

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return router.replace('/login')
      const { data: me } = await supabase.from('profiles').select('role').eq('id', u.user.id).single()
      if (!['admin', 'editor'].includes(me?.role ?? '')) return setStatus('denied')
      await load()
      setStatus('ok')
    })()
  }, [router, load])

  const dropdowns = list.filter((m) => m.kind === 'dropdown')

  async function save() {
    if (!edit) return
    const isDrop = edit.kind === 'dropdown'
    if (!edit.label.trim()) return setMsg({ type: 'err', text: 'Label is required.' })
    if (isDrop && !edit.key) return setMsg({ type: 'err', text: 'A dropdown needs a key (for example: workshops).' })
    if (!isDrop && !edit.href.trim()) return setMsg({ type: 'err', text: 'Link is required.' })
    if (isDrop && dropdowns.some((d) => d.key === edit.key && d.id !== edit.id))
      return setMsg({ type: 'err', text: 'This key is already used by another dropdown.' })

    const row = {
      label: edit.label.trim(),
      href: isDrop ? '#' : edit.href.trim(),
      parent: edit.parent,
      sort_order: edit.sort_order,
      visible: edit.visible,
      kind: edit.kind,
      key: isDrop ? edit.key : null,
    }
    const supabase = createClient()
    const { error } = edit.id
      ? await supabase.from('menu_items').update(row).eq('id', edit.id)
      : await supabase.from('menu_items').insert(row)
    if (error) return setMsg({ type: 'err', text: error.message })
    setMsg({ type: 'ok', text: 'Saved.' })
    setEdit(null)
    await load()
  }

  async function toggle(m: M) {
    const { error } = await createClient().from('menu_items').update({ visible: !m.visible }).eq('id', m.id!)
    if (error) return setMsg({ type: 'err', text: error.message })
    await load()
  }

  async function remove(m: M) {
    const kids = m.kind === 'dropdown' ? list.filter((x) => x.parent === m.key).length : 0
    const text = kids
      ? `Delete the dropdown "${m.label}" and its ${kids} item(s)?`
      : `Remove "${m.label}" from the menu?`
    if (!window.confirm(text)) return
    const supabase = createClient()
    if (kids) {
      const { error: e1 } = await supabase.from('menu_items').delete().eq('parent', m.key!)
      if (e1) return setMsg({ type: 'err', text: e1.message })
    }
    const { error } = await supabase.from('menu_items').delete().eq('id', m.id!)
    if (error) return setMsg({ type: 'err', text: error.message })
    await load()
  }

  async function move(group: M[], i: number, d: -1 | 1) {
    const j = i + d
    if (j < 0 || j >= group.length) return
    const a = group[i], b = group[j]
    const supabase = createClient()
    // Barabar sort_order par bhi kaam kare
    const [sa, sb] = a.sort_order === b.sort_order ? [b.sort_order + d, a.sort_order] : [b.sort_order, a.sort_order]
    await supabase.from('menu_items').update({ sort_order: sa }).eq('id', a.id!)
    await supabase.from('menu_items').update({ sort_order: sb }).eq('id', b.id!)
    await load()
  }

  if (status === 'loading') return <main className="bg-white"><div className="px-6 pt-28 text-center text-neutral-500">Loading...</div></main>
  if (status === 'denied')
    return (
      <main className="bg-white"><div className="mx-auto max-w-2xl px-6 pb-24 pt-28 text-center">
        <h1 className="font-heading text-3xl font-medium text-neutral-900">Access denied</h1>
        <p className="mt-4 text-neutral-600">You do not have permission to view this page.</p>
      </div></main>
    )

  const top = list.filter((m) => !m.parent)

  const row = (group: M[], m: M, i: number) => (
    <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-neutral-900">
          {m.label}
          {m.kind === 'dropdown' && <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">Dropdown</span>}
        </p>
        <p className="truncate text-xs text-neutral-400">{m.kind === 'dropdown' ? `key: ${m.key}` : m.href}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${m.visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-neutral-600'}`}>{m.visible ? 'Shown' : 'Hidden'}</span>
      <button onClick={() => move(group, i, -1)} disabled={i === 0} className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30">Up</button>
      <button onClick={() => move(group, i, 1)} disabled={i === group.length - 1} className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30">Down</button>
      <button onClick={() => toggle(m)} className="rounded-md border border-gray-300 px-3 py-1 text-sm">{m.visible ? 'Hide' : 'Show'}</button>
      <button onClick={() => setEdit(m)} className="rounded-md border border-gray-300 px-3 py-1 text-sm">Edit</button>
      <button onClick={() => remove(m)} className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700">Delete</button>
    </div>
  )

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/admin" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">&larr; Back to dashboard</Link>
        <h1 className="mt-4 font-heading text-4xl font-medium tracking-tight text-neutral-900">Menu</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Items in the menu bar appear in the order below. A dropdown shows only when it has at least one item.
          Log in/Dashboard and the Publish button are fixed.
        </p>
        {msg && <p className={`mt-4 text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

        {edit ? (
          <div className="mt-6 space-y-3 rounded-2xl border border-gray-100 bg-white p-6">
            <h2 className="text-lg font-semibold text-neutral-900">{edit.id ? 'Edit item' : 'Add item'}</h2>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">Type</label>
              <select className={inputClass} value={edit.kind}
                onChange={(e) => setEdit({ ...edit, kind: e.target.value as M['kind'], parent: edit.parent })}>
                <option value="link">Link</option>
                <option value="dropdown">Dropdown (a menu with items inside)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">Label</label>
              <input className={inputClass} value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} />
            </div>

            {edit.kind === 'dropdown' ? (
              <>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Key (short name, for example: workshops)</label>
                  <input className={inputClass} value={edit.key ?? ''} onChange={(e) => setEdit({ ...edit, key: keyify(e.target.value) })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Where does it appear?</label>
                  <select className={inputClass} value={edit.parent ?? ''} onChange={(e) => setEdit({ ...edit, parent: e.target.value || null })}>
                    <option value="">Menu bar</option>
                    {dropdowns.filter((d) => d.key !== edit.key).map((d) => <option key={d.id} value={d.key ?? ''}>Inside: {d.label}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Pick a page (or type a link below)</label>
                  <select className={inputClass} value="" onChange={(e) => e.target.value && setEdit({ ...edit, href: e.target.value })}>
                    <option value="">Choose...</option>
                    {pages.map((p) => (
                      <option key={p.slug} value={DIRECT.includes(p.slug) ? `/${p.slug}` : `/p/${p.slug}`}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Link (/page, https://..., PDF path)</label>
                  <input className={inputClass} value={edit.href} onChange={(e) => setEdit({ ...edit, href: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Where does it appear?</label>
                  <select className={inputClass} value={edit.parent ?? ''} onChange={(e) => setEdit({ ...edit, parent: e.target.value || null })}>
                    <option value="">Menu bar</option>
                    {dropdowns.map((d) => <option key={d.id} value={d.key ?? ''}>Inside: {d.label}</option>)}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-xs text-neutral-500">Sort order (smaller = earlier)</label>
              <input type="number" className={inputClass} value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={edit.visible} onChange={(e) => setEdit({ ...edit, visible: e.target.checked })} />
              Shown in menu
            </label>
            <div className="flex gap-3">
              <button onClick={save} className="rounded-md bg-black px-6 py-2.5 text-sm font-bold text-white">Save</button>
              <button onClick={() => setEdit(null)} className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setEdit({ label: '', href: '', parent: null, sort_order: (top[top.length - 1]?.sort_order ?? 0) + 1, visible: true, kind: 'link', key: null })}
                className="rounded-md bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700"
              >
                + Add item
              </button>
            </div>

            <h2 className="mt-4 text-lg font-semibold text-neutral-900">Menu bar</h2>
            <div className="mt-3 space-y-2">{top.map((m, i) => row(top, m, i))}</div>

            {dropdowns.map((d) => {
              const kids = list.filter((x) => x.parent === d.key)
              return (
                <div key={d.id}>
                  <h2 className="mt-8 text-lg font-semibold text-neutral-900">{d.label} dropdown</h2>
                  <div className="mt-3 space-y-2">
                    {kids.map((m, i) => row(kids, m, i))}
                    {!kids.length && <p className="text-sm text-neutral-500">Empty. Add an item and choose &quot;Inside: {d.label}&quot;.</p>}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </main>
  )
}