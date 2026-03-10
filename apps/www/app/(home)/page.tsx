import type { Metadata } from "next";
import Script from "next/script";
import {
  ArchitectureSection,
  CapabilitiesGrid,
  CTASection,
  FAQSection,
  HeroSection,
  InstallationSteps,
  ProblemSolution,
  StatusBar,
  UserTypesSection,
} from "@/components/landing";
import { faqs } from "@/components/landing/faq-data";

export const metadata: Metadata = {
  title: "Open Source Self-Hosted Cloud File Manager",
  description:
    "Manage files across cloud and local storage providers from one dashboard. Drivebase combines global search, Vault encryption, WebDAV access, smart uploads, cloud transfers, and team collaboration.",
  keywords: [
    "open source cloud file manager",
    "self-hosted file manager",
    "multi cloud storage manager",
    "webdav server",
    "encrypted file vault",
    "cloud transfer tool",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Drivebase | Open Source Self-Hosted Cloud File Manager",
    description:
      "Global search, Vault encryption, WebDAV access, smart uploads, cloud transfers, and team collaboration in one self-hosted file manager.",
    url: "https://drivebase.io",
    images: ["/drivebase-banner.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Drivebase | Open Source Self-Hosted Cloud File Manager",
    description:
      "A self-hosted file manager for multi-provider storage with search, Vault, WebDAV, transfers, and smart uploads.",
    images: ["/drivebase-banner.png"],
  },
};

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://drivebase.io/#organization",
        name: "Drivebase",
        url: "https://drivebase.io",
        logo: "https://drivebase.io/drivebase-light.svg",
        sameAs: ["https://github.com/drivebase/drivebase"],
      },
      {
        "@type": "WebSite",
        "@id": "https://drivebase.io/#website",
        name: "Drivebase",
        url: "https://drivebase.io",
        description:
          "Open source self-hosted cloud file management across multiple storage providers.",
        publisher: {
          "@id": "https://drivebase.io/#organization",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://drivebase.io/#software",
        name: "Drivebase",
        url: "https://drivebase.io",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Docker, Linux",
        description:
          "Drivebase is an open source self-hosted cloud file manager for teams using multiple storage providers.",
        image: "https://drivebase.io/drivebase-banner.png",
        softwareHelp: "https://drivebase.io/docs",
        downloadUrl: "https://github.com/drivebase/drivebase",
        publisher: {
          "@id": "https://drivebase.io/#organization",
        },
        featureList: [
          "Global search across images, OCR, PDFs, and documents",
          "Vault for end-to-end encrypted uploads",
          "WebDAV server for remote access",
          "Smart uploads with rule-based routing",
          "Cloud transfers across providers",
          "Team collaboration with shared workspaces",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": "https://drivebase.io/#faq",
        mainEntity: faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <main className="flex flex-col flex-1">
      <Script
        id="home-structured-data"
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: safe JSON-LD structured data
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HeroSection />
      <StatusBar />
      <ProblemSolution />
      <InstallationSteps />
      <CapabilitiesGrid />
      <ArchitectureSection />
      <UserTypesSection />
      <CTASection />
      <FAQSection />
    </main>
  );
}
