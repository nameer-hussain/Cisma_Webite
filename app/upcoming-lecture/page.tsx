import Image from "next/image";
import LectureRegistration from "@/components/LectureRegistration";

const SLUG = "elizabeth-hanks-15";

export default function UpcomingLecturePage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-20 md:pt-28">
        <Image
          src="/events/elizabeth-hanks-15.jpg"
          alt="CISMA Lecture Series 15: Elizabeth Hanks poster"
          width={1236}
          height={1600}
          className="mx-auto mb-10 h-auto w-full max-w-md rounded-lg shadow-lg"
        />
        <p className="text-center text-sm font-bold uppercase tracking-widest text-cisma-gold">
          CISMA Lecture Series 15
        </p>
        <h1 className="mt-3 text-center font-heading text-3xl font-medium tracking-tight text-neutral-900 md:text-4xl">
          Designing and evaluating a corpus of conversation: Lessons learned in
          the creation of LANA-CASE
        </h1>
        <p className="mt-4 text-center text-lg text-neutral-700">
          Dr. Elizabeth Hanks, Northern Arizona University
        </p>
        <p className="mt-2 text-center font-semibold text-cisma-blue">
          17 November 2026 · 17:00 China Standard Time (14:00 Pakistan, 09:00 UTC)
        </p>
        <p className="mt-1 text-center text-neutral-600">Online webinar</p>

        <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-neutral-600">
          <p>
            This talk introduces the design and collection of LANA-CASE, a
            10-million-word corpus of American English conversation released
            open access in September 2026. It describes how the corpus was
            built, evaluates how well it represents conversation and speakers of
            American English, and highlights implications for future spoken
            corpus projects.
          </p>
        </div>

        <div className="mt-10">
          <LectureRegistration slug={SLUG} />
        </div>
      </div>
    </main>
  );
}