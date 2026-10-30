'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Episode = {
  id: string
  title: string
  speaker: string | null
  description: string | null
  recorded_on: string | null
  audio_path: string
  duration_minutes: number | null
  published: boolean
  created_at: string
}

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB (Supabase free plan limit)

const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
}

function slugify(s: string) {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  return slug || 'episode'
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'

export default function AdminPodcastPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [title, setTitle] = useState('')
  const [speaker, setSpeaker] = useState('')
  const [description, setDescription] = useState('')
  const [recordedOn, setRecordedOn] = useState('')
  const [duration, setDuration] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.replace('/login')
        return
      }

      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single()

      if (me?.role !== 'admin') {
        setStatus('denied')
        return
      }

      const { data, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) setError(error.message)
      setEpisodes((data as Episode[]) ?? [])
      setStatus('ok')
    }

    load()
  }, [router])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (!f) return

    if (f.size > MAX_BYTES) {
      setError(
        `This file is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 50 MB. Please compress it first (mono, 64 kbps MP3).`
      )
      setFile(null)
      setFileKey((k) => k + 1)
      return
    }

    // Try to read the duration automatically
    const url = URL.createObjectURL(f)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      if (isFinite(audio.duration)) setDuration(String(Math.max(1, Math.round(audio.duration / 60))))
      URL.revokeObjectURL(url)
    }
    audio.onerror = () => URL.revokeObjectURL(url)
    audio.src = url
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!title.trim()) return setError('Please enter a title.')
    if (!file) return setError('Please choose an audio file.')

    setSaving(true)
    const supabase = createClient()

    const ext = (file.name.split('.').pop() || 'mp3').toLowerCase()
    const path = `${slugify(title)}-${Date.now()}.${ext}`
    const contentType = file.type || MIME_BY_EXT[ext] || 'audio/mpeg'

    const { error: upErr } = await supabase.storage
      .from('podcast')
      .upload(path, file, { contentType, upsert: false })

    if (upErr) {
      setSaving(false)
      setError(`Upload failed: ${upErr.message}`)
      return
    }

    const { data, error: insErr } = await supabase
      .from('podcast_episodes')
      .insert({
        title: title.trim(),
        speaker: speaker.trim() || null,
        description: description.trim() || null,
        recorded_on: recordedOn || null,
        audio_path: path,
        duration_minutes: duration ? parseInt(duration, 10) : null,
      })
      .select()
      .single()

    if (insErr || !data) {
      // Do not leave an orphan file behind
      await supabase.storage.from('podcast').remove([path])
      setSaving(false)
      setError(`Could not save the episode: ${insErr?.message ?? 'unknown error'}`)
      return
    }

    setEpisodes((list) => [data as Episode, ...list])
    setTitle('')
    setSpeaker('')
    setDescription('')
    setRecordedOn('')
    setDuration('')
    setFile(null)
    setFileKey((k) => k + 1)
    setSaving(false)
    setMessage('Episode added.')
  }

  async function togglePublished(ep: Episode) {
    setError('')
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase
      .from('podcast_episodes')
      .update({ published: !ep.published })
      .eq('id', ep.id)
    if (error) return setError(error.message)
    setEpisodes((list) =>
      list.map((x) => (x.id === ep.id ? { ...x, published: !ep.published } : x))
    )
  }

  async function handleDelete(ep: Episode) {
    if (!window.confirm(`Delete "${ep.title}" and its audio file? This cannot be undone.`)) return
    setError('')
    setMessage('')
    const supabase = createClient()

    const { error: delErr } = await supabase.from('podcast_episodes').delete().eq('id', ep.id)
    if (delErr) return setError(delErr.message)

    await supabase.storage.from('podcast').remove([ep.audio_path])
    setEpisodes((list) => list.filter((x) => x.id !== ep.id))
    setMessage('Episode deleted.')
  }

  if (status === 'loading') {
    return (
      <main className="bg-white">
        <div className="mx-auto max-w-2xl px-6 pb-24 pt-20 text-center text-neutral-500 md:pt-28">
          Loading...
        </div>
      </main>
    )
  }

  if (status === 'denied') {
    return (
      <main className="bg-white">
        <div className="mx-auto max-w-2xl px-6 pb-24 pt-20 text-center md:pt-28">
          <h1 className="font-heading text-3xl font-medium text-neutral-900">Access denied</h1>
          <p className="mt-4 text-neutral-600">You do not have permission to view this page.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-20 md:pt-28">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900 md:text-5xl">
            Manage Podcast
          </h1>
          <Link href="/admin" className="text-sm text-cisma-blue hover:underline">
            Back to Admin
          </Link>
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-6 text-sm text-green-700">{message}</p>}

        <form onSubmit={handleSubmit} className="mt-10 space-y-4 rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-cisma-navy">Add a new episode</h2>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Title *</label>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Speaker</label>
            <input className={inputClass} value={speaker} onChange={(e) => setSpeaker(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Description</label>
            <textarea
              className={inputClass}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Lecture date</label>
              <input
                type="date"
                className={inputClass}
                value={recordedOn}
                onChange={(e) => setRecordedOn(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Duration (minutes)</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Audio file * (MP3, M4A, AAC or WAV, up to 50 MB)
            </label>
            <input
              key={fileKey}
              type="file"
              accept=".mp3,.m4a,.aac,.wav,audio/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-neutral-700 file:mr-4 file:rounded-md file:border-0 file:bg-cisma-navy file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-cisma-blue"
            />
            {file && (
              <p className="mt-1 text-xs text-neutral-500">
                {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-cisma-navy px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cisma-blue disabled:opacity-50"
          >
            {saving ? 'Uploading, please wait...' : 'Upload episode'}
          </button>
        </form>

        <h2 className="mt-12 text-xl font-semibold text-cisma-navy">
          All episodes ({episodes.length})
        </h2>
        <div className="mt-4 space-y-3">
          {episodes.map((ep) => (
            <div key={ep.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900">{ep.title}</p>
                  <p className="text-sm text-neutral-500">
                    {[ep.speaker, ep.recorded_on, ep.duration_minutes ? `${ep.duration_minutes} min` : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">{ep.audio_path}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      ep.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-neutral-600'
                    }`}
                  >
                    {ep.published ? 'Published' : 'Hidden'}
                  </span>
                  <button
                    onClick={() => togglePublished(ep)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-gray-50"
                  >
                    {ep.published ? 'Hide' : 'Publish'}
                  </button>
                  <button
                    onClick={() => handleDelete(ep)}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!episodes.length && <p className="text-neutral-500">No episodes yet.</p>}
        </div>
      </div>
    </main>
  )
}