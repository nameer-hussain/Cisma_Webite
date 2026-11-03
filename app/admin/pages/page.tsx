'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { PBlock } from '@/components/PageView'

type Pg = { slug: string; title: string; description: string | null; blocks: PBlock[]; published: boolean }
const EMPTY: Pg = { slug: '', title: '', description: '', blocks: [], published: true }

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)
const idify = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+/g, '').slice(0, 40)
const BGS: [string, string][] = [['White', '#ffffff'], ['Beige', '#e8e5da'], ['Tan', '#d8d2bb'], ['Grey', '#cbcbcb'], ['Light grey', '#d0d0d0'], ['Navy', '#07294f']]
const TYPES = ['heading', 'text', 'image', 'button', 'people_list', 'people_grid', 'gallery', 'timeline', 'cards', 'columns', 'banners', 'band'] as const
// Jin pages ka URL /p/slug nahi, seedha /slug hai
const DIRECT = ['about', 'privacy-policy', 'memory', 'cisma-attendee-guide-2026']

export default function AdminPagesPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [list, setList] = useState<Pg[]>([])
  const [edit, setEdit] = useState<Pg | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await createClient().from('pages').select('*').order('slug')
    if (error) setMsg({ type: 'err', text: error.message })
    setList((data ?? []) as Pg[])
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

  const setBlocks = (blocks: PBlock[]) => edit && setEdit({ ...edit, blocks })
  const patchBlock = (i: number, p: Record<string, unknown>) =>
    edit && setBlocks(edit.blocks.map((b, j) => (j === i ? ({ ...b, ...p } as PBlock) : b)))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const swap = (arr: any[], i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= arr.length) return arr
    const c = [...arr]
    ;[c[i], c[j]] = [c[j], c[i]]
    return c
  }

  function addBlock(type: (typeof TYPES)[number]) {
    if (!edit) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map: Record<string, any> = {
      heading: { type, text: '' },
      text: { type, text: '', align: 'justify' },
      image: { type, src: '', width: 'md', alt: '' },
      button: { type, text: '', href: '' },
      people_list: { type, items: [{ name: '' }] },
      people_grid: { type, items: [{ name: '' }] },
      gallery: { type, images: [], cols: 3 },
      timeline: { type, items: [{ title: '', date: '' }] },
      cards: { type, items: [{ title: '' }], layout: 'list' },
      columns: { type, items: [{ text: '' }] },
      banners: { type, items: [{ title: '' }] },
      band: { type, bg: '#e8e5da', overlay: false, dark: false, narrow: false, full: false },
    }
    setBlocks([...edit.blocks, map[type] as PBlock])
  }

  async function uploadMany(files: FileList, key: string, done: (urls: string[]) => void) {
    setUploading(key)
    const supabase = createClient()
    const urls: string[] = []
    for (const file of Array.from(files)) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `pages/${edit?.slug || 'new'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
      const { error } = await supabase.storage.from('site-images').upload(path, file)
      if (error) {
        setMsg({ type: 'err', text: `Upload failed: ${error.message}` })
        break
      }
      urls.push(supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl)
    }
    setUploading('')
    if (urls.length) done(urls)
  }
  const uploadOne = (file: File, key: string, done: (url: string) => void) => {
    const dt = new DataTransfer()
    dt.items.add(file)
    return uploadMany(dt.files, key, (u) => done(u[0]))
  }

  async function save() {
    if (!edit) return
    if (!edit.slug.trim() || !edit.title.trim()) return setMsg({ type: 'err', text: 'Slug and title are required.' })
    setSaving(true)
    setMsg(null)
    const supabase = createClient()
    const { slug, ...rest } = edit
    const { error } = isNew
      ? await supabase.from('pages').insert({ slug, ...rest })
      : await supabase.from('pages').update(rest).eq('slug', slug)
    setSaving(false)
    if (error) return setMsg({ type: 'err', text: error.message })
    setMsg({ type: 'ok', text: 'Page saved.' })
    setEdit(null)
    await load()
  }

  async function remove(p: Pg) {
    if (!window.confirm(`Delete page "${p.title}"?`)) return
    const { error } = await createClient().from('pages').delete().eq('slug', p.slug)
    if (error) return setMsg({ type: 'err', text: error.message })
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

  const bar = (i: number, len: number, onUp: () => void, onDown: () => void, onDel: () => void) => (
    <div className="flex gap-1">
      <button onClick={onUp} disabled={i === 0} className="rounded border border-gray-300 px-2 py-0.5 text-xs disabled:opacity-30">Up</button>
      <button onClick={onDown} disabled={i === len - 1} className="rounded border border-gray-300 px-2 py-0.5 text-xs disabled:opacity-30">Down</button>
      <button onClick={onDel} className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700">Delete</button>
    </div>
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemBox = (i: number, items: any[], k: number, children: React.ReactNode) => (
    <div key={k} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="mb-2 flex justify-between">
        <span className="text-xs text-neutral-500">Item {k + 1}</span>
        {bar(k, items.length,
          () => patchBlock(i, { items: swap(items, k, -1) }),
          () => patchBlock(i, { items: swap(items, k, 1) }),
          () => patchBlock(i, { items: items.filter((_, j) => j !== k) }))}
      </div>
      {children}
    </div>
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setItem = (i: number, items: any[], k: number, p: Record<string, unknown>) =>
    patchBlock(i, { items: items.map((x, j) => (j === k ? { ...x, ...p } : x)) })
  const photoInput = (key: string, url: string | undefined, onUrl: (u: string) => void) => (
    <div className="mt-2 flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="h-12 w-12 rounded object-cover" />}
      <input type="file" accept="image/*" className="text-sm" onChange={(e) => e.target.files?.[0] && uploadOne(e.target.files[0], key, onUrl)} />
      {uploading === key && <span className="text-xs text-neutral-500">Uploading...</span>}
    </div>
  )

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/admin" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">&larr; Back to dashboard</Link>
        {msg && <p className={`mt-4 text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

        {!edit ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900">Pages</h1>
              <button onClick={() => { setEdit({ ...EMPTY }); setIsNew(true); setMsg(null) }}
                className="rounded-md bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700">+ Add page</button>
            </div>
            <div className="mt-6 space-y-3">
              {list.map((p) => (
                <div key={p.slug} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900">{p.title}</p>
                    <p className="text-xs text-neutral-400">{DIRECT.includes(p.slug) ? `/${p.slug}` : `/p/${p.slug}`}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${p.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-neutral-600'}`}>
                    {p.published ? 'Published' : 'Hidden'}
                  </span>
                  <button onClick={() => { setEdit(p); setIsNew(false); setMsg(null) }} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Edit</button>
                  <button onClick={() => remove(p)} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Delete</button>
                </div>
              ))}
              {!list.length && <p className="text-neutral-500">No pages yet.</p>}
            </div>
          </>
        ) : (
          <div className="mt-4">
            <h1 className="font-heading text-3xl font-medium text-neutral-900">{isNew ? 'Add page' : 'Edit page'}</h1>
            <div className="mt-6 grid gap-4 rounded-2xl border border-gray-100 bg-white p-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Slug (URL: /p/slug, cannot change later)</label>
                <input className={inputClass + (!isNew ? ' bg-gray-50' : '')} disabled={!isNew} value={edit.slug}
                  onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Title</label>
                <input className={inputClass} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Description (for search engines)</label>
                <input className={inputClass} value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} />
                Published
              </label>
            </div>

            <h2 className="mt-8 text-xl font-semibold text-neutral-900">Page content</h2>
            <p className="text-sm text-neutral-500">
              A &quot;band&quot; block starts a new full-width section (colour or background image) for the blocks below it.
              In text, wrap words in **double stars** to make them bold.
            </p>
            <div className="mt-4 space-y-3">
              {edit.blocks.map((raw, i) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const b = raw as any
                return (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">{b.type.replace('_', ' ')}</span>
                      {bar(i, edit.blocks.length, () => setBlocks(swap(edit.blocks, i, -1)), () => setBlocks(swap(edit.blocks, i, 1)),
                        () => setBlocks(edit.blocks.filter((_, j) => j !== i)))}
                    </div>
                    {b.type !== 'band' && (
                      <input className={inputClass + ' mb-2'} placeholder="Anchor id (optional, e.g. schedule, for links like /memory#schedule)"
                        value={b.id ?? ''} onChange={(e) => patchBlock(i, { id: idify(e.target.value) })} />
                    )}

                    {b.type === 'heading' && (
                      <div className="space-y-2">
                        <input className={inputClass} placeholder="Heading" value={b.text} onChange={(e) => patchBlock(i, { text: e.target.value })} />
                        <input className={inputClass} placeholder="Small line below (optional)" value={b.sub ?? ''} onChange={(e) => patchBlock(i, { sub: e.target.value })} />
                        <div className="flex flex-wrap gap-4 text-sm">
                          <label className="flex items-center gap-2"><input type="checkbox" checked={!!b.big} onChange={(e) => patchBlock(i, { big: e.target.checked })} /> Large section title</label>
                          <label className="flex items-center gap-2"><input type="checkbox" checked={!!b.left} onChange={(e) => patchBlock(i, { left: e.target.checked })} /> Left aligned</label>
                          <label className="flex items-center gap-2"><input type="checkbox" checked={!!b.underline} onChange={(e) => patchBlock(i, { underline: e.target.checked })} /> Underline</label>
                        </div>
                      </div>
                    )}

                    {b.type === 'text' && (
                      <>
                        <textarea rows={5} className={inputClass} value={b.text} onChange={(e) => patchBlock(i, { text: e.target.value })} />
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <select className="rounded-md border border-gray-300 px-2 py-1" value={b.align ?? 'center'} onChange={(e) => patchBlock(i, { align: e.target.value })}>
                            <option value="center">Center</option><option value="justify">Justify</option><option value="left">Left</option>
                          </select>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={!!b.bold} onChange={(e) => patchBlock(i, { bold: e.target.checked })} /> Bold (whole block)</label>
                        </div>
                      </>
                    )}

                    {b.type === 'image' && (
                      <>
                        {photoInput(`b${i}`, b.src, (url) => patchBlock(i, { src: url }))}
                        <div className="mt-2 flex gap-3">
                          <select className="rounded-md border border-gray-300 px-2 py-1 text-sm" value={b.width ?? 'md'} onChange={(e) => patchBlock(i, { width: e.target.value })}>
                            <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option><option value="full">Full width</option>
                          </select>
                          <input className={inputClass} placeholder="Alt text" value={b.alt ?? ''} onChange={(e) => patchBlock(i, { alt: e.target.value })} />
                        </div>
                      </>
                    )}

                    {b.type === 'button' && (
                      <div className="grid gap-2 md:grid-cols-2">
                        <input className={inputClass} placeholder="Button text" value={b.text} onChange={(e) => patchBlock(i, { text: e.target.value })} />
                        <input className={inputClass} placeholder="Link (/page, https://..., PDF path)" value={b.href} onChange={(e) => patchBlock(i, { href: e.target.value })} />
                      </div>
                    )}

                    {(b.type === 'people_list' || b.type === 'people_grid') && (
                      <div className="space-y-3">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {b.items.map((it: any, k: number) =>
                          itemBox(i, b.items, k, (
                            <>
                              <div className="grid gap-2 md:grid-cols-2">
                                <input className={inputClass} placeholder="Name" value={it.name} onChange={(e) => setItem(i, b.items, k, { name: e.target.value })} />
                                {b.type === 'people_list' && (
                                  <input className={inputClass} placeholder="Role (optional)" value={it.role ?? ''} onChange={(e) => setItem(i, b.items, k, { role: e.target.value })} />
                                )}
                              </div>
                              {b.type === 'people_list' && (
                                <textarea rows={4} className={inputClass + ' mt-2'} placeholder="Bio" value={it.bio ?? ''} onChange={(e) => setItem(i, b.items, k, { bio: e.target.value })} />
                              )}
                              {photoInput(`b${i}-${k}`, it.photo, (url) => setItem(i, b.items, k, { photo: url }))}
                            </>
                          )))}
                        <button onClick={() => patchBlock(i, { items: [...b.items, { name: '' }] })} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">+ Add person</button>
                      </div>
                    )}

                    {b.type === 'gallery' && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <label>Columns{' '}
                            <select className="rounded-md border border-gray-300 px-2 py-1" value={b.cols ?? 3} onChange={(e) => patchBlock(i, { cols: Number(e.target.value) })}>
                              <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
                            </select>
                          </label>
                          <input type="file" accept="image/*" multiple
                            onChange={(e) => e.target.files?.length && uploadMany(e.target.files, `g${i}`, (urls) => patchBlock(i, { images: [...b.images, ...urls.map((src) => ({ src }))] }))} />
                          {uploading === `g${i}` && <span className="text-xs text-neutral-500">Uploading...</span>}
                          <span className="text-xs text-neutral-500">{b.images.length} photos</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {b.images.map((g: any, k: number) => (
                            <div key={k} className="w-24 rounded border border-gray-200 p-1">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={g.src} alt="" className="h-16 w-full object-cover" />
                              <div className="mt-1 flex justify-between text-xs">
                                <button onClick={() => patchBlock(i, { images: swap(b.images, k, -1) })}>&larr;</button>
                                <button onClick={() => patchBlock(i, { images: swap(b.images, k, 1) })}>&rarr;</button>
                                <button className="text-red-700" onClick={() => patchBlock(i, { images: b.images.filter((_: unknown, j: number) => j !== k) })}>x</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {b.type === 'timeline' && (
                      <div className="space-y-3">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {b.items.map((it: any, k: number) =>
                          itemBox(i, b.items, k, (
                            <div className="grid gap-2 md:grid-cols-2">
                              <input className={inputClass} placeholder="Step title" value={it.title} onChange={(e) => setItem(i, b.items, k, { title: e.target.value })} />
                              <input className={inputClass} placeholder="Date / detail" value={it.date ?? ''} onChange={(e) => setItem(i, b.items, k, { date: e.target.value })} />
                            </div>
                          )))}
                        <button onClick={() => patchBlock(i, { items: [...b.items, { title: '', date: '' }] })} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">+ Add step</button>
                      </div>
                    )}

                    {b.type === 'cards' && (
                      <div className="space-y-3">
                        <label className="block text-sm">Layout{' '}
                          <select className="rounded-md border border-gray-300 px-2 py-1" value={b.layout ?? 'list'} onChange={(e) => patchBlock(i, { layout: e.target.value })}>
                            <option value="list">Rows (image and text)</option>
                            <option value="grid3">3 columns</option>
                          </select>
                        </label>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {b.items.map((it: any, k: number) =>
                          itemBox(i, b.items, k, (
                            <>
                              <input className={inputClass} placeholder="Title" value={it.title} onChange={(e) => setItem(i, b.items, k, { title: e.target.value })} />
                              <textarea rows={3} className={inputClass + ' mt-2'} placeholder="Text (optional)" value={it.text ?? ''} onChange={(e) => setItem(i, b.items, k, { text: e.target.value })} />
                              <div className="mt-2 grid gap-2 md:grid-cols-2">
                                <input className={inputClass} placeholder="Button text (optional)" value={it.button ?? ''} onChange={(e) => setItem(i, b.items, k, { button: e.target.value })} />
                                <input className={inputClass} placeholder="Button link" value={it.href ?? ''} onChange={(e) => setItem(i, b.items, k, { href: e.target.value })} />
                              </div>
                              {photoInput(`b${i}-${k}`, it.image, (url) => setItem(i, b.items, k, { image: url }))}
                            </>
                          )))}
                        <button onClick={() => patchBlock(i, { items: [...b.items, { title: '' }] })} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">+ Add card</button>
                      </div>
                    )}

                    {b.type === 'columns' && (
                      <div className="space-y-3">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {b.items.map((it: any, k: number) =>
                          itemBox(i, b.items, k, (
                            <div className="space-y-2">
                              <textarea rows={3} className={inputClass} placeholder="Text" value={it.text ?? ''} onChange={(e) => setItem(i, b.items, k, { text: e.target.value })} />
                              <div className="grid gap-2 md:grid-cols-2">
                                <input className={inputClass} placeholder="Link text" value={it.linkText ?? ''} onChange={(e) => setItem(i, b.items, k, { linkText: e.target.value })} />
                                <input className={inputClass} placeholder="Link (https://, mailto:)" value={it.link ?? ''} onChange={(e) => setItem(i, b.items, k, { link: e.target.value })} />
                              </div>
                              <input className={inputClass} placeholder="Embed URL (Google Maps embed link, optional)" value={it.embed ?? ''} onChange={(e) => setItem(i, b.items, k, { embed: e.target.value })} />
                              <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!!it.linkLast} onChange={(e) => setItem(i, b.items, k, { linkLast: e.target.checked })} /> Show link below text</label>
                            </div>
                          )))}
                        <button onClick={() => patchBlock(i, { items: [...b.items, { text: '' }] })} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">+ Add column</button>
                      </div>
                    )}

                    {b.type === 'banners' && (
                      <div className="space-y-3">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {b.items.map((it: any, k: number) =>
                          itemBox(i, b.items, k, (
                            <>
                              <input className={inputClass} placeholder="Title" value={it.title} onChange={(e) => setItem(i, b.items, k, { title: e.target.value })} />
                              {photoInput(`b${i}-${k}`, it.image, (url) => setItem(i, b.items, k, { image: url }))}
                            </>
                          )))}
                        <button onClick={() => patchBlock(i, { items: [...b.items, { title: '' }] })} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">+ Add banner</button>
                      </div>
                    )}

                    {b.type === 'band' && (
                      <div className="space-y-3 text-sm">
                        <div className="flex flex-wrap items-center gap-3">
                          <select className="rounded-md border border-gray-300 px-2 py-1" value={BGS.some(([, v]) => v === b.bg) ? b.bg : ''} onChange={(e) => e.target.value && patchBlock(i, { bg: e.target.value })}>
                            <option value="">Custom</option>
                            {BGS.map(([n, v]) => <option key={v} value={v}>{n}</option>)}
                          </select>
                          <input className={inputClass + ' max-w-[140px]'} placeholder="#e8e5da" value={b.bg ?? ''} onChange={(e) => patchBlock(i, { bg: e.target.value })} />
                          <span className="inline-block h-6 w-6 rounded border border-gray-300" style={{ background: b.bg }} />
                        </div>
                        {photoInput(`band${i}`, b.image, (url) => patchBlock(i, { image: url }))}
                        {b.image && <button className="text-xs text-red-700" onClick={() => patchBlock(i, { image: '' })}>Remove background image</button>}
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-1"><input type="checkbox" checked={!!b.overlay} onChange={(e) => patchBlock(i, { overlay: e.target.checked })} /> Dark overlay on image</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={!!b.dark} onChange={(e) => patchBlock(i, { dark: e.target.checked })} /> White text</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={!!b.narrow} onChange={(e) => patchBlock(i, { narrow: e.target.checked })} /> Narrow width</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={!!b.full} onChange={(e) => patchBlock(i, { full: e.target.checked })} /> Full width (no side margin)</label>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button key={t} onClick={() => addBlock(t)} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">
                  + {t.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={save} disabled={saving} className="rounded-md bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save page'}</button>
              <button onClick={() => setEdit(null)} className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm text-neutral-700">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}