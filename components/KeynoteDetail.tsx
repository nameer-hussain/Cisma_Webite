"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type K = { slug: string; speaker_name: string; title: string | null; photo: string | null; abstract: string; keywords: string | null; bio: string | null; conference_slug: string };

export default function KeynoteDetail() {
  const [state, setState] = useState<"loading" | "missing" | "ok">("loading");
  const [k, setK] = useState<K | null>(null);
  const [base, setBase] = useState("/keynote-2026");
  const [prev, setPrev] = useState<{ slug: string; speaker_name: string } | null>(null);
  const [next, setNext] = useState<{ slug: string; speaker_name: string } | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search).get("slug");
    const last = window.location.pathname.replace(/\/+$/, "").split("/").pop() || "";
    const slug = qs || decodeURIComponent(last);
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.from("keynotes").select("*").eq("slug", slug).maybeSingle();
      if (!data) return setState("missing");
      setK(data as K);
      document.title = `Keynote Speech: ${data.speaker_name} | CISMA`;
      const conf: string = data.conference_slug || "cisma-2026";
      const basePath = `/keynote-${conf.split("-").pop()}`;
      setBase(basePath);
      const { data: all } = await supabase
        .from("keynotes").select("slug, speaker_name").eq("published", true).eq("conference_slug", conf).order("sort_order", { ascending: true });
      const list = all ?? [];
      const i = list.findIndex((x) => x.slug === slug);
      setPrev(i > 0 ? list[i - 1] : null);
      setNext(i >= 0 && i < list.length - 1 ? list[i + 1] : null);
      setState("ok");
    })();
  }, []);

  if (state === "loading") return <div className="py-40 text-center text-neutral-500">Loading...</div>;
  if (state === "missing" || !k)
    return (
      <div className="py-40 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Keynote not found</h1>
        <Link href={base} className="mt-4 inline-block text-cisma-blue">Back to all keynotes</Link>
      </div>
    );

  const paras = k.abstract.split(/\n\s*\n/).filter(Boolean);

  return (
    <main className="bg-white">
      <section className="bg-gradient-to-br from-[#cfe3d1] via-[#6ea3ae] to-[#2a4f87] pb-14 pt-40 md:pt-48">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-3xl font-semibold leading-tight text-white drop-shadow md:text-4xl">Keynote Speech: {k.speaker_name}</h1>
          {k.title && <p className="mt-3 text-lg leading-snug text-white/95 md:text-xl">{k.title}</p>}
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-6 py-12">
        {k.title && <h2 className="text-center text-2xl font-bold leading-snug text-neutral-800 md:text-[1.7rem]">{k.title}</h2>}
        {k.photo && (
          <div className="mt-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={k.photo} alt={k.speaker_name} className="h-auto w-full max-w-[370px] object-cover" />
          </div>
        )}
        <div className="mt-14 space-y-4 text-justify text-[15px] leading-8 text-neutral-700">
          {paras.map((p, i) => <p key={i}>{p}</p>)}
          {k.keywords && <p>Keywords: {k.keywords}</p>}
          {k.bio && <p>{k.bio}</p>}
        </div>

        <nav aria-label="Keynote navigation" className="mt-20 flex items-start justify-between gap-6 border-t border-neutral-200 pt-6">
          {prev ? (
            <Link href={`${base}/${prev.slug}`} className="group block text-left">
              <span className="block text-xs text-neutral-500">‹ Previous</span>
              <span className="mt-1 block text-neutral-900 group-hover:underline">Keynote Speech: {prev.speaker_name}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`${base}/${next.slug}`} className="group block text-right">
              <span className="block text-xs text-neutral-500">Next ›</span>
              <span className="mt-1 block text-neutral-900 group-hover:underline">Keynote Speech: {next.speaker_name}</span>
            </Link>
          ) : <span />}
        </nav>
        <div className="mt-6 border-t border-neutral-200 pt-4 text-sm">
          <Link href={base} className="text-neutral-600 hover:text-neutral-900">‹ Back to all keynotes</Link>
        </div>
      </article>
    </main>
  );
}