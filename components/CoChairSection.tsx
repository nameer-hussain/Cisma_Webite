"use client";

import { useEffect } from "react";
import Link from "next/link";
import { articles } from "@/lib/articles";

export default function CoChairSection() {
  // Set these to true once the respective images are placed in /public
  const hasCoChairPhoto = true;
  const hasFounderPhoto = true;

  // The top of the About page is loaded from the database after the page opens,
  // which pushes this section down. So after the page opens we scroll to the
  // #anchor in the address again a few times. Any scroll by the visitor stops it.
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    let timers: number[] = [];
    const stop = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
    const start = () => {
      stop();
      timers = [0, 400, 1000, 2000, 3500].map((ms) => window.setTimeout(go, ms));
    };
    start();
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    window.addEventListener("hashchange", start);
    return () => {
      stop();
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      window.removeEventListener("hashchange", start);
    };
  }, []);

  return (
    <>
    <section id="message" className="w-full scroll-mt-20">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Row 1 - left: "Message from Co-Chair" image tile */}
        <a
          href="#"
          className="group relative flex min-h-[300px] md:min-h-[400px] items-center justify-center bg-gray-800"
        >
          {hasCoChairPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/co-chair-bg.webp"
              alt="Message from Co-Chair"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/45 transition-colors group-hover:bg-black/30" />
          <h3 className="relative z-10 px-4 text-center text-2xl md:text-3xl font-bold italic text-white">
            Message from Co-Chair
          </h3>
          {!hasCoChairPhoto && (
            <div className="absolute bottom-2 left-2 right-2 z-10 text-center text-[11px] text-gray-300">
              Image not added yet — place it at /public/co-chair-bg.jpg and set
              hasCoChairPhoto to true
            </div>
          )}
        </a>

        {/* Row 1 - right: letter */}
        <div className="flex flex-col justify-center bg-[#1b1d1f] px-8 py-10 md:pl-32 md:pr-16 text-[11px] md:text-xs leading-relaxed text-white">
          <p className="mb-4">
            Dear Colleagues, Scholars, and Research Partners,
          </p>
          <p className="mb-4">
            It is my great honor to welcome you to the CISMA Conference
            Platform- an academic space founded with a clear purpose: to bring
            together the brightest minds working at the intersection of corpus
            linguistics, natural language processing, discourse studies,
            translation, and interpreting.
            <br />
            In an age where digital technologies, big data, and AI increasingly
            shape how societies communicate, understand one another, and
            negotiate meaning, our responsibility as researchers has never been
            more critical. The CISMA platform was established to respond to this
            moment. It is built on the conviction that rigorous empirical
            inquiry, methodological innovation, and interdisciplinary dialogue
            are essential to understanding the complex linguistic and
            communicative landscapes of our time.
          </p>
          <p className="mb-4">
            CISMA is more than a conference; it is a collaborative global
            network. It brings together early career researchers, senior
            academics, technologists, and professional practitioners who share a
            commitment to exploring how digital tools and corpus driven methods
            can deepen our understanding of language, power, culture, and
            society. Our mission is to cultivate research that is theoretically
            robust, methodologically transparent, and socially meaningful.
            <br />I encourage you to join us in advancing this intellectual
            journey. Whether your work focuses on discourse and society,
            computational linguistics, translation technologies, sentiment
            analysis, digital humanities, or interdisciplinary approaches to
            language, CISMA offers a platform where your ideas can grow, be
            challenged, and make an impact.
          </p>
          <p className="mb-4">
            Together, we can build a scholarly community that not only responds
            to today&apos;s challenges but also shapes the future of language
            sciences- a future defined by innovation, collaboration, and shared
            academic curiosity.
            <br />I look forward to welcoming you, learning from your insights,
            and working with you to strengthen our collective contribution to
            global scholarship.
          </p>
          <p>
            Warm regards,
            <br />
            Muhammad Afzaal
            <br />
            Founder &amp; Co Chair, CISMA Conference Platform
            <br />
            Associate Professor, Institute of Language Sciences
            <br />
            Shanghai International Studies University, China
          </p>
        </div>

        {/* Row 2 - left: quote */}
        <div id="story" className="flex scroll-mt-20 items-center bg-[#1b1d1f] px-8 py-12 md:px-28 md:min-h-[260px] text-white">
          <blockquote className="m-0 text-sm italic leading-relaxed">
            &quot; CISMA was not born in a meeting room or through a formal
            proposal. It began as an idea, quiet, persistent, and shaped by
            years of encountering a simple but powerful truth: language research
            was changing, and the academic world needed a space that could
            change with it.&quot;
            <footer className="mt-4 text-right">-- Muhammad Afzaal</footer>
          </blockquote>
        </div>

        {/* Row 2 - right: "Founder's story" image tile */}
        <a
          href="#"
          className="group relative flex min-h-[260px] items-center justify-center bg-gray-300"
        >
          {hasFounderPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/founders-story.webp"
              alt="Founder's story"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
          <h3 className="relative z-10 px-4 text-center text-2xl md:text-3xl font-bold text-white">
            Founder&apos;s story
          </h3>
          {!hasFounderPhoto && (
            <div className="absolute bottom-2 left-2 right-2 z-10 text-center text-[11px] text-gray-600">
              Image not added yet — place it at /public/founders-story.jpg and
              set hasFounderPhoto to true
            </div>
          )}
        </a>
      </div>
    </section>

    {/* CISMA articles list */}
    <section className="w-full bg-[#f3f3f3] px-4 py-12">
      <div className="mx-auto max-w-[880px]">
        <h2 className="text-center text-3xl md:text-4xl font-semibold text-gray-900">
          CISMA: Frontiers in Corpus Linguistics and Translation Studies
        </h2>
        <p className="mt-3 text-center text-sm text-gray-400">
          CISMA會議旨在促進全球學者之間的交流，探索語料庫研究在不同領域的應用與挑戰。
        </p>

        <div className="mt-12">
          {articles.map((article, i) => (
            <div
              key={article.slug}
              id={article.slug}
              className={`flex scroll-mt-24 flex-col gap-5 py-6 sm:flex-row ${
                i > 0 ? "border-t border-gray-300" : ""
              }`}
            >
              <Link
                href={`/articles/${article.slug}`}
                className="block w-full shrink-0 sm:w-[40%]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.image}
                  alt={article.title}
                  className="h-[220px] w-full object-cover sm:h-[264px]"
                />
              </Link>
              <div>
                <h3 className="text-[15px] text-gray-900">
                  <Link href={`/articles/${article.slug}`}>{article.title}</Link>
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-700">
                  {article.excerpt}
                </p>
                <Link
                  href={`/articles/${article.slug}`}
                  className="mt-2 inline-block text-xs text-gray-800 underline"
                >
                  Read more...
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}