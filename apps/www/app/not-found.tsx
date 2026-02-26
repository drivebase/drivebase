import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background">
      <div className="relative z-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 -top-px h-px w-[200vw] -translate-x-1/2 bg-border/70" />
          <div className="absolute left-1/2 -bottom-px h-px w-[200vw] -translate-x-1/2 bg-border/70" />
          <div className="absolute -left-px top-1/2 w-px h-[200vh] -translate-y-1/2 bg-border/70" />
          <div className="absolute -right-px top-1/2 w-px h-[200vh] -translate-y-1/2 bg-border/70" />
        </div>

        <div className="relative max-w-md w-md border bg-card p-6 text-center space-y-4 shadow-sm">
          <Image
            src="/drivebase-light.svg"
            alt="Drivebase"
            className="h-12 w-12 mx-auto"
            width={48}
            height={48}
          />

          <div className="space-y-2">
            <h1 className="text-xl font-semibold">404</h1>
            <p className="text-sm text-muted-foreground">
              The page you are looking for does not exist.
            </p>

            <Link
              href="/"
              className="inline-flex mt-6 px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground border border-transparent"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
