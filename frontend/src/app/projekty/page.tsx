"use client";

import { useRouter } from "next/navigation";
import DomeGallery, { type DomeImage } from "@/components/DomeGallery";
import Link from "next/link";
import { allProjects } from "@/data/projects";

export default function ProjektyPage() {
  const router = useRouter();

  const domeImages: DomeImage[] = allProjects.map((p) => ({
    src: p.image,
    alt: p.title,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Back button */}
      <Link
        href="/"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111]/80 backdrop-blur-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all duration-200 text-sm font-mono"
      >
        <span>←</span> Powrót
      </Link>

      {/* Title overlay */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Moje <span className="gradient-text">Projekty</span>
        </h1>
      </div>

      {/* Dome Gallery */}
      <div className="w-full h-screen">
        <DomeGallery
          images={domeImages}
          onImageClick={(index) =>
            router.push(`/projekty/${allProjects[index].id}`)
          }
          overlayBlurColor="#0a0a0a"
          grayscale={false}
          imageBorderRadius="16px"
          openedImageBorderRadius="24px"
          openedImageWidth="350px"
          openedImageHeight="450px"
          fit={0.55}
          minRadius={500}
          dragSensitivity={18}
          dragDampening={2}
        />
      </div>
    </div>
  );
}
