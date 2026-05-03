# CaddyBerry

[![Docker Image](https://img.shields.io/badge/ghcr.io-caddyberry-blue?logo=docker&logoColor=white)](https://github.com/StelianMorariu/CaddyBerry/pkgs/container/caddyberry) [![GitHub tag](https://img.shields.io/github/v/tag/StelianMorariu/CaddyBerry)](https://github.com/StelianMorariu/CaddyBerry/tags)

A web-based editor for [Caddy](https://caddyserver.com) configuration files.

![CaddyBerry screenshot](docs/screenshot.png)

## What it does

Provides a browser-based Monaco editor (the same editor that powers VS Code) for editing your Caddyfile, with:

- **Syntax highlighting** — directives, matchers, addresses, variables, paths, and more, all colour-coded
- **Validate & apply** — on save, the config is validated against the Caddy admin API before being written to disk and reloaded live, so a bad config can never take your server down
- **Auto-restart** — after every successful reload, CaddyBerry restarts the Caddy container via the Docker socket and waits for it to come back online before showing success
- **Keyboard shortcut** — `Ctrl`/`Cmd` + `S` to apply
- **Mobile friendly** — readable and usable on small screens

> **Security note:** CaddyBerry has no built-in authentication. Anyone who can reach the app can read and modify your Caddyfile. Run it on a private network or behind a reverse proxy with authentication (e.g. Caddy `basicauth`, Authelia, oauth2-proxy).

## Usage

### Docker Compose

```yaml
services:
  caddyberry:
    image: ghcr.io/stelianmorariu/caddyberry:latest
    ports:
      - "3000:3000"
    environment:
      CADDYFILE_PATH: /config/Caddyfile
      CADDY_ADMIN_URL: http://caddy:2019
      # Optional: auto-restart Caddy after every reload
      # CADDY_CONTAINER_NAME: caddy             # Container to restart (default: caddy)
    volumes:
      - ./Caddyfile:/config/Caddyfile
      # Required for auto-restart:
      # - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
```

`caddyberry` needs to share the same Caddyfile that Caddy reads on startup, and network access to the Caddy admin API (port `2019` by default).

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `CADDYFILE_PATH` | `/caddy/Caddyfile` | Path to the Caddyfile on disk |
| `CADDY_ADMIN_URL` | `http://caddy:2019` | Base URL of the Caddy admin API |
| `CADDY_CONTAINER_NAME` | `caddy` | Docker container name to restart after every reload (requires Docker socket) |
| `IS_DEV` | — | Set to `true` to skip all network requests and use built-in sample content instead |

### Auto-restart

After every successful reload, CaddyBerry restarts the Caddy container via the Docker socket and polls until the app is reachable again before showing success. This works around cases where Caddy's hot reload silently leaves it in a broken state.

To enable, mount the Docker socket and optionally set `CADDY_CONTAINER_NAME` (defaults to `caddy`). The Docker socket grants container-level restart privileges — a common trade-off in homelab setups.

## Local development

Create a `.env` file in the project root:

```bash
# Use built-in sample data — no running Caddy instance needed
IS_DEV=true

# Or point at a real Caddy instance
# CADDYFILE_PATH=/path/to/your/Caddyfile
# CADDY_ADMIN_URL=http://localhost:2019
```

Then:

```bash
npm install
npm run dev   # runs on http://localhost:3000
```

With `IS_DEV=true`, the editor loads a built-in sample Caddyfile on startup and mocks the apply pipeline — no running Caddy instance needed. A **DEV** badge appears in the toolbar with a dropdown to simulate success or failure responses.
