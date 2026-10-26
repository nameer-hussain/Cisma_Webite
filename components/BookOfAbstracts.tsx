export default function BookOfAbstracts() {
  return (
    <section id="book-of-abstracts" className="scroll-mt-24 bg-cisma-light py-14 md:py-20">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 md:grid-cols-[320px_1fr] md:gap-14">
        {/* Cover */}
        <a
          href="/book-of-abstracts-2026.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto block w-56 sm:w-64 md:w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/book-of-abstracts-cover.jpg"
            alt="CISMA 2026 Book of Abstracts cover"
            className="h-auto w-full rounded-md shadow-2xl ring-1 ring-black/10 transition duration-300 hover:-translate-y-1"
          />
        </a>

        {/* Text */}
        <div className="text-center md:text-left">
          <p className="text-sm font-bold uppercase tracking-widest text-cisma-gold">
            Now Available
          </p>
          <h2 className="mt-3 font-heading text-3xl font-medium tracking-tight text-cisma-navy md:text-4xl">
            CISMA 2026 Book of Abstracts
          </h2>
          <div className="mx-auto mt-3 h-0.5 w-16 bg-cisma-gold md:mx-0" />
          <p className="mt-6 text-lg leading-relaxed text-neutral-700">
            The Book of Abstracts for CISMA 2026 has been published and is now
            available to read and download.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
            <a
              href="/book-of-abstracts-2026.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-cisma-navy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-cisma-blue"
            >
              Read online
            </a>
            <a
              href="/book-of-abstracts-2026.pdf"
              download
              className="rounded-md border border-cisma-navy px-6 py-3 text-sm font-bold text-cisma-navy transition-colors hover:bg-cisma-navy hover:text-white"
            >
              Download PDF
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}