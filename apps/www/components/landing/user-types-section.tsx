"use client";

import { Code2, Server, Users } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

export function UserTypesSection() {
  return (
    <div className="border-y border-border bg-background">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 divide-x divide-border border-x border-border">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="p-12 hover:bg-secondary transition-colors"
        >
          <Code2 className="w-10 h-10 text-primary mb-6" />
          <h3 className="text-xl font-bold text-foreground mb-3">Developers</h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Consolidate multiple SDK instances into one simple API. Build
            powerful applications without managing credentials.
          </p>
          <Link
            href="#"
            className="text-sm font-medium text-primary hover:underline"
          >
            View API Docs →
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="p-12 hover:bg-secondary transition-colors"
        >
          <Users className="w-10 h-10 text-primary mb-6" />
          <h3 className="text-xl font-bold text-foreground mb-3">Teams</h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Manage cross-provider assets without credential leakage. Collaborate
            securely with granular permissions.
          </p>
          <Link
            href="#"
            className="text-sm font-medium text-primary hover:underline"
          >
            Team Features →
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="p-12 hover:bg-secondary transition-colors"
        >
          <Server className="w-10 h-10 text-primary mb-6" />
          <h3 className="text-xl font-bold text-foreground mb-3">
            Self-Hosted
          </h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Integrate NAS nodes with cloud mirror protocols. Full control over
            your infrastructure.
          </p>
          <Link
            href="#"
            className="text-sm font-medium text-primary hover:underline"
          >
            Self-Host Options →
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
