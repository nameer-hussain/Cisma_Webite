import Hero from "@/components/Hero";
import BrandLogo from "@/components/BrandLogo";
import HomeSlider from "@/components/HomeSlider";
import CismaLectureSeries from "@/components/CismaLectureSeries";
import FeaturedLecture from "@/components/FeaturedLecture";
import HomeSections from "@/components/HomeSections";
import LectureTicker from '@/components/LectureTicker'

// Poster images live in /public . Add a new event = add one block here.


export default function Home() {
  return (
    <main>
      <Hero />
      <LectureTicker />
      <BrandLogo />
      <FeaturedLecture />
      <HomeSlider /> 
      <HomeSections />
      <CismaLectureSeries />
    </main>
  );
}