import { NextResponse } from "next/server";
import http from "http";

export const runtime = "nodejs";

const CADDY_CONTAINER_NAME = process.env.CADDY_CONTAINER_NAME || "caddy";
const DOCKER_SOCKET = "/var/run/docker.sock";

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
        // 204 = success, 404 = container not found, others = error
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

export async function POST() {
  console.log("[caddyberry] restart: probing Docker socket...");

  // Verify socket is reachable before promising a restart
  const socketReachable = await new Promise<boolean>((resolve) => {
    const probe = http.request(
      {
        socketPath: DOCKER_SOCKET,
        path: "/v1.41/ping",
        method: "GET",
        timeout: 2000,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      },
    );
    probe.on("error", (err) => {
      console.warn(`[caddyberry] restart: Docker socket unavailable — ${err.message}`);
      resolve(false);
    });
    probe.end();
  });

  if (!socketReachable) {
    console.error("[caddyberry] restart: Docker socket not available, cannot restart container");
    return NextResponse.json(
      { error: "Docker socket not available" },
      { status: 503 },
    );
  }

  console.log(`[caddyberry] restart: scheduling restart of container "${CADDY_CONTAINER_NAME}" in 1500ms`);

  // Respond immediately so the response travels back through Caddy before it restarts
  const response = NextResponse.json({ ok: true });

  // Schedule the actual restart after a short delay
  setTimeout(() => {
    console.log(`[caddyberry] restart: issuing restart for container "${CADDY_CONTAINER_NAME}"...`);
    restartContainer(CADDY_CONTAINER_NAME).catch((err) => {
      console.error(`[caddyberry] restart: failed to restart container "${CADDY_CONTAINER_NAME}" — ${err.message}`);
    });
  }, 1500);

  return response;
}
