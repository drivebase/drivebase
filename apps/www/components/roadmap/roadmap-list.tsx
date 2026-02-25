"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const statusConfig = {
  released: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
    label: "Released",
  },
  "in-progress": {
    icon: Clock,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    border: "border-indigo-400/20",
    label: "In Progress",
  },
  planned: {
    icon: Circle,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    border: "border-gray-400/20",
    label: "Planned",
  },
};

interface RoadmapItem {
  url: string;
  data: {
    title: string;
    version: string;
    description: string;
    features?: Array<{
      title: string;
      description: string;
    }>;
    status: "released" | "in-progress" | "planned";
    date?: string | Date;
  };
}

export function RoadmapList({ items }: { items: RoadmapItem[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const didAutoScroll = useRef(false);
  const [releasedLine, setReleasedLine] = useState({ top: 0, height: 0 });

  useEffect(() => {
    if (didAutoScroll.current || items.length === 0) return;

    const inProgressItem = items.find(
      (item) => item.data.status === "in-progress",
    );
    const targetItem = inProgressItem ?? items[0];
    const targetEl = targetItem ? itemRefs.current[targetItem.url] : null;

    if (targetEl) {
      const headerOffset = 140;
      const y =
        targetEl.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
      didAutoScroll.current = true;
    }
  }, [items]);

  useEffect(() => {
    const updateReleasedLinePosition = () => {
      const containerEl = containerRef.current;
      if (!containerEl) return;

      const releasedItems = items.filter(
        (item) => item.data.status === "released",
      );
      if (releasedItems.length === 0) {
        setReleasedLine({ top: 0, height: 0 });
        return;
      }

      const containerRect = containerEl.getBoundingClientRect();
      const containerTop = containerRect.top;
      const markerCenterOffset = 8;
      const centers = releasedItems
        .map((item) => itemRefs.current[item.url])
        .filter((el): el is HTMLDivElement => Boolean(el))
        .map(
          (el) =>
            el.getBoundingClientRect().top - containerTop + markerCenterOffset,
        );

      if (centers.length === 0) {
        setReleasedLine({ top: 0, height: 0 });
        return;
      }

      const newestReleasedCenter = Math.min(...centers);
      setReleasedLine({
        top: newestReleasedCenter,
        height: Math.max(containerRect.height - newestReleasedCenter, 0),
      });
    };

    updateReleasedLinePosition();
    window.addEventListener("resize", updateReleasedLinePosition);
    return () => {
      window.removeEventListener("resize", updateReleasedLinePosition);
    };
  }, [items]);

  return (
    <div ref={containerRef} className="relative mx-auto max-w-4xl">
      {/* Vertical line */}
      <div className="absolute left-7 top-0 bottom-0 w-px bg-gray-800/70 hidden sm:block" />
      <div
        className="absolute left-7 w-px bg-indigo-500/50 hidden sm:block"
        style={{
          top: `${releasedLine.top}px`,
          height: `${releasedLine.height}px`,
        }}
      />

      <div className="space-y-12">
        {items.map((item, index) => {
          const status = statusConfig[item.data.status];
          const Icon = status.icon;
          const formattedDate = item.data.date
            ? new Date(item.data.date).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })
            : "TBA";

          return (
            <motion.div
              key={item.url}
              ref={(el) => {
                itemRefs.current[item.url] = el;
              }}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative sm:pl-20"
            >
              <div className="hidden sm:block absolute -left-40 top-0 w-32 text-right">
                <div className="text-sm text-muted-foreground font-mono">
                  {formattedDate}
                </div>
              </div>

              {/* Timeline dot */}
              <div
                className={`absolute left-6 sm:left-7 top-1.5 -translate-x-1/2 w-3 h-3 rounded-full bg-[#050505] border-2 ${status.color.replace("text", "border")} z-20 hidden sm:block`}
              />

              <div
                className={`group relative rounded-2xl border ${status.border} bg-foreground/2 p-6 transition-all hover:bg-foreground/4`}
              >
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.color}`}
                    >
                      <Icon className="size-3.5" />
                      {status.label}
                    </span>
                    <h2 className="text-xl font-semibold text-foreground">
                      {item.data.title}
                    </h2>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed max-w-2xl">
                  {item.data.description}
                </p>
              </div>

              {item.data.features?.length ? (
                <div className="mt-4 space-y-4">
                  {item.data.features.map((feature) => (
                    <div
                      key={`${item.url}-${feature.title}`}
                      className="rounded-2xl border border-border/60 bg-background/80 px-6 py-5"
                    >
                      <h3 className="text-lg font-semibold text-foreground">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
