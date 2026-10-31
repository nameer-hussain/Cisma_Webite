"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { lectures as staticLectures } from "@/lib/lectures";
import { fetchPastLectures } from "@/lib/siteData";

// How many cards show in the grid. The rest are only in the "More Posts" list.
const GRID_COUNT = 8;

type Item = {
  slug: string;
  cardTitle: string;
  listTitle: string;
  image: string | null;
};

// Shown first (and if the database is empty or unreachable), so the section is never blank.
const fallback: Item[] = staticLectures.map((l) => ({
  slug: l.slug.replace(/\s+/g, "-"),
  cardTitle: l.cardTitle,
  listTitle: l.listTitle || l.cardTitle,
  image: l.hasCardImage ? l.cardImage : null,
}));

export default function CismaLectureSeries() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>(fallback);

  // Load past lectures from the database
  useEffect(() => {
    fetchPastLectures().then((rows) => {
      if (!rows.length) return;
      setItems(
        rows.map((r) => ({
          slug: r.slug,
          cardTitle: r.card_title || r.title || r.slug,
          listTitle: r.list_title || r.card_title || r.title || r.slug,
          image: r.card_image,
        }))
      );
    });
  }, []);

  // Close on Escape + lock page scroll while the list is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <section id="cisma-lectures-series" className="w-full bg-gray-100 py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-4">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            CISMA Lecture Series
          </h2>
          <p className="text-sm text-gray-400">
            Connect with the world&apos;s{" "}
            <span className="text-[#c9a876]">brilliant minds</span> on a regular basis
          </p>
        </div>

        {/* Grid (latest posts only) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {items.slice(0, GRID_COUNT).map((lecture) => (
            <Link
              key={lecture.slug}
              href={`/lectures/${lecture.slug}`}
              className="relative aspect-square overflow-hidden bg-gray-300 group block"
            >
              {lecture.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lecture.image}
                  alt={lecture.cardTitle}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs text-center px-4">
                  No image
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <p className="absolute bottom-3 left-3 right-3 text-white text-sm font-semibold leading-snug line-clamp-2">
                {lecture.cardTitle}
              </p>
            </Link>
          ))}
        </div>

        {/* More Posts button */}
        <div className="flex justify-center mt-12">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md bg-[#f3ddc4] text-gray-800 px-6 py-2.5 text-sm font-bold hover:bg-[#ecd0af] transition-colors"
          >
            More Posts
          </button>
        </div>
      </div>

      {/* Full list of all posts */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-white overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="CISMA Lecture Series"
        >
          <div className="mx-auto max-w-xl px-6 py-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold tracking-wide text-gray-900 uppercase">
                CISMA Lecture Series
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M5 5l14 14M19 5L5 19" />
                </svg>
              </button>
            </div>

            <ul className="border-t border-gray-200">
              {items.map((lecture) => (
                <li key={lecture.slug} className="border-b border-gray-200">
                  <Link
                    href={`/lectures/${lecture.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="relative shrink-0 w-6 h-6 rounded-full overflow-hidden bg-gray-300">
                      {lecture.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={lecture.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </span>
                    <span className="text-sm text-gray-700 leading-snug">
                      {lecture.listTitle}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}