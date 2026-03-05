import fs from "node:fs/promises";
import path from "node:path";
import { InlineTOC } from "fumadocs-ui/components/inline-toc";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blog } from "@/lib/source";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const page = blog.getPage([params.slug]);

  if (!page) notFound();

  // Try to extract the first image from the MDX file if bannerImage is not provided
  let firstImage: string | undefined = page.data.bannerImage;

  if (!firstImage) {
    try {
      const filePath = path.join(
        process.cwd(),
        "content",
        "blogs",
        `${params.slug}.mdx`,
      );
      const content = await fs.readFile(filePath, "utf-8");
      const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
      if (imageMatch) {
        firstImage = imageMatch[1];
      }
    } catch (e) {
      console.error("Error reading blog post for metadata:", e);
    }
  }

  const images = firstImage ? [{ url: firstImage }] : undefined;

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      type: "article",
      publishedTime: new Date(page.data.date).toISOString(),
      authors: [page.data.author],
      url: `/blogs/${page.slugs[0]}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description: page.data.description,
      images: firstImage ? [firstImage] : undefined,
    },
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
    <main className="flex-1 w-full mx-auto bg-background">
      {/* Hero Section */}
      <div className="border-b border-border bg-background z-10 relative">
        <div className="max-w-7xl mx-auto pt-16 pb-24 md:pt-24 md:pb-32 px-6 lg:px-8 border-x border-border">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to Blog
            </Link>

            <div className="flex items-center space-x-2 text-primary mb-6">
              <span className="w-2 h-2 bg-primary" />
              <span className="text-sm font-medium">Update</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl mb-6">
              {page.data.title}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {page.data.description}
            </p>

            {page.data.bannerImage && (
              <div className="mt-8 mb-4 border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <Image
                  src={page.data.bannerImage}
                  alt={page.data.title}
                  className="w-full h-auto object-cover"
                  width={1920}
                  height={1080}
                />
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-8 border-t border-border mt-8">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {page.data.author}
                </span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-border" />
              <time dateTime={new Date(page.data.date).toISOString()}>
                {new Date(page.data.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-background relative z-10 border-b border-border">
        <div className="max-w-7xl mx-auto border-x border-border py-16 px-6 lg:px-8">
          <article className="prose prose-neutral dark:prose-invert max-w-4xl mx-auto prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-img:rounded-none prose-img:border prose-img:border-border prose-headings:font-bold prose-hr:border-border">
            <InlineTOC items={page.data.toc} />
            <Mdx components={defaultMdxComponents} />
          </article>
        </div>
      </div>
    </main>
  );
}

export function generateStaticParams(): { slug: string }[] {
  return blog.getPages().map((page) => ({
    slug: page.slugs[0],
  }));
}
