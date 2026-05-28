# Discogs Wantlist Shopper

A container-ready Next.js app for connecting to Discogs, loading your wantlist, and narrowing marketplace sellers with stronger filters than the default search.

## What it does

- Connects to Discogs with OAuth 1.0a or a personal access token.
- Loads your wantlist and lets you choose specific releases to search.
- Groups marketplace results by seller so you can compare matches in detail.
- Supports filters like seller rating, condition, shipping origin, and max price.

## Environment

Copy [.env.example](.env.example) to [.env.local](.env.local) and set the values before starting the app:

- `DISCOGS_CONSUMER_KEY`
- `DISCOGS_CONSUMER_SECRET`
- `DISCOGS_USER_AGENT`
- `APP_PUBLIC_URL` (recommended for reverse proxy/tunnel deployments, for example `https://your-domain.example`)
- `DISCOGS_PERSONAL_ACCESS_TOKEN` or an OAuth session created through the app
- `DISCOGS_USERNAME` when using a personal access token

Use OAuth when you want to click "Connect Discogs" in the UI. Use a personal access token if you only want the app to read your account without the browser auth flow.

For Discogs OAuth, register the callback URL below in your Discogs application settings:

- `http://localhost:3000/api/auth/discogs/callback`

If you run in Docker, use the same variables and keep the callback URL pointed at the host-mapped address you browse in the host browser.

## Reverse proxy and Cloudflare Tunnel

This app can run behind a reverse proxy or Cloudflare Tunnel, including the Discogs OAuth flow, as long as your public origin is forwarded correctly.

Requirements:

- Register your public callback URL in Discogs app settings, for example:
	- `https://your-domain.example/api/auth/discogs/callback`
- Ensure your proxy/tunnel forwards the original `Host` header.
- Ensure your proxy/tunnel forwards `X-Forwarded-Proto: https` when TLS is terminated upstream.
- Use the same public origin for the full auth flow. Do not start auth on `localhost` and complete it on a public domain (or vice versa).
- Set `APP_PUBLIC_URL` to your public origin (for example `https://your-domain.example`) to force stable callback and redirect URL generation.

Why this matters:

- The app builds OAuth callback/redirect URLs from the incoming request URL.
- Cookie security is set based on the detected request protocol.

If forwarded headers are missing or incorrect, OAuth callback validation or auth cookies may fail.

If you see a callback URL using a container hostname (for example `https://<container-id>:3000/...`), your app is not seeing the public host correctly. In Cloudflare Tunnel, set the public hostname and configure the origin request host header to your public domain.

## Docker and headless browser

The marketplace search uses a two-stage strategy. Stage 1 queries the Discogs API. Stage 2 falls back to a headless browser page scrape when the API returns no listings for a release.

The Docker image installs Chromium at build time and sets `CHROMIUM_PATH` automatically so stage 2 works in the container. No extra configuration is needed.

On a Windows dev machine, stage 2 falls back to Microsoft Edge instead.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` after the server starts.

## Run in Docker

```bash
docker compose up --build
```

The app listens on port `3000` inside the container and maps it to the host.

## Build and publish to GHCR

This repo includes a GitHub Actions workflow that builds the Docker image and pushes it to GitHub Container Registry as `ghcr.io/<owner>/<repo>`.

Trigger it by either:

- pushing to `main` to publish `latest`
- pushing a version tag like `v1.0.0` to publish semver tags

The workflow uses the repository `GITHUB_TOKEN`, so no extra registry secret is required.

If you want to build locally, you can use:

```bash
docker build -t ghcr.io/<owner>/<repo>:dev .
```

## Project structure

- `app/` contains the UI and API routes.
- `lib/` contains Discogs client and filtering logic.
- `Dockerfile` and `docker-compose.yml` provide container support.

## Notes

The marketplace search endpoint is wrapped behind a single server route so it can be adjusted easily if Discogs changes response fields or pagination behavior.
