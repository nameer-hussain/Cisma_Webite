import Hero from "@/components/Hero";
import BrandLogo from "@/components/BrandLogo";
import HomeSlider from "@/components/HomeSlider";
import CallForProceedings from "@/components/CallForProceedings";
import JoinOurTeam from "@/components/JoinOurTeam";
import CismaLectureSeries from "@/components/CismaLectureSeries";
import FeaturedLecture from "@/components/FeaturedLecture";
import HomeSections from "@/components/HomeSections";

// Poster images live in /public . Add a new event = add one block here.


export default function Home() {
  return (
    <main>
      <Hero />
      <BrandLogo />
      <FeaturedLecture />
      <HomeSlider /> 
      <HomeSections />
      <CismaLectureSeries />
    </main>
  );
}