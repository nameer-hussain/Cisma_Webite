import type { Metadata } from "next";
import ConferenceCommittee from "@/components/ConferenceCommittee";
import CoChairSection from "@/components/CoChairSection";

export const metadata: Metadata = {
  title: "About CISMA",
  description:
    "About CISMA: our committee, scientific panel, founder's message and mission.",
};

export default function AboutPage() {
  return (
    <main>
      <ConferenceCommittee />
      <CoChairSection />
    </main>
  );
}