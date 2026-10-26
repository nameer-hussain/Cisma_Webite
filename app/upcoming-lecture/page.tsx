"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";

const SLUG = "paul-baker-14";
const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2.5 text-gray-800 placeholder:text-gray-400 focus:border-cisma-blue focus:outline-none focus:ring-1 focus:ring-cisma-blue";
const buttonClass =
  "w-full rounded-md bg-cisma-navy px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cisma-blue disabled:opacity-50";

export default function UpcomingLecturePage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [country, setCountry] = useState("");
  const [registered, setRegistered] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadLink() {
    const supabase = createClient();
    const { data } = await supabase
      .from("lecture_links")
      .select("join_url, meeting_id, passcode")
      .eq("lecture_slug", SLUG)
      .maybeSingle();
    if (data?.join_url) setJoinUrl(data.join_url);
    if (data?.meeting_id) setMeetingId(data.meeting_id);
    if (data?.passcode) setPasscode(data.passcode);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: user can still select the link text */
    }
  }

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        setUserId(u.user.id);
        setEmail(u.user.email || "");
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", u.user.id)
          .maybeSingle();
        setFullName(p?.full_name || "");
        const { data: r } = await supabase
          .from("lecture_registrations")
          .select("id")
          .eq("user_id", u.user.id)
          .eq("lecture_slug", SLUG)
          .maybeSingle();
        if (r) {
          setRegistered(true);
          await loadLink();
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("lecture_registrations").insert({
      user_id: userId,
      lecture_slug: SLUG,
      full_name: fullName.trim(),
      email,
      institution: institution.trim(),
      country: country.trim(),
    });
    setSaving(false);
    if (error && error.code !== "23505") {
      setError(error.message);
      return;
    }
    setRegistered(true);
    await loadLink();
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-20 md:pt-28">
        <Image
          src="/lecture-14-poster.jpeg"
          alt="CISMA Lecture Series 14: Paul Baker poster"
          width={1236}
          height={1600}
          className="mx-auto mb-10 h-auto w-full max-w-md rounded-lg shadow-lg"
        />
        <p className="text-center text-sm font-bold uppercase tracking-widest text-cisma-gold">
          CISMA Lecture Series 14
        </p>
        <h1 className="mt-3 text-center font-heading text-3xl font-medium tracking-tight text-neutral-900 md:text-4xl">
          Surprise Words and Core Words: Using Vibe Coding to Identify
          Collocational Divergence Across Corpora
        </h1>
        <p className="mt-4 text-center text-lg text-neutral-700">
          Professor Paul Baker, The Hong Kong Polytechnic University
        </p>
        <p className="mt-2 text-center font-semibold text-cisma-blue">
          27 October 2026 · 16:00 China Standard Time (13:00 Pakistan, 08:00 UTC)
        </p>
        <p className="mt-1 text-center text-neutral-600">Online webinar</p>

        <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-neutral-600">
          <p>
            This talk proposes the concept of collocationally divergent words,
            or surprise words (s-words), whose collocational profiles differ
            significantly between two corpora, and describes the S-Word
            Analysis Tool (SWAT), created using a large language model.
          </p>
        </div>

        <div className="mt-10 rounded-lg border border-gray-200 p-6">
          {loading ? (
            <p className="text-center text-neutral-500">Loading...</p>
          ) : !userId ? (
            <div className="text-center">
              <p className="text-neutral-700">
                This lecture is for registered members only. Please log in or
                create a free account to register.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/signup"
                  className="rounded-md bg-cisma-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-cisma-blue"
                >
                  Create account
                </Link>
                <Link
                  href="/login"
                  className="rounded-md border border-cisma-navy px-5 py-2.5 text-sm font-bold text-cisma-navy hover:bg-cisma-navy hover:text-white"
                >
                  Log in
                </Link>
              </div>
              <p className="mt-4 text-sm text-neutral-500">
                After logging in, come back to this page to complete your
                registration.
              </p>
            </div>
          ) : registered ? (
            <div className="text-center">
              <p className="text-xl font-semibold text-green-700">
                You are registered for this lecture.
              </p>
              {joinUrl ? (
                <div className="mt-6 flex flex-col items-center gap-5">
                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-md bg-cisma-navy px-6 py-3 text-sm font-bold text-white hover:bg-cisma-blue"
                  >
                    Join the lecture on Zoom
                  </a>

                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <QRCodeSVG
                      value={joinUrl}
                      size={220}
                      level="M"
                      marginSize={4}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                  <p className="text-sm text-neutral-600">
                    Scan this QR code with your phone camera to join.
                  </p>

                  <div className="w-full rounded-md bg-gray-50 p-4 text-left text-sm text-neutral-700">
                    <p className="font-semibold text-cisma-navy">
                      Cannot scan the QR code?
                    </p>
                    <p className="mt-1">Use the button above, or open this link:</p>
                    <p className="mt-1 break-all">
                      <a
                        href={joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cisma-blue underline"
                      >
                        {joinUrl}
                      </a>
                    </p>
                    <button
                      type="button"
                      onClick={copyLink}
                      className="mt-3 rounded-md border border-cisma-navy px-4 py-2 text-xs font-bold text-cisma-navy hover:bg-cisma-navy hover:text-white"
                    >
                      {copied ? "Copied" : "Copy link"}
                    </button>
                    {(meetingId || passcode) && (
                      <p className="mt-4">
                        Or join from the Zoom app with
                        {meetingId && (
                          <>
                            {" "}Meeting ID <strong>{meetingId}</strong>
                          </>
                        )}
                        {meetingId && passcode && " and"}
                        {passcode && (
                          <>
                            {" "}Passcode <strong>{passcode}</strong>
                          </>
                        )}
                        .
                      </p>
                    )}
                    <p className="mt-4 text-neutral-500">
                      The same link has also been sent to your email. For help:
                      cisma@shisu.edu.cn
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-neutral-600">
                  The attendance link will appear on this page and will also be
                  sent to your email before the lecture.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="text-xl font-semibold text-cisma-navy">
                Register for this lecture
              </h2>
              <input
                className={inputClass}
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <input className={inputClass} value={email} disabled />
              <input
                className={inputClass}
                placeholder="Institution / University"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
              />
              <input
                className={inputClass}
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
              <button type="submit" disabled={saving} className={buttonClass}>
                {saving ? "Please wait..." : "Register"}
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}