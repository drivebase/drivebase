import Link from "next/link";
import { blog } from "@/lib/source";

export default function BlogPage() {
  const posts = [...blog.getPages()].sort(
    (a, b) =>
      new Date(b.data.date ?? 0).getTime() -
      new Date(a.data.date ?? 0).getTime(),
  );

  return (
    <main className="flex-1 w-full mx-auto bg-background">
      {/* Hero Section */}
      <div className="border-b border-border bg-background z-10 relative">
        <div className="max-w-7xl mx-auto py-24 md:py-32 px-6 lg:px-8 border-x border-border">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2 text-primary mb-6">
              <span className="w-2 h-2 bg-primary" />
              <span className="text-sm font-medium">Updates</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-6">
              Latest Updates
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              News, tutorials, and product updates from the Drivebase team.
            </p>
          </div>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="bg-background relative z-10 border-b border-border">
        <div className="max-w-7xl mx-auto border-x border-border">
          <div className="grid md:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.url}
                className="flex flex-col items-start justify-between p-8 hover:bg-secondary/50 transition-colors group border-b border-border last:border-b-0 md:border-b md:[&:not(:nth-child(3n))]:border-r"
              >
                <div className="flex items-center gap-x-4 text-xs mb-4">
                  <time
                    dateTime={new Date(post.data.date).toISOString()}
                    className="text-muted-foreground font-medium"
                  >
                    {new Date(post.data.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>
                <div className="group relative flex-1 w-full">
                  <h3 className="mt-3 text-xl font-bold leading-6 text-foreground group-hover:text-primary transition-colors">
                    <Link href={post.url}>
                      <span className="absolute inset-0" />
                      {post.data.title}
                    </Link>
                  </h3>
                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {post.data.description}
                  </p>
                </div>
                <div className="relative mt-8 flex items-center gap-x-4 pt-8 border-t border-border w-full">
                  <div className="text-sm leading-6">
                    <p className="font-medium text-foreground">
                      <span className="absolute inset-0" />
                      {post.data.author}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
