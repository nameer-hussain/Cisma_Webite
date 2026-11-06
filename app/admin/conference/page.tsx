'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Conf = {
  slug: string; name: string; theme: string | null; description: string
  start_date: string | null; end_date: string | null
  venue: string | null; city: string | null; country: string | null
  hosts: string | null; contact_email: string | null
  submission_guidelines: string; publication_info: string; published: boolean
  hero_image: string | null
}
type Deadline = { id: string; conference_slug: string; label: string; due_date: string; sort_order: number }
type Track = { id: string; conference_slug: string; name: string; description: string; sort_order: number }
type Topic = { id: string; track_id: string; title: string; sort_order: number }
type SubType = { id: string; conference_slug: string; category: string; name: string; description: string; sort_order: number }

type Tab = 'info' | 'deadlines' | 'tracks' | 'types'
type Msg = { type: 'ok' | 'err'; text: string } | null

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'
const smallBtn = 'rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-30'
const outlineBtn = 'rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50'
const dangerBtn = 'rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50'
const primaryBtn = 'rounded-md bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-50'

const nn = (s: string | null) => (s && s.trim() ? s.trim() : null)

export default function AdminConferencePage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [tab, setTab] = useState<Tab>('info')
  const [msg, setMsg] = useState<Msg>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [confs, setConfs] = useState<Conf[]>([])
  const [slug, setSlug] = useState('')
  const [conf, setConf] = useState<Conf | null>(null)
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [types, setTypes] = useState<SubType[]>([])

  const fail = (text: string) => setMsg({ type: 'err', text })
  const ok = (text: string) => setMsg({ type: 'ok', text })

  const load = useCallback(async (wanted?: string) => {
    const supabase = createClient()
    const { data: cs, error } = await supabase.from('conferences').select('*').order('sort_order').order('start_date')
    if (error) return fail(error.message)
    const all = (cs ?? []) as Conf[]
    setConfs(all)
    const current = all.find((c) => c.slug === (wanted ?? slug)) ?? all[0]
    if (!current) {
      setConf(null)
      return
    }
    setSlug(current.slug)
    setConf(current)
    const [d, t, tp, st] = await Promise.all([
      supabase.from('deadlines').select('*').eq('conference_slug', current.slug).order('due_date'),
      supabase.from('tracks').select('*').eq('conference_slug', current.slug).order('sort_order'),
      supabase.from('topics').select('*').order('sort_order'),
      supabase.from('submission_types').select('*').eq('conference_slug', current.slug).order('sort_order'),
    ])
    const firstError = d.error || t.error || tp.error || st.error
    if (firstError) fail(firstError.message)
    const trackList = (t.data ?? []) as Track[]
    const ids = new Set(trackList.map((x) => x.id))
    setDeadlines((d.data ?? []) as Deadline[])
    setTracks(trackList)
    setTopics(((tp.data ?? []) as Topic[]).filter((x) => ids.has(x.track_id)))
    setTypes((st.data ?? []) as SubType[])
  }, [slug])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // ---------- shared helpers ----------
  async function reorder(table: 'tracks' | 'topics' | 'submission_types', rows: { id: string; sort_order: number }[], i: number, d: -1 | 1) {
    const j = i + d
    if (j < 0 || j >= rows.length) return
    const order = [...rows]
    ;[order[i], order[j]] = [order[j], order[i]]
    const supabase = createClient()
    for (let k = 0; k < order.length; k++) {
      if (order[k].sort_order !== k + 1) {
        const { error } = await supabase.from(table).update({ sort_order: k + 1 }).eq('id', order[k].id)
        if (error) return fail(error.message)
      }
    }
    await load()
  }

  async function removeRow(table: 'deadlines' | 'tracks' | 'topics' | 'submission_types', id: string, label: string, extra = '') {
    if (!window.confirm(`Delete "${label}"?${extra}`)) return
    const { error } = await createClient().from(table).delete().eq('id', id)
    if (error) return fail(error.message)
    ok('Deleted.')
    await load()
  }

  // ---------- conference info ----------
  async function uploadHero(file: File) {
    if (!conf) return
    setUploading(true)
    const supabase = createClient()
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `conference/${conf.slug}-hero-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('site-images').upload(path, file)
    setUploading(false)
    if (error) return fail(`Upload failed: ${error.message}`)
    setConf({ ...conf, hero_image: supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl })
    ok('Image uploaded. Click Save conference to keep it.')
  }

  async function saveConf() {
    if (!conf) return
    if (!conf.name.trim()) return fail('Conference name is required.')
    setSaving(true)
    setMsg(null)
    const { slug: s, ...rest } = conf
    const row = {
      ...rest,
      name: conf.name.trim(),
      theme: nn(conf.theme), start_date: nn(conf.start_date), end_date: nn(conf.end_date),
      venue: nn(conf.venue), city: nn(conf.city), country: nn(conf.country),
      hosts: nn(conf.hosts), contact_email: nn(conf.contact_email),
    }
    const { error } = await createClient().from('conferences').update(row).eq('slug', s)
    setSaving(false)
    if (error) return fail(error.message)
    ok('Conference saved.')
    await load()
  }

  // ---------- deadlines ----------
  async function addDeadline() {
    if (!conf) return
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await createClient()
      .from('deadlines')
      .insert({ conference_slug: conf.slug, label: 'New deadline', due_date: today, sort_order: deadlines.length + 1 })
    if (error) return fail(error.message)
    await load()
  }
  async function saveDeadline(d: Deadline) {
    if (!d.label.trim() || !d.due_date) return fail('Deadline needs a label and a date.')
    const { error } = await createClient().from('deadlines').update({ label: d.label.trim(), due_date: d.due_date }).eq('id', d.id)
    if (error) return fail(error.message)
    ok('Deadline saved.')
    await load()
  }

  // ---------- tracks and topics ----------
  async function addTrack() {
    if (!conf) return
    const { error } = await createClient()
      .from('tracks')
      .insert({ conference_slug: conf.slug, name: 'New track', sort_order: tracks.length + 1 })
    if (error) return fail(error.message)
    await load()
  }
  async function saveTrack(t: Track) {
    if (!t.name.trim()) return fail('Track name is required.')
    const { error } = await createClient().from('tracks').update({ name: t.name.trim(), description: t.description }).eq('id', t.id)
    if (error) return fail(error.message)
    ok('Track saved.')
    await load()
  }
  async function addTopic(trackId: string) {
    const count = topics.filter((x) => x.track_id === trackId).length
    const { error } = await createClient().from('topics').insert({ track_id: trackId, title: 'New topic', sort_order: count + 1 })
    if (error) return fail(error.message)
    await load()
  }
  async function saveTopic(t: Topic) {
    if (!t.title.trim()) return fail('Topic text is required.')
    const { error } = await createClient().from('topics').update({ title: t.title.trim() }).eq('id', t.id)
    if (error) return fail(error.message)
    ok('Topic saved.')
    await load()
  }

  // ---------- submission types ----------
  async function addType() {
    if (!conf) return
    const { error } = await createClient()
      .from('submission_types')
      .insert({ conference_slug: conf.slug, category: 'Individual Papers', name: 'New type', sort_order: types.length + 1 })
    if (error) return fail(error.message)
    await load()
  }
  async function saveType(t: SubType) {
    if (!t.name.trim() || !t.category.trim()) return fail('Type needs a category and a name.')
    const { error } = await createClient()
      .from('submission_types')
      .update({ category: t.category.trim(), name: t.name.trim(), description: t.description })
      .eq('id', t.id)
    if (error) return fail(error.message)
    ok('Submission type saved.')
    await load()
  }

  // ---------- render ----------
  if (status === 'loading') return <main className="bg-white"><div className="px-6 pt-28 text-center text-neutral-500">Loading...</div></main>
  if (status === 'denied')
    return (
      <main className="bg-white"><div className="mx-auto max-w-2xl px-6 pb-24 pt-28 text-center">
        <h1 className="font-heading text-3xl font-medium text-neutral-900">Access denied</h1>
        <p className="mt-4 text-neutral-600">You do not have permission to view this page.</p>
      </div></main>
    )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Conference' },
    { key: 'deadlines', label: 'Deadlines' },
    { key: 'tracks', label: 'Tracks and topics' },
    { key: 'types', label: 'Submission types' },
  ]

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-20 md:pt-28">
        <Link href="/admin" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">&larr; Back to dashboard</Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900">Conference setup</h1>
          {confs.length > 1 && (
            <select className={inputClass + ' !w-auto'} value={slug} onChange={(e) => load(e.target.value)}>
              {confs.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          )}
        </div>
        {msg && <p className={`mt-4 text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

        {!conf ? (
          <p className="mt-8 text-neutral-500">No conference found. Add one in the database first.</p>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setMsg(null) }}
                  className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === t.key ? 'bg-black text-white' : 'border border-gray-300 bg-white text-neutral-700 hover:bg-gray-50'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ---------- Conference info ---------- */}
            {tab === 'info' && (
              <div className="mt-6">
                <div className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Slug (URL key, cannot change)</label>
                    <input className={inputClass + ' bg-gray-50'} disabled value={conf.slug} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Conference name</label>
                    <input className={inputClass} value={conf.name} onChange={(e) => setConf({ ...conf, name: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-neutral-500">Theme</label>
                    <input className={inputClass} value={conf.theme ?? ''} onChange={(e) => setConf({ ...conf, theme: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Start date</label>
                    <input type="date" className={inputClass} value={conf.start_date ?? ''} onChange={(e) => setConf({ ...conf, start_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">End date</label>
                    <input type="date" className={inputClass} value={conf.end_date ?? ''} onChange={(e) => setConf({ ...conf, end_date: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-neutral-500">Venue</label>
                    <input className={inputClass} value={conf.venue ?? ''} onChange={(e) => setConf({ ...conf, venue: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">City</label>
                    <input className={inputClass} value={conf.city ?? ''} onChange={(e) => setConf({ ...conf, city: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Country</label>
                    <input className={inputClass} value={conf.country ?? ''} onChange={(e) => setConf({ ...conf, country: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-neutral-500">Hosts</label>
                    <input className={inputClass} value={conf.hosts ?? ''} onChange={(e) => setConf({ ...conf, hosts: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-neutral-500">Contact email</label>
                    <input type="email" className={inputClass} value={conf.contact_email ?? ''} onChange={(e) => setConf({ ...conf, contact_email: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-neutral-500">Description (leave an empty line between paragraphs)</label>
                    <textarea rows={10} className={inputClass} value={conf.description} onChange={(e) => setConf({ ...conf, description: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-neutral-500">Submission guidelines (leave an empty line between paragraphs)</label>
                    <textarea rows={8} className={inputClass} value={conf.submission_guidelines} onChange={(e) => setConf({ ...conf, submission_guidelines: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-neutral-500">Publication opportunities</label>
                    <textarea rows={3} className={inputClass} value={conf.publication_info} onChange={(e) => setConf({ ...conf, publication_info: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-neutral-500">Hero image (wide landscape photo, at least 1600 px wide)</label>
                    {conf.hero_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={conf.hero_image} alt="" className="mb-2 h-32 w-auto rounded border border-gray-200" />
                    )}
                    <input type="file" accept="image/*" className="block w-full text-sm" onChange={(e) => e.target.files?.[0] && uploadHero(e.target.files[0])} />
                    {uploading && <p className="text-xs text-neutral-500">Uploading...</p>}
                    {conf.hero_image && (
                      <button type="button" onClick={() => setConf({ ...conf, hero_image: null })} className="mt-2 text-xs text-red-700 underline">
                        Remove image
                      </button>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-neutral-700 md:col-span-2">
                    <input type="checkbox" checked={conf.published} onChange={(e) => setConf({ ...conf, published: e.target.checked })} />
                    Published (visible on the public website)
                  </label>
                </div>
                <div className="mt-6">
                  <button onClick={saveConf} disabled={saving} className={primaryBtn}>{saving ? 'Saving...' : 'Save conference'}</button>
                </div>
              </div>
            )}

            {/* ---------- Deadlines ---------- */}
            {tab === 'deadlines' && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-500">Deadlines are shown in date order.</p>
                  <button onClick={addDeadline} className={primaryBtn}>+ Add deadline</button>
                </div>
                <div className="mt-4 space-y-3">
                  {deadlines.map((d) => (
                    <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
                      <input
                        className={inputClass + ' min-w-[200px] flex-1'}
                        value={d.label}
                        onChange={(e) => setDeadlines(deadlines.map((x) => (x.id === d.id ? { ...x, label: e.target.value } : x)))}
                      />
                      <input
                        type="date"
                        className={inputClass + ' !w-auto'}
                        value={d.due_date}
                        onChange={(e) => setDeadlines(deadlines.map((x) => (x.id === d.id ? { ...x, due_date: e.target.value } : x)))}
                      />
                      <button onClick={() => saveDeadline(d)} className={outlineBtn}>Save</button>
                      <button onClick={() => removeRow('deadlines', d.id, d.label)} className={dangerBtn}>Delete</button>
                    </div>
                  ))}
                  {!deadlines.length && <p className="text-neutral-500">No deadlines yet.</p>}
                </div>
              </div>
            )}

            {/* ---------- Tracks and topics ---------- */}
            {tab === 'tracks' && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-500">Each track groups the topics authors can submit to.</p>
                  <button onClick={addTrack} className={primaryBtn}>+ Add track</button>
                </div>
                <div className="mt-4 space-y-6">
                  {tracks.map((t, i) => {
                    const own = topics.filter((x) => x.track_id === t.id)
                    return (
                      <div key={t.id} className="rounded-2xl border border-gray-100 bg-white p-5">
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            className={inputClass + ' min-w-[220px] flex-1 font-semibold'}
                            value={t.name}
                            onChange={(e) => setTracks(tracks.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))}
                          />
                          <div className="flex gap-1">
                            <button onClick={() => reorder('tracks', tracks, i, -1)} disabled={i === 0} className={smallBtn}>Up</button>
                            <button onClick={() => reorder('tracks', tracks, i, 1)} disabled={i === tracks.length - 1} className={smallBtn}>Down</button>
                          </div>
                          <button onClick={() => saveTrack(t)} className={outlineBtn}>Save track</button>
                          <button
                            onClick={() => removeRow('tracks', t.id, t.name, own.length ? ` This also deletes its ${own.length} topics.` : '')}
                            className={dangerBtn}
                          >
                            Delete track
                          </button>
                        </div>

                        <div className="mt-4 space-y-2">
                          {own.map((tp, j) => (
                            <div key={tp.id} className="flex flex-wrap items-start gap-2">
                              <textarea
                                rows={2}
                                className={inputClass + ' min-w-[220px] flex-1'}
                                value={tp.title}
                                onChange={(e) => setTopics(topics.map((x) => (x.id === tp.id ? { ...x, title: e.target.value } : x)))}
                              />
                              <div className="flex gap-1 pt-1">
                                <button onClick={() => reorder('topics', own, j, -1)} disabled={j === 0} className={smallBtn}>Up</button>
                                <button onClick={() => reorder('topics', own, j, 1)} disabled={j === own.length - 1} className={smallBtn}>Down</button>
                              </div>
                              <button onClick={() => saveTopic(tp)} className={outlineBtn}>Save</button>
                              <button onClick={() => removeRow('topics', tp.id, tp.title.slice(0, 60))} className={dangerBtn}>Delete</button>
                            </div>
                          ))}
                          {!own.length && <p className="text-sm text-neutral-500">No topics in this track yet.</p>}
                        </div>
                        <button onClick={() => addTopic(t.id)} className={outlineBtn + ' mt-4'}>+ Add topic</button>
                      </div>
                    )
                  })}
                  {!tracks.length && <p className="text-neutral-500">No tracks yet.</p>}
                </div>
              </div>
            )}

            {/* ---------- Submission types ---------- */}
            {tab === 'types' && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-500">Use the same category text to group types together (for example Individual Papers).</p>
                  <button onClick={addType} className={primaryBtn}>+ Add type</button>
                </div>
                <div className="mt-4 space-y-3">
                  {types.map((t, i) => (
                    <div key={t.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-neutral-500">Category</label>
                          <input
                            className={inputClass}
                            value={t.category}
                            onChange={(e) => setTypes(types.map((x) => (x.id === t.id ? { ...x, category: e.target.value } : x)))}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-neutral-500">Name</label>
                          <input
                            className={inputClass}
                            value={t.name}
                            onChange={(e) => setTypes(types.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs text-neutral-500">Description</label>
                          <textarea
                            rows={3}
                            className={inputClass}
                            value={t.description}
                            onChange={(e) => setTypes(types.map((x) => (x.id === t.id ? { ...x, description: e.target.value } : x)))}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className="flex gap-1">
                          <button onClick={() => reorder('submission_types', types, i, -1)} disabled={i === 0} className={smallBtn}>Up</button>
                          <button onClick={() => reorder('submission_types', types, i, 1)} disabled={i === types.length - 1} className={smallBtn}>Down</button>
                        </div>
                        <button onClick={() => saveType(t)} className={outlineBtn}>Save</button>
                        <button onClick={() => removeRow('submission_types', t.id, t.name)} className={dangerBtn}>Delete</button>
                      </div>
                    </div>
                  ))}
                  {!types.length && <p className="text-neutral-500">No submission types yet.</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}