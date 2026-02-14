import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CADDY_ADMIN_URL =
  process.env.CADDY_ADMIN_URL || "http://caddy:2019";

export async function POST(request: Request) {
  try {
    const body = await request.text();

    const res = await fetch(`${CADDY_ADMIN_URL}/load`, {
      method: "POST",
      headers: {
        "Content-Type": "text/caddyfile",
      },
      body,
    });

    const responseText = await res.text();

    // Try to parse as JSON to extract structured error/warnings
    let error: string | null = null;
    let warnings: string[] = [];

    if (responseText.trim()) {
      try {
        const json = JSON.parse(responseText);
        if (json.error) {
          error = json.error;
        }
        if (Array.isArray(json.warnings)) {
          warnings = json.warnings.map((w: { message?: string; directive?: string; line?: number }) => {
            const parts: string[] = [];
            if (w.directive) parts.push(`directive: ${w.directive}`);
            if (w.line) parts.push(`line ${w.line}`);
            if (w.message) parts.push(w.message);
            return parts.join(" - ") || JSON.stringify(w);
          });
        }
      } catch {
        // Response wasn't JSON — treat as plain-text error
        if (!res.ok) {
          error = responseText.trim();
        }
      }
    }

    if (!res.ok) {
      return NextResponse.json(
        { valid: false, error: error || "Unknown validation error", warnings },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true, warnings });
  } catch (err) {
    return NextResponse.json(
      {
        valid: false,
        error: `Failed to reach Caddy admin API (${CADDY_ADMIN_URL}): ${(err as Error).message}`,
        warnings: [],
      },
      { status: 502 }
    );
  }
}
