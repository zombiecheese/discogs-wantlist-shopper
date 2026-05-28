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
- `DISCOGS_PERSONAL_ACCESS_TOKEN` or an OAuth session created through the app
- `DISCOGS_USERNAME` when using a personal access token

Use OAuth when you want to click "Connect Discogs" in the UI. Use a personal access token if you only want the app to read your account without the browser auth flow.

For Discogs OAuth, register the callback URL below in your Discogs application settings:

- `http://localhost:3000/api/auth/discogs/callback`

If you run in Docker, use the same variables and keep the callback URL pointed at the host-mapped address you browse in the host browser.

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
