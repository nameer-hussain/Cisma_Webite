import KeynoteDetail from "@/components/KeynoteDetail";

export async function generateStaticParams() {
  const slugs = new Set<string>(["placeholder"]);
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/keynotes?select=slug&published=eq.true&conference_slug=eq.cisma-2027`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
      }
    );
    ((await res.json()) as { slug: string }[]).forEach((r) => slugs.add(r.slug));
  } catch {}
  return [...slugs].map((slug) => ({ slug }));
}

export default function Keynote2027DetailPage() {
  return <KeynoteDetail />;
}