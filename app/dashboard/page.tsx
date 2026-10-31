'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_PANEL_ROLES } from '@/lib/adminModules'

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

type LectureOption = {
  lecture_slug: string
  can_apply: boolean
  has_certificate: boolean
}

const TEMPLATE_PATH = '/certificate-template.png'

// Har lecture ki details. Key wohi hai jo database mein lecture_slug hai.
const LECTURE_INFO: Record<
  string,
  {
    topic: string
    speaker: string
    speakerInfo: string[] // zyada se zyada 2 lines, har line chhoti rakhein
    date: string
    time: string
  }
> = {
  'paul-baker-14': {
    topic:
      'Surprise Words and Core Words: Using Vibe Coding to Identify Collocational Divergence Across Corpora',
    speaker: 'Prof. Paul Baker',
    speakerInfo: [
      'Professor, Department of English and Communication',
      'The Hong Kong Polytechnic University',
    ],
    date: '27 October 2026',
    time: '1:00 PM PKT (08:00 UTC)',
  },
}

// Dashboard par lecture ka naam dikhane ke liye
function lectureLabel(slug: string) {
  const info = LECTURE_INFO[slug]
  return info ? `${info.speaker}: ${info.topic}` : slug
}

// Positions, template ke pixels mein (template 1655 pixel chora hai)
const REF_W = 1655
const NAME_X = 864 // ribbon ka beech
const NAME_Y = 1094 // naam ki baseline
const NAME_MAX_W = 740
const CENTER_X = 870 // "has attended" ke neeche sab kuch is line par center hota hai
const TOPIC_Y = 1318 // topic ki pehli line ki baseline
const TOPIC_MAX_W = 1100
const FOOTER_Y = 2324
// Template ke purane "delivered by" aur Date/Time/Venue ko dhakne ke liye
const COVER = { x: 760, y: 1300, w: 240, h: 270 }

// Neeche ka naam aur designation (template ke purane text ko dhak kar naya bold safed text likha jata hai)
const CHAIR_NAME = 'MUAHAMMAD AFZAAL'
const CHAIR_TITLE = 'FOUNDER & CO-CHAIR, CISMA'
const CHAIR_X = 863
const CHAIR_NAME_Y = 1878
const CHAIR_TITLE_Y = 1922
const CHAIR_COVER = { x: 640, y: 1848, w: 450, h: 84 }

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

