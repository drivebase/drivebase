"use client";

import { motion } from "motion/react";
import { ExternalLink, Tag, Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState, useEffect, useRef } from "react";

export type GitHubRelease = {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
};

export function ReleaseList({ items }: { items: GitHubRelease[] }) {
  const [activeTab, setActiveTab] = useState<string>(items[0]?.tag_name);
  const scrollRef = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToRelease = (tagName: string) => {
    setActiveTab(tagName);
    const element = scrollRef.current[tagName];
    if (element) {
      const offset = 100; // Adjust for sticky header
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;

      for (const item of items) {
        const element = scrollRef.current[item.tag_name];
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;

          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveTab(item.tag_name);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [items]);

  return (
    <div className="flex flex-col md:flex-row gap-8 relative mx-auto max-w-6xl">
      {/* Sidebar - Left Side */}
      <aside className="md:w-64 flex-shrink-0">
        <div className="sticky top-24 space-y-1">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 px-3">
            Versions
          </div>
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToRelease(item.tag_name)}
                className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors border-l-2 ${
                  activeTab === item.tag_name
                    ? "text-primary border-primary bg-primary/5"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {item.tag_name}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Content - Right Side */}
      <div className="flex-1 space-y-16">
        {items.map((item, index) => {
          const parsedDate = new Date(item.published_at);
          const formattedDate = parsedDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });

          return (
            <motion.div
              key={item.id}
              ref={(el) => {
                scrollRef.current[item.tag_name] = el;
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="scroll-mt-24"
            >
              <div className="border border-border bg-card/40 overflow-hidden transition-colors hover:bg-card/60">
                {/* Card Header */}
                <div className="px-6 py-4 border-b border-border bg-secondary/30 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary text-xs font-bold uppercase rounded-none border border-primary/20">
                      <Tag className="size-3" />
                      {item.tag_name}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
                      <Calendar className="size-4" />
                      {formattedDate}
                    </div>
                  </div>
                  <a
                    href={item.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                  >
                    VIEW ON GITHUB
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                {/* Card Content */}
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-6">
                    {item.name || `Release ${item.tag_name}`}
                  </h2>
                  <div className="prose prose-invert prose-neutral max-w-none prose-h1:text-xl prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-none prose-pre:rounded-none prose-pre:border prose-pre:border-border prose-img:rounded-none prose-img:border prose-img:border-border">
                    <ReactMarkdown>{item.body}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
