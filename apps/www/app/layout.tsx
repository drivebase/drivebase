import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

const inter = Inter({
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#050505",
};

export const metadata: Metadata = {
  applicationName: "Drivebase",
  title: {
    template: "%s | Drivebase",
    default: "Drivebase Docs",
  },
  description: "Documentation for Drivebase.",
  keywords: [
    "file storage",
    "s3",
    "google drive",
    "local storage",
    "open source",
    "self-hosted",
    "file manager",
    "drivebase",
  ],
  metadataBase: new URL("https://drivebase.io"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Drivebase Docs",
    description: "Documentation for Drivebase.",
    url: "https://drivebase.io",
    siteName: "Drivebase",
    images: [
      {
        url: "/drivebase-banner.png",
        width: 1200,
        height: 630,
        alt: "Drivebase banner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Drivebase Docs",
    description: "Documentation for Drivebase.",
    images: ["/drivebase-banner.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/drivebase-light.svg",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
            {children}
          </DocsLayout>
        </RootProvider>
      </body>
      {process.env.NODE_ENV === "production" && (
        <GoogleAnalytics gaId="G-1Y4NXMQPWJ" />
      )}
    </html>
  );
}
