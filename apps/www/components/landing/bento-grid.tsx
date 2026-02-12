'use client';

import { motion } from 'motion/react';
import { Cloud, Server, Box, Globe, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';

const features = [
  {
    title: 'S3 Compatible',
    description: 'Use any S3-compatible storage provider like AWS, MinIO, or DigitalOcean Spaces.',
    icon: Cloud,
    className: 'col-span-1 md:col-span-2 lg:col-span-1',
    color: 'bg-orange-500/10 text-orange-500',
  },
  {
    title: 'Google Drive Integration',
    description: 'Connect your Google Drive account and manage files seamlessly alongside other providers.',
    icon: Globe,
    className: 'col-span-1',
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    title: 'Local Storage',
    description: 'Keep your files on your own server. Perfect for sensitive data or low-latency access.',
    icon: Server,
    className: 'col-span-1',
    color: 'bg-green-500/10 text-green-500',
  },
  {
    title: 'End-to-End Encryption',
    description: 'Your files are encrypted at rest using AES-256. Only you have the keys.',
    icon: Shield,
    className: 'col-span-1 md:col-span-2',
    color: 'bg-indigo-500/10 text-indigo-500',
  },
  {
    title: 'High Performance',
    description: 'Built with Bun and optimized for speed. Handle large file uploads with ease.',
    icon: Zap,
    className: 'col-span-1',
    color: 'bg-yellow-500/10 text-yellow-500',
  },
  {
    title: 'Docker Ready',
    description: 'Deploy anywhere with a single Docker command. Kubernetes friendly.',
    icon: Box,
    className: 'col-span-1',
    color: 'bg-purple-500/10 text-purple-500',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function BentoGrid() {
  return (
    <section className="py-24 sm:py-32 bg-black/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center mb-16"
        >
          <h2 className="text-base font-semibold leading-7 text-indigo-400">Features</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to manage your files
          </p>
        </motion.div>
        
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[200px]"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className={cn(
                "group relative overflow-hidden rounded-[2rem] bg-white/[0.03] p-8 transition-all hover:bg-white/[0.05]",
                feature.className
              )}
            >
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex flex-col justify-between h-full">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors", feature.color)}>
                  <feature.icon className="size-6" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}