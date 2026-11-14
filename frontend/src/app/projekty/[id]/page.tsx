"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { allProjects, categoryColors } from "@/data/projects";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const project = allProjects.find((p) => p.id === id);

  if (!project) return notFound();


  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Back button */}
      <Link
        href="/projekty"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111]/80 backdrop-blur-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all duration-200 text-sm font-mono"
      >
        <span>←</span> Projekty
      </Link>

      {/* Hero image */}
      <div
        className="relative w-full h-[50vh] overflow-hidden"
        style={project.imageBg ? { backgroundColor: project.imageBg } : undefined}
      >
        <motion.img
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          src={project.image}
          alt={project.title}
          className={
            project.imageFit === "contain"
              ? "w-full h-full object-contain p-10 pb-32"
              : "w-full h-full object-cover"
          }
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative max-w-3xl mx-auto px-6 -mt-32 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {/* Header */}
          <div className="mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">{project.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${
                    categoryColors[project.category] ||
                    "text-white/50 border-white/20 bg-white/5"
                  }`}
                >
                  {project.category}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono ${
                    project.status === "Ukończony"
                      ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"
                      : "bg-neon-pink/10 text-neon-pink border border-neon-pink/20"
                  }`}
                >
                  {project.status}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-white/60 text-lg leading-relaxed mb-6">
            {project.description}
          </p>

          <div className="w-full h-px bg-white/8 my-8" />

          {/* Details */}
          <p className="text-white/40 leading-relaxed mb-8 whitespace-pre-line">
            {project.details}
          </p>

          {/* Tech stack */}
          <div className="mb-8">
            <h3 className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">
              Technologie
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.tech.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-white/60 border border-white/10"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          {(project.github || project.live) && (
            <div className="flex gap-3 flex-wrap mb-12">
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </a>
              )}
              {project.live && (
                <a
                  href={project.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-neon-cyan border border-neon-cyan/25 hover:bg-neon-cyan/10 transition-all duration-200"
                >
                  <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
                  Live Demo
                </a>
              )}
            </div>
          )}

        </motion.div>
      </div>
    </div>
  );
}
