'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2.5 text-gray-800 placeholder:text-gray-400 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue'
const buttonClass =
  'w-full rounded-md bg-cisma-navy px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cisma-blue disabled:opacity-50'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-md px-6 pb-24 pt-20 md:pt-28">
        <h1 className="text-center font-heading text-4xl font-medium tracking-tight text-neutral-900 md:text-5xl">
          Log in
        </h1>
        <p className="mt-3 text-center text-[15px] text-neutral-500">
          Access your CISMA member account.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-4">
          <input
            className={inputClass}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={inputClass}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading} className={buttonClass}>
            {loading ? 'Please wait...' : 'Log in'}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <p className="mt-8 text-center text-sm text-neutral-500">
          New here?{' '}
          <Link href="/signup" className="font-semibold text-cisma-blue hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}