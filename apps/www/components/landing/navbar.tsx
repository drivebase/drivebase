"use client";

import { Github, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blogs" },
];

export function Navbar() {
  const [_isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b bg-background/80 backdrop-blur-sm`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-r border-l">
        <div className="flex items-center h-16">
          <div className="flex-1 flex items-center">
            <Link href="/" className="flex items-center space-x-4">
              <Image
                src="/drivebase.svg"
                alt="Drivebase Logo"
                width={32}
                height={32}
              />
              <span className="text-foreground font-bold text-lg tracking-tight">
                Drivebase
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex-1 flex items-center justify-end">
            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="https://github.com/drivebase/drivebase"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground border border-transparent transition-colors"
              >
                <Github className="w-4 h-4 mr-2" />
                Github
              </Link>
            </div>

            <button
              type="button"
              className="md:hidden text-muted-foreground ml-4"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-background border-b border-border px-4 py-4 space-y-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-border space-y-4">
            <Link
              href="https://github.com/drivebase/drivebase"
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-secondary hover:bg-primary/90 text-primary-foreground border border-transparent rounded-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Github
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
