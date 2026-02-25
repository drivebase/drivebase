"use client";

import { Database, Server } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";

const statusItems = [
  { label: "Google Drive", image: "/providers/google_drive.svg" },
  { label: "AWS S3", image: "/providers/s3.svg" },
  { label: "Local Disk", image: "/providers/local.svg" },
  { label: "Dropbox", image: "/providers/dropbox.svg" },
  { label: "FTP", image: "/providers/ftp.svg" },
  { label: "Nextcloud", image: "/providers/nextcloud.svg" },
  { label: "Telegram", image: "/providers/telegram.svg" },
  { label: "WebDAV", icon: Server },
  { label: "DarkiBox", icon: Database },
];

export function StatusBar() {
  return (
    <div className="border-b border-border bg-background z-10 relative">
      <div className="max-w-7xl mx-auto border-x border-border overflow-hidden">
        <motion.div
          animate={{ x: [0, "-32%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 50,
          }}
          className="flex whitespace-nowrap w-max"
        >
          {[...statusItems, ...statusItems].map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              className="p-4 flex items-center space-x-3 group hover:bg-secondary transition-colors cursor-default border-r border-border w-64 shrink-0"
            >
              {item.image ? (
                <div className="w-5 h-5 relative shrink-0">
                  <Image
                    src={item.image}
                    alt={`${item.label} logo`}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                item.icon && (
                  <item.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                )
              )}
              <div className="text-sm text-muted-foreground truncate">
                <span className="text-foreground font-medium mr-2">
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
