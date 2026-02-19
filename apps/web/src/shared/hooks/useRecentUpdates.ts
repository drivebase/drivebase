import { useEffect, useState } from "react";

const WWW_BASE_URL = "https://drivebase.one";
const CACHE_KEY = "drivebase.recent_updates";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export type BlogPost = {
	title: string;
	description: string;
	author: string;
	date: string;
	url: string;
};

type CachedData = {
	posts: BlogPost[];
	fetchedAt: number;
};

export function useRecentUpdates() {
	const [posts, setPosts] = useState<BlogPost[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function fetchPosts() {
			// Check cache first
			try {
				const cached = localStorage.getItem(CACHE_KEY);
				if (cached) {
					const parsed = JSON.parse(cached) as CachedData;
					if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
						if (!cancelled) setPosts(parsed.posts);
						return;
					}
				}
			} catch (_) {
				// ignore cache errors
			}

			setIsLoading(true);
			try {
				const res = await fetch(`${WWW_BASE_URL}/api/blogs`);
				if (!res.ok) return;

				const data = (await res.json()) as BlogPost[];
				if (cancelled) return;

				setPosts(data);
				localStorage.setItem(
					CACHE_KEY,
					JSON.stringify({
						posts: data,
						fetchedAt: Date.now(),
					} satisfies CachedData),
				);
			} catch (_) {
				// silently fail — non-critical feature
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		}

		void fetchPosts();
		return () => {
			cancelled = true;
		};
	}, []);

	return { posts, isLoading };
}
