# Scriptiz

Scriptiz is a local-first MCP server for extracting video metadata and timed transcripts.

The current MVP focuses on YouTube videos, Shorts, playlists, channel uploads, cursor-based transcript reads, local lists, Docker execution, and MCP UI payloads. Scriptiz is not a summarizer. It provides reliable source material to agents; summarization, recommendation, clipping, and research workflows should live in other MCP servers or skills.

## Install (recommended: Docker + `npx`)

You need **Docker Desktop** (or Docker Engine) running and **Node.js 18+** (for `npx`). You do not need to clone this repo or install `yt-dlp` locally.

The `[@scriptiz/mcp](packages/mcp-launcher)` package runs an **all-in-one** image: MCP server + worker + `yt-dlp` + `ffmpeg`, with data in a Docker volume by default.

### Cursor

Add to `.cursor/mcp.json` (or your user MCP settings):

```json
{
  "mcpServers": {
    "scriptiz": {
      "command": "npx",
      "args": ["-y", "@scriptiz/mcp"],
      "env": {
        "DEFAULT_TRANSCRIPT_LANGUAGE": "ko"
      }
    }
  }
}
```

Optional STT fallback when captions are missing:

```json
{
  "mcpServers": {
    "scriptiz": {
      "command": "npx",
      "args": ["-y", "@scriptiz/mcp"],
      "env": {
        "DEFAULT_TRANSCRIPT_LANGUAGE": "ko",
        "STT_PROVIDER": "openai",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

Optional HTTP proxy for all `yt-dlp` traffic (metadata, captions, STT audio download). The `@scriptiz/mcp` launcher forwards `YTDLP_PROXY` into the container:

```json
{
  "mcpServers": {
    "scriptiz": {
      "command": "npx",
      "args": ["-y", "@scriptiz/mcp"],
      "env": {
        "DEFAULT_TRANSCRIPT_LANGUAGE": "ko",
        "YTDLP_PROXY": "http://USER:PASS@superproxy.zenrows.com:1337"
      }
    }
  }
}
```

Use the URL your proxy provider gives you (`yt-dlp --proxy` format). Geo or sticky options can be encoded in the password per your provider.

### Claude Code

```bash
claude mcp add scriptiz -- npx -y @scriptiz/mcp
```

Pass `DEFAULT_TRANSCRIPT_LANGUAGE` / STT keys if your CLI supports `-e` flags, or set them in your shell profile before starting the IDE.

### Data storage

By default, data lives in the Docker named volume `scriptiz-data` (mounted at `/app/data` in the container). To use a folder on your machine instead, set `SCRIPTIZ_DATA_DIR` in the environment where `npx` runs, e.g. `SCRIPTIZ_DATA_DIR=$HOME/.scriptiz`.

### Advanced: local image (development)

Build the all-in-one image and point the launcher at it:

```bash
pnpm docker:build:mcp
SCRIPTIZ_DOCKER_IMAGE=scriptiz-mcp:local SCRIPTIZ_DOCKER_PULL=never npx --yes @scriptiz/mcp
```

See [docs/MCP_RELEASE.md](docs/MCP_RELEASE.md) for publishing the image to GHCR and the package to npm.

## What It Does

- Extracts YouTube metadata and captions with `yt-dlp`.
- Stores resources, transcripts, jobs, and lists on the local filesystem.
- Provides timed transcript segments.
- Lets agents read long transcripts through cursors and time ranges.
- Imports playlist metadata and channel uploads.
- Saves resources into user-defined local lists.
- Returns MCP UI payloads for video transcript, list, and job status views.
- Supports optional STT fallback through OpenAI or xAI when captions are unavailable.

## Current Status

Scriptiz is an early MVP. The repo already includes the TypeScript workspace, MCP server, worker, YouTube extractor, filesystem storage, local queue, MCP tools, STT adapters, Docker setup, and a demo MCP UI renderer.

Verified so far:

- `pnpm -r run build`
- `pnpm lint`
- `pnpm test:unit`
- `pnpm test:docker-smoke` (all-in-one image + MCP stdio + extraction/tool flow against a YouTube URL)
- Optional `pnpm test:docker-compose-smoke` for split-compose `/healthz` only

Known limits:

- MCP transport is stdio. The recommended end-user path is `npx @scriptiz/mcp` (Docker all-in-one). The compose `mcp-server` service is mainly for health checks and dev smoke tests, not a remote HTTP MCP endpoint.
- Local dev data defaults to `~/.scriptiz`; the npx/Docker path uses a named volume or `SCRIPTIZ_DATA_DIR`.
- STT requires `OPENAI_API_KEY` or `XAI_API_KEY` when you enable STT (with optional `STT_PROVIDER=openai|xai`). When captionless fallback runs, failures surface as job `errorCode` values such as `STT_API_KEY_MISSING`, `STT_PROVIDER_INVALID`, `STT_FILE_TOO_LARGE`, `STT_TIMEOUT`, and `STT_HTTP_ERROR` (inspect `get_extraction_status`).
- Hosted cache, auth, billing, teams, cloud sync, and remote MCP are roadmap items.

## Documentation

- **Product docs (Mintlify):** source in `[apps/docs](apps/docs)`. Covers the recommended `**npx -y @scriptiz/mcp`** install, environment variables, architecture, agent flows, and reference pages.
- **Local preview:**

```bash
pnpm dev:docs
```

- **Deploy:** connect the repo to [Mintlify](https://mintlify.com) with monorepo path `apps/docs`. See `[apps/docs/deployment.mdx](apps/docs/deployment.mdx)`.

Release process for the launcher + Docker image: `[docs/MCP_RELEASE.md](docs/MCP_RELEASE.md)`.

## Architecture

```txt
apps/
  mcp-server/      stdio MCP server and tool registration
  worker/          extraction worker that processes queued jobs
  mcp-ui-web/      demo renderer for MCP UI payloads
  docs/            Mintlify site (product docs; not the root docs/ planning notes)

