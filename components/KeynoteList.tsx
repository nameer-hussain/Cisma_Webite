"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type K = { slug: string; speaker_name: string; title: string | null; photo: string | null; abstract: string; bio: string | null };

function preview(text: string, max = 110) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() + "…" : clean;
}

export default function KeynoteList({
  conference = "cisma-2026",
  basePath = "/keynote-2026",
}: {
  conference?: string;
  basePath?: string;
}) {
  const [list, setList] = useState<K[] | null>(null);

  useEffect(() => {
    createClient()
      .from("keynotes")
      .select("slug, speaker_name, title, photo, abstract, bio")
      .eq("published", true)
      .eq("conference_slug", conference)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setList((data ?? []) as K[]));
  }, [conference]);

  if (!list) return <div className="py-20 text-center text-neutral-500">Loading...</div>;
  if (!list.length) return <div className="py-20 text-center text-neutral-500">Keynote speakers will be announced soon.</div>;

  return (
    <div className="mx-auto mt-16 max-w-5xl px-6">
      {list.map((k, idx) => (
        <article
          key={k.slug}
          className={`grid items-center gap-8 py-10 md:grid-cols-2 md:gap-12 ${idx !== list.length - 1 ? "border-b border-neutral-200" : ""}`}
        >
          <Link href={`${basePath}/${k.slug}`} className="flex justify-center" aria-label={`Keynote: ${k.speaker_name}`}>
            {k.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={k.photo} alt={k.speaker_name} className="h-[320px] w-auto max-w-full object-cover" />
            )}
          </Link>
          <div>
            <h2 className="text-lg font-normal text-neutral-900">Keynote Speech: {k.speaker_name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700">{preview(k.title || k.abstract || k.bio || "")}</p>
            <Link href={`${basePath}/${k.slug}`} className="mt-2 inline-block text-sm text-neutral-900 underline underline-offset-2 hover:text-neutral-600">
              Read more…
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}