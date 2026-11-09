import KeynoteList from "@/components/KeynoteList";

export const metadata = { title: "Programme: Keynotes 2027 | CISMA" };

export default function Keynote2027ListPage() {
  return (
    <main className="bg-white pb-24 pt-28">
      <h1 className="text-center text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl">
        Programme: Keynotes
      </h1>
      <KeynoteList conference="cisma-2027" basePath="/keynote-2027" />
    </main>
  );
}