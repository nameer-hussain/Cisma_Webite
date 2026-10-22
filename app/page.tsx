import Hero from "@/components/Hero";
import BrandLogo from "@/components/BrandLogo";
import MilanAnnouncement from "@/components/MilanAnnouncement";
import CallForProceedings from "@/components/CallForProceedings";
import CismaLive from "@/components/CismaLive";
import JoinOurTeam from "@/components/JoinOurTeam";
import CallForChapterProposals from "@/components/CallForChapterProposals";
import CismaLectureSeries from "@/components/CismaLectureSeries";
import UpcomingLecture from "@/components/UpcomingLecture";

export default function Home() {
  return (
    <main>
      <Hero />
      <BrandLogo />
      <UpcomingLecture />
      <MilanAnnouncement />
      <CallForProceedings />
      <CismaLive />
      <JoinOurTeam />
      <CallForChapterProposals />
      <CismaLectureSeries />
    </main>
  );
}