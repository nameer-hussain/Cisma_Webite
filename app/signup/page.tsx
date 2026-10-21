'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage('Account created. Please check your email and click the confirmation link, then log in.')
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-3xl font-bold">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-slate-800 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Please wait...' : 'Sign up'}
        </button>
      </form>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {message && <p className="mt-4 text-green-700">{message}</p>}
      <p className="mt-6 text-sm">
        Already have an account? <Link href="/login" className="underline">Log in</Link>
      </p>
    </main>
  )
}