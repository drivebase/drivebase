"use client";

import {
  ArrowRightLeft,
  Lock,
  Route,
  Search,
  Server,
  Users,
} from "lucide-react";
import { motion } from "motion/react";

const capabilities = [
  {
    label: "Search",
    title: "Global Search",
    desc: "Search across images with OCR, PDFs, documents, and more from one place.",
    icon: Search,
  },
  {
    label: "Vault",
    title: "Vault",
    desc: "End-to-end encrypted uploads for sensitive files and controlled access.",
    icon: Lock,
  },
  {
    label: "WebDAV",
    title: "WebDAV Server",
    desc: "Enable remote access across multiple storage providers with credential-based controls.",
    icon: Server,
  },
  {
    label: "Uploads",
    title: "Smart Uploads",
    desc: "Route files automatically with rules so every upload lands in the right provider.",
    icon: Route,
  },
  {
    label: "Transfers",
    title: "Cloud Transfers",
    desc: "Move files between storage providers from one workflow without manual re-uploads.",
    icon: ArrowRightLeft,
  },
  {
    label: "Teams",
    title: "Team Collaboration",
    desc: "Shared workspaces and granular permissions for teams managing files together.",
    icon: Users,
  },
];

export function CapabilitiesGrid() {
  return (
    <div className="border-y border-border bg-background">
      <div className="max-w-7xl mx-auto text-center py-32!">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything you need to manage cloud storage
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Powerful features to streamline your workflow
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-x border-y border-border">
          {capabilities.map((item, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              key={item.label}
              className="p-8 hover:bg-secondary/50 transition-colors group"
            >
              <item.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2 text-left">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-left">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
