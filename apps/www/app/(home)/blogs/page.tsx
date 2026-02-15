import Link from "next/link";
import { blog } from "@/lib/source";

export default function BlogPage() {
  const posts = [...blog.getPages()].sort(
    (a, b) =>
      new Date(b.data.date ?? 0).getTime() -
      new Date(a.data.date ?? 0).getTime(),
  );

  return (
    <main className="flex-1 w-full mx-auto">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Latest Updates
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-400">
              News, tutorials, and product updates from the Drivebase team.
            </p>
          </div>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.url}
              className="flex max-w-xl flex-col items-start justify-between p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center gap-x-4 text-xs">
                <time
                  dateTime={new Date(post.data.date).toISOString()}
                  className="text-gray-400"
                >
                  {new Date(post.data.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
              <div className="group relative">
                <h3 className="mt-3 text-lg font-semibold leading-6 text-white group-hover:text-gray-300">
                  <Link href={post.url}>
                    <span className="absolute inset-0" />
                    {post.data.title}
                  </Link>
                </h3>
                <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-400">
                  {post.data.description}
                </p>
              </div>
              <div className="relative mt-8 flex items-center gap-x-4">
                <div className="text-sm leading-6">
                  <p className="font-semibold text-white">
                    <span className="absolute inset-0" />
                    {post.data.author}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
