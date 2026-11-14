'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const NAVY = '#2a4f87'

type Step = {
  title: string
  text: string
  note?: string
  image?: { src: string; alt: string; phone?: boolean }
}

const STEPS: Step[] = [
  {
    title: 'Log in or create an account',
    text: 'You need a CISMA account to submit. Use “Log in” in the footer or the Dashboard link in the menu. If you are new, create an account with your email address.',
    note: 'Use the email address you check regularly: all updates about your abstract are sent there.',
  },
  {
    title: 'Choose the submission type',
    text: 'Open the Submit page and pick the type of contribution: an individual paper (research, work-in-progress, methodological, review, demonstration), a poster, or a workshop.',
    image: { src: '/guide/step-1-submission-type.png', alt: 'Choosing the submission type' },
  },
  {
    title: 'Choose your track',
    text: 'Select the track that best fits your work. Your abstract will be handled by the section editor of this track.',
    image: { src: '/guide/step-2-track.png', alt: 'Choosing the track' },
  },
  {
    title: 'Choose a topic (optional)',
    text: 'After you select a track, the list of topics for that track becomes available. Pick the closest one, or leave it empty if none fits.',
    note: 'The topic menu stays locked until a track is selected.',
    image: { src: '/guide/step-3-topic.png', alt: 'Choosing a topic after selecting a track' },
  },
  {
    title: 'Enter your abstract and submit',
    text: 'Add the title, your abstract (250–300 words, in English) and optional keywords. Then list all authors, mark the presenting author, optionally attach a Word file, and press “Submit abstract”.',
    note: 'Include the purpose of the study, methodology, summary of findings/results, conclusion and contributions.',
    image: { src: '/guide/step-4-fill-form.png', alt: 'The abstract form', phone: true },
  },
  {
    title: 'Follow your submission',
    text: 'You will receive a confirmation email straight away. From your Dashboard you can follow the status of your abstract (under review, accepted, not accepted) and you will be emailed whenever it changes.',
  },
]

const CHECKLIST = [
  'Abstract of 250–300 words, written in English',
  'Names, emails and affiliations of all authors',
  'Optional Word file (.doc or .docx, up to 5 MB), named CISMA2027 Paper-YourLastName.docx',
]

function Frame({ src, alt, phone, onOpen }: { src: string; alt: string; phone?: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full text-left"
      aria-label={`Enlarge: ${alt}`}
    >
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition group-hover:shadow-xl">
        <div className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-100 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
          <span className="ml-3 truncate rounded bg-white px-3 py-0.5 text-[11px] text-gray-400">cisma-corpus.com/submit</span>
        </div>
        <div className={phone ? 'flex justify-center bg-slate-50 py-4' : ''}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className={phone ? 'w-[230px] rounded-md border border-gray-200' : 'h-auto w-full'}
          />
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">Click to enlarge</p>
    </button>
  )
}

export default function SubmissionGuide({ submitOpen = true }: { submitOpen?: boolean }) {
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    if (!zoom) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  return (
    <div className="mt-10">
      <h3 className="text-xl font-semibold text-neutral-900">How to submit your abstract</h3>
      <p className="mt-1 text-[15px] text-neutral-600">Follow these steps to submit your abstract through the CISMA website.</p>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-slate-50 p-6">
        <p className="font-semibold text-neutral-900">Before you start, have ready:</p>
        <ul className="mt-3 space-y-2 text-[15px] text-neutral-700">
          {CHECKLIST.map((c) => (
            <li key={c} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: NAVY }}>✓</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <ol className="mt-10">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative flex gap-5 pb-12 last:pb-0 sm:gap-8">
            {i < STEPS.length - 1 && <span className="absolute left-[19px] top-11 h-[calc(100%_-_2.75rem)] w-px bg-gray-200" aria-hidden />}
            <span
              className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
              style={{ background: NAVY }}
            >
              {i + 1}
            </span>
            <div className={`grid min-w-0 flex-1 items-start gap-6 ${s.image ? 'md:grid-cols-2 md:gap-10' : ''}`}>
              <div>
                <h4 className="text-lg font-semibold text-neutral-900">{s.title}</h4>
                <p className="mt-2 text-[15px] leading-7 text-neutral-700">{s.text}</p>
                {s.note && (
                  <p className="mt-3 rounded-lg border-l-4 bg-blue-50/60 px-4 py-2.5 text-sm leading-6 text-neutral-700" style={{ borderColor: NAVY }}>
                    {s.note}
                  </p>
                )}
              </div>
              {s.image && (
                <Frame
                  src={s.image.src}
                  alt={s.image.alt}
                  phone={s.image.phone}
                  onOpen={() => setZoom({ src: s.image!.src, alt: s.image!.alt })}
                />
              )}
            </div>
          </li>
        ))}
      </ol>

      {submitOpen && (
        <div className="mt-10 text-center">
          <Link
            href="/submit"
            className="inline-block rounded-md px-8 py-3 text-sm font-bold text-white hover:opacity-90"
            style={{ background: NAVY }}
          >
            Submit your abstract
          </Link>
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.src} alt={zoom.alt} className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-2xl" />
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-neutral-900"
            onClick={() => setZoom(null)}
          >
            Close ✕
          </button>
        </div>
      )}
    </div>
  )
}