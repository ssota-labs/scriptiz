# @scriptiz/mcp

NPM launcher that runs the Scriptiz **all-in-one** Docker image: MCP server + extraction worker + `yt-dlp` + `ffmpeg`.

Long-form documentation (install, env vars, architecture) lives in the monorepo under **`apps/docs`** (Mintlify). From the repo root: `pnpm dev:docs`.

## Usage

Requires [Docker](https://docs.docker.com/get-docker/) (e.g. Docker Desktop).

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

Optional STT (caption fallback):

```json
{
  "env": {
    "DEFAULT_TRANSCRIPT_LANGUAGE": "ko",
    "STT_PROVIDER": "openai",
    "OPENAI_API_KEY": "sk-..."
  }
}
```

## Environment

Forwarded into the container: `DEFAULT_TRANSCRIPT_LANGUAGE`, `DEFAULT_LANGUAGE`, `STT_PROVIDER`, `OPENAI_API_KEY`, `XAI_API_KEY`, `WORKER_*`, `YTDLP_TIMEOUT_MS`, `YTDLP_PROXY` (HTTP/HTTPS proxy URL for all `yt-dlp` requests; e.g. residential proxy), `STT_TIMEOUT_MS`, `STT_MAX_AUDIO_BYTES`.

Launcher-only (not forwarded):

| Variable | Default | Meaning |
| --- | --- | --- |
| `SCRIPTIZ_DOCKER_IMAGE` | `ghcr.io/scriptiz/scriptiz-mcp:latest` | Image to run |
| `SCRIPTIZ_DOCKER_VOLUME` | `scriptiz-data` | Named Docker volume for `/app/data` |
| `SCRIPTIZ_DATA_DIR` | (unset) | Host path bind-mounted to `/app/data` instead of named volume |
| `SCRIPTIZ_DOCKER_PULL` | `missing` | `always` / `missing` / `never` → Docker `--pull` |

See the main repository README for full documentation.
