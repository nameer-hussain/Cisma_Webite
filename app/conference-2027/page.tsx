import ConferenceView from "@/components/ConferenceView";

export const metadata = { title: "3rd CISMA International Conference | CISMA" };

export default function ConferencePage() {
  return (
    <main className="bg-white pb-24">
      <ConferenceView slug="cisma-2027" />
    </main>
  );
}