packages/
  core/            IDs, cursors, transcript slicing, list logic, safe path helpers
  schemas/         shared domain schemas
  ports/           storage, queue, extractor, and STT interfaces
  mcp-tools/       MCP tool handlers and input schemas
  mcp-ui/          MCP UI payload builders and schemas
  extractor-ytdlp/ yt-dlp adapter and VTT parsing
  storage-filesystem/
  queue-local/
  stt-openai/
  stt-xai/
  cache-noop/
  mcp-launcher/    @scriptiz/mcp npm launcher (docker run wrapper)

tests/
  integration/
  e2e/

docker/
  Dockerfile.mcp
  Dockerfile.worker
  Dockerfile.mcp-all-in-one   # worker + MCP stdio (for npx / end users)
```

Local storage layout:

```txt
~/.scriptiz/
  resources/
  transcripts/
  lists/
  jobs/
    queued/
    running/
    completed/
    failed/
  tmp/
```

## Requirements

**End users (npx path):** Docker, Node.js 18+ for `npx`.

**Contributors:** Node.js 22+ (see `.nvmrc`), pnpm 10.33.2 (see `package.json` `packageManager`), and (for local extraction without Docker) `yt-dlp` and `ffmpeg`. Optional: `OPENAI_API_KEY` or `XAI_API_KEY` for STT fallback.

## Install from source (contributors)

```bash
git clone <repo-url> scriptiz
cd scriptiz
pnpm install
pnpm build
```

Run checks:

```bash
pnpm lint
pnpm test:unit
pnpm test:integration
```

Run the worker locally (same `DATA_DIR` as the MCP server):

```bash
DATA_DIR="$HOME/.scriptiz" \
DEFAULT_TRANSCRIPT_LANGUAGE=ko \
pnpm --filter @scriptiz/worker start
```

### MCP client: Node + local `DATA_DIR`

Build the repo, then point your MCP client at the built server. Replace `<scriptiz-dir>` with your clone path and `<data-dir>` with your data directory (default `~/.scriptiz`).

```bash
node <scriptiz-dir>/apps/mcp-server/dist/index.js
```

Environment: `DATA_DIR=<data-dir>`, `DEFAULT_TRANSCRIPT_LANGUAGE=ko`, optional `YTDLP_PROXY` (passed to `yt-dlp --proxy`).

**Cursor** example:

```json
{
  "mcpServers": {
    "scriptiz": {
      "command": "node",
      "args": ["<scriptiz-dir>/apps/mcp-server/dist/index.js"],
      "env": {
        "DATA_DIR": "<data-dir>",
        "DEFAULT_TRANSCRIPT_LANGUAGE": "ko"
      }
    }
  }
}
```

**Claude Code:** `claude mcp add scriptiz -- node <scriptiz-dir>/apps/mcp-server/dist/index.js` (plus `DATA_DIR` if supported).

**Codex:** same `node` command and `env` as in the JSON example above.

## MCP Tools

Extraction:

- `extract_content`: queue a YouTube video or Shorts extraction job.
- `get_extraction_status`: read job status.
- `get_content`: read resource metadata and transcript language info.
- `list_available_languages`: inspect caption languages from a resource or URL.

Transcript:

- `get_transcript`: read transcript text, optionally with timestamps.
- `get_timed_transcript`: read timed segments with cursor pagination.
- `get_transcript_chunk`: read a cursor-based chunk.
- `get_transcript_range`: read segments overlapping a time range.

Playlist and channel:

- `extract_playlist`: fetch playlist metadata and video items.
- `extract_channel_latest`: fetch latest channel uploads.

Lists:

- `create_list`
- `list_lists`
- `add_resource_to_list`
- `add_playlist_to_list`
- `get_list_contents`

MCP UI payloads:

- `get_video_transcript_view`
- `get_list_view`
- `get_job_status_view`

Typical flow:

```txt
extract_content({ url, language: "ko" })
  -> get_extraction_status({ jobId })
  -> get_timed_transcript({ resourceId, language: "ko" })
  -> get_transcript_chunk({ resourceId, cursor })
  -> create_list({ name })
  -> add_resource_to_list({ listId, resourceId })
