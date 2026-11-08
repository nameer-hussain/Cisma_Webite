'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CONF = 'cisma-2027'
const MIN_WORDS = 250
const MAX_WORDS = 300
const MAX_AUTHORS = 8
const MAX_FILE = 5 * 1024 * 1024

type Conf = { slug: string; name: string; submissions_open: boolean; submissions_deadline: string | null }
type SubType = { id: string; category: string; name: string }
type Track = { id: string; name: string }
type Topic = { id: string; track_id: string; title: string }
type Author = { full_name: string; affiliation: string; email: string; is_presenting: boolean }

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'
const labelClass = 'mb-1 block text-xs font-semibold text-neutral-600'
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)
const refLabel = (n: number) => `CISMA2027-${String(n).padStart(4, '0')}`
const emptyAuthor = (a: Partial<Author> = {}): Author => ({ full_name: '', affiliation: '', email: '', is_presenting: false, ...a })
const isOpen = (c: Conf) =>
  c.submissions_open && (!c.submissions_deadline || new Date().toISOString().slice(0, 10) <= c.submissions_deadline)
const niceDate = (s: string) =>
  new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export default function SubmitPage() {
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'ok' | 'blocked'>('loading')
  const [blockedText, setBlockedText] = useState('')
  const [uid, setUid] = useState('')
  const [conf, setConf] = useState<Conf | null>(null)
  const [types, setTypes] = useState<SubType[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [refNo, setRefNo] = useState<number | null>(null)
  const [typeId, setTypeId] = useState('')
  const [trackId, setTrackId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [title, setTitle] = useState('')
  const [abstract, setAbstract] = useState('')
  const [keywords, setKeywords] = useState('')
  const [authors, setAuthors] = useState<Author[]>([emptyAuthor({ is_presenting: true })])
  const [file, setFile] = useState<File | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return router.replace('/login')
      setUid(u.user.id)
      const id = new URLSearchParams(window.location.search).get('id')
      const [c, st, tr, tp, me] = await Promise.all([
        supabase.from('conferences').select('slug,name,submissions_open,submissions_deadline').eq('slug', CONF).maybeSingle(),
        supabase.from('submission_types').select('id,category,name').eq('conference_slug', CONF).order('sort_order'),
        supabase.from('tracks').select('id,name').eq('conference_slug', CONF).order('sort_order'),
        supabase.from('topics').select('id,track_id,title').order('sort_order'),
        supabase.from('profiles').select('full_name').eq('id', u.user.id).maybeSingle(),
      ])
      const block = (t: string) => { setBlockedText(t); setState('blocked') }
      if (!c.data) return block('Abstract submission is not available yet.')
      const conference = c.data as Conf
      setConf(conference)
      const trackList = (tr.data ?? []) as Track[]
      const ids = new Set(trackList.map((x) => x.id))
      setTypes((st.data ?? []) as SubType[])
      setTracks(trackList)
      setTopics(((tp.data ?? []) as Topic[]).filter((x) => ids.has(x.track_id)))

      if (!isOpen(conference)) {
        return block(id ? 'Submissions are closed, so this abstract can no longer be edited.' : 'Abstract submissions are not open at the moment.')
      }
      if (id) {
        const { data: s } = await supabase
          .from('submissions')
          .select('*, submission_authors(*)')
          .eq('id', id)
          .eq('submitter_id', u.user.id)
          .maybeSingle()
        if (!s) return block('Submission not found.')
        if (s.status !== 'submitted') return block('This submission can no longer be edited.')
        setEditId(s.id)
        setRefNo(s.ref_no)
        setTypeId(s.submission_type_id ?? '')
        setTrackId(s.track_id ?? '')
        setTopicId(s.topic_id ?? '')
        setTitle(s.title)
        setAbstract(s.abstract)
        setKeywords(s.keywords ?? '')
        setFilePath(s.file_path ?? null)
        const list = ((s.submission_authors ?? []) as (Author & { position: number })[])
          .sort((a, b) => a.position - b.position)
          .map((a) => emptyAuthor(a))
        if (list.length) setAuthors(list)
      } else {
        setAuthors([emptyAuthor({ full_name: me.data?.full_name ?? '', email: u.user.email ?? '', is_presenting: true })])
      }
      setState('ok')
    })()
  }, [router])

  const wc = words(abstract)
  const wcOk = wc >= MIN_WORDS && wc <= MAX_WORDS
  const trackTopics = topics.filter((t) => t.track_id === trackId)
  const categories = Array.from(new Set(types.map((t) => t.category)))

  function setAuthor(i: number, patch: Partial<Author>) {
    setAuthors(authors.map((a, k) => (k === i ? { ...a, ...patch } : a)))
  }
  function setPresenting(i: number) {
    setAuthors(authors.map((a, k) => ({ ...a, is_presenting: k === i })))
  }
  function removeAuthor(i: number) {
    const next = authors.filter((_, k) => k !== i)
    if (!next.some((a) => a.is_presenting)) next[0].is_presenting = true
    setAuthors(next)
  }

  function validate(): string {
    if (!typeId) return 'Please choose a submission type.'
    if (!trackId) return 'Please choose a track.'
    if (!title.trim()) return 'Please enter the title.'
    if (!wcOk) return `The abstract must be ${MIN_WORDS} to ${MAX_WORDS} words (currently ${wc}).`
    for (const [i, a] of authors.entries()) {
      if (!a.full_name.trim() || !a.affiliation.trim() || !/^\S+@\S+\.\S+$/.test(a.email.trim()))
        return `Author ${i + 1}: please fill in name, affiliation and a valid email.`
    }
    if (authors.filter((a) => a.is_presenting).length !== 1) return 'Please mark exactly one presenting author.'
    if (file) {
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      if (!['doc', 'docx'].includes(ext)) return 'The file must be a Word document (.doc or .docx).'
      if (file.size > MAX_FILE) return 'The file must be smaller than 5 MB.'
    }
    return ''
  }

  async function submit() {
    const problem = validate()
    if (problem) return setMsg(problem)
    setSaving(true)
    setMsg('')
    const supabase = createClient()
    const row = {
      conference_slug: CONF,
      submission_type_id: typeId,
      track_id: trackId,
      topic_id: topicId || null,
      title: title.trim(),
      abstract: abstract.trim(),
      keywords: keywords.trim() || null,
    }
    let id = editId
    let ref = refNo
    if (id) {
      const { error } = await supabase.from('submissions').update(row).eq('id', id)
      if (error) { setSaving(false); return setMsg(error.message) }
    } else {
      const { data, error } = await supabase.from('submissions').insert(row).select('id, ref_no').single()
      if (error || !data) { setSaving(false); return setMsg(error?.message ?? 'Could not save the submission.') }
      id = data.id
      ref = data.ref_no
      setEditId(data.id)
      setRefNo(data.ref_no)
    }

    // authors: replace the whole list
    const del = await supabase.from('submission_authors').delete().eq('submission_id', id)
    if (del.error) { setSaving(false); return setMsg(del.error.message) }
    const { error: aErr } = await supabase.from('submission_authors').insert(
      authors.map((a, i) => ({
        submission_id: id,
        position: i + 1,
        full_name: a.full_name.trim(),
        affiliation: a.affiliation.trim(),
        email: a.email.trim(),
        is_presenting: a.is_presenting,
      }))
    )
    if (aErr) { setSaving(false); return setMsg(`${aErr.message} Your abstract was saved; please press Submit again to save the authors.`) }

    // optional file
    if (file) {
      const ext = (file.name.split('.').pop() || 'docx').toLowerCase()
      const path = `${uid}/${id}-${Date.now()}.${ext}`
      const up = await supabase.storage.from('submissions').upload(path, file)
      if (up.error) { setSaving(false); return setMsg(`File upload failed: ${up.error.message}. Your abstract was saved; you can try again.`) }
      const { error: fErr } = await supabase.from('submissions').update({ file_path: path }).eq('id', id)
      if (fErr) { setSaving(false); return setMsg(fErr.message) }
      if (filePath) await supabase.storage.from('submissions').remove([filePath])
      setFilePath(path)
      setFile(null)
    }

    setSaving(false)
    setRefNo(ref)
    setDone(true)
  }

  const shell = (children: React.ReactNode) => (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-28">{children}</div>
    </main>
  )

  if (state === 'loading') return shell(<p className="text-center text-neutral-500">Loading...</p>)
  if (state === 'blocked')
    return shell(
      <div className="text-center">
        <h1 className="font-heading text-3xl font-medium text-neutral-900">Submit an abstract</h1>
        <p className="mt-4 text-neutral-600">{blockedText}</p>
        <Link href="/submissions" className="mt-6 inline-block font-semibold text-cisma-blue hover:underline">Go to my submissions</Link>
      </div>
    )
  if (done)
    return shell(
      <div className="rounded-2xl border border-green-200 bg-white p-8 text-center">
        <h1 className="font-heading text-3xl font-medium text-neutral-900">Thank you</h1>
        <p className="mt-4 text-neutral-700">
          Your abstract has been {editId ? 'saved' : 'submitted'}.
          {refNo != null && <> Your reference number is <strong>{refLabel(refNo)}</strong>.</>}
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          You can edit it from My submissions until {conf?.submissions_deadline ? niceDate(conf.submissions_deadline) : 'the submission deadline'}.
        </p>
        <Link href="/submissions" className="mt-6 inline-block rounded-md bg-cisma-navy px-6 py-2.5 text-sm font-bold text-white hover:bg-cisma-blue">My submissions</Link>
      </div>
    )

  return shell(
    <>
      <Link href="/submissions" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">&larr; My submissions</Link>
      <h1 className="mt-4 font-heading text-4xl font-medium tracking-tight text-neutral-900">
        {editId ? 'Edit abstract' : 'Submit an abstract'}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        {conf?.name}
        {conf?.submissions_deadline && <> &middot; Deadline: {niceDate(conf.submissions_deadline)}</>}
        {refNo != null && <> &middot; {refLabel(refNo)}</>}
      </p>

      <div className="mt-8 space-y-6 rounded-2xl border border-gray-100 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Submission type</label>
            <select className={inputClass} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="">Choose...</option>
              {categories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {types.filter((t) => t.category === cat).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Track</label>
            <select className={inputClass} value={trackId} onChange={(e) => { setTrackId(e.target.value); setTopicId('') }}>
              <option value="">Choose...</option>
              {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Topic (optional)</label>
            <select className={inputClass} value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!trackId}>
              <option value="">{trackId ? 'Choose...' : 'Choose a track first'}</option>
              {trackTopics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Title</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Abstract ({MIN_WORDS}&ndash;{MAX_WORDS} words, in English)</label>
          <textarea rows={12} className={inputClass} value={abstract} onChange={(e) => setAbstract(e.target.value)} />
          <p className={`mt-1 text-xs ${wcOk ? 'text-green-700' : 'text-neutral-500'}`}>{wc} words</p>
          <p className="mt-1 text-xs text-neutral-500">
            Include the purpose of the study, methodology, summary of findings/results, conclusion, and contributions.
          </p>
        </div>

        <div>
          <label className={labelClass}>Keywords (optional)</label>
          <input className={inputClass} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. orality, register variation, corpus" />
        </div>

        <div>
          <p className={labelClass}>Authors</p>
          <div className="space-y-3">
            {authors.map((a, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <input className={inputClass} placeholder="Full name" value={a.full_name} onChange={(e) => setAuthor(i, { full_name: e.target.value })} />
                  <input className={inputClass} type="email" placeholder="Email" value={a.email} onChange={(e) => setAuthor(i, { email: e.target.value })} />
                  <input className={inputClass + ' md:col-span-2'} placeholder="Affiliation" value={a.affiliation} onChange={(e) => setAuthor(i, { affiliation: e.target.value })} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input type="radio" name="presenting" checked={a.is_presenting} onChange={() => setPresenting(i)} />
                    Presenting author
                  </label>
                  {authors.length > 1 && (
                    <button type="button" onClick={() => removeAuthor(i)} className="text-sm text-red-700 hover:underline">Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {authors.length < MAX_AUTHORS && (
            <button type="button" onClick={() => setAuthors([...authors, emptyAuthor()])} className="mt-3 rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              + Add author
            </button>
          )}
        </div>

        <div>
          <label className={labelClass}>Word file (optional, .doc or .docx, up to 5 MB)</label>
          {filePath && !file && <p className="mb-2 text-xs text-neutral-500">A file is already attached. Choosing a new one replaces it.</p>}
          <input type="file" accept=".doc,.docx" className="block w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <p className="mt-1 text-xs text-neutral-500">Suggested name: CISMA2027 Paper-YourLastName.docx</p>
        </div>

        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button onClick={submit} disabled={saving} className="rounded-md bg-cisma-navy px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cisma-blue disabled:opacity-50">
          {saving ? 'Saving...' : editId ? 'Save changes' : 'Submit abstract'}
        </button>
      </div>
    </>
  )
}