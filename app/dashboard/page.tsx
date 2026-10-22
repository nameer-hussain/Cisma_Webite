'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  full_name: string | null
  email: string | null
  role: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.replace('/login')
        return
      }
      setUserId(userData.user.id)

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', userData.user.id)
        .single()

      if (error) {
        setError(error.message)
      } else {
        setProfile(data)
        setNameInput(data.full_name || '')
      }
      setLoading(false)
    }

    load()
  }, [router])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaveMessage('')

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: nameInput.trim() })
      .eq('id', userId)

    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setProfile((p) => (p ? { ...p, full_name: nameInput.trim() } : p))
      setEditing(false)
      setSaveMessage('Name updated.')
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <main className="bg-white">
        <div className="mx-auto max-w-2xl px-6 pb-24 pt-20 text-center text-neutral-500 md:pt-28">
          Loading...
        </div>
      </main>
    )
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-20 md:pt-28">
        <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900 md:text-5xl">
          Member Dashboard
        </h1>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
        {saveMessage && <p className="mt-6 text-sm text-green-700">{saveMessage}</p>}

        {profile && (
          <div className="mt-10 rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-neutral-500">Welcome back</p>

            {editing ? (
              <form onSubmit={handleSaveName} className="mt-2 flex flex-wrap gap-3">
                <input
                  className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-cisma-navy px-4 py-2 text-sm font-bold text-white hover:bg-cisma-blue disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setNameInput(profile.full_name || '')
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-neutral-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="mt-1 flex items-center justify-between gap-4">
                <p className="text-2xl font-semibold text-cisma-navy">
                  {profile.full_name || 'CISMA Member'}
                </p>
                <button
                  onClick={() => {
                    setSaveMessage('')
                    setEditing(true)
                  }}
                  className="text-sm text-cisma-blue hover:underline"
                >
                  Edit name
                </button>
              </div>
            )}

            <dl className="mt-6 space-y-3 text-[15px]">
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <dt className="text-neutral-500">Email</dt>
                <dd className="text-neutral-800">{profile.email}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <dt className="text-neutral-500">Account type</dt>
                <dd className="capitalize text-neutral-800">{profile.role}</dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {profile?.role === 'admin' && (
            <Link
              href="/admin"
              className="rounded-md bg-cisma-navy px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cisma-blue"
            >
              Admin Panel
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="rounded-md border border-cisma-navy px-5 py-2.5 text-sm font-bold text-cisma-navy transition-colors hover:bg-cisma-navy hover:text-white"
          >
            Log out
          </button>
        </div>
      </div>
    </main>
  )
}