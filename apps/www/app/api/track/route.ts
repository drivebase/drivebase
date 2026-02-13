import { type NextRequest, NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, distinctId, properties } = body;

    if (!event) {
      return NextResponse.json(
        { error: "Missing event name" },
        { status: 400 },
      );
    }

    const client = getPostHogClient();

    if (!client) {
      return NextResponse.json(
        { error: "PostHog client not found" },
        { status: 500 },
      );
    }

    // Generate a distinct ID if none provided (though one should be)
    const id = distinctId || crypto.randomUUID();

    client.capture({
      distinctId: id,
      event,
      properties: {
        ...properties,
        $current_url: req.url,
        $ip: req.headers.get("x-forwarded-for") || req.nextUrl.hostname,
      },
    });

    // Ensure events are flushed before responding in serverless environments
    await client._shutdown();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tracking error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
