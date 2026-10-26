"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const pastEvents = [
  { label: "CISMA Attendee Guide 2026", href: "/cisma-attendee-guide-2026" },
  { label: "Travel Information", href: "/cisma-attendee-guide-2026#travel-information" },
  { label: "Keynote 2026", href: "/keynote-2026" },
  { label: "Schedule", href: "/keynote-2026#schedule" },
  { label: "Download", href: "/keynote-2026#download" },
  { label: "Book of Abstracts 2026", href: "/book-of-abstracts-2026.pdf" },
  { label: "Memory", href: "/memory" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

    const [loggedIn, setLoggedIn] = useState(false);

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
          <Link href="/about" className={`transition-colors ${linkColor}`}>
            About CISMA
          </Link>
          <Link href="/#cisma-lectures-series" className={`transition-colors ${linkColor}`}>
            CISMA Lectures Series
          </Link>

          {/* Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <button className={`transition-colors flex items-center gap-1 ${linkColor}`}>
              Past Events
              <svg width="9" height="9" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 7l5 6 5-6z" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 top-full w-64 bg-white shadow-lg border border-gray-100 rounded-md py-2">
                {pastEvents.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm font-normal text-gray-700 hover:bg-cisma-light hover:text-cisma-blue"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/privacy-policy" className={`transition-colors ${linkColor}`}>
            Privacy Policy
          </Link>
          
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className={`transition-colors ${linkColor}`}
          >
            {loggedIn ? "Dashboard" : "Log in"}
          </Link>

          <a
            href="https://www.degruyterbrill.com/journal/key/csh/html?srsltid=AfmBOooYXr95qYA8GnQTCxM3f7BOsBoTdFeqjIA3v6_Bnd9uK6JesEaz"
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
          <Link href="/about" className="block">About CISMA</Link>
          <Link href="/#cisma-lectures-series" className="block">CISMA Lectures Series</Link>
          <details>
            <summary className="cursor-pointer">Past Events</summary>
            <div className="pl-4 pt-2 space-y-2">
              {pastEvents.map((item) => (
                <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className="block text-gray-600 font-normal">
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
          <Link href="/privacy-policy" className="block">Privacy Policy</Link>
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            onClick={() => setMobileOpen(false)}
            className="block"
          >
            {loggedIn ? "Dashboard" : "Log in"}
          </Link>
          <a href="#" className="block rounded-full bg-[#f3ddc4] text-gray-800 px-4 py-2 text-center font-bold">
            Publish with us
          </a>
        </div>
      )}
    </header>
  );
}