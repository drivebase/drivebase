import { CTA } from '@/components/landing/cta';
import { BentoGrid } from '@/components/landing/bento-grid';
import { Hero } from '@/components/landing/hero';

export default function HomePage() {
  return (
    <main className="flex flex-col flex-1 selection:bg-indigo-500/30">
      <Hero />
      <BentoGrid />
      <CTA />
    </main>
  );
}
