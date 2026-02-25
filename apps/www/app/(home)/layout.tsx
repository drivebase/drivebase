import { Footer, Navbar } from "@/components/landing";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing flex flex-col min-h-screen">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
