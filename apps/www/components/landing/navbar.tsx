"use client";

import {
  ArrowRightLeft,
  ChevronDown,
  Github,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const featureLinks = [
  {
    title: "Vault",
    href: "/features/vault",
    description: "Private encrypted storage with end-to-end protection.",
    icon: ShieldCheck,
  },
  {
    title: "Smart Upload",
    href: "/features/smart-upload",
    description: "Route files to the right provider automatically.",
    icon: Route,
  },
  {
    title: "Cloud Transfers",
    href: "/features/cloud-transfers",
    description: "Move files between providers without manual downloads.",
    icon: ArrowRightLeft,
  },
  {
    title: "Team Collaboration",
    href: "/features/team-collaboration",
    description: "Share files securely with workspace-level permissions.",
    icon: Users,
  },
];

export function Navbar() {
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!featuresRef.current?.contains(event.target as Node)) {
        setIsFeaturesOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full bg-black/60 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center justify-start">
            <Link href="/" className="flex items-center gap-2">
              <Image
                className="h-8 w-auto"
                src="https://raw.githubusercontent.com/drivebase/drivebase/main/drivebase.svg"
                alt="Drivebase"
                width={32}
                height={32}
              />
            </Link>
          </div>
          <div className="hidden md:flex items-center justify-center gap-7">
            {/** biome-ignore lint/a11y/noStaticElementInteractions: . */}
            <div
              ref={featuresRef}
              className="relative"
              onMouseEnter={() => setIsFeaturesOpen(true)}
              onMouseLeave={() => setIsFeaturesOpen(false)}
            >
              <button
                type="button"
                aria-expanded={isFeaturesOpen}
                onClick={() => setIsFeaturesOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                Features
                <ChevronDown
                  className={`size-3 transition-transform ${isFeaturesOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`absolute left-0 top-full z-30 w-[460px] pt-3 transition-all duration-150 ${
                  isFeaturesOpen
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <ul className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#0B0B0B] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
                  {featureLinks.map((item) => (
                    <li key={item.title}>
                      <Link
                        href={item.href}
                        onClick={() => setIsFeaturesOpen(false)}
                        className="block rounded-lg p-3 transition-colors hover:bg-white/5"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 rounded-md bg-white/5 p-1.5 text-indigo-300">
                            <item.icon className="size-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none text-white">
                              {item.title}
                            </p>
                            <p className="mt-2 line-clamp-2 text-xs leading-snug text-gray-400">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Link
              href="/docs"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Documentation
            </Link>
            <Link
              href="/docs/api"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              API Reference
            </Link>
            <Link
              href="/blogs"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Blogs
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/drivebase/drivebase"
              target="_blank"
              className="ml-auto text-gray-400 hover:text-white transition-colors"
            >
              <span className="sr-only">GitHub</span>
              <Github className="size-5" />
            </Link>
            <Link
              href="/docs"
              className="hidden sm:block rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black hover:bg-gray-200 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
