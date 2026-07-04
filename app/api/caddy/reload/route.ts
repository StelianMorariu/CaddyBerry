import { NextResponse } from "next/server";
import http from "http";
import https from "https";

export const runtime = "nodejs";

const CADDY_ADMIN_URL = process.env.CADDY_ADMIN_URL || "http://caddy:2019";
const CADDY_CONTAINER_NAME = process.env.CADDY_CONTAINER_NAME || "caddy";
const CADDY_TLS_CHECK_IP = process.env.CADDY_TLS_CHECK_IP || "caddy";
const CADDY_TLS_CHECK_HOST = process.env.CADDY_TLS_CHECK_HOST;
const DOCKER_SOCKET = "/var/run/docker.sock";

function checkTls(): Promise<boolean> {
  if (!CADDY_TLS_CHECK_HOST) return Promise.resolve(true);

  return new Promise((resolve) => {
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
      (res) => { res.resume(); resolve(true); },
    );
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.on("error", () => resolve(false));
    req.end();
  });
}

function pingDockerSocket(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      { socketPath: DOCKER_SOCKET, path: "/_ping", method: "GET", timeout: 2000 },
      (res) => { res.resume(); resolve(res.statusCode === 200); },
    );
    req.on("error", () => resolve(false));
    req.end();
  });
}

function restartContainer(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: DOCKER_SOCKET,
        path: `/v1.41/containers/${encodeURIComponent(name)}/restart`,
        method: "POST",
        timeout: 30000,
      },
      (res) => {
        res.resume();
        if (res.statusCode === 204) {
          console.log(`[caddyberry] restart: container "${name}" restarted successfully`);
          resolve();
        } else {
          reject(new Error(`Docker API returned ${res.statusCode}`));
        }
      },
    );
    req.on("error", reject);
    req.end();
  });
}

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
      return NextResponse.json({ error, warnings: [] }, { status: res.status });
    }

    console.log("[caddyberry] reload: configuration applied successfully");

    // Check TLS health server-side. If broken, fire a restart via Docker socket
    // directly — never through Caddy's (potentially broken) reverse proxy.
    const tlsHealthy = await checkTls();
    if (tlsHealthy) {
      return NextResponse.json({ ok: true, restarting: false, warnings: [] });
    }

    console.warn("[caddyberry] reload: TLS unhealthy after reload, attempting restart...");

    const dockerAvailable = await pingDockerSocket();
    if (!dockerAvailable) {
      console.error("[caddyberry] restart: Docker socket not available");
      return NextResponse.json({ ok: true, restarting: false, warnings: ["TLS unhealthy but Docker socket unavailable — restart Caddy manually"] });
    }

    console.log(`[caddyberry] restart: issuing restart for container "${CADDY_CONTAINER_NAME}"...`);
    restartContainer(CADDY_CONTAINER_NAME).catch((err) => {
      console.error(`[caddyberry] restart: failed — ${(err as Error).message}`);
    });

    return NextResponse.json({ ok: true, restarting: true, warnings: [] });
  } catch (err) {
    console.error(`[caddyberry] reload: failed to reach Caddy admin API — ${(err as Error).message}`);
    return NextResponse.json(
      { error: `Failed to reach Caddy admin API: ${(err as Error).message}`, warnings: [] },
      { status: 502 },
    );
  }
}
