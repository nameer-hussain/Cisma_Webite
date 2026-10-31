import { lectures } from "@/lib/lectures";
import LectureView from "@/components/LectureView";

export async function generateStaticParams() {
  const slugs = new Set(lectures.map((l) => l.slug.replace(/\s+/g, "-")));
  slugs.add("elizabeth-hanks-15");
  slugs.add("placeholder");

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/lectures?select=slug&status=neq.draft`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
      }
    );
    const rows = (await res.json()) as { slug: string }[];
    rows.forEach((r) => slugs.add(r.slug));
  } catch {
    /* database na mile to sirf upar wali list use hogi */
  }

  return [...slugs].map((slug) => ({ slug }));
}

export default function LecturePage() {
  return <LectureView />;
}