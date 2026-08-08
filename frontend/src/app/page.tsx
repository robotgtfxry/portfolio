import Hero from "@/components/Hero";
import About from "@/components/About";
import Experience from "@/components/Experience";
import Skills from "@/components/Skills";
import Robotics from "@/components/Robotics";
import Projects from "@/components/Projects";
import Showcase3D from "@/components/Showcase3D";
import Contact from "@/components/Contact";
import Navigation from "@/components/Navigation";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Experience />
      <Skills />
      <Projects />
      <Robotics />
      <Showcase3D />
      <Contact />
      <Navigation />
    </main>
  );
}
