import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";

export const runtime = "nodejs";

const CADDYFILE_PATH = process.env.CADDYFILE_PATH || "/caddy/Caddyfile";

export async function GET() {
  try {
    const content = await readFile(CADDYFILE_PATH, "utf-8");
    return NextResponse.json({ content });
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      return NextResponse.json({ content: "" });
    }
    return NextResponse.json(
      { error: `Failed to read Caddyfile: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { content } = await request.json();

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "Request body must include a 'content' string field" },
        { status: 400 }
      );
    }

    await writeFile(CADDYFILE_PATH, content, "utf-8");
    console.log(`[caddyberry] file: Caddyfile written to ${CADDYFILE_PATH}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[caddyberry] file: failed to write Caddyfile — ${(err as Error).message}`);
    return NextResponse.json(
      { error: `Failed to write Caddyfile: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
