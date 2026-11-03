'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Kn = {
  slug: string; speaker_name: string; title: string | null; photo: string | null
  abstract: string; keywords: string | null; bio: string | null; published: boolean; sort_order: number
}
const EMPTY: Kn = { slug: '', speaker_name: '', title: '', photo: null, abstract: '', keywords: '', bio: '', published: true, sort_order: 0 }
const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export default function AdminKeynotesPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [list, setList] = useState<Kn[]>([])
  const [edit, setEdit] = useState<Kn | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await createClient().from('keynotes').select('*').order('sort_order', { ascending: true })
    if (error) setMsg({ type: 'err', text: error.message })
    setList((data ?? []) as Kn[])
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

  async function move(i: number, d: -1 | 1) {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const order = [...list]
    ;[order[i], order[j]] = [order[j], order[i]]
    const supabase = createClient()
    for (let k = 0; k < order.length; k++) {
      if (order[k].sort_order !== k + 1) {
        const { error } = await supabase.from('keynotes').update({ sort_order: k + 1 }).eq('slug', order[k].slug)
        if (error) return setMsg({ type: 'err', text: error.message })
      }
    }
    await load()
  }

  async function upload(file: File) {
    if (!edit) return
    setUploading(true)
    const supabase = createClient()
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `keynotes/${edit.slug || 'new'}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('site-images').upload(path, file)
    setUploading(false)
    if (error) return setMsg({ type: 'err', text: `Upload failed: ${error.message}` })
    setEdit({ ...edit, photo: supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl })
  }

  async function save() {
    if (!edit) return
    if (!edit.slug.trim() || !edit.speaker_name.trim() || !edit.abstract.trim())
      return setMsg({ type: 'err', text: 'Slug, speaker name and abstract are required.' })
    setSaving(true)
    setMsg(null)
    const supabase = createClient()
    const { slug, ...rest } = edit
    const row = { ...rest, title: edit.title || null, keywords: edit.keywords || null, bio: edit.bio || null }
    const { error } = isNew
      ? await supabase.from('keynotes').insert({ slug, ...row, sort_order: list.length + 1 })
      : await supabase.from('keynotes').update(row).eq('slug', slug)
    setSaving(false)
    if (error) return setMsg({ type: 'err', text: error.message })
    setMsg({ type: 'ok', text: 'Keynote saved.' })
    setEdit(null)
    await load()
  }

  async function toggle(k: Kn) {
    const { error } = await createClient().from('keynotes').update({ published: !k.published }).eq('slug', k.slug)
    if (error) return setMsg({ type: 'err', text: error.message })
    await load()
  }

  async function remove(k: Kn) {
    if (!window.confirm(`Delete keynote "${k.speaker_name}"?`)) return
    const { error } = await createClient().from('keynotes').delete().eq('slug', k.slug)
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

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/admin" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">&larr; Back to dashboard</Link>
        {msg && <p className={`mt-4 text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

        {!edit ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900">Keynotes</h1>
              <button onClick={() => { setEdit({ ...EMPTY }); setIsNew(true); setMsg(null) }}
                className="rounded-md bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700">+ Add keynote</button>
            </div>
            <div className="mt-6 space-y-3">
              {list.map((k, i) => (
                <div key={k.slug} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
                  {k.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={k.photo} alt="" className="h-14 w-14 rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900">{k.speaker_name}</p>
                    <p className="truncate text-xs text-neutral-400">{k.title || 'No title'}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${k.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-neutral-600'}`}>
                    {k.published ? 'Published' : 'Hidden'}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30">Up</button>
                    <button onClick={() => move(i, 1)} disabled={i === list.length - 1} className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30">Down</button>
                  </div>
                  <button onClick={() => toggle(k)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">{k.published ? 'Hide' : 'Show'}</button>
                  <button onClick={() => { setEdit(k); setIsNew(false); setMsg(null) }} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Edit</button>
                  <button onClick={() => remove(k)} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Delete</button>
                </div>
              ))}
              {!list.length && <p className="text-neutral-500">No keynotes yet.</p>}
            </div>
          </>
        ) : (
          <div className="mt-4">
            <h1 className="font-heading text-3xl font-medium text-neutral-900">{isNew ? 'Add keynote' : 'Edit keynote'}</h1>
            <div className="mt-6 grid gap-4 rounded-2xl border border-gray-100 bg-white p-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Slug (URL, cannot change later)</label>
                <input className={inputClass + (!isNew ? ' bg-gray-50' : '')} disabled={!isNew} value={edit.slug}
                  onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })} placeholder="e.g. jane-doe" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Speaker name</label>
                <input className={inputClass} value={edit.speaker_name} onChange={(e) => setEdit({ ...edit, speaker_name: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Talk title (optional)</label>
                <input className={inputClass} value={edit.title ?? ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Abstract (leave an empty line between paragraphs)</label>
                <textarea rows={10} className={inputClass} value={edit.abstract} onChange={(e) => setEdit({ ...edit, abstract: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Keywords (optional)</label>
                <input className={inputClass} value={edit.keywords ?? ''} onChange={(e) => setEdit({ ...edit, keywords: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Short bio (optional, shown under the abstract)</label>
                <textarea rows={3} className={inputClass} value={edit.bio ?? ''} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Photo</label>
                {edit.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={edit.photo} alt="" className="mb-2 h-24 w-auto rounded border border-gray-200" />
                )}
                <input type="file" accept="image/*" className="block w-full text-sm" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                {uploading && <p className="text-xs text-neutral-500">Uploading...</p>}
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} />
                Published
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={save} disabled={saving} className="rounded-md bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save keynote'}</button>
              <button onClick={() => setEdit(null)} className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm text-neutral-700">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}