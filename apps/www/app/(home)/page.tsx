import type { Metadata } from "next";
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

export const metadata: Metadata = {
  description:
    "Manage files across cloud and local storage providers from one dashboard. Drivebase unifies uploads, sync, and automation for modern teams.",
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return (
    <main className="flex flex-col flex-1">
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
