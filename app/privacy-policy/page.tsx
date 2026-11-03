import type { Metadata } from "next";
import PageView from "@/components/PageView";

export const metadata: Metadata = {
  title: "Privacy Policy | CISMA",
  description: "CISMA Privacy Policy: how we collect, use and protect your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-white">
      <PageView slug="privacy-policy" />
    </main>
  );
}