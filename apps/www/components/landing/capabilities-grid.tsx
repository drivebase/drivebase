"use client";

import { Activity, FileText, Layout, Lock, Search, Shield } from "lucide-react";
import { motion } from "motion/react";

const capabilities = [
  {
    label: "Search",
    title: "Global Search",
    desc: "Find any file across all your storage providers instantly",
    icon: Search,
  },
  {
    label: "Monitor",
    title: "Real-time Monitoring",
    desc: "Track file access and storage usage in real-time",
    icon: Activity,
  },
  {
    label: "Interface",
    title: "Unified Interface",
    desc: "One dashboard to manage all your cloud storage",
    icon: Layout,
  },
  {
    label: "Security",
    title: "Role-based Access",
    desc: "Fine-grained permissions for your team members",
    icon: Shield,
  },
  {
    label: "Logging",
    title: "Activity Logs",
    desc: "Complete audit trail of all file operations",
    icon: FileText,
  },
  {
    label: "Encryption",
    title: "Secure Vault",
    desc: "Encrypted storage with automatic key rotation",
    icon: Lock,
  },
];

export function CapabilitiesGrid() {
  return (
    <div className="border-y border-border bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="px-4 py-8 border-b border-border"
        >
          <h2 className="text-2xl font-bold text-foreground">
            Everything you need to manage cloud storage
          </h2>
          <p className="text-muted-foreground mt-2">
            Powerful features to streamline your workflow
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-x border-border">
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
              <h3 className="text-lg font-bold text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
