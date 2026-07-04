# ADR-001: Caddy reload and conditional restart strategy

## Status

Implemented in v0.4.0

## Context

CaddyBerry applies a new Caddyfile by calling Caddy's admin API `POST /load` (hot reload). For most configs this works fine. However, certain configurations — specifically those using wildcard ACME TLS certificates — corrupt Caddy's in-memory TLS cache after a hot reload. When this happens, all HTTPS reverse proxy routes stop working until the Caddy container is fully restarted.

### History of attempts

**v0.3.2** — Added a TLS health check after reload (`/api/caddy/tls-check`). If TLS was broken, triggered a container restart via Docker socket. The restart was triggered by a separate browser request (`POST /api/caddy/restart`) which travelled through Caddy's reverse proxy.

**v0.3.4** — Simplified: removed the TLS check entirely and always restarted after every reload. Rationale: TLS corruption was happening often enough that the conditional check felt redundant.

**Problem with v0.3.4**: Always restarting is wrong — it causes a ~10 second container restart outage on every single config apply, even when the hot reload worked perfectly. Additionally, the restart was still triggered by a separate browser call through Caddy's proxy. When Caddy's TLS was corrupted, the browser couldn't reach `POST /api/caddy/restart` through the broken proxy, so `.catch(() => null)` silently swallowed the failure and no restart happened. The worst outcome: Caddy is broken AND no restart fires.

## Decision

Consolidate the reload, TLS check, and conditional restart into a single server-side operation inside `POST /api/caddy/reload`:

1. Call `POST /load` on Caddy's admin API.
2. If `/load` fails, return the error immediately — no restart needed.
3. If `/load` succeeds, probe Caddy's TLS health **server-side** (CaddyBerry → `caddy:443` direct HTTPS connection, `rejectUnauthorized: false`). This never goes through Caddy's reverse proxy so TLS corruption doesn't affect the check itself.
4. If TLS is healthy → return `{ ok: true, restarting: false }`. Done.
5. If TLS is unhealthy → ping the Docker socket, fire a container restart in the background (fire-and-forget via Unix socket, never through Caddy), return `{ ok: true, restarting: true }`.

The response travels back to the browser before the container restart fires. The browser then polls `GET /api/caddy/file` every second for up to 30 seconds until CaddyBerry is reachable again.

The TLS check requires `CADDY_TLS_CHECK_HOST` to be set. If it is not set, the check is skipped and the route always returns `restarting: false`. This makes the behaviour safe for HTTP-only Caddyfiles that don't need TLS.

## Consequences

- No unnecessary restarts for configs that hot-reload cleanly.
- Restart fires reliably when TLS is actually broken, because the trigger is server-side via Docker Unix socket — completely independent of Caddy's TLS state.
- Single round-trip from the browser (one `POST /reload` call) instead of a reload + separate restart call.
- `restart/route.ts` and `tls-check/route.ts` are now unused by the apply flow. They remain in place but are dead code.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `CADDY_TLS_CHECK_IP` | `caddy` | IP or hostname to probe for TLS health |
| `CADDY_TLS_CHECK_HOST` | *(unset)* | `Host` header for the TLS probe. If unset, TLS check is skipped entirely |
| `CADDY_CONTAINER_NAME` | `caddy` | Docker container name to restart |
| `CADDY_ADMIN_URL` | `http://caddy:2019` | Caddy admin API base URL |
