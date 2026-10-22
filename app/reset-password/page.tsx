'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2.5 text-gray-800 placeholder:text-gray-400 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'
const buttonClass =
  'w-full rounded-md bg-cisma-navy px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cisma-blue disabled:opacity-50'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [checked, setChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    const timer = setTimeout(() => setChecked(true), 3000)
    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage('Password updated. Redirecting to your dashboard...')
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-md px-6 pb-24 pt-20 md:pt-28">
        <h1 className="text-center font-heading text-4xl font-medium tracking-tight text-neutral-900 md:text-5xl">
          Set new password
        </h1>

        {ready ? (
          <form onSubmit={handleSubmit} className="mt-10 space-y-4">
            <input
              className={inputClass}
              type="password"
              placeholder="New password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? 'Please wait...' : 'Update password'}
            </button>
          </form>
        ) : (
          <p className="mt-10 text-center text-[15px] text-neutral-500">
            {checked ? (
              <>
                This reset link is invalid or has expired.{' '}
                <Link href="/forgot-password" className="font-semibold text-cisma-blue hover:underline">
                  Request a new one
                </Link>
              </>
            ) : (
              'Verifying your link...'
            )}
          </p>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-4 text-sm text-green-700">{message}</p>}
      </div>
    </main>
  )
}