import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CADDY_ADMIN_URL =
  process.env.CADDY_ADMIN_URL || "http://caddy:2019";

export async function POST(request: Request) {
  try {
    const body = await request.text();

    const res = await fetch(`${CADDY_ADMIN_URL}/load`, {
      method: "POST",
      headers: { "Content-Type": "text/caddyfile", Origin: CADDY_ADMIN_URL },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      let error = "Failed to reload Caddy";
      try {
        const json = JSON.parse(text);
        if (json.error) error = json.error;
      } catch {
        if (text.trim()) error = text.trim();
      }
      console.error(`[caddyberry] reload: Caddy rejected config — ${error}`);
      return NextResponse.json(
        { error, warnings: [] },
        { status: res.status }
      );
    }

    console.log("[caddyberry] reload: configuration applied successfully");
    return NextResponse.json({ ok: true, warnings: [] });
  } catch (err) {
    console.error(`[caddyberry] reload: failed to reach Caddy admin API — ${(err as Error).message}`);
    return NextResponse.json(
      {
        error: `Failed to reach Caddy admin API: ${(err as Error).message}`,
        warnings: [],
      },
      { status: 502 }
    );
  }
}
