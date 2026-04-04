import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Robotics from "@/components/Robotics";
import Engineering from "@/components/Engineering";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";
import Navigation from "@/components/Navigation";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Skills />
      <Robotics />
      <Engineering />
      <Projects />
      <Contact />
      <Navigation />
    </main>
  );
}
