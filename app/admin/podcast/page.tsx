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
  audio_path: string | null
  youtube_id: string | null
  duration_minutes: number | null
  published: boolean
  created_at: string
}

// Har tarah ka YouTube link samajhta hai: watch?v=, youtu.be/, embed/, shorts/, live/
function parseYouTubeId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  try {
    const u = new URL(s)
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1, 12) || null
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const v = u.searchParams.get('v')
      if (v) return v.slice(0, 11)
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]{11})/)
      if (m) return m[2]
    }
  } catch {
    /* link nahi hai */
  }
  return null
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
  const [ytUrl, setYtUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const previewId = ytUrl ? parseYouTubeId(ytUrl) : null

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

      if (!['admin', 'editor'].includes(me?.role ?? '')) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!title.trim()) return setError('Please enter a title.')
    const id = parseYouTubeId(ytUrl)
    if (!id) return setError('Please paste a valid YouTube link.')

    setSaving(true)
    const supabase = createClient()
    const { data, error: insErr } = await supabase
      .from('podcast_episodes')
      .insert({
        title: title.trim(),
        speaker: speaker.trim() || null,
        description: description.trim() || null,
        recorded_on: recordedOn || null,
        youtube_id: id,
        duration_minutes: duration ? parseInt(duration, 10) : null,
      })
      .select()
      .single()
    setSaving(false)

    if (insErr || !data) {
      setError(`Could not save the episode: ${insErr?.message ?? 'unknown error'}`)
      return
    }

    setEpisodes((list) => [data as Episode, ...list])
    setTitle('')
    setSpeaker('')
    setDescription('')
    setRecordedOn('')
    setDuration('')
    setYtUrl('')
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
    if (!window.confirm(`Delete "${ep.title}"? This cannot be undone.`)) return
    setError('')
    setMessage('')
    const supabase = createClient()

    const { error: delErr } = await supabase.from('podcast_episodes').delete().eq('id', ep.id)
    if (delErr) return setError(delErr.message)

    // Purane audio episodes ki file bhi hatao (YouTube wale mein file nahi hoti)
    if (ep.audio_path) await supabase.storage.from('podcast').remove([ep.audio_path])
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
            <label className="mb-1 block text-sm text-neutral-600">YouTube link *</label>
            <input
              className={inputClass}
              placeholder="https://www.youtube.com/watch?v=..."
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-neutral-500">
              Upload the video on YouTube first (Unlisted or Public), then paste its link here.
              Private videos will not play on the website.
            </p>
            {ytUrl && !previewId && (
              <p className="mt-1 text-xs text-red-600">This does not look like a YouTube link.</p>
            )}
            {previewId && (
              <div className="mt-3 aspect-video w-full max-w-md overflow-hidden rounded-md border border-gray-200">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${previewId}`}
                  title="Preview"
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
            )}
          </div>

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
              <label className="mb-1 block text-sm text-neutral-600">Duration (minutes, optional)</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-cisma-navy px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cisma-blue disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add episode'}
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
                  <p className="mt-1 text-xs text-neutral-400">
                    {ep.youtube_id ? `YouTube: ${ep.youtube_id}` : `Audio file: ${ep.audio_path}`}
                  </p>
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