import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#050505",
};

export const metadata: Metadata = {
  title: {
    template: "%s | Drivebase",
    default: "Drivebase - Self-Hosted Cloud File Manager",
  },
  description:
    "The unified file storage API for modern applications. Seamlessly integrate secure, scalable file storage with support for S3, Google Drive, and local storage.",
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
  metadataBase: new URL("https://drivebase.app"),
  openGraph: {
    title: "Drivebase - Self-Hosted Cloud File Manager",
    description: "The unified file storage API for modern applications.",
    url: "https://drivebase.app",
    siteName: "Drivebase",
    images: [
      {
        url: "/app/all-files.png",
        width: 1200,
        height: 630,
        alt: "Drivebase Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Drivebase - Self-Hosted Cloud File Manager",
    description: "The unified file storage API for modern applications.",
    images: ["/app/all-files.png"],
    creator: "@drivebase_app", // Assuming handle, or remove if unknown
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo192.png", // Assuming these exist or will exist, but let's stick to what we know
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
      {process.env.NODE_ENV === "production" && (
        <GoogleAnalytics gaId="G-60H49RJF0W" />
      )}
    </html>
  );
}
