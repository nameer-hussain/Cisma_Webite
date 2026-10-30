import Image from "next/image";
import Link from "next/link";

const lecture = {
  series: "CISMA Lecture Series 15",
  speaker: "Elizabeth Hanks",
  title: "Designing and evaluating a corpus of conversation: lessons learned",
  date: "17 November 2026",
  time: "17:00 CST",
  image: "/events/elizabeth-hanks-15.jpg",
  href: "/upcoming-lecture",
};

export default function FeaturedLecture() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-10 overflow-hidden rounded-2xl bg-white shadow-lg md:grid-cols-2">
          {/* Poster */}
          <div className="bg-gray-100">
            <Image
                src={lecture.image}
                alt={`${lecture.series}: ${lecture.speaker}`}
                width={800}
                height={1000}
                className="h-auto w-full"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
            />
            </div>

          {/* Details */}
          <div className="p-8 md:p-10">
            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Upcoming Lecture
            </span>

            <h2 className="mt-4 text-3xl font-bold text-gray-900">
              {lecture.series}: {lecture.speaker}
            </h2>

            <p className="mt-3 text-lg text-gray-600">{lecture.title}</p>

            <div className="mt-6 space-y-1 text-gray-700">
              <p><span className="font-semibold">Date:</span> {lecture.date}</p>
              <p><span className="font-semibold">Time:</span> {lecture.time}</p>
              <p><span className="font-semibold">Format:</span> Online</p>
            </div>

            <Link
              href={lecture.href}
              className="mt-8 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Register now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}