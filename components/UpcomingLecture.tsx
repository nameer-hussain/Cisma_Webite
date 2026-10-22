import Link from "next/link";
import Image from "next/image";

export default function UpcomingLecture() {
  return (
    <section className="bg-cisma-light py-14">
      <div className="mx-auto grid max-w-content items-center gap-10 px-6 md:grid-cols-2">
        <div className="text-center md:text-left">
          <p className="text-sm font-bold uppercase tracking-widest text-cisma-gold">
            Upcoming Lecture
          </p>
          <h2 className="mt-3 text-2xl font-bold text-cisma-navy md:text-4xl">
            CISMA Lecture Series 14: Paul Baker
          </h2>
          <p className="mt-4 text-lg text-neutral-700">
            Surprise Words and Core Words: Using Vibe Coding to Identify
            Collocational Divergence Across Corpora
          </p>
          <p className="mt-4 font-semibold text-cisma-blue">
            27 October 2026 · 16:00 China Standard Time (13:00 Pakistan, 08:00 UTC)
          </p>
          <p className="mt-1 text-neutral-600">Online webinar</p>

          <p className="mt-6 rounded-md border border-cisma-gold/40 bg-white px-4 py-3 text-sm text-neutral-700">
            Access to this lecture is for registered members only. Create a free
            account and register to receive the joining link.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
            <Link
              href="/upcoming-lecture"
              className="rounded-md bg-cisma-navy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-cisma-blue"
            >
              Register now
            </Link>
            <Link
              href="/upcoming-lecture"
              className="rounded-md border border-cisma-navy px-6 py-3 text-sm font-bold text-cisma-navy transition-colors hover:bg-cisma-navy hover:text-white"
            >
              Lecture details
            </Link>
          </div>
        </div>

        <Link href="/upcoming-lecture" className="block">
          <Image
            src="/lecture-14-poster.jpeg"
            alt="CISMA Lecture Series 14: Paul Baker poster"
            width={1236}
            height={1600}
            className="mx-auto h-auto w-full max-w-md rounded-lg shadow-lg"
          />
        </Link>
      </div>
    </section>
  );
}