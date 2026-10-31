'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
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
}

function formatDate(value: string | null) {
  if (!value) return ''
  const d = new Date(value + 'T00:00:00')
  return isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PodcastPage() {
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const [activeId, setActiveId] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setLoggedIn(false)
        setLoading(false)
        return
      }
      setLoggedIn(true)

      const { data, error } = await supabase
        .from('podcast_episodes')
        .select('id, title, speaker, description, recorded_on, audio_path, youtube_id, duration_minutes')
        .order('recorded_on', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) setError(error.message)
      else setEpisodes((data ?? []) as Episode[])
      setLoading(false)
    }

    load()
  }, [])

  async function handleListen(ep: Episode) {
    // Dobara click karne par player band
    if (activeId === ep.id) {
      setActiveId(null)
      setAudioUrl('')
      return
    }

    setError('')

    // YouTube episode: sirf kholna hai, signed link ki zaroorat nahi
    if (ep.youtube_id) {
      setAudioUrl('')
      setActiveId(ep.id)
      return
    }

    if (!ep.audio_path) return
    setLoadingId(ep.id)
    const supabase = createClient()
    // Private link jo 1 ghante chalta hai
    const { data, error } = await supabase.storage
      .from('podcast')
      .createSignedUrl(ep.audio_path, 3600)
    setLoadingId(null)

    if (error || !data) {
      setError(error?.message || 'Could not load this audio. Please try again.')
      return
    }
    setAudioUrl(data.signedUrl)
    setActiveId(ep.id)
  }

  const q = query.trim().toLowerCase()
  const filtered = q
    ? episodes.filter((e) =>
        `${e.title} ${e.speaker ?? ''} ${e.description ?? ''}`.toLowerCase().includes(q)
      )
    : episodes

  if (loading) {
    return (
      <main className="bg-white">
        <div className="mx-auto max-w-3xl px-6 pb-24 pt-20 text-center text-neutral-500 md:pt-28">
          Loading...
        </div>
      </main>
    )
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-20 md:pt-28">
        <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900 md:text-5xl">
          CISMA Podcast
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
          Recordings of CISMA lectures, available to registered members only.
        </p>

        {!loggedIn ? (
          <div className="mt-10 rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-lg font-semibold text-cisma-navy">Members only</p>
            <p className="mt-2 text-sm text-neutral-600">
              Please log in or create a free account to watch the lectures.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className="rounded-md bg-cisma-navy px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cisma-blue"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md border border-cisma-navy px-5 py-2.5 text-sm font-bold text-cisma-navy transition-colors hover:bg-cisma-navy hover:text-white"
              >
                Sign up
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

            {episodes.length > 0 && (
              <input
                className="mt-8 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue"
                placeholder="Search by title or speaker..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            )}

            <div className="mt-6 space-y-4">
              {filtered.map((ep) => {
                const isActive = activeId === ep.id
                const isVideo = Boolean(ep.youtube_id)
                return (
                  <div key={ep.id} className="rounded-lg border border-gray-200 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-semibold text-cisma-navy">{ep.title}</h2>
                        <p className="mt-1 text-sm text-neutral-500">
                          {[
                            ep.speaker,
                            formatDate(ep.recorded_on),
                            ep.duration_minutes ? `${ep.duration_minutes} min` : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleListen(ep)}
                        disabled={loadingId === ep.id}
                        className="rounded-md bg-cisma-navy px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-cisma-blue disabled:opacity-50"
                      >
                        {loadingId === ep.id
                          ? 'Loading...'
                          : isActive
                            ? 'Close'
                            : isVideo
                              ? 'Watch'
                              : 'Listen'}
                      </button>
                    </div>

                    {ep.description && (
                      <p className="mt-3 text-[15px] leading-relaxed text-neutral-700">
                        {ep.description}
                      </p>
                    )}

                    {isActive && ep.youtube_id && (
                      <div className="mt-5 aspect-video w-full overflow-hidden rounded-md bg-black">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${ep.youtube_id}?autoplay=1&rel=0`}
                          title={ep.title}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {isActive && !ep.youtube_id && audioUrl && (
                      <audio
                        key={audioUrl}
                        controls
                        autoPlay
                        controlsList="nodownload"
                        src={audioUrl}
                        className="mt-5 w-full"
                      >
                        Your browser does not support audio playback.
                      </audio>
                    )}
                  </div>
                )
              })}

              {!filtered.length && !error && (
                <p className="py-10 text-center text-neutral-500">
                  {episodes.length ? 'No episodes match your search.' : 'No episodes yet. Please check back soon.'}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}