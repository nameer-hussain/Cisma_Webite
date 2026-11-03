"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MenuItem = {
  label: string;
  href: string;
  parent: string | null;
  sort_order: number;
  kind?: string | null;
  key?: string | null;
};

// Database na mile to yeh menu dikhta hai, taake navbar kabhi khali na ho
const FALLBACK: MenuItem[] = [
  { label: "About CISMA", href: "/about", parent: null, sort_order: 1 },
  { label: "CISMA Lectures Series", href: "/#cisma-lectures-series", parent: null, sort_order: 2 },
  { label: "CISMA Podcast", href: "/podcast", parent: null, sort_order: 3 },
  { label: "Past Events", href: "#", parent: null, sort_order: 4, kind: "dropdown", key: "past-events" },
  { label: "Privacy Policy", href: "/privacy-policy", parent: null, sort_order: 5 },
  { label: "CISMA Attendee Guide 2026", href: "/cisma-attendee-guide-2026", parent: "past-events", sort_order: 1 },
  { label: "Keynote 2026", href: "/keynote-2026", parent: "past-events", sort_order: 2 },
  { label: "Book of Abstracts 2026", href: "/book-of-abstracts-2026.pdf", parent: "past-events", sort_order: 3 },
  { label: "Memory", href: "/memory", parent: "past-events", sort_order: 4 },
];

const PUBLISH_URL =
  "https://www.degruyterbrill.com/journal/key/csh/html?srsltid=AfmBOooYXr95qYA8GnQTCxM3f7BOsBoTdFeqjIA3v6_Bnd9uK6JesEaz";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>(FALLBACK);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Menu database se
  useEffect(() => {
    createClient()
      .from("menu_items")
      .select("label, href, parent, sort_order, kind, key")
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length) setMenu(data as MenuItem[]);
      });
  }, []);

  const topItems = menu.filter((m) => !m.parent);
  const childrenOf = (key?: string | null) =>
    menu.filter((m) => key && m.parent === key);

  const linkColor = isHome
    ? "text-white hover:text-gray-200 drop-shadow-sm"
    : "text-gray-800 hover:text-cisma-blue";

  return (
    <header
      className={
        isHome
          ? "absolute top-0 left-0 w-full z-50 bg-transparent font-sans-ui"
          : "sticky top-0 z-50 bg-white shadow-sm font-sans-ui"
      }
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-[72px] gap-3 lg:gap-4">
        {/* Logo + Title */}
        <Link href="/" className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 lg:h-11 lg:w-11 flex-shrink-0 rounded-full overflow-hidden relative bg-white">
            <Image src="/logo.webp" alt="CISMA logo" fill className="object-contain" />
          </div>
          <span
            className={`hidden sm:block font-bold leading-tight text-sm md:text-base lg:text-[15px] xl:text-lg whitespace-nowrap truncate ${
              isHome ? "text-white drop-shadow-sm" : "text-cisma-navy"
            }`}
          >
            Corpus-Informed Studies: Methodologies and Applications (CISMA)
          </span>
        </Link>

        {/* Desktop menu */}
        <nav className="hidden lg:flex items-center gap-3 xl:gap-5 text-[13px] xl:text-sm font-semibold shrink-0 whitespace-nowrap">
          {topItems.map((m) =>
            m.kind === "dropdown" ? (
              childrenOf(m.key).length > 0 && (
                <div
                  key={m.label}
                  className="relative"
                  onMouseEnter={() => setOpenKey(m.key ?? null)}
                  onMouseLeave={() => setOpenKey(null)}
                >
                  <button className={`transition-colors flex items-center gap-1 ${linkColor}`}>
                    {m.label}
                    <svg width="9" height="9" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 7l5 6 5-6z" />
                    </svg>
                  </button>
                  {openKey === m.key && (
                    <div className="absolute left-0 top-full w-64 bg-white shadow-lg border border-gray-100 rounded-md py-2">
                      {childrenOf(m.key).map((c) => (
                        <Link
                          key={c.label}
                          href={c.href}
                          onClick={() => setOpenKey(null)}
                          className="block px-4 py-2 text-sm font-normal text-gray-700 hover:bg-cisma-light hover:text-cisma-blue"
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : (
              <Link key={m.label} href={m.href} className={`transition-colors ${linkColor}`}>
                {m.label}
              </Link>
            )
          )}

          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className={`transition-colors ${linkColor}`}
          >
            {loggedIn ? "Dashboard" : "Log in"}
          </Link>

          <a
            href={PUBLISH_URL}
            className="ml-1 rounded-md bg-[#f3ddc4] text-gray-800 px-3.5 py-2 text-[13px] xl:text-sm font-bold hover:bg-[#ecd0af] transition-colors"
          >
            Publish with us
          </a>
        </nav>

        {/* Mobile toggle */}
        <button
          className={`lg:hidden shrink-0 ${isHome ? "text-white" : "text-cisma-navy"}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3 text-sm font-semibold text-gray-700">
          {topItems.map((m) =>
            m.kind === "dropdown" ? (
              childrenOf(m.key).length > 0 && (
                <details key={m.label}>
                  <summary className="cursor-pointer">{m.label}</summary>
                  <div className="pl-4 pt-2 space-y-2">
                    {childrenOf(m.key).map((c) => (
                      <Link
                        key={c.label}
                        href={c.href}
                        onClick={() => setMobileOpen(false)}
                        className="block text-gray-600 font-normal"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </details>
              )
            ) : (
              <Link key={m.label} href={m.href} onClick={() => setMobileOpen(false)} className="block">
                {m.label}
              </Link>
            )
          )}

          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            onClick={() => setMobileOpen(false)}
            className="block"
          >
            {loggedIn ? "Dashboard" : "Log in"}
          </Link>
          <a
            href={PUBLISH_URL}
            className="block rounded-full bg-[#f3ddc4] text-gray-800 px-4 py-2 text-center font-bold"
          >
            Publish with us
          </a>
        </div>
      )}
    </header>
  );
}