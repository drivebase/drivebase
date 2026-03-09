"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { faqs } from "./faq-data";

export function FAQSection() {
  return (
    <section className="border-y border-border bg-background">
      <div className="mx-auto max-w-7xl border-x border-border px-6 py-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            FAQ
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Drivebase questions, answered
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-0 border border-border">
          {faqs.map((item) => (
            <motion.article
              key={item.question}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35 }}
              className="border-b border-border p-6 last:border-b-0"
            >
              <h3 className="text-lg font-semibold text-foreground">
                {item.question}
              </h3>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
                {item.answer}
              </p>
              {item.href ? (
                <Link
                  href={item.href}
                  className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
                >
                  {item.cta}
                </Link>
              ) : null}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