// Member ke certificates aur apply ke options database se laata hai
async function fetchCertificateData(userId: string) {
  const supabase = createClient()
  const { data: certData } = await supabase
    .from('certificates')
    .select(
      'id, certificate_code, lecture_slug, full_name, institution, issued_at, name_locked'
    )
    .eq('user_id', userId)
    .order('issued_at', { ascending: false })

  const { data: optData } = await supabase.rpc('my_certificate_options')

  return {
    certs: (certData || []) as Certificate[],
    options: (optData || []) as LectureOption[],
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [lectureOptions, setLectureOptions] = useState<LectureOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Certificate ke liye apply karna
  const [applying, setApplying] = useState('')
  const [applyError, setApplyError] = useState('')
  const [applyMessage, setApplyMessage] = useState('')

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

      const { certs, options } = await fetchCertificateData(userData.user.id)
      setCertificates(certs)
      setLectureOptions(options)
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

  async function handleApply(slug: string) {
    setApplyError('')
    setApplyMessage('')
    setCertError('')
    setCertMessage('')
    setApplying(slug)

    const supabase = createClient()
    const { data, error } = await supabase.rpc('apply_for_certificate', {
      p_lecture_slug: slug,
    })

    if (error) {
      setApplyError(error.message)
      setApplying('')
      return
    }

    const result = data as string
    if (result === 'issued' || result === 'already_issued') {
      const fresh = await fetchCertificateData(userId)
      setCertificates(fresh.certs)
      setLectureOptions(fresh.options)
      setApplyMessage(
        result === 'issued'
          ? 'Your certificate is ready. Set your name below, then you can view or download it.'
          : 'You already have this certificate.'
      )
    } else if (result === 'not_registered') {
      setApplyError('We could not find a registration for this lecture with your account.')
    } else if (result === 'closed') {
      setApplyError('Certificates for this lecture are not open for applications.')
    } else if (result === 'not_logged_in') {
      setApplyError('Please log in again.')
    } else {
      setApplyError('Could not apply. Please try again.')
    }
    setApplying('')
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
      const cx = CENTER_X * s

      // Template ke purane "delivered by" aur Date/Time/Venue ko background rang se dhak dein
      doc.setFillColor(7, 41, 79)
      doc.rect(COVER.x * s, COVER.y * s, COVER.w * s, COVER.h * s, 'F')

      // Lecture ka topic: zyada se zyada 2 lines, lamba ho to font chhota ho jata hai
      doc.setFont('times', 'bold')
      let topicPx = 38
      let topicLines: string[] = [info.topic]
      for (;;) {
        doc.setFontSize(pt(topicPx))
        topicLines = doc.splitTextToSize(info.topic, TOPIC_MAX_W * s) as string[]
        if (topicLines.length <= 2 || topicPx <= 24) break
        topicPx -= 1
      }
      doc.setTextColor(255, 255, 255)
      let y = TOPIC_Y
      topicLines.forEach((line) => {
        doc.text(line, cx, y * s, { align: 'center' })
        y += 44
      })
      y -= 44 // aakhri line ki baseline

      // delivered by
      y += 52
      doc.setFont('times', 'normal')
      doc.setFontSize(pt(32))
      doc.setTextColor(172, 183, 196)
      doc.text('delivered by', cx, y * s, { align: 'center' })

      // Lecture dene wale ka naam
      y += 50
      doc.setFont('times', 'bold')
      doc.setFontSize(pt(40))
      doc.setTextColor(255, 255, 255)
      doc.text(info.speaker, cx, y * s, { align: 'center' })

      // Lecture dene wale ki chhoti si info
      y += 40
      doc.setFont('times', 'normal')
      doc.setFontSize(pt(28))
      doc.setTextColor(172, 183, 196)
      info.speakerInfo.forEach((line) => {
        doc.text(line, cx, y * s, { align: 'center' })
        y += 32
      })
      y += 18

      // Date aur Time: har line (label + value) beech mein
      doc.setFontSize(pt(30))
      const gap = 10 * s
      const rows: [string, string][] = [
        ['Date:', info.date],
        ['Time:', info.time],
      ]
      rows.forEach(([label, value]) => {
        const wl = doc.getTextWidth(label)
        const wv = doc.getTextWidth(value)
        const startX = cx - (wl + gap + wv) / 2
        doc.setTextColor(172, 183, 196)
        doc.text(label, startX, y * s)
        doc.setTextColor(235, 240, 248)
        doc.text(value, startX + wl + gap, y * s)
        y += 42
      })
    }

    // Co-chair ka naam aur designation: bold safed, topic ki tarah
    doc.setFillColor(7, 41, 79)
    doc.rect(
      CHAIR_COVER.x * s,
      CHAIR_COVER.y * s,
      CHAIR_COVER.w * s,
      CHAIR_COVER.h * s,
      'F'
    )
    doc.setFont('times', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(pt(34))
    doc.text(CHAIR_NAME, CHAIR_X * s, CHAIR_NAME_Y * s, { align: 'center' })
    doc.setFontSize(pt(28))
    doc.text(CHAIR_TITLE, CHAIR_X * s, CHAIR_TITLE_Y * s, { align: 'center' })

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

  const pendingOptions = lectureOptions.filter((o) => !o.has_certificate)

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

        {pendingOptions.length > 0 && (
          <div className="mt-8 rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-cisma-navy">
              Apply for a certificate
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              You registered for the lectures below. When certificates are open, you can
              apply for yours here.
            </p>

            {applyError && <p className="mt-3 text-sm text-red-600">{applyError}</p>}
            {applyMessage && <p className="mt-3 text-sm text-green-700">{applyMessage}</p>}

            <ul className="mt-4 space-y-4">
              {pendingOptions.map((opt) => (
                <li
                  key={opt.lecture_slug}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4"
                >
                  <p className="min-w-0 flex-1 text-sm text-neutral-800">
                    {lectureLabel(opt.lecture_slug)}
                  </p>
                  {opt.can_apply ? (
                    <button
                      onClick={() => handleApply(opt.lecture_slug)}
                      disabled={applying !== ''}
                      className="rounded-md bg-cisma-navy px-4 py-2 text-sm font-bold text-white hover:bg-cisma-blue disabled:opacity-50"
                    >
                      {applying === opt.lecture_slug
                        ? 'Applying...'
                        : 'Apply for certificate'}
                    </button>
                  ) : (
                    <span className="text-xs text-neutral-500">
                      Certificates are not open for this lecture.
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-cisma-navy">Your certificates</h2>

          {certError && <p className="mt-3 text-sm text-red-600">{certError}</p>}
          {certMessage && <p className="mt-3 text-sm text-green-700">{certMessage}</p>}

          {certificates.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              No certificates yet. If you registered for a lecture, you can apply for your
              certificate above once certificates are open.
            </p>
          ) : (
            <ul className="mt-4 space-y-5">
              {certificates.map((cert) => (
                <li key={cert.id} className="border-t border-gray-100 pt-4">
                  <p className="font-medium text-neutral-800">
                    {lectureLabel(cert.lecture_slug)}
                  </p>
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
                          Set the name you want printed on your certificate. You can do
                          this only once.
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
          {ADMIN_PANEL_ROLES.includes(profile?.role ?? '') && (
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