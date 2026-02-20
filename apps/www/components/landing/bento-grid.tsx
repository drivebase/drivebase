"use client";

import {
  ArrowRightLeft,
  ArrowUpRight,
  Layers,
  Route,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const features = [
  {
    title: "High Performance",
    description:
      "Built with Bun and optimized for speed. Handle large file uploads with ease.",
    icon: Zap,
    className: "col-span-1",
    color: "bg-yellow-500/10 text-yellow-500",
  },
  {
    title: "Vault",
    description:
      "Protect sensitive files with end-to-end encrypted storage inside Drivebase.",
    icon: ShieldCheck,
    href: "/features/vault",
    className: "col-span-1",
    color: "bg-violet-500/10 text-violet-400",
  },
  {
    title: "Smart Upload",
    description:
      "Auto-route files by type or size. E.g. send PDFs to S3 and Images to Google Drive.",
    icon: Route,
    href: "/features/smart-upload",
    className: "col-span-1",
    color: "bg-indigo-500/10 text-indigo-500",
  },
  {
    title: "Multi-Cloud Support",
    description:
      "Unify S3, Google Drive, Local Storage, and more under a single interface.",
    icon: Layers,
    className: "col-span-1 md:col-span-2",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Users Management",
    description:
      "Manage workspace members, roles, and access controls from one place.",
    icon: Users,
    href: "/features/team-collaboration",
    className: "col-span-1",
    color: "bg-sky-500/10 text-sky-500",
  },
  {
    title: "Team Collaboration",
    description:
      "Share folders and files with your team. Granular permissions and access control.",
    icon: Users,
    href: "/features/team-collaboration",
    className: "col-span-1",
    color: "bg-red-500/10 text-red-500",
  },
  {
    title: "Cloud Transfers",
    description:
      "Move files between cloud providers seamlessly in the background.",
    icon: ArrowRightLeft,
    href: "/features/cloud-transfers",
    className: "col-span-1",
    color: "bg-gray-500/10 text-gray-500",
  },
  {
    title: "Smart Search",
    description:
      "Instant, powerful search across all your storage providers simultaneously.",
    icon: Search,
    className: "col-span-1",
    color: "bg-orange-500/10 text-orange-500",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function BentoGrid() {
  return (
    <section className="py-24 sm:py-32 bg-black/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center mb-16"
        >
          <h2 className="text-base font-semibold leading-7 text-indigo-400">
            Features
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to manage your files
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[200px]"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className={cn(
                "group relative overflow-hidden rounded-[2rem] bg-white/[0.03] p-8 transition-all hover:bg-white/[0.05]",
                feature.className,
              )}
            >
              {feature.href && (
                <Link
                  href={feature.href}
                  className="absolute inset-0 z-10"
                  aria-label={`Open ${feature.title}`}
                />
              )}
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                      feature.color,
                    )}
                  >
                    <feature.icon className="size-6" />
                  </div>
                  {feature.href && (
                    <div className="relative z-20 rounded-full bg-white/5 p-1.5 text-indigo-300/90 ring-1 ring-white/10">
                      <ArrowUpRight className="size-4" />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