```

## Docker

**All-in-one (end users, same image as `npx @scriptiz/mcp`):**

```bash
pnpm docker:build:mcp
# produces image tag scriptiz-mcp:local
```

**Compose (development / split services):** the root `docker-compose.yml` builds two services:

- `mcp-server`: Node image with `/healthz`; stdio is off in detached mode (`SCRIPTIZ_MCP_START_STDIO=0`).
- `worker`: Node image with `yt-dlp` and `ffmpeg`.

```bash
docker compose up --build
curl http://127.0.0.1:8080/healthz
pnpm test:docker-compose-smoke   # optional: split compose /healthz only
pnpm test:docker-smoke          # all-in-one image + MCP stdio + extraction/tool flow
pnpm test:docker-mcp-smoke      # quick: build image + sanity checks (no full MCP protocol)
```

Container environment (worker and all-in-one) examples:

```txt
DATA_DIR=/app/data
DEFAULT_TRANSCRIPT_LANGUAGE=ko
WORKER_POLL_INTERVAL_MS=2000
WORKER_STALE_JOB_AFTER_MS=1800000
YTDLP_TIMEOUT_MS=600000
YTDLP_PROXY=
STT_TIMEOUT_MS=300000
STT_MAX_AUDIO_BYTES=26214400
STT_PROVIDER=openai|xai
OPENAI_API_KEY=
XAI_API_KEY=
```

For day-to-day development you can still run MCP + worker on the host with a shared `DATA_DIR`, or use the all-in-one image via `pnpm docker:build:mcp` and the launcher.

## Development

Common commands:

```bash
pnpm build
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:docker-smoke
pnpm test:docker-compose-smoke
pnpm test:docker-mcp-smoke
pnpm docker:build:mcp
pnpm dev:ui
pnpm dev:docs
```

Test tiers:

- Unit tests are fast and deterministic. They cover core IDs, cursors, transcript slicing, list logic, URL validation, VTT parsing, schemas, STT segment normalization, and storage safety helpers.
- Integration tests use temporary directories and fixtures to verify local storage and queue behavior without external APIs.
- Adapter/e2e tests may require `yt-dlp`, `ffmpeg`, network access, Docker, and optional STT keys.
- `pnpm test:docker-smoke` builds the all-in-one image (when using `scriptiz-mcp:local`), runs the same path as `npx @scriptiz/mcp` against a **throwaway** Docker volume, and exercises MCP stdio (`initialize`, `tools/list`, `tools/call`) through a real YouTube extraction job, transcript reads, list tools, and MCP UI payload tools. Requires Docker, network access, and `yt-dlp` inside the image.
- `pnpm test:docker-compose-smoke` is optional and only checks split-compose `mcp-server` `/healthz`.

Before opening a PR:

```bash
pnpm build
pnpm lint
pnpm test:unit
pnpm test:integration
```

If your change touches extraction, Docker, or worker behavior:

```bash
DOCKER_SMOKE_YOUTUBE_URL='https://www.youtube.com/watch?v=YOUR_VIDEO_ID' pnpm test:docker-smoke
pnpm test:docker-mcp-smoke
pnpm test:e2e
```

Optional env for the full smoke: `DOCKER_SMOKE_JOB_TIMEOUT_MS` (default 300000), `SCRIPTIZ_DOCKER_IMAGE` (default `scriptiz-mcp:local`), `SCRIPTIZ_DOCKER_VOLUME` (if unset, a per-run `scriptiz-smoke-<pid>` volume is created and removed). If you set `SCRIPTIZ_DOCKER_VOLUME` yourself, the smoke script will **not** delete it. The smoke script defaults `DEFAULT_TRANSCRIPT_LANGUAGE` to `en` for reliable captions on the sample URL; override (e.g. `ko`) when testing other videos.

## Contributing

Good first contribution areas:

- Improve README quickstart reproduction.
- Add fixture-based integration tests.
- Improve MCP tool error messages.
- Add source adapters behind existing ports.
- Improve the MCP UI payload renderer without turning it into a hosted product.

Project rules:

- Keep extraction separate from summarization.
- Keep hosted-only features out of the local OSS runtime.
- Prefer ports/adapters over hard-coding infrastructure into core logic.
- Keep default tests deterministic and free of external network calls.
- Treat YouTube URLs and filesystem IDs as untrusted input.

When adding a feature:

1. Add or update schemas in `packages/schemas` or `packages/mcp-tools/src/schemas.ts`.
2. Put pure domain behavior in `packages/core`.
3. Put I/O behind a port in `packages/ports`.
4. Implement local adapters under `packages/`*.
5. Wire MCP behavior in `packages/mcp-tools`.
6. Register new tools in `apps/mcp-server`.
7. Add unit and integration tests.
8. Document the tool in the Mintlify site under `apps/docs` and, where helpful, in this README.

## Roadmap

Near term:

- Add more fixture-based integration coverage.

Open-source MCP:

- Better MCP UI payloads for video transcript, lists, and job status.
- Better local scripts for running MCP server and worker together.
- More source adapters: Vimeo, Loom, podcasts, and direct audio/video files.

Cloud / hosted:

- Remote MCP endpoint with auth.
- Hosted extraction workers.
- Managed transcript cache.
- Team workspaces and shared lists.
- Billing, quotas, rate limits, and observability.
- Cloud UI for non-technical users.

Other platforms:

- TikTok
- Instagram Reels
- X/Twitter video
- Facebook video
- Twitch clips/VOD
- Podcast RSS
- Public audio/video file URLs

## License

Planned license: source-available / fair-code.

Free use should cover personal use, local self-hosting, learning, contributions, and internal company use. Commercial hosting, resale, or offering Scriptiz as a managed transcript extraction service should require a commercial license.