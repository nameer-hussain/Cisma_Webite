'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Ev = {
  id?: string
  title: string
  tag: string | null
  date_text: string | null
  description: string | null
  image: string | null
  href: string
  cta: string | null
  active: boolean
  ends_on: string | null
  sort_order: number
}
type Sec = { id: string; title: string }
type Lec = { slug: string; card_title: string | null; title: string | null }

const EMPTY: Ev = {
  title: '', tag: '', date_text: '', description: '', image: null,
  href: '', cta: 'Learn more', active: true, ends_on: null, sort_order: 0,
}

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'

export default function AdminEventsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [list, setList] = useState<Ev[]>([])
  const [sections, setSections] = useState<Sec[]>([])
  const [lectures, setLectures] = useState<Lec[]>([])
  const [edit, setEdit] = useState<Ev | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [linkMode, setLinkMode] = useState('custom')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [e, s, l] = await Promise.all([
      supabase.from('events').select('*').order('sort_order', { ascending: false }),
      supabase.from('home_sections').select('id, title').order('sort_order'),
      supabase.from('lectures').select('slug, card_title, title').neq('status', 'draft').order('sort_order', { ascending: false }),
    ])
    if (e.error) setMsg({ type: 'err', text: e.error.message })
    setList((e.data ?? []) as Ev[])
    setSections((s.data ?? []) as Sec[])
    setLectures((l.data ?? []) as Lec[])
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

  function open(ev: Ev) {
    setEdit(ev)
    setMsg(null)
    if (ev.href.startsWith('/#') && sections.some((s) => '/#' + s.id === ev.href)) setLinkMode(ev.href)
    else if (ev.href.startsWith('/lectures/') && lectures.some((l) => '/lectures/' + l.slug === ev.href)) setLinkMode(ev.href)
    else setLinkMode('custom')
  }

  function pickLink(v: string) {
    setLinkMode(v)
    if (edit && v !== 'custom') setEdit({ ...edit, href: v })
  }

  async function upload(file: File) {
    if (!edit) return
    setUploading(true)
    const supabase = createClient()
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `events/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('site-images').upload(path, file)
    setUploading(false)
    if (error) return setMsg({ type: 'err', text: `Upload failed: ${error.message}` })
    setEdit({ ...edit, image: supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl })
  }

  async function save() {
    if (!edit) return
    if (!edit.title.trim() || !edit.href.trim()) return setMsg({ type: 'err', text: 'Title and link are required.' })
    if (!edit.image) return setMsg({ type: 'err', text: 'Please add an image (the slider needs one).' })
    setSaving(true)
    setMsg(null)
    const supabase = createClient()
    const { id, ...rest } = edit
    const row = { ...rest, ends_on: edit.ends_on || null }
    const { error } = id
      ? await supabase.from('events').update(row).eq('id', id)
      : await supabase.from('events').insert(row)
    setSaving(false)
    if (error) return setMsg({ type: 'err', text: error.message })
    setMsg({ type: 'ok', text: 'Event saved.' })
    setEdit(null)
    await load()
  }

  async function toggle(ev: Ev) {
    const { error } = await createClient().from('events').update({ active: !ev.active }).eq('id', ev.id!)
    if (error) return setMsg({ type: 'err', text: error.message })
    await load()
  }

  async function remove(ev: Ev) {
    if (!window.confirm(`Delete "${ev.title}" from the slider?`)) return
    const { error } = await createClient().from('events').delete().eq('id', ev.id!)
    if (error) return setMsg({ type: 'err', text: error.message })
    await load()
  }

  const txt = (label: string, key: keyof Ev, type = 'text') => (
    <div>
      <label className="mb-1 block text-xs text-neutral-500">{label}</label>
      <input type={type} className={inputClass} value={(edit?.[key] as string | number | null) ?? ''}
        onChange={(e) => edit && setEdit({ ...edit, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} />
    </div>
  )

  if (status === 'loading') return <main className="bg-white"><div className="px-6 pt-28 text-center text-neutral-500">Loading...</div></main>
  if (status === 'denied')
    return (
      <main className="bg-white"><div className="mx-auto max-w-2xl px-6 pb-24 pt-28 text-center">
        <h1 className="font-heading text-3xl font-medium text-neutral-900">Access denied</h1>
        <p className="mt-4 text-neutral-600">You do not have permission to view this page.</p>
      </div></main>
    )

  const today = new Date().toISOString().slice(0, 10)

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/admin" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">&larr; Back to dashboard</Link>
        {msg && <p className={`mt-4 text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

        {!edit ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900">Slider Events</h1>
              <button onClick={() => open({ ...EMPTY, sort_order: (list[0]?.sort_order ?? 0) + 1 })}
                className="rounded-md bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700">+ Add event</button>
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              Upcoming lectures appear in the slider automatically (manage them under Lectures). Items here are shown after them, bigger sort order first.
            </p>
            <div className="mt-6 space-y-3">
              {list.map((ev) => {
                const expired = ev.ends_on && ev.ends_on < today
                return (
                  <div key={ev.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
                    {ev.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.image} alt="" className="h-14 w-14 rounded object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-900">{ev.title}</p>
                      <p className="truncate text-xs text-neutral-400">{ev.href}{ev.ends_on ? ` · until ${ev.ends_on}` : ''}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      expired ? 'bg-amber-100 text-amber-800' : ev.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-neutral-600'}`}>
                      {expired ? 'Expired' : ev.active ? 'In slider' : 'Hidden'}
                    </span>
                    <button onClick={() => toggle(ev)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">{ev.active ? 'Hide' : 'Show'}</button>
                    <button onClick={() => open(ev)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Edit</button>
                    <button onClick={() => remove(ev)} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Delete</button>
                  </div>
                )
              })}
              {!list.length && <p className="text-neutral-500">No events yet.</p>}
            </div>
          </>
        ) : (
          <div className="mt-4">
            <h1 className="font-heading text-3xl font-medium text-neutral-900">{edit.id ? 'Edit event' : 'Add event'}</h1>
            <div className="mt-6 grid gap-4 rounded-2xl border border-gray-100 bg-white p-6 md:grid-cols-2">
              <div className="md:col-span-2">{txt('Title', 'title')}</div>
              {txt('Small tag (e.g. Upcoming Conference)', 'tag')}
              {txt('Date text (optional)', 'date_text')}
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Description</label>
                <textarea rows={3} className={inputClass} value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Image (required)</label>
                {edit.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={edit.image} alt="" className="mb-2 h-24 w-auto rounded border border-gray-200" />
                )}
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="block w-full text-sm" />
                {uploading && <p className="text-xs text-neutral-500">Uploading...</p>}
              </div>

              {txt('Button text', 'cta')}
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Button goes to</label>
                <select className={inputClass} value={linkMode} onChange={(e) => pickLink(e.target.value)}>
                  <option value="custom">Custom link (type below)</option>
                  <optgroup label="Homepage sections">
                    {sections.map((s) => <option key={s.id} value={`/#${s.id}`}>{s.title}</option>)}
                  </optgroup>
                  <optgroup label="Lecture pages">
                    {lectures.map((l) => <option key={l.slug} value={`/lectures/${l.slug}`}>{l.card_title || l.title || l.slug}</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Link (/page, /#section, https://..., mailto:..., or a PDF path)</label>
                <input className={inputClass} value={edit.href}
                  onChange={(e) => { setEdit({ ...edit, href: e.target.value }); setLinkMode('custom') }} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-neutral-500">Remove from slider after (optional)</label>
                <input type="date" className={inputClass} value={edit.ends_on ?? ''} onChange={(e) => setEdit({ ...edit, ends_on: e.target.value || null })} />
              </div>
              {txt('Sort order (bigger = earlier)', 'sort_order', 'number')}
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
                Show in slider
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={save} disabled={saving} className="rounded-md bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save event'}</button>
              <button onClick={() => setEdit(null)} className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm text-neutral-700">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}