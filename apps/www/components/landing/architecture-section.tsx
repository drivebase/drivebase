"use client";

import { Cpu, LinkIcon, PianoIcon } from "lucide-react";
import Image from "next/image";

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

export function ArchitectureSection() {
  return (
    <Section className="!py-32">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-4xl font-bold text-foreground mb-6">
            Built for reliability and performance
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Drivebase uses a reliable transfer system with direct connections
            for speed and secure proxy routing when needed. Failed transfers are
            handled automatically, and incomplete uploads are cleaned up.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-secondary/50 flex items-start space-x-4">
              <Cpu className="w-6 h-6 text-primary mt-1" />
              <div>
                <div className="font-medium text-foreground">
                  Modular provider system
                </div>
                <div className="text-sm text-muted-foreground">
                  Easy to add new storage providers
                </div>
              </div>
            </div>
            <div className="p-4 bg-secondary/50 flex items-start space-x-4">
              <LinkIcon className="w-6 h-6 text-primary mt-1" />
              <div>
                <div className="font-medium text-foreground">
                  Schema-first API engine
                </div>
                <div className="text-sm text-muted-foreground">
                  Built on GraphQL for flexible queries and integrations
                </div>
              </div>
            </div>
            <div className="p-4 bg-secondary/50 flex items-start space-x-4">
              <PianoIcon className="w-6 h-6 text-primary mt-1" />
              <div>
                <div className="font-medium text-foreground">
                  Optimistic UI architecture
                </div>
                <div className="text-sm text-muted-foreground">
                  Real-time updates and progress tracking for all file
                  operations
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-border bg-secondary/20 p-4">
          <div className="aspect-square bg-background border border-border relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px]" />

            <Image
              src="https://picsum.photos/seed/schematic/800/800?grayscale"
              alt="Core Engine"
              className="w-3/4 h-3/4 object-contain opacity-50 mix-blend-screen invert"
              width={700}
              height={500}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}
