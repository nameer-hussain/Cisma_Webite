"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchUpcomingLectures, type LectureRow } from "@/lib/siteData";
import LectureStats from "@/components/LectureStats";

export default function FeaturedLecture() {
  const [lecture, setLecture] = useState<LectureRow | null>(null);

  useEffect(() => {
    fetchUpcomingLectures().then((l) => setLecture(l[0] ?? null));
  }, []);

  if (!lecture) return null;

  const subtitle = lecture.slider_description || lecture.title;

  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-10 overflow-hidden rounded-2xl bg-white shadow-lg md:grid-cols-2">
          <div className="bg-gray-100">
            {lecture.card_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lecture.card_image} alt={lecture.card_title || ""} className="h-auto w-full" />
            )}
          </div>
          <div className="p-8 md:p-10">
            <span className="inline-block rounded-full bg-cisma-gold/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cisma-navy">
              Upcoming Lecture
            </span>
            <h2 className="mt-4 text-3xl font-bold text-cisma-navy">
              {lecture.card_title || lecture.title}
            </h2>
            {subtitle && <p className="mt-3 text-lg text-gray-600">{subtitle}</p>}
            <div className="mt-6 space-y-1 text-gray-700">
              {lecture.date_text && (
                <p><span className="font-semibold">Date:</span> {lecture.date_text}</p>
              )}
              <p><span className="font-semibold">Format:</span> Online</p>
            </div>

            {/* Live registration numbers */}
            <div className="mt-6">
              <LectureStats slug={lecture.slug} />
            </div>

            <Link
              href={`/lectures/${lecture.slug}`}
              className="inline-block rounded-lg bg-cisma-navy px-6 py-3 font-semibold text-white transition hover:bg-cisma-blue"
            >
              {lecture.registration_open ? "Register now" : "Learn more"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}