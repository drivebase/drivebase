"use client";

import { motion } from "motion/react";

export function CTASection() {
  return (
    <div className="py-32 text-center bg-background border-b border-border">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto px-4"
      >
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
          Take control of your cloud storage today
        </h2>
        <p className="text-muted-foreground mb-10 text-lg">
          Join 10,000+ users managing their files with 99.99% uptime
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <button
            type="button"
            className="px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors w-full sm:w-auto"
          >
            Get Started Free
          </button>
          <button
            type="button"
            className="px-8 py-4 bg-transparent border border-border hover:border-muted-foreground text-foreground transition-colors w-full sm:w-auto"
          >
            Contact Sales
          </button>
        </div>
      </motion.div>
    </div>
  );
}
