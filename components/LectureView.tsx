"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LectureRegistration from "@/components/LectureRegistration";
import type { LectureRow } from "@/lib/siteData";

const blockWidth = { sm: "w-36", md: "w-52", lg: "w-64", full: "w-full" } as const;

export default function LectureView() {
  const [state, setState] = useState<"loading" | "missing" | "ok">("loading");
  const [l, setL] = useState<LectureRow | null>(null);
  const [prev, setPrev] = useState<{ slug: string; card_title: string | null } | null>(null);
  const [next, setNext] = useState<{ slug: string; card_title: string | null } | null>(null);

  useEffect(() => {
    // URL se slug; local test ke liye ?slug=... bhi chalta hai
    const qs = new URLSearchParams(window.location.search).get("slug");
    const last = window.location.pathname.replace(/\/+$/, "").split("/").pop() || "";
    const slug = qs || decodeURIComponent(last);
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.from("lectures").select("*").eq("slug", slug).maybeSingle();
      if (!data) return setState("missing");
      setL(data as LectureRow);
      const { data: all } = await supabase
        .from("lectures").select("slug, card_title")
        .neq("status", "draft").order("sort_order", { ascending: false });
      const list = all ?? [];
      const i = list.findIndex((x) => x.slug === slug);
      setPrev(i >= 0 && i < list.length - 1 ? list[i + 1] : null);
      setNext(i > 0 ? list[i - 1] : null);
      setState("ok");
    })();
  }, []);

  if (state === "loading")
    return <div className="py-40 text-center text-neutral-500">Loading...</div>;
  if (state === "missing" || !l)
    return (
      <div className="py-40 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Lecture not found</h1>
        <Link href="/#cisma-lectures-series" className="mt-4 inline-block text-cisma-blue">Back to Lecture Series</Link>
      </div>
    );

  return (
    <>
      <section className="relative w-full h-[380px] md:h-[440px] overflow-hidden bg-gray-700">
        {l.hero_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.hero_image} alt={l.title || ""} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-16 pb-10 max-w-4xl">
          <h1 className="text-white text-2xl md:text-4xl font-extrabold leading-snug mb-3">
            {l.hero_title || l.title}
          </h1>
          <p className={`text-white/90 text-lg ${l.hero_subtitle ? "italic" : ""}`}>
            {l.hero_subtitle || l.speaker_name}
          </p>
          {l.registration_open && (
            <a href="#register" className="mt-5 inline-block self-start rounded-md bg-cisma-gold px-6 py-2.5 text-sm font-bold text-cisma-navy hover:opacity-90">
              Register now
            </a>
          )}
        </div>
      </section>

      <section className="w-full bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-gray-800">
          <div className="space-y-4">
            {(l.blocks ?? []).map((b: any, i: number) => {
              if (b.type === "heading")
                return <h3 key={i} className="text-center font-bold text-gray-900 pt-6">{b.text}</h3>;
              if (b.type === "text") {
                const align = b.align === "justify" ? "text-justify" : b.align === "left" ? "text-left" : "text-center";
                return (
                  <p key={i} className={`${align} leading-relaxed whitespace-pre-line ${b.bold ? "font-bold text-gray-900" : ""}`}>
                    {b.text}
                  </p>
                );
              }
              if (b.type === "image" && b.src)
                return (
                  <div key={i} className="flex justify-center py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.src} alt={b.alt || ""} className={`${blockWidth[(b.width as keyof typeof blockWidth) || "md"]} h-auto`} />
                  </div>
                );
              return null;
            })}
          </div>

          {l.registration_open && (
            <div id="register" className="mt-14 scroll-mt-24">
              <LectureRegistration slug={l.slug} />
            </div>
          )}
        </div>
      </section>

      <section className="w-full border-t border-gray-200 py-6">
        <div className="mx-auto max-w-3xl px-4 flex justify-between text-sm text-gray-600">
          {prev ? <Link href={`/lectures/${prev.slug}`} className="hover:text-cisma-blue">&larr; {prev.card_title}</Link> : <span />}
          {next ? <Link href={`/lectures/${next.slug}`} className="hover:text-cisma-blue">{next.card_title} &rarr;</Link> : <span />}
        </div>
      </section>
    </>
  );
}