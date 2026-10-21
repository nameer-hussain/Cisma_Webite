'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  full_name: string | null
  email: string | null
  role: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', userData.user.id)
        .single()

      if (error) {
        setError(error.message)
      } else {
        setProfile(data)
      }
      setLoading(false)
    }

    load()
  }, [router])

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

        {profile && (
          <div className="mt-10 rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-neutral-500">Welcome back</p>
            <p className="mt-1 text-2xl font-semibold text-cisma-navy">
              {profile.full_name || 'CISMA Member'}
            </p>
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

        <button
          onClick={handleLogout}
          className="mt-8 rounded-md border border-cisma-navy px-5 py-2.5 text-sm font-bold text-cisma-navy transition-colors hover:bg-cisma-navy hover:text-white"
        >
          Log out
        </button>
      </div>
    </main>
  )
}