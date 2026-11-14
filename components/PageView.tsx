"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export type Item = { name: string; role?: string; bio?: string; photo?: string };
export type Card = { title: string; text?: string; image?: string; button?: string; href?: string };
export type Col = { text?: string; embed?: string; link?: string; linkText?: string; linkLast?: boolean };
export type PBlock = (
  | { type: "heading"; text: string; sub?: string; big?: boolean; left?: boolean; underline?: boolean }
  | { type: "text"; text: string; align?: "center" | "justify" | "left"; bold?: boolean }
  | { type: "image"; src: string; width?: "sm" | "md" | "lg" | "full"; alt?: string }
  | { type: "button"; text: string; href: string }
  | { type: "people_list"; items: Item[] }
  | { type: "people_grid"; items: Item[] }
  | { type: "gallery"; images: { src: string; alt?: string }[]; cols?: 2 | 3 | 4 }
  | { type: "timeline"; items: { title: string; date?: string }[] }
  | { type: "cards"; items: Card[]; layout?: "list" | "grid3" }
  | { type: "columns"; items: Col[] }
  | { type: "banners"; items: { title: string; image?: string }[] }
  | { type: "band"; bg?: string; image?: string; overlay?: boolean; dark?: boolean; narrow?: boolean; full?: boolean }
) & { id?: string };

const W = { sm: "w-36", md: "w-52", lg: "w-64", full: "w-full" } as const;
const COLS = { 2: "md:columns-2", 3: "md:columns-3", 4: "md:columns-4" } as const;
const GC = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" } as const;

// **text** ko bold dikhata hai
function Rich({ text }: { text: string }) {
  return <>{text.split("**").map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : p))}</>;
}

function Btn({ href, children, className }: { href: string; children: React.ReactNode; className: string }) {
  const ext = /^(https?:|mailto:)/.test(href) || href.endsWith(".pdf");
  if (ext || href.startsWith("#"))
    return (
      <a href={href} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={className}>
        {children}
      </a>
    );
  return <Link href={href} className={className}>{children}</Link>;
}

