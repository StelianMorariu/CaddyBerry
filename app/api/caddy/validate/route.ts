import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CADDY_ADMIN_URL =
  process.env.CADDY_ADMIN_URL || "http://caddy:2019";

export async function POST(request: Request) {
  try {
    const body = await request.text();

    // Use /adapt to validate without loading the config into Caddy.
    const res = await fetch(`${CADDY_ADMIN_URL}/adapt`, {
      method: "POST",
      headers: { "Content-Type": "text/caddyfile", Origin: CADDY_ADMIN_URL },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      let error = "Caddyfile is invalid";
      try {
        const json = JSON.parse(text);
        if (json.error) error = json.error;
      } catch {
        if (text.trim()) error = text.trim();
      }
      return NextResponse.json(
        { valid: false, error, warnings: [] },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true, warnings: [] });
  } catch (err) {
    return NextResponse.json(
      {
        valid: false,
        error: `Failed to reach Caddy admin API: ${(err as Error).message}`,
        warnings: [],
      },
      { status: 502 }
    );
  }
}
