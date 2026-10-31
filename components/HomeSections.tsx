"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Section = {
  id: string; eyebrow: string | null; title: string; body: string | null;
  image: string | null; image_style: "wide" | "portrait"; image_side: "left" | "right";
  button1_text: string | null; button1_href: string | null;
  button2_text: string | null; button2_href: string | null; button2_download: boolean;
  bg: "white" | "light" | "gray";
};

const BG = { white: "bg-white", light: "bg-cisma-light", gray: "bg-gray-50" } as const;

export default function HomeSections() {
  const [items, setItems] = useState<Section[]>([]);

  useEffect(() => {
    createClient().from("home_sections").select("*").eq("visible", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setItems((data ?? []) as Section[]));
  }, []);

  return (
    <>
      {items.map((s) => {
        const portrait = s.image_style === "portrait";
        const imgRight = s.image_side === "right";
        const ext = (h: string) => /^https?:/.test(h);
        return (
          <section key={s.id} id={s.id} className={`scroll-mt-24 py-14 md:py-20 ${BG[s.bg]}`}>
            <div className={`mx-auto grid max-w-5xl items-center gap-10 px-6 md:gap-14 ${
              portrait ? "md:grid-cols-[320px_1fr]" : "md:grid-cols-2"}`}>
              {s.image && (
                <div className={imgRight ? "md:order-2" : ""}>
                  {portrait ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt={s.title}
                      className="mx-auto h-auto w-56 rounded-md shadow-2xl ring-1 ring-black/10 sm:w-64 md:w-full" />
                  ) : (
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.image} alt={s.title} className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              )}
              <div className="text-center md:text-left">
                {s.eyebrow && (
                  <p className="text-sm font-bold uppercase tracking-widest text-cisma-gold">{s.eyebrow}</p>
                )}
                <h2 className="mt-3 font-heading text-3xl font-medium leading-tight tracking-tight text-cisma-navy md:text-4xl">
                  {s.title}
                </h2>
                <div className="mx-auto mt-3 h-0.5 w-16 bg-cisma-gold md:mx-0" />
                {s.body && (
                  <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-neutral-700">{s.body}</p>
                )}
                {(s.button1_text || s.button2_text) && (
                  <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
                    {s.button1_text && s.button1_href && (
                      <a href={s.button1_href}
                        {...(ext(s.button1_href) || s.button1_href.endsWith(".pdf")
                          ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="rounded-md bg-cisma-navy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-cisma-blue">
                        {s.button1_text}
                      </a>
                    )}
                    {s.button2_text && s.button2_href && (
                      <a href={s.button2_href}
                        {...(s.button2_download ? { download: true } : ext(s.button2_href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="rounded-md border border-cisma-navy px-6 py-3 text-sm font-bold text-cisma-navy transition-colors hover:bg-cisma-navy hover:text-white">
                        {s.button2_text}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}