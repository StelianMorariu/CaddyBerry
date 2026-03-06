import { NextResponse } from "next/server";
import https from "https";

export const runtime = "nodejs";

const CADDY_TLS_CHECK_IP = process.env.CADDY_TLS_CHECK_IP || "caddy";
const CADDY_TLS_CHECK_HOST = process.env.CADDY_TLS_CHECK_HOST;

export async function GET() {
  if (!CADDY_TLS_CHECK_HOST) {
    console.log("[caddyberry] tls-check: CADDY_TLS_CHECK_HOST not set, skipping");
    return NextResponse.json({ skipped: true });
  }

  console.log(`[caddyberry] tls-check: probing ${CADDY_TLS_CHECK_IP}:443 (Host: ${CADDY_TLS_CHECK_HOST})`);

  return new Promise<NextResponse>((resolve) => {
    const req = https.request(
      {
        hostname: CADDY_TLS_CHECK_IP,
        port: 443,
        path: "/",
        method: "GET",
        rejectUnauthorized: false,
        headers: { Host: CADDY_TLS_CHECK_HOST },
        timeout: 5000,
      },
      (res) => {
        // TLS handshake succeeded — any HTTP response means TLS is healthy
        res.resume();
        console.log(`[caddyberry] tls-check: healthy (HTTP ${res.statusCode})`);
        resolve(NextResponse.json({ healthy: true }));
      },
    );

    req.on("timeout", () => {
      req.destroy();
      console.warn("[caddyberry] tls-check: connection timed out");
      resolve(
        NextResponse.json(
          { healthy: false, error: "Connection timed out" },
          { status: 200 },
        ),
      );
    });

    req.on("error", (err) => {
      console.warn(`[caddyberry] tls-check: TLS handshake failed — ${err.message}`);
      resolve(
        NextResponse.json(
          { healthy: false, error: err.message },
          { status: 200 },
        ),
      );
    });

    req.end();
  });
}
