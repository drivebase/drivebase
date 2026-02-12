import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#050505]">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