export function Blocks({ blocks, dark }: { blocks: PBlock[]; dark?: boolean }) {
  const strong = dark ? "text-white" : "text-gray-900";
  const body = dark ? "text-white" : "text-gray-700";
  return (
    <div className="space-y-6">
      {blocks.map((b, i) => {
        let el: React.ReactNode = null;

        if (b.type === "heading")
          el = (
            <div className={`${b.left ? "text-left" : "text-center"} ${b.big ? "pb-4 pt-6" : "pt-4"}`}>
              <h2 className={`${b.big ? "text-3xl font-extrabold md:text-4xl" : "text-xl font-bold"} ${b.underline ? "underline" : ""} ${strong}`}>
                {b.text}
              </h2>
              {b.sub && <p className={`mt-2 text-sm ${dark ? "text-white/70" : "text-[#c9a876]"}`}>{b.sub}</p>}
            </div>
          );
        else if (b.type === "text") {
          const a = b.align === "justify" ? "text-justify" : b.align === "left" ? "text-left" : "text-center";
          el = (
            <p className={`mx-auto max-w-3xl whitespace-pre-line leading-relaxed ${a} ${b.bold ? `font-bold ${strong}` : body}`}>
              <Rich text={b.text} />
            </p>
          );
        } else if (b.type === "image" && b.src)
          el = (
            <div className="flex justify-center py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.src} alt={b.alt || ""} className={`${W[b.width || "md"]} h-auto`} />
            </div>
          );
        else if (b.type === "button")
          el = (
            <div className="flex justify-center">
              <Btn href={b.href} className="rounded-md bg-cisma-navy px-6 py-3 text-sm font-bold text-white hover:bg-cisma-blue">{b.text}</Btn>
            </div>
          );
        else if (b.type === "people_list")
          el = (
            <div className={`mx-auto max-w-4xl divide-y ${dark ? "divide-white/20" : "divide-gray-200"}`}>
              {b.items.map((m, k) => (
                <div key={k} className="flex flex-col items-center gap-6 py-8 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-10">
                  {m.photo && (
                    <div className="aspect-[4/5] w-48 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:w-52">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.photo} alt={m.name} className="h-full w-full object-cover object-top" />
                    </div>
                  )}
                  <div className="flex-1 text-center sm:text-left">
                    {m.role && <p className={`mb-1 text-sm font-semibold uppercase tracking-wider ${dark ? "text-white/70" : "text-cisma-blue"}`}>{m.role}</p>}
                    <h4 className={`mb-3 text-2xl font-bold ${strong}`}>{m.name}</h4>
                    {m.bio && <p className={`whitespace-pre-line text-[15px] leading-7 ${dark ? "text-white/80" : "text-gray-600"}`}>{m.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          );
        else if (b.type === "people_grid")
          el = (
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-10">
              {b.items.map((m, k) => (
                <div
                  key={k}
                  className="flex w-[calc(50%_-_12px)] flex-col items-center text-center sm:w-[calc(33.333%_-_16px)] md:w-[calc(25%_-_18px)]"
                >
                  {m.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photo} alt={m.name} className="aspect-square w-full object-cover" />
                  )}
                  <p className={`mt-2 text-sm font-semibold ${dark ? "text-white" : "text-gray-700"}`}>{m.name}</p>
                </div>
              ))}
            </div>
          );
        else if (b.type === "gallery")
          el = (
            <div className={`columns-2 gap-2 ${COLS[b.cols || 3]}`}>
              {b.images.map((g, k) => (
                <div key={k} className="mb-2 break-inside-avoid">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.src} alt={g.alt || ""} loading="lazy" className="h-auto w-full" />
                </div>
              ))}
            </div>
          );
        else if (b.type === "timeline")
          el = (
            <ol className={`mx-auto max-w-md ${strong}`}>
              {b.items.map((t, k) => (
                <li key={k} className="relative flex items-start gap-4 pb-10 last:pb-0">
                  <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center border border-current text-xl font-semibold">{k + 1}</span>
                  {k < b.items.length - 1 && (
                    <span className="absolute left-[27px] top-[54px] h-[calc(100%-54px)] w-px bg-current opacity-50" />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">{t.title}</h3>
                    {t.date && <p className="mt-1">{t.date}</p>}
                  </div>
                </li>
              ))}
            </ol>
          );
        else if (b.type === "cards" && b.layout === "grid3")
          el = (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {b.items.map((c, k) => (
                <div key={k} className="text-center">
                  {c.image && (
                    <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.image} alt={c.title} className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                  )}
                  <p className="font-bold text-gray-900">{c.title}</p>
                  {c.text && (
                    <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                      <Rich text={c.text} />
                    </p>
                  )}
                </div>
              ))}
            </div>
          );
        else if (b.type === "cards")
          el = (
            <div className="space-y-2.5">
              {b.items.map((c, k) => (
                <article key={k} className={`grid items-center gap-4 bg-white p-1.5 ${c.image ? "md:grid-cols-2 md:gap-6" : ""}`}>
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.title} className={`aspect-[4/3] w-full object-cover ${k % 2 === 1 ? "md:order-2" : ""}`} />
                  )}
                  <div className="px-3 pb-4 md:px-2 md:pb-0">
                    <h3 className="text-base font-bold text-neutral-900">{c.title}</h3>
                    {c.text && <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{c.text}</p>}
                    {c.button && c.href && (
                      <Btn href={c.href} className="mt-3 inline-block bg-[#e3dfd3] px-4 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-[#d3cebf]">
                        {c.button}
                      </Btn>
                    )}
                  </div>
                </article>
              ))}
            </div>
          );
        else if (b.type === "columns")
          el = (
            <div className={`grid grid-cols-1 items-start gap-6 ${GC[Math.min(Math.max(b.items.length, 1), 4) as 1 | 2 | 3 | 4]}`}>
              {b.items.map((c, k) => {
                const link = c.link && c.linkText && (
                  <Btn href={c.link} className="inline-block text-sm text-cisma-blue hover:underline">{c.linkText}</Btn>
                );
                return (
                  <div key={k} className="space-y-3 text-sm text-gray-800">
                    {!c.linkLast && link}
                    {c.embed && (
                      <div className="relative aspect-[4/3] w-full bg-gray-100">
                        <iframe
                          src={c.embed}
                          className="absolute inset-0 h-full w-full border-0"
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    )}
                    {c.text && (
                      <p className="whitespace-pre-line">
                        <Rich text={c.text} />
                      </p>
                    )}
                    {c.linkLast && link}
                  </div>
                );
              })}
            </div>
          );
        else if (b.type === "banners")
          el = (
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {b.items.map((x, k) => (
                <div key={k} className="relative h-64 overflow-hidden bg-gray-700 sm:h-80">
                  {x.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={x.image} alt={x.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="relative z-10 flex h-full items-center justify-center px-6">
                    <h3 className="text-center text-2xl font-extrabold leading-snug text-white sm:text-3xl">{x.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          );

        if (!el) return null;
        return <div key={i} id={b.id || undefined} className="scroll-mt-24">{el}</div>;
      })}
    </div>
  );
}

type Group = { band?: Extract<PBlock, { type: "band" }>; items: PBlock[] };

function group(blocks: PBlock[]): Group[] {
  const g: Group[] = [{ items: [] }];
  for (const b of blocks) {
    if (b.type === "band") g.push({ band: b, items: [] });
    else g[g.length - 1].items.push(b);
  }
  return g.filter((x) => x.band || x.items.length);
}

export default function PageView({ slug }: { slug?: string }) {
  const [state, setState] = useState<"loading" | "missing" | "ok">("loading");
  const [page, setPage] = useState<{ title: string; blocks: PBlock[] } | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search).get("slug");
    const last = window.location.pathname.replace(/\/+$/, "").split("/").pop() || "";
    const s = slug || qs || decodeURIComponent(last);
    createClient()
      .from("pages")
      .select("title, blocks")
      .eq("slug", s)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return setState("missing");
        setPage(data as { title: string; blocks: PBlock[] });
        if (!slug) document.title = data.title;
        setState("ok");
        setTimeout(() => {
          const h = window.location.hash.slice(1);
          if (h) document.getElementById(h)?.scrollIntoView();
        }, 100);
      });
  }, [slug]);

  if (state === "loading") return <div className="py-32 text-center text-neutral-500">Loading...</div>;
  if (state === "missing" || !page)
    return (
      <div className="py-32 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <Link href="/" className="mt-4 inline-block text-cisma-blue">Back to home</Link>
      </div>
    );

  return (
    <>
      {group(page.blocks ?? []).map((g, gi) => (
        <section key={gi} className="relative w-full" style={{ background: g.band?.bg || "#ffffff" }}>
          {g.band?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={g.band.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {g.band?.overlay && <div className="absolute inset-0 bg-black/45" />}
          <div
            className={
              g.band?.full
                ? "relative w-full"
                : `relative mx-auto px-4 py-12 md:py-16 ${g.band?.narrow ? "max-w-3xl" : "max-w-5xl"}`
            }
          >
            <Blocks blocks={g.items} dark={g.band?.dark} />
          </div>
        </section>
      ))}
    </>
  );
}