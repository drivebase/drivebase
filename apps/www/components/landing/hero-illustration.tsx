"use client";

import { Search } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";

const searchResults = [
  {
    id: "1",
    name: "Q3 Financials.xlsx",
    timestamp: "Modified 2 hours ago",
    icon: "/providers/google_drive.svg",
    isActive: true,
  },
  {
    id: "2",
    name: "Project_Q3_Report.pdf",
    timestamp: "Modified yesterday",
    icon: "/providers/s3.svg",
    isActive: false,
  },
  {
    id: "3",
    name: "Meeting_Notes_Q3.docx",
    timestamp: "Modified last week",
    icon: "/providers/dropbox.svg",
    isActive: false,
  },
  {
    id: "4",
    name: "Marketing_Assets_Final.docx",
    timestamp: "Modified 3 days ago",
    icon: "/providers/google_drive.svg",
    isActive: false,
  },
];

export function HeroIllustration() {
  return (
    <div className="relative w-full max-w-lg mx-auto md:max-w-xl">
      {/* Subtle Background Glow - Primary color with very low opacity */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10 flex flex-col gap-0 shadow-2xl shadow-primary/5"
      >
        {/* Search Bar - Squared, Flat, Theme-aligned with subtle glow */}
        <div className="flex items-center gap-3 px-4 py-4 bg-background border border-border rounded-none relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none" />
          <Search className="w-5 h-5 text-muted-foreground z-10 shrink-0" />
          <div className="flex items-center z-10">
            <span className="text-foreground font-medium text-lg">
              Q3 Financials
            </span>
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="w-[2px] h-5 bg-primary ml-[1px] shadow-[0_0_8px_var(--primary)]"
            />
          </div>
        </div>

        {/* Results Dropdown - Squared, Flat, Theme-aligned */}
        <div className="bg-card border-x border-b border-border rounded-none flex relative shadow-xl shadow-black/20">
          <div className="flex flex-col w-full z-10">
            {searchResults.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 transition-colors group relative border-b border-border/50 last:border-b-0 ${
                  item.isActive ? "bg-accent/40" : "hover:bg-accent/20"
                }`}
              >
                {item.isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_var(--primary)]" />
                )}
                <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-background border border-border rounded-none p-2">
                  <Image
                    src={item.icon}
                    alt=""
                    className="w-full h-full object-contain"
                    width={48}
                    height={48}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-foreground font-medium">
                    {item.name}
                  </span>
                  <span className="text-muted-foreground text-xs mt-0.5">
                    {item.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollbar Track - Minimalist & Theme-aligned */}
          <div className="w-1.5 bg-muted flex flex-col shrink-0">
            <div className="w-full h-32 bg-border/50" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
