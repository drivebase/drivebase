"use client";

import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "AI", href: "/docs/ai" },
      { label: "Vault", href: "/docs/vault" },
      { label: "Storage Providers", href: "/docs/storage-providers/overview" },
      { label: "Using Drivebase", href: "/docs/using-drivebase" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/docs/api" },
      { label: "Guides", href: "/docs/using-drivebase" },
      { label: "DeepWiki", href: "https://deepwiki.com/drivebase/drivebase" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Privacy Policy", href: "#" },
    ],
  },
];

const socialLinks = [
  { label: "GitHub", href: "https://github.com/drivebase/drivebase" },
  { label: "Discord", href: "https://discord.gg/zy3XyWcU6D" },
  { label: "Telegram", href: "https://t.me/+fWEMYD3gp61lYWZl" },
];

export function Footer() {
  return (
    <footer className="bg-background py-16 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          <div className="col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <Image
                src="/drivebase.svg"
                alt="Drivebase Logo"
                width={32}
                height={32}
              />
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-[250px]">
              Unified storage platform for all your cloud providers.
            </p>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-bold text-foreground mb-4">
                {section.title}
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {section.links.map((link) => {
                  const isExternal = /^https?:\/\//.test(link.href);
                  return (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        className="hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Drivebase. All rights reserved.
          </div>
          <div className="flex space-x-6 text-sm text-muted-foreground">
            {socialLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
