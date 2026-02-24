"use client";

import { Activity, ArrowRight, Check, Copy, Terminal } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs font-medium bg-primary/10 text-primary ${className}`}
    >
      {children}
    </span>
  );
}

function Button({
  children,
  variant = "primary",
  className = "",
  icon: Icon,
  href = "#",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
  icon?: React.ElementType;
  href?: string;
}) {
  const baseStyles =
    "inline-flex items-center justify-center px-6 py-3 text-sm font-medium transition-colors duration-200 focus:outline-none";
  const variants = {
    primary:
      "bg-primary hover:bg-primary/90 text-primary-foreground border border-transparent",
    secondary:
      "bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border",
    outline:
      "bg-transparent hover:bg-secondary text-foreground border border-border",
  };

  return (
    <a
      href={href}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </a>
  );
}

export function HeroSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(
      "curl -fsSL https://drivebase.io/install | bash",
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 border-b border-border bg-background z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <Badge>v2.5.0 Released | Read Changelog →</Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight from-gray-100 via-gray-200 to-gray-500 bg-linear-to-r bg-clip-text text-transparent"
            >
              One Interface. <br />
              Unified Storage.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-6 leading-relaxed max-w-xl"
            >
              Manage files across multiple cloud and local providers from a
              single modern dashboard designed for speed, clarity, and control.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mb-8 flex items-center justify-between bg-secondary/30 border border-border p-3 max-w-xl"
            >
              <code className="text-sm font-mono text-muted-foreground break-all">
                <span className="text-primary select-none">$ </span>
                <span className="text-foreground">curl</span> -fsSL
                https://drivebase.io/install |{" "}
                <span className="text-foreground">bash</span>
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="ml-4 p-2 hover:bg-secondary border border-transparent hover:border-border transition-colors group shrink-0"
                aria-label="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                )}
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4"
            >
              <Button
                variant="primary"
                icon={ArrowRight}
                href="#"
                className="w-full sm:w-auto"
              >
                Get Started Free
              </Button>
              <Button
                variant="outline"
                icon={Terminal}
                href="#"
                className="w-full sm:w-auto"
              >
                View Documentation
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="lg:col-span-5"
          >
            <div className="aspect-square border border-border bg-secondary/20 p-2 relative">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />

              <div className="w-full h-full bg-background border border-border flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />

                <div className="text-center space-y-6 relative z-10">
                  <div className="w-32 h-32 mx-auto border border-muted-foreground/20 flex items-center justify-center relative">
                    <div className="absolute inset-0 border border-border animate-[spin_10s_linear_infinite]" />
                    <div className="absolute inset-2 border border-dashed border-border animate-[spin_15s_linear_infinite_reverse]" />
                    <Activity className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      All systems operational
                    </p>
                    <p className="text-xs text-muted-foreground">
                      99.99% uptime • 12ms latency
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
