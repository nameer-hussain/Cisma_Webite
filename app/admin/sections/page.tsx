'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Sec = {
  id: string; eyebrow: string | null; title: string; body: string | null
  image: string | null; image_style: 'wide' | 'portrait'; image_side: 'left' | 'right'
  button1_text: string | null; button1_href: string | null
  button2_text: string | null; button2_href: string | null; button2_download: boolean
  bg: 'white' | 'light' | 'gray'; visible: boolean; sort_order: number
}

const EMPTY: Sec = {
  id: '', eyebrow: '', title: '', body: '', image: null, image_style: 'wide', image_side: 'left',
  button1_text: '', button1_href: '', button2_text: '', button2_href: '', button2_download: false,
  bg: 'white', visible: true, sort_order: 0,
}

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

export default function AdminSectionsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [list, setList] = useState<Sec[]>([])
  const [edit, setEdit] = useState<Sec | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await createClient().from('home_sections').select('*').order('sort_order', { ascending: true })
    if (error) setMsg({ type: 'err', text: error.message })
    setList((data ?? []) as Sec[])
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

  async function toggle(s: Sec) {
    const { error } = await createClient().from('home_sections').update({ visible: !s.visible }).eq('id', s.id)
    if (error) return setMsg({ type: 'err', text: error.message })
    await load()
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const a = list[i], b = list[j]
    const supabase = createClient()
    // sort_order barabar na rahe, is liye position se dobara likhte hain
    const order = [...list]
    ;[order[i], order[j]] = [order[j], order[i]]
    for (let k = 0; k < order.length; k++) {
      if (order[k].sort_order !== k + 1) {
        const { error } = await supabase.from('home_sections').update({ sort_order: k + 1 }).eq('id', order[k].id)
        if (error) return setMsg({ type: 'err', text: error.message })
      }
    }
    void a; void b
    await load()
  }

  async function upload(file: File) {
    if (!edit) return
    setUploading(true)
    const supabase = createClient()
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `sections/${edit.id || 'new'}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('site-images').upload(path, file)
    setUploading(false)
    if (error) return setMsg({ type: 'err', text: `Upload failed: ${error.message}` })
    setEdit({ ...edit, image: supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl })
  }

  async function save() {
    if (!edit) return
    if (!edit.id.trim() || !edit.title.trim()) return setMsg({ type: 'err', text: 'ID and title are required.' })
    setSaving(true)
    setMsg(null)
    const row = { ...edit }
    const supabase = createClient()
    const { error } = isNew
      ? await supabase.from('home_sections').insert({ ...row, sort_order: list.length + 1 })
      : await supabase.from('home_sections').update(row).eq('id', edit.id)
    setSaving(false)
    if (error) return setMsg({ type: 'err', text: error.message })
    setMsg({ type: 'ok', text: 'Section saved.' })
    setEdit(null)
    await load()
  }

  async function remove(s: Sec) {
    if (!window.confirm(`Delete section "${s.title}"?`)) return
    const { error } = await createClient().from('home_sections').delete().eq('id', s.id)
    if (error) return setMsg({ type: 'err', text: error.message })
    await load()
  }

  const txt = (label: string, key: keyof Sec, span = false) => (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="mb-1 block text-xs text-neutral-500">{label}</label>
      <input className={inputClass} value={(edit?.[key] as string | null) ?? ''}
        onChange={(e) => edit && setEdit({ ...edit, [key]: e.target.value })} />
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

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/admin" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">&larr; Back to dashboard</Link>
        {msg && <p className={`mt-4 text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

        {!edit ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900">Homepage Sections</h1>
              <button onClick={() => { setEdit({ ...EMPTY }); setIsNew(true); setMsg(null) }}
                className="rounded-md bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700">+ Add section</button>
            </div>
            <p className="mt-2 text-sm text-neutral-500">Shown on the homepage from top to bottom, between the slider and the Lecture Series.</p>
            <div className="mt-6 space-y-3">
              {list.map((s, i) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
                  {s.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt="" className="h-14 w-14 rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900">{s.title}</p>
                    <p className="text-xs text-neutral-400">Link: /#{s.id}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-neutral-600'}`}>
                    {s.visible ? 'Visible' : 'Hidden'}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30">Up</button>
                    <button onClick={() => move(i, 1)} disabled={i === list.length - 1} className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30">Down</button>
                  </div>
                  <button onClick={() => toggle(s)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">{s.visible ? 'Hide' : 'Show'}</button>
                  <button onClick={() => { setEdit(s); setIsNew(false); setMsg(null) }} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Edit</button>
                  <button onClick={() => remove(s)} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Delete</button>
                </div>
              ))}
              {!list.length && <p className="text-neutral-500">No sections yet.</p>}
            </div>
          </>
        ) : (
          <div className="mt-4">
            <h1 className="font-heading text-3xl font-medium text-neutral-900">{isNew ? 'Add section' : 'Edit section'}</h1>
            <div className="mt-6 grid gap-4 rounded-2xl border border-gray-100 bg-white p-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">ID (used for the link /#id, cannot change later)</label>
                <input className={inputClass + (!isNew ? ' bg-gray-50' : '')} disabled={!isNew} value={edit.id}
                  onChange={(e) => setEdit({ ...edit, id: slugify(e.target.value) })} placeholder="e.g. summer-school" />
              </div>
              {txt('Small label above title (optional)', 'eyebrow')}
              {txt('Title', 'title', true)}
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Text</label>
                <textarea rows={4} className={inputClass} value={edit.body ?? ''} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Image</label>
                {edit.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={edit.image} alt="" className="mb-2 h-24 w-auto rounded border border-gray-200" />
                )}
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="block w-full text-sm" />
                {uploading && <p className="text-xs text-neutral-500">Uploading...</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Image style</label>
                <select className={inputClass} value={edit.image_style} onChange={(e) => setEdit({ ...edit, image_style: e.target.value as Sec['image_style'] })}>
                  <option value="wide">Wide (cropped, like a photo)</option>
                  <option value="portrait">Portrait (like a book cover)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Image side</label>
                <select className={inputClass} value={edit.image_side} onChange={(e) => setEdit({ ...edit, image_side: e.target.value as Sec['image_side'] })}>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>

              {txt('Button 1 text', 'button1_text')}
              {txt('Button 1 link (/page, #section, https://..., mailto:...)', 'button1_href')}
              {txt('Button 2 text (optional)', 'button2_text')}
              {txt('Button 2 link', 'button2_href')}
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={edit.button2_download} onChange={(e) => setEdit({ ...edit, button2_download: e.target.checked })} />
                Button 2 downloads the file
              </label>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Background</label>
                <select className={inputClass} value={edit.bg} onChange={(e) => setEdit({ ...edit, bg: e.target.value as Sec['bg'] })}>
                  <option value="white">White</option>
                  <option value="light">Light blue/cream</option>
                  <option value="gray">Light gray</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={edit.visible} onChange={(e) => setEdit({ ...edit, visible: e.target.checked })} />
                Visible on homepage
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={save} disabled={saving} className="rounded-md bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save section'}</button>
              <button onClick={() => setEdit(null)} className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm text-neutral-700">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}