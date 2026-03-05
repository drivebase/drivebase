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
