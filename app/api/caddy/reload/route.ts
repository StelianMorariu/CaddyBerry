import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CADDY_ADMIN_URL =
  process.env.CADDY_ADMIN_URL || "http://caddy:2019";

function parseWarnings(
  json: Record<string, unknown>
): string[] {
  if (!Array.isArray(json.warnings)) return [];
  return json.warnings.map(
    (w: { message?: string; directive?: string; line?: number }) => {
      const parts: string[] = [];
      if (w.directive) parts.push(`directive: ${w.directive}`);
      if (w.line) parts.push(`line ${w.line}`);
      if (w.message) parts.push(w.message);
      return parts.join(" - ") || JSON.stringify(w);
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.text();

    // Load the Caddyfile directly — Caddy's /load accepts text/caddyfile
    const loadRes = await fetch(`${CADDY_ADMIN_URL}/load`, {
      method: "POST",
      headers: {
        "Content-Type": "text/caddyfile",
      },
      body,
    });

    const responseText = await loadRes.text();
    let error: string | null = null;
    let warnings: string[] = [];

    if (responseText.trim()) {
      try {
        const json = JSON.parse(responseText);
        if (json.error) error = json.error;
        warnings = parseWarnings(json);
      } catch {
        if (!loadRes.ok) {
          error = responseText.trim();
        }
      }
    }

    if (!loadRes.ok) {
      return NextResponse.json(
        {
          error: error || "Failed to reload Caddy",
          warnings,
        },
        { status: loadRes.status }
      );
    }

    return NextResponse.json({ ok: true, warnings });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to reach Caddy admin API (${CADDY_ADMIN_URL}): ${(err as Error).message}`,
        warnings: [],
      },
      { status: 502 }
    );
  }
}
