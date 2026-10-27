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

type Certificate = {
  id: string
  certificate_code: string
  lecture_slug: string
  full_name: string
  institution: string | null
  issued_at: string
  name_locked: boolean
}

const TEMPLATE_PATH = '/certificate-template.png'

// Har lecture ki details. Key wohi hai jo database mein lecture_slug hai.
const LECTURE_INFO: Record<
  string,
  { speaker: string; date: string; time: string; venue: string }
> = {
  'paul-baker-14': {
    speaker: 'Paul Baker',
    date: '27 October 2026',
    time: '1:00 PM PKT (08:00 UTC)',
    venue: 'Zoom',
  },
}

// Positions, template ke pixels mein (template 1655 pixel chora hai)
const REF_W = 1655
const NAME_X = 864 // ribbon ka beech
const NAME_Y = 1094 // naam ki baseline
const NAME_MAX_W = 740
const SPEAKER_X = 870 // "delivered by" ka beech (Date/Time/Venue bhi yahin center hote hain)
const SPEAKER_Y = 1405
const DATE_Y = 1467
const TIME_Y = 1511
const VENUE_Y = 1555
const FOOTER_Y = 2324
// Template ke purane Date/Time/Venue labels ko dhakne ke liye (template pixels mein)
const LABEL_COVER = { x: 800, y: 1436, w: 140, h: 128 }

