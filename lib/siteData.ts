import { createClient } from "@/lib/supabase/client";

export type DbEvent = {
  id: string;
  title: string;
  tag: string | null;
  date_text: string | null;
  description: string | null;
  image: string | null;
  href: string;
  cta: string | null;
  sort_order: number;
};

export type LectureRow = {
  slug: string;
  title: string | null;
  card_title: string | null;
  list_title: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  speaker_name: string | null;
  card_image: string | null;
  hero_image: string | null;
  blocks: any[];
  status: "draft" | "upcoming" | "past";
  registration_open: boolean;
  date_text: string | null;
  slider_description: string | null;
  slider_cta: string | null;
  sort_order: number;
};

export async function fetchUpcomingLectures(): Promise<LectureRow[]> {
  const { data } = await createClient()
    .from("lectures").select("*").eq("status", "upcoming")
    .order("sort_order", { ascending: false });
  return (data ?? []) as LectureRow[];
}

export async function fetchPastLectures(): Promise<LectureRow[]> {
  const { data } = await createClient()
    .from("lectures").select("*").eq("status", "past")
    .order("sort_order", { ascending: false });
  return (data ?? []) as LectureRow[];
}

export async function fetchEvents(): Promise<DbEvent[]> {
  const { data } = await createClient()
    .from("events").select("*")
    .order("sort_order", { ascending: false });
  return (data ?? []) as DbEvent[];
}