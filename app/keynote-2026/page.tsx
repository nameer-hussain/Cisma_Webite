import KeynoteList from "@/components/KeynoteList";
import PageView from "@/components/PageView";

export const metadata = { title: "Programme: Keynotes | CISMA" };

export default function KeynoteListPage() {
  return (
    <main className="bg-white pb-24 pt-28">
      <h1 className="text-center text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl">
        Programme: Keynotes
      </h1>
      <KeynoteList />
      <PageView slug="keynote-2026-extra" />
    </main>
  );
}