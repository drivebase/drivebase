import { NextResponse } from "next/server";
import { blog } from "@/lib/source";

export const revalidate = 3600; // revalidate every hour

export async function GET() {
  const posts = blog.getPages().map((page) => ({
    title: page.data.title,
    description: page.data.description,
    author: page.data.author,
    date: new Date(page.data.date).toISOString(),
    url: `https://drivebase.one${page.url}`,
  }));

  // Sort by date descending (newest first) and return top 5
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(posts.slice(0, 5), {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}
