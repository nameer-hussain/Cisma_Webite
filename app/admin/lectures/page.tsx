'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Block =
  | { type: 'heading'; text: string }
  | { type: 'text'; text: string; align?: 'center' | 'justify' | 'left'; bold?: boolean }
  | { type: 'image'; src: string; has: boolean; width?: 'sm' | 'md' | 'lg' | 'full'; alt?: string }

type Lec = {
  slug: string
  title: string | null
  card_title: string | null
  list_title: string | null
  hero_title: string | null
  hero_subtitle: string | null
  speaker_name: string | null
  card_image: string | null
  hero_image: string | null
  blocks: Block[]
  status: 'draft' | 'upcoming' | 'past'
  registration_open: boolean
  lecture_date: string | null
  date_text: string | null
  slider_description: string | null
  slider_cta: string | null
  sort_order: number
}

const EMPTY: Lec = {
  slug: '', title: '', card_title: '', list_title: '', hero_title: '', hero_subtitle: '',
  speaker_name: '', card_image: null, hero_image: null, blocks: [], status: 'draft',
  registration_open: false, lecture_date: null, date_text: '', slider_description: '',
  slider_cta: 'Register now', sort_order: 0,
}

const BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-neutral-600',
  upcoming: 'bg-green-100 text-green-800',
  past: 'bg-slate-200 text-slate-700',
}

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

