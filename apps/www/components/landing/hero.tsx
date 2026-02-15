"use client";

import { ArrowRight, Check, Copy } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const installCommand = "curl -fsSL https://drivebase.one/install | bash";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative overflow-hidden pt-14 pb-16 sm:pb-24 lg:pb-32 bg-[#050505]">
      <div className="absolute inset-0 z-0 h-full w-full bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(120,119,198,0.1),transparent)]" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex justify-center"
          >
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-400 transition-all duration-300 backdrop-blur-sm bg-white/5 hover:bg-white/10">
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent font-medium">
                v1.7.0 Released
              </span>
              <span className="mx-2 text-gray-600">|</span>
              <Link
                href="https://github.com/drivebase/drivebase/releases/tag/v1.7.0"
                target="_blank"
                className="font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Read Changelog <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl font-bold tracking-tight text-white sm:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-400 pb-2"
          >
            The Self-Hosted <br />
            Cloud File Manager
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg leading-8 text-gray-400 max-w-2xl mx-auto"
          >
            Unify your file storage across S3, Google Drive, and Local Storage.
            Secure, open-source, and designed for modern applications. Stop
            worrying about vendor lock-in.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex items-center justify-center gap-x-6"
          >
            <Link
              href="/docs/quick-start"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-sm hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors flex items-center gap-2"
            >
              Get Started
            </Link>
            <Link
              href="https://github.com/monawwar/drivebase"
              target="_blank"
              className="text-sm font-semibold leading-6 text-white hover:text-gray-300 flex items-center gap-2 group"
            >
              View on GitHub{" "}
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-10 flex justify-center"
          >
            <a
              href="https://www.producthunt.com/posts/drivebase?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-drivebase"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1078989&theme=dark"
                alt="Drivebase - Unified file manager for all your cloud storage | Product Hunt"
                width={250}
                height={54}
                className="w-[250px] h-[54px]"
                unoptimized
              />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex justify-center"
          >
            <div className="group relative flex items-center gap-3 rounded-xl bg-white/5 px-5 py-3 ring-1 ring-inset ring-white/10 transition-all hover:bg-white/10 hover:ring-white/20">
              <div className="flex select-none items-center gap-1 font-mono text-sm text-gray-500">
                <span className="text-indigo-400">❯</span>
              </div>
              <code className="font-mono text-sm text-gray-300">
                {installCommand}
              </code>
              <button
                onClick={copyToClipboard}
                className="ml-2 p-1 rounded-md hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                title="Copy to clipboard"
                type="button"
              >
                {copied ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="mt-16 flow-root sm:mt-24 relative"
        >
          <div className="relative rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-full"></div>

            <div className="bg-[#0A0A0A] rounded-xl overflow-hidden relative">
              <div className="absolute -top-24 -left-24 size-48 bg-indigo-500/20 blur-[100px]" />
              <div className="absolute -bottom-24 -right-24 size-48 bg-purple-500/20 blur-[100px]" />

              <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.02]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                </div>
              </div>

              <div className="relative aspect-19/10 overflow-hidden">
                <Image
                  src="/app/all-files.png"
                  alt="Drivebase Dashboard"
                  className="w-full h-full object-cover object-top"
                  width={768}
                  height={405}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
