'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Result = {
  full_name: string
  lecture_slug: string
  issued_at: string
}

export default function VerifyPage() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  async function verify(value: string) {
    const trimmed = value.trim().toUpperCase()
    if (!trimmed) return
    setChecking(true)
    setResult(null)
    setNotFound(false)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.rpc('verify_certificate', { code: trimmed })

    setChecking(false)
    if (error) {
      setError(error.message)
    } else if (data && data.length > 0) {
      setResult(data[0])
    } else {
      setNotFound(true)
    }
  }

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('code')
    if (c) {
      setCode(c)
      verify(c)
    }
  }, [])

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-20 md:pt-28">
        <h1 className="font-heading text-4xl font-medium tracking-tight text-neutral-900 md:text-5xl">
          Verify Certificate
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            verify(code)
          }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <input
            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue"
            placeholder="CISMA-XXXXXXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={checking}
            className="rounded-md bg-cisma-navy px-5 py-2 text-sm font-bold text-white hover:bg-cisma-blue disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Verify'}
          </button>
        </form>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {notFound && (
          <p className="mt-6 text-sm text-red-600">
            No certificate found with this code. Please check the code and try again.
          </p>
        )}

        {result && (
          <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6">
            <p className="text-sm font-semibold text-green-800">Valid certificate</p>
            <dl className="mt-4 space-y-2 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Name</dt>
                <dd className="text-neutral-800">{result.full_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Lecture</dt>
                <dd className="text-neutral-800">{result.lecture_slug}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Issued</dt>
                <dd className="text-neutral-800">
                  {new Date(result.issued_at).toLocaleDateString('en-GB')}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </main>
  )
}