"use client";

import { motion } from "motion/react";

const problemItems = [
  "No unified search across all your storage providers",
  "Managing multiple cloud accounts and login credentials",
  "Copying files manually between different services",
];

const solutionItems = [
  "AI powered search that finds files anywhere",
  "Access to all your cloud storage from a single dashboard",
  "Background file transfers arcross multiple providers",
];

export function ProblemSolution() {
  return (
    <div className="border-b border-border bg-background z-10 relative">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border border-x border-border">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="p-12 lg:p-16"
        >
          <div className="flex items-center space-x-2 text-destructive mb-6">
            <span className="w-2 h-2 bg-destructive" />
            <span className="text-sm font-medium">The Problem</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Fragmented Storage
          </h2>
          <ul className="space-y-6 text-muted-foreground">
            {problemItems.map((item) => (
              <li key={item} className="flex items-start">
                <span className="text-destructive mr-4">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="p-12 lg:p-16 bg-card/50"
        >
          <div className="flex items-center space-x-2 text-primary mb-6">
            <span className="w-2 h-2 bg-primary" />
            <span className="text-sm font-medium">The Solution</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Unified Storage Layer
          </h2>
          <ul className="space-y-6 text-muted-foreground">
            {solutionItems.map((item) => (
              <li key={item} className="flex items-start">
                <span className="text-primary mr-4">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