export default function AdminLecturesPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [list, setList] = useState<Lec[]>([])
  const [edit, setEdit] = useState<Lec | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .order('sort_order', { ascending: false })
    if (error) setMsg({ type: 'err', text: error.message })
    setList((data ?? []) as Lec[])
  }, [])

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return router.replace('/login')
      const { data: me } = await supabase.from('profiles').select('role').eq('id', u.user.id).single()
      if (!['admin', 'editor'].includes(me?.role ?? '')) return setStatus('denied')
      await load()
      setStatus('ok')
    }
    init()
  }, [router, load])

  async function quick(l: Lec, patch: Partial<Lec>, text: string) {
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from('lectures').update(patch).eq('slug', l.slug)
    if (error) return setMsg({ type: 'err', text: error.message })
    setMsg({ type: 'ok', text })
    await load()
  }

  async function upload(file: File, field: 'card_image' | 'hero_image' | number) {
    if (!edit) return
    setUploading(String(field))
    const supabase = createClient()
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `lectures/${edit.slug || 'new'}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('site-images').upload(path, file, { upsert: false })
    setUploading('')
    if (error) return setMsg({ type: 'err', text: `Upload failed: ${error.message}` })
    const url = supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl
    if (typeof field === 'number') updateBlock(field, { src: url, has: true } as Partial<Block>)
    else setEdit({ ...edit, [field]: url })
  }

  function updateBlock(i: number, patch: Partial<Block>) {
    if (!edit) return
    const blocks = edit.blocks.map((b, j) => (j === i ? ({ ...b, ...patch } as Block) : b))
    setEdit({ ...edit, blocks })
  }

  function addBlock(type: Block['type']) {
    if (!edit) return
    const b: Block =
      type === 'heading'
        ? { type: 'heading', text: '' }
        : type === 'text'
          ? { type: 'text', text: '', align: 'justify' }
          : { type: 'image', src: '', has: false, width: 'md', alt: '' }
    setEdit({ ...edit, blocks: [...edit.blocks, b] })
  }

  function moveBlock(i: number, dir: -1 | 1) {
    if (!edit) return
    const j = i + dir
    if (j < 0 || j >= edit.blocks.length) return
    const blocks = [...edit.blocks]
    ;[blocks[i], blocks[j]] = [blocks[j], blocks[i]]
    setEdit({ ...edit, blocks })
  }

  function removeBlock(i: number) {
    if (!edit) return
    setEdit({ ...edit, blocks: edit.blocks.filter((_, j) => j !== i) })
  }

  async function save() {
    if (!edit) return
    const slug = edit.slug.trim()
    if (!slug || !edit.title?.trim()) return setMsg({ type: 'err', text: 'Slug and title are required.' })
    setSaving(true)
    setMsg(null)
    const supabase = createClient()
    const { slug: _s, ...rest } = edit
    const row = { ...rest, lecture_date: edit.lecture_date || null }
    const { error } = isNew
      ? await supabase.from('lectures').insert({ slug, ...row })
      : await supabase.from('lectures').update(row).eq('slug', slug)
    setSaving(false)
    if (error) return setMsg({ type: 'err', text: error.message })
    setMsg({ type: 'ok', text: 'Lecture saved.' })
    setEdit(null)
    await load()
  }

  async function remove(l: Lec) {
    if (!window.confirm(`Delete "${l.slug}"? Registrations and certificates keep their slug, but the lecture page disappears.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('lectures').delete().eq('slug', l.slug)
    if (error) return setMsg({ type: 'err', text: error.message })
    setMsg({ type: 'ok', text: 'Lecture deleted.' })
    await load()
  }

  const field = (label: string, key: keyof Lec, extra?: { type?: string; disabled?: boolean }) => (
    <div>
      <label className="mb-1 block text-xs text-neutral-500">{label}</label>
      <input
        type={extra?.type ?? 'text'}
        disabled={extra?.disabled}
        className={inputClass + (extra?.disabled ? ' bg-gray-50' : '')}
        value={(edit?.[key] as string | null) ?? ''}
        onChange={(e) => edit && setEdit({ ...edit, [key]: e.target.value })}
      />
    </div>
  )

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
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/admin" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">
          &larr; Back to dashboard
        </Link>

        {msg && <p className={`mt-4 text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

        {!edit ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900">Lectures</h1>
              <button
                onClick={() => {
                  setEdit({ ...EMPTY, sort_order: (list[0]?.sort_order ?? 0) + 1 })
                  setIsNew(true)
                  setMsg(null)
                }}
                className="rounded-md bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700"
              >
                + Add lecture
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {list.map((l) => (
                <div key={l.slug} className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-900">{l.card_title || l.title || l.slug}</p>
                      <p className="text-xs text-neutral-400">{l.slug}{l.date_text ? ` · ${l.date_text}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${BADGE[l.status]}`}>{l.status}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${l.registration_open ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-neutral-600'}`}>
                        {l.registration_open ? 'Registration open' : 'Registration closed'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => { setEdit(l); setIsNew(false); setMsg(null) }} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Edit</button>
                    {l.status !== 'upcoming' && (
                      <button onClick={() => quick(l, { status: 'upcoming', registration_open: true }, 'Published as upcoming, registration open.')} className="rounded-md bg-black px-3 py-1.5 text-sm font-bold text-white">Publish as upcoming</button>
                    )}
                    {l.registration_open && (
                      <button onClick={() => quick(l, { registration_open: false }, 'Registration closed.')} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Close registration</button>
                    )}
                    {l.status !== 'past' && (
                      <button onClick={() => quick(l, { status: 'past', registration_open: false }, 'Moved to Lecture Series.')} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Move to past</button>
                    )}
                    <Link href="/admin" className="rounded-md px-3 py-1.5 text-sm text-cisma-blue hover:underline">Registrations</Link>
                    <button onClick={() => remove(l)} className="ml-auto rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Delete</button>
                  </div>
                </div>
              ))}
              {!list.length && <p className="text-neutral-500">No lectures yet.</p>}
            </div>
          </>
        ) : (
          <div className="mt-4">
            <h1 className="font-heading text-3xl font-medium text-neutral-900">{isNew ? 'Add lecture' : 'Edit lecture'}</h1>

            <div className="mt-6 grid gap-4 rounded-2xl border border-gray-100 bg-white p-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Slug (URL and registration key, cannot change later)</label>
                <input
                  className={inputClass + (!isNew ? ' bg-gray-50' : '')}
                  disabled={!isNew}
                  value={edit.slug}
                  onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })}
                  placeholder="e.g. jane-doe-16"
                />
              </div>
              {field('Speaker name', 'speaker_name')}
              <div className="md:col-span-2">{field('Title', 'title')}</div>
              {field('Card title (short, on the grid)', 'card_title')}
              {field('List title (in More Posts)', 'list_title')}
              {field('Hero title', 'hero_title')}
              {field('Hero subtitle', 'hero_subtitle')}
              {field('Lecture date', 'lecture_date', { type: 'date' })}
              {field('Date text (shown on slider)', 'date_text')}
              {field('Slider button text', 'slider_cta')}
              {field('Sort order (bigger = newer)', 'sort_order', { type: 'number' })}
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Slider description (short)</label>
                <textarea rows={2} className={inputClass} value={edit.slider_description ?? ''} onChange={(e) => setEdit({ ...edit, slider_description: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Status</label>
                <select className={inputClass} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Lec['status'] })}>
                  <option value="draft">Draft (hidden)</option>
                  <option value="upcoming">Upcoming (homepage)</option>
                  <option value="past">Past (Lecture Series)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 pt-6 text-sm text-neutral-700">
                <input type="checkbox" checked={edit.registration_open} onChange={(e) => setEdit({ ...edit, registration_open: e.target.checked })} />
                Registration open
              </label>

              {(['card_image', 'hero_image'] as const).map((k) => (
                <div key={k}>
                  <label className="mb-1 block text-xs text-neutral-500">{k === 'card_image' ? 'Card / poster image' : 'Hero image'}</label>
                  {edit[k] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={edit[k]!} alt="" className="mb-2 h-24 w-auto rounded border border-gray-200 object-cover" />
                  )}
                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], k)} className="block w-full text-sm" />
                  {uploading === k && <p className="text-xs text-neutral-500">Uploading...</p>}
                </div>
              ))}
            </div>

            <h2 className="mt-8 text-xl font-semibold text-neutral-900">Page content</h2>
            <p className="text-sm text-neutral-500">Shown top to bottom on the lecture page.</p>
            <div className="mt-4 space-y-3">
              {edit.blocks.map((b, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">{b.type}</span>
                    <div className="flex gap-1">
                      <button onClick={() => moveBlock(i, -1)} className="rounded border border-gray-300 px-2 py-0.5 text-xs">Up</button>
                      <button onClick={() => moveBlock(i, 1)} className="rounded border border-gray-300 px-2 py-0.5 text-xs">Down</button>
                      <button onClick={() => removeBlock(i)} className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700">Delete</button>
                    </div>
                  </div>
                  {b.type === 'heading' && (
                    <input className={inputClass} value={b.text} onChange={(e) => updateBlock(i, { text: e.target.value })} />
                  )}
                  {b.type === 'text' && (
                    <>
                      <textarea rows={5} className={inputClass} value={b.text} onChange={(e) => updateBlock(i, { text: e.target.value })} />
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <select className="rounded-md border border-gray-300 px-2 py-1" value={b.align ?? 'center'} onChange={(e) => updateBlock(i, { align: e.target.value as 'center' | 'justify' | 'left' })}>
                          <option value="center">Center</option>
                          <option value="justify">Justify</option>
                          <option value="left">Left</option>
                        </select>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={!!b.bold} onChange={(e) => updateBlock(i, { bold: e.target.checked })} /> Bold
                        </label>
                      </div>
                    </>
                  )}
                  {b.type === 'image' && (
                    <>
                      {b.src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.src} alt="" className="mb-2 h-24 w-auto rounded border border-gray-200" />
                      )}
                      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], i)} className="block w-full text-sm" />
                      {uploading === String(i) && <p className="text-xs text-neutral-500">Uploading...</p>}
                      <div className="mt-2 flex gap-3">
                        <select className="rounded-md border border-gray-300 px-2 py-1 text-sm" value={b.width ?? 'md'} onChange={(e) => updateBlock(i, { width: e.target.value as 'sm' | 'md' | 'lg' | 'full' })}>
                          <option value="sm">Small</option>
                          <option value="md">Medium</option>
                          <option value="lg">Large</option>
                          <option value="full">Full width</option>
                        </select>
                        <input className={inputClass} placeholder="Alt text" value={b.alt ?? ''} onChange={(e) => updateBlock(i, { alt: e.target.value })} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => addBlock('heading')} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">+ Heading</button>
              <button onClick={() => addBlock('text')} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">+ Text</button>
              <button onClick={() => addBlock('image')} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">+ Image</button>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={save} disabled={saving} className="rounded-md bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save lecture'}
              </button>
              <button onClick={() => setEdit(null)} className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm text-neutral-700">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}