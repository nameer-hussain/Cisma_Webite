"use client";
import { useEffect, useState } from "react";
import EventSlider, { type SliderEvent } from "@/components/EventSlider";
import { fetchEvents, fetchUpcomingLectures } from "@/lib/siteData";

export default function HomeSlider() {
  const [items, setItems] = useState<SliderEvent[]>([]);

  useEffect(() => {
    (async () => {
      const [lecs, evs] = await Promise.all([fetchUpcomingLectures(), fetchEvents()]);
      const a: SliderEvent[] = lecs
        .filter((l) => l.card_image)
        .map((l) => ({
          title: l.card_title || l.title || l.slug,
          image: l.card_image!,
          href: `/lectures/${l.slug}`,
          tag: "Upcoming lecture",
          date: l.date_text || undefined,
          description: l.slider_description || undefined,
          cta: l.slider_cta || "Register now",
        }));
      const b: SliderEvent[] = evs
        .filter((e) => e.image)
        .map((e) => ({
          title: e.title,
          image: e.image!,
          href: e.href,
          tag: e.tag || undefined,
          date: e.date_text || undefined,
          description: e.description || undefined,
          cta: e.cta || undefined,
        }));
      setItems([...a, ...b]);
    })();
  }, []);

  if (!items.length) return null;
  return <EventSlider events={items} heading="Latest Events" />;
}