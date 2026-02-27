import { type NextRequest, NextResponse } from "next/server";

type EventProperties = Record<string, string | number | boolean>;

function normalizeProperties(input: unknown): EventProperties {
  if (!input || typeof input !== "object") {
    return {};
  }

  const normalized: EventProperties = {};

  for (const [key, value] of Object.entries(input)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      normalized[key] = value;
    }
  }

  return normalized;
}

export async function POST(req: NextRequest) {
  try {
    const measurementId =
      process.env.GA4_MEASUREMENT_ID ??
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const apiSecret = process.env.GA4_API_SECRET;

    if (!measurementId || !apiSecret) {
      return NextResponse.json(
        {
          error:
            "Missing GA4 configuration. Set GA4_MEASUREMENT_ID and GA4_API_SECRET.",
        },
        { status: 500 },
      );
    }

    const body = await req.json();
    const { event, distinctId, properties } = body as {
      event?: unknown;
      distinctId?: unknown;
      properties?: unknown;
    };

    if (!event || typeof event !== "string") {
      return NextResponse.json(
        { error: "Missing event name" },
        { status: 400 },
      );
    }

    const id =
      typeof distinctId === "string" && distinctId.length > 0
        ? distinctId
        : `${crypto.randomUUID()}.${Date.now()}`;

    const eventProperties = normalizeProperties(properties);

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: id,
          user_id:
            typeof distinctId === "string" && distinctId.length > 0
              ? distinctId
              : undefined,
          events: [
            {
              name: event,
              params: {
                ...eventProperties,
                page_location: req.headers.get("referer") ?? req.url,
              },
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to send event to Google Analytics" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tracking error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
