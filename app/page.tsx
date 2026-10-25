import Hero from "@/components/Hero";
import BrandLogo from "@/components/BrandLogo";
import UpcomingLecture from "@/components/UpcomingLecture";
import EventSlider, { type SliderEvent } from "@/components/EventSlider";
import MilanAnnouncement from "@/components/MilanAnnouncement";
import CallForProceedings from "@/components/CallForProceedings";
import CismaLive from "@/components/CismaLive";
import JoinOurTeam from "@/components/JoinOurTeam";
import CismaLectureSeries from "@/components/CismaLectureSeries";

// Poster images live in /public . Add a new event = add one block here.
const events: SliderEvent[] = [
  {
    title: "CISMA Lecture Series 14: Paul Baker",
    image: "/events/paul-baker-14.jpeg",
    href: "/upcoming-lecture",
    tag: "Upcoming Lecture",
    date: "27 October 2026 · 16:00 China Standard Time",
    description:
      "Surprise Words and Core Words: Using Vibe Coding to Identify Collocational Divergence Across Corpora. Free for registered members.",
    cta: "Register now",
  },
  {
    title: "CISMA International Conference 2027, Milan, Italy",
    image: "/milan-conference.jpg",
    href: "/#milan",
    tag: "Upcoming Conference",
    description:
      "Join researchers from around the world in Milan for the next CISMA international conference on corpus-informed studies.",
    cta: "Learn more",
  },
  {
    title: "Call for Chapter Proposals",
    image: "/chapter-proposals-poster.png",
    href: "mailto:cisma@shisu.edu.cn?subject=Chapter%20Proposal%20Submission",
    tag: "Open Call",
    date: "Chapter submission deadline: 30 October 2026",
    description:
      "Language, Culture, and Society in Contemporary China. An edited volume published by Springer Nature, with no publication fee.",
    cta: "Submit a proposal",
  },
];

export default function Home() {
  return (
    <main>
      <Hero />
      <BrandLogo />
      <UpcomingLecture />
      <EventSlider events={events} heading="Latest Events" />
      <MilanAnnouncement />
      <CismaLive />
      <CismaLectureSeries />
    </main>
  );
}