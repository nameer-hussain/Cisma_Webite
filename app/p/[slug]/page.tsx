import PageView from "@/components/PageView";

export async function generateStaticParams() {
  const slugs = new Set<string>(["placeholder"]);
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/pages?select=slug&published=eq.true`,
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

export default function Page() {
  return <PageView />;
}