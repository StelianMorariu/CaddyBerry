import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const CADDY_BIN = process.env.CADDY_BIN || "caddy";

export async function POST(request: Request) {
  const body = await request.text();
  const tmpPath = join(tmpdir(), `caddyberry-fmt-${randomUUID()}`);

  try {
    // Write to temp file so `caddy fmt` can read it
    await writeFile(tmpPath, body, "utf-8");

    const result = await new Promise<{
      formatted: string;
      warnings: string[];
      error: string | null;
    }>((resolve) => {
      execFile(
        CADDY_BIN,
        ["fmt", tmpPath],
        { timeout: 10_000 },
        (err, stdout, stderr) => {
          const warnings: string[] = [];
          let error: string | null = null;

          // Parse stderr for warnings and errors
          if (stderr) {
            for (const line of stderr.split("\n")) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (
                trimmed.toLowerCase().includes("warn") ||
                trimmed.toLowerCase().includes("warning")
              ) {
                warnings.push(trimmed);
              } else {
                // Accumulate non-warning stderr as error
                error = error ? `${error}\n${trimmed}` : trimmed;
              }
            }
          }

          if (err) {
            resolve({
              formatted: "",
              warnings,
              error:
                error ||
                err.message ||
                "caddy fmt failed with unknown error",
            });
          } else {
            resolve({
              formatted: stdout,
              warnings,
              error: null,
            });
          }
        }
      );
    });

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          warnings: result.warnings,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      formatted: result.formatted,
      warnings: result.warnings,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to run caddy fmt: ${(err as Error).message}`,
        warnings: [],
      },
      { status: 500 }
    );
  } finally {
    unlink(tmpPath).catch(() => {});
  }
}
