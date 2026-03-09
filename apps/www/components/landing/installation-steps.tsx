"use client";

import { Globe, Layout, Zap } from "lucide-react";
import { motion } from "motion/react";

const steps = [
  {
    step: "01",
    title: "Run Command",
    desc: "Run the install command to get Drivebase onto your machine.",
    icon: Globe,
  },
  {
    step: "02",
    title: "Compose Up",
    desc: "Start the full stack with Docker Compose and bring the services online.",
    icon: Layout,
  },
  {
    step: "03",
    title: "Start Using",
    desc: "Open Drivebase and start managing files across your storage providers.",
    icon: Zap,
  },
];

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto ${className}`}
    >
      {children}
    </section>
  );
}

export function InstallationSteps() {
  return (
    <section className="border-y border-border bg-background">
      <Section className="py-32! border-x border-border">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Three simple steps to unify all your cloud storage in one place
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-0 border border-border">
          {steps.map((item, _i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: _i * 0.1 }}
              key={item.step}
              className="border-b border-border p-8 transition-colors group relative bg-background last:border-b-0 md:border-b-0 md:border-r last:md:border-r-0"
            >
              <div className="flex justify-between items-start mb-6">
                <item.icon className="w-8 h-8 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Step {item.step}
                </span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {item.title}
              </h3>
              <p className="text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>
    </section>
  );
}
