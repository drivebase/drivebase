import { Github } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-black/60 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <img
                className="h-8 w-auto"
                src="https://raw.githubusercontent.com/drivebase/drivebase/main/drivebase.svg"
                alt="Drivebase"
              />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/docs"
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Documentation
              </Link>
              <Link
                href="/docs/api-reference"
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                API Reference
              </Link>
              <Link
                href="/docs/storage-providers"
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Providers
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/monawwar/drivebase"
              target="_blank"
              className="text-gray-400 hover:text-white transition-colors"
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
