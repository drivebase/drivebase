import { InlineTOC } from "fumadocs-ui/components/inline-toc";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blog } from "@/lib/source";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const page = blog.getPage([params.slug]);

  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}

export default async function Page(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const page = blog.getPage([params.slug]);

  if (!page) notFound();
  const Mdx = page.data.body;

  return (
    <main className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="space-y-4 mb-12 max-w-4xl mx-auto">
        <Link
          href="/blogs"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Blog
        </Link>

        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {page.data.title}
        </h1>
        <p className="text-xl text-gray-400">{page.data.description}</p>
        <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-white/10 mt-8">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{page.data.author}</span>
          </div>
          <span>•</span>
          <time dateTime={new Date(page.data.date).toISOString()}>
            {new Date(page.data.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </div>
      </div>

      <article className="prose prose-invert max-w-4xl mx-auto">
        <InlineTOC items={page.data.toc} />
        <Mdx components={defaultMdxComponents} />
      </article>
    </main>
  );
}

export function generateStaticParams(): { slug: string }[] {
  return blog.getPages().map((page) => ({
    slug: page.slugs[0],
  }));
}
