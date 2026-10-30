import Hero from "@/components/Hero";
import BrandLogo from "@/components/BrandLogo";
import EventSlider, { type SliderEvent } from "@/components/EventSlider";
import MilanAnnouncement from "@/components/MilanAnnouncement";
import CallForProceedings from "@/components/CallForProceedings";
import JoinOurTeam from "@/components/JoinOurTeam";
import CismaLectureSeries from "@/components/CismaLectureSeries";
import BookOfAbstracts from "@/components/BookOfAbstracts";
import FeaturedLecture from "@/components/FeaturedLecture";

// Poster images live in /public . Add a new event = add one block here.
const events: SliderEvent[] = [
  {
    title: "CISMA Lecture Series 15: Elizabeth Hanks",
    image: "/events/elizabeth-hanks-15.jpg",
    href: "/upcoming-lecture",
    tag: "Upcoming lecture",
    date: "17 November 2026 · 17:00 CST",
    description:
      "Designing and evaluating a corpus of conversation: lessons learned in the creation of LANA-CASE.",
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
  {
    title: "CISMA 2026 Book of Abstracts",
    image: "/book-of-abstracts-cover.jpg",
    href: "/book-of-abstracts-2026.pdf",
    tag: "New",
    description: "The Book of Abstracts is now available to read and download.",
    cta: "Read now",
  },
];

export default function Home() {
  return (
    <main>
      <Hero />
      <BrandLogo />
      <FeaturedLecture />
      <EventSlider events={events} heading="Latest Events" />
      <BookOfAbstracts />
      <MilanAnnouncement />
      <CismaLectureSeries />
    </main>
  );
}