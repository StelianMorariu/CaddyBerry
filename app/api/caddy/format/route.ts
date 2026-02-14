import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CADDY_ADMIN_URL =
  process.env.CADDY_ADMIN_URL || "http://caddy:2019";

export async function POST(request: Request) {
  const body = await request.text();

  try {
    // Use /adapt to parse the Caddyfile without loading it into Caddy.
    // The admin API can't return a re-formatted Caddyfile, so we return
    // the original content when it's valid.
    const res = await fetch(`${CADDY_ADMIN_URL}/adapt`, {
      method: "POST",
      headers: { "Content-Type": "text/caddyfile" },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      let error = "Failed to format Caddyfile";
      try {
        const json = JSON.parse(text);
        if (json.error) error = json.error;
      } catch {
        if (text.trim()) error = text.trim();
      }
      return NextResponse.json({ error, warnings: [] }, { status: 400 });
    }

    return NextResponse.json({ formatted: body, warnings: [] });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to reach Caddy admin API: ${(err as Error).message}`,
        warnings: [],
      },
      { status: 502 }
    );
  }
}
