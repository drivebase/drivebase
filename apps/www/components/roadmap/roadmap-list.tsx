"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { RoadmapListItem } from "@/lib/types";

function parseDate(value: string) {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      0,
      0,
      0,
      0,
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function RoadmapList({ items }: { items: RoadmapListItem[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const didAutoScroll = useRef(false);
  const [completedLine, setCompletedLine] = useState({ top: 0, height: 0 });

  useEffect(() => {
    if (didAutoScroll.current || items.length === 0) return;

    const now = new Date();
    const currentItem = items.find((item) => {
      const date = parseDate(item.data.date);
      return date !== null && date.getTime() <= now.getTime();
    });
    const targetItem = currentItem ?? items[0];
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
    const updateCompletedLinePosition = () => {
      const containerEl = containerRef.current;
      if (!containerEl) return;

      const now = new Date();
      const reachedItems = items.filter((item) => {
        const date = parseDate(item.data.date);
        return date !== null && date.getTime() <= now.getTime();
      });

      if (reachedItems.length === 0) {
        setCompletedLine({ top: 0, height: 0 });
        return;
      }

      const containerRect = containerEl.getBoundingClientRect();
      const containerTop = containerRect.top;
      const markerCenterOffset = 8;
      const centers = reachedItems
        .map((item) => itemRefs.current[item.url])
        .filter((el): el is HTMLDivElement => Boolean(el))
        .map(
          (el) =>
            el.getBoundingClientRect().top - containerTop + markerCenterOffset,
        );

      if (centers.length === 0) {
        setCompletedLine({ top: 0, height: 0 });
        return;
      }

      const currentDateMarker = Math.min(...centers);
      setCompletedLine({
        top: currentDateMarker,
        height: Math.max(containerRect.height - currentDateMarker, 0),
      });
    };

    updateCompletedLinePosition();
    window.addEventListener("resize", updateCompletedLinePosition);
    return () => {
      window.removeEventListener("resize", updateCompletedLinePosition);
    };
  }, [items]);

  return (
    <div ref={containerRef} className="relative mx-auto max-w-4xl">
      {/* Vertical line */}
      <div className="absolute left-7 top-0 bottom-0 w-px bg-border hidden sm:block" />
      <div
        className="absolute left-7 w-px bg-foreground hidden sm:block"
        style={{
          top: `${completedLine.top}px`,
          height: `${completedLine.height}px`,
        }}
      />

      <div className="space-y-12">
        {items.map((item, index) => {
          const parsedDate = parseDate(item.data.date);
          const isReached = parsedDate
            ? parsedDate.getTime() <= Date.now()
            : false;
          const formattedDate = parsedDate
            ? parsedDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })
            : item.data.date;

          return (
            <motion.div
              key={item.url}
              ref={(el) => {
                itemRefs.current[item.url] = el;
              }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative sm:pl-20"
            >
              <div className="hidden sm:block absolute -left-40 top-0 w-32 text-right">
                <div className="text-sm text-muted-foreground font-mono">
                  {formattedDate}
                </div>
                <div className="mt-1 text-xl font-semibold text-foreground">
                  {item.data.title}
                </div>
              </div>

              <div className="sm:hidden mb-4">
                <div className="text-sm text-muted-foreground font-mono">
                  {formattedDate}
                </div>
                <div className="text-xl font-semibold text-foreground">
                  {item.data.version}
                </div>
              </div>

              {/* Timeline dot */}
              <div
                className={`absolute left-6 sm:left-7 top-1.5 -translate-x-1/2 size-3 bg-background border-2 ${isReached ? "border-foreground" : "border-border"} z-20 hidden sm:block`}
              />

              <div className="space-y-4">
                {item.data.features.map((feature) => (
                  <div
                    key={`${item.url}-${feature.title}`}
                    className="border border-border bg-card/40 px-6 py-5 transition-colors hover:bg-card/60"
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