// Certificate par naam: sirf English/Latin huroof (PDF font ki wajah se)
const NAME_PATTERN = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'\-]*$/

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Certificate ke naam ki tabdeeli
  const [editingCertId, setEditingCertId] = useState<string | null>(null)
  const [certNameInput, setCertNameInput] = useState('')
  const [certSaving, setCertSaving] = useState(false)
  const [certError, setCertError] = useState('')
  const [certMessage, setCertMessage] = useState('')
  const [busy, setBusy] = useState('')

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

      const { data: certData } = await supabase
        .from('certificates')
        .select(
          'id, certificate_code, lecture_slug, full_name, institution, issued_at, name_locked'
        )
        .eq('user_id', userData.user.id)
        .order('issued_at', { ascending: false })

      setCertificates(certData || [])
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

  function startEditCertName(cert: Certificate) {
    setCertError('')
    setCertMessage('')
    setEditingCertId(cert.id)
    setCertNameInput(cert.full_name)
  }

  async function handleSaveCertName(e: React.FormEvent, cert: Certificate) {
    e.preventDefault()
    setCertError('')
    setCertMessage('')

    const cleaned = certNameInput.trim().replace(/\s+/g, ' ')
    if (cleaned.length < 2 || cleaned.length > 80) {
      setCertError('Name must be between 2 and 80 characters.')
      return
    }
    if (!NAME_PATTERN.test(cleaned)) {
      setCertError(
        'Please use English letters only (spaces, dots, hyphens and apostrophes are fine).'
      )
      return
    }

    const ok = window.confirm(
      `Your certificate will be printed with this name:\n\n${cleaned}\n\n` +
        'Once saved, the name is locked and cannot be changed. Continue?'
    )
    if (!ok) return

    setCertSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('certificates')
      .update({ full_name: cleaned, name_locked: true })
      .eq('id', cert.id)
      .select('id')
    setCertSaving(false)

    if (error || !data || data.length === 0) {
      setCertError(
        error?.message ||
          'Could not save the name. It may already be locked. Please refresh the page.'
      )
      return
    }

    setCertificates((list) =>
      list.map((c) =>
        c.id === cert.id ? { ...c, full_name: cleaned, name_locked: true } : c
      )
    )
    setEditingCertId(null)
    setCertMessage('Name saved and locked. Your certificate will show this name.')
  }

  // Certificate ki PDF banata hai (Blob wapas karta hai)
  async function buildCertificateBlob(cert: Certificate): Promise<Blob> {
    const { jsPDF } = await import('jspdf')
    const img = await loadImage(TEMPLATE_PATH)

    const pageW = 210
    const pageH = pageW * (img.naturalHeight / img.naturalWidth)
    const s = pageW / REF_W // 1 template pixel = s mm
    const pt = (px: number) => px * s * 2.8346 // pixel size ko font size mein badalna

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageW, pageH],
    })

    doc.addImage(
      img,
      TEMPLATE_PATH.endsWith('.png') ? 'PNG' : 'JPEG',
      0,
      0,
      pageW,
      pageH
    )

    // Member ka naam, ribbon par (lamba ho to chhota ho jata hai)
    let nameSize = pt(64)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(nameSize)
    while (doc.getTextWidth(cert.full_name) > NAME_MAX_W * s && nameSize > 10) {
      nameSize -= 1
      doc.setFontSize(nameSize)
    }
    doc.text(cert.full_name, NAME_X * s, NAME_Y * s, { align: 'center' })

    const info = LECTURE_INFO[cert.lecture_slug]
    if (info) {
      // Template ke purane Date/Time/Venue labels ko background rang se dhak dein
      doc.setFillColor(7, 41, 79)
      doc.rect(
        LABEL_COVER.x * s,
        LABEL_COVER.y * s,
        LABEL_COVER.w * s,
        LABEL_COVER.h * s,
        'F'
      )

      // Lecture dene wale ka naam
      doc.setFont('times', 'bold')
      doc.setFontSize(pt(40))
      doc.setTextColor(255, 255, 255)
      doc.text(info.speaker, SPEAKER_X * s, SPEAKER_Y * s, { align: 'center' })

      // Date, Time, Venue: har line (label + value) beech mein
      doc.setFont('times', 'normal')
      doc.setFontSize(pt(32))
      const rows: [string, string, number][] = [
        ['Date:', info.date, DATE_Y],
        ['Time:', info.time, TIME_Y],
        ['Venue:', info.venue, VENUE_Y],
      ]
      const gap = 10 * s
      rows.forEach(([label, value, y]) => {
        const wl = doc.getTextWidth(label)
        const wv = doc.getTextWidth(value)
        const startX = SPEAKER_X * s - (wl + gap + wv) / 2
        doc.setTextColor(172, 183, 196)
        doc.text(label, startX, y * s)
        doc.setTextColor(235, 240, 248)
        doc.text(value, startX + wl + gap, y * s)
      })
    }

    // Bilkul neeche chhota sa certificate ID aur verify link
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(pt(16))
    doc.setTextColor(140, 150, 170)
    doc.text(
      `Certificate ID: ${cert.certificate_code}  |  Verify: ${window.location.origin}/verify?code=${cert.certificate_code}`,
      (REF_W / 2) * s,
      FOOTER_Y * s,
      { align: 'center' }
    )

    return doc.output('blob')
  }

    async function handleDownload(cert: Certificate) {
    setCertError('')
    if (!cert.name_locked) {
      setCertError('Please set your name for the certificate first.')
      return
    }
    setBusy(`${cert.id}:download`)
    try {
      const blob = await buildCertificateBlob(cert)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-${cert.certificate_code}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (e) {
      setCertError('Could not generate the certificate PDF. Please try again.')
    }
    setBusy('')
  }

    async function handleView(cert: Certificate) {
    setCertError('')
    if (!cert.name_locked) {
      setCertError('Please set your name for the certificate first.')
      return
    }
    setBusy(`${cert.id}:view`)
    // Tab pehle kholte hain taake browser pop-up block na kare
    const w = window.open('', '_blank')
    try {
      const blob = await buildCertificateBlob(cert)
      const url = URL.createObjectURL(blob)
      if (w) {
        w.location.href = url
      } else {
        setCertError('Your browser blocked the new tab. Please allow pop-ups or use Download.')
      }
    } catch (e) {
      if (w) w.close()
      setCertError('Could not generate the certificate PDF. Please try again.')
    }
    setBusy('')
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

        <div className="mt-8 rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-cisma-navy">Your certificates</h2>

          {certError && <p className="mt-3 text-sm text-red-600">{certError}</p>}
          {certMessage && <p className="mt-3 text-sm text-green-700">{certMessage}</p>}

          {certificates.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              No certificates yet. Certificates are issued after a lecture to members who
              attended.
            </p>
          ) : (
            <ul className="mt-4 space-y-5">
              {certificates.map((cert) => (
                <li key={cert.id} className="border-t border-gray-100 pt-4">
                  <p className="font-medium text-neutral-800">{cert.lecture_slug}</p>
                  <p className="text-xs text-neutral-500">
                    {cert.certificate_code} ·{' '}
                    {new Date(cert.issued_at).toLocaleDateString('en-GB')}
                  </p>

                  {editingCertId === cert.id ? (
                    <form
                      onSubmit={(e) => handleSaveCertName(e, cert)}
                      className="mt-3"
                    >
                      <label className="text-xs text-neutral-500">
                        Name to print on the certificate
                      </label>
                      <div className="mt-1 flex flex-wrap gap-3">
                        <input
                          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-800 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue"
                          value={certNameInput}
                          onChange={(e) => setCertNameInput(e.target.value)}
                          maxLength={80}
                          required
                        />
                        <button
                          type="submit"
                          disabled={certSaving}
                          className="rounded-md bg-cisma-navy px-4 py-2 text-sm font-bold text-white hover:bg-cisma-blue disabled:opacity-50"
                        >
                          {certSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCertId(null)
                            setCertError('')
                          }}
                          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-neutral-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-neutral-500">
                        Write your name in English letters, exactly as you want it
                        printed. You can save it only once. After saving, it cannot be
                        changed.
                      </p>
                    </form>
                  ) : cert.name_locked ? (
                    <div className="mt-3">
                      <p className="text-sm text-neutral-600">
                        Name on certificate:{' '}
                        <span className="font-semibold text-neutral-900">
                          {cert.full_name}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Name is locked. To correct a mistake, please contact the CISMA
                        team.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-neutral-600">
                          Name on certificate:{' '}
                          <span className="font-semibold text-neutral-900">
                            {cert.full_name}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                            Set the name you want printed on your certificate. You can do this only once.
                        </p>
                      </div>
                      <button
                        onClick={() => startEditCertName(cert)}
                        className="text-sm text-cisma-blue hover:underline"
                      >
                        Set name
                      </button>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      onClick={() => handleView(cert)}
                      disabled={busy !== '' || editingCertId === cert.id || !cert.name_locked}
                      className="rounded-md border border-cisma-navy px-4 py-2 text-sm font-bold text-cisma-navy transition-colors hover:bg-cisma-navy hover:text-white disabled:opacity-50"
                    >
                      {busy === `${cert.id}:view` ? 'Opening...' : 'View'}
                    </button>
                    <button
                      onClick={() => handleDownload(cert)}
                      disabled={busy !== '' || editingCertId === cert.id || !cert.name_locked}
                      className="rounded-md bg-cisma-navy px-4 py-2 text-sm font-bold text-white hover:bg-cisma-blue disabled:opacity-50"
                    >
                      {busy === `${cert.id}:download` ? 'Preparing...' : 'Download PDF'}
                    </button>
                  </div>
                   {!cert.name_locked && (
                    <p className="mt-2 text-xs text-amber-700">
                      Set your name above to enable View and Download.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

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