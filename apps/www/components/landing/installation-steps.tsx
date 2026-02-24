"use client";

import { Globe, Layout, Zap } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Connect",
    desc: "Link your cloud storage providers with secure credentials.",
    icon: Globe,
  },
  {
    step: "02",
    title: "Configure",
    desc: "Define how files should be handled and where they should be stored.",
    icon: Layout,
  },
  {
    step: "03",
    title: "Start Using",
    desc: "Drivebase routes, tracks, and organizes files automatically.",
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
    <Section className="py-32!">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Get Started in Minutes
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Three simple steps to unify all your cloud storage in one place
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((item, _i) => (
          <div
            key={item.step}
            className="border border-border p-8 hover:border-primary/50 transition-colors group relative bg-background"
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
          </div>
        ))}
      </div>
    </Section>
  );
}
