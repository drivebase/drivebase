import { PostHog } from "posthog-node";

const POSTHOG_API_KEY = process.env.POSTHOG_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

let posthogClient: PostHog | null = null;

export function getPostHogClient() {
  if (!POSTHOG_API_KEY) {
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    });
  }
  return posthogClient;
}
