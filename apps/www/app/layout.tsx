import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";

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
    default: "Drivebase | Open Source Self-Hosted Cloud File Manager",
  },
  description:
    "Drivebase is an open source, self-hosted cloud file manager for teams using multiple storage providers. Manage files across S3, Google Drive, local storage, WebDAV, and more from one interface.",
  keywords: [
    "drivebase",
    "open source file manager",
    "self-hosted file manager",
    "cloud file manager",
    "multi cloud file manager",
    "webdav server",
    "s3 file manager",
    "google drive manager",
    "document management",
    "file browser",
    "s3",
    "google drive",
    "local storage",
    "self-hosted storage",
  ],
  metadataBase: new URL("https://drivebase.io"),
  alternates: {
    canonical: "/",
  },
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Drivebase | Open Source Self-Hosted Cloud File Manager",
    description:
      "Manage files across S3, Google Drive, local storage, WebDAV, and more from one modern self-hosted interface.",
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
    title: "Drivebase | Open Source Self-Hosted Cloud File Manager",
    description:
      "Open source multi-cloud file management with Vault, WebDAV, search, transfers, and smart uploads.",
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
        <RootProvider>{children}</RootProvider>
      </body>
      {process.env.NODE_ENV === "production" && (
        <Script
          defer
          src="https://analytics.monawwar.io/script.js"
          data-website-id="432ec307-33fd-4912-85aa-53d28440e058"
        />
      )}
    </html>
  );
}
