# yt-view

`yt-view` turns a YouTube URL into a VLM-friendly context pack:

- downloads the video
- extracts compressed audio
- transcribes with timestamps
- samples candidate frames
- describes and scores frames with OpenAI vision + embeddings
- selects either top-k salient frames or salience-density samples
- writes copy-pasteable Markdown, JSON metadata, selected frame JPGs, and a ZIP

It ships as a CLI, MCP stdio server, and Next.js website.

## Requirements

- Node.js 20+
- `OPENAI_API_KEY`
- Network access to YouTube and OpenAI

The project uses bundled `ffmpeg` and `ffprobe` binaries. You do not need a system install.

## Setup

```bash
npm install
cp .env.example .env
# add OPENAI_API_KEY to .env
```

## CLI

```bash
npm run cli -- "https://www.youtube.com/watch?v=VIDEO_ID" -k 8 --mode density
```

Useful options:

```bash
npm run cli -- "<url>" \
  --output .yt-view \
  --top-k 10 \
  --mode top-k \
  --candidate-interval 6 \
  --max-candidates 48 \
  --frame-width 768
```

The CLI prints the Markdown context and writes artifacts under `.yt-view/<job-id>/`:

- `watch.md`
- `metadata.json`
- `yt-view-artifacts.zip`
- `frames/*.jpg`

## MCP

Build the stdio server:

```bash
npm run build:bin
```

Add this command to an MCP client:

```bash
node /absolute/path/to/yt-view/dist/mcp.js
```

The server exposes one tool:

```text
watch_youtube
```

Arguments:

- `url` required
- `topK` default `8`
- `mode` `density` or `top-k`
- `candidateIntervalSeconds` default `8`
- `maxCandidateFrames` default `36`
- `frameWidth` default `768`
- `outputDir` optional

The tool returns Markdown plus selected frames as MCP image content and also writes local artifacts.

## Website

```bash
npm run dev
```

Open `http://localhost:3000`, paste a YouTube URL, choose frame selection options, and run analysis. The result page includes:

- copy button for the Markdown
- frame previews
- per-frame downloads
- ZIP download

## Vercel

This repo is intended to deploy through the linked GitHub repository. Push to the configured production branch and let Vercel build automatically.

Set `OPENAI_API_KEY` in the Vercel project settings before relying on automatic deployments:

```bash
OPENAI_API_KEY=...
```

This app is configured for Node.js runtime and a 300 second function duration. Vercel serverless limits still apply; long videos are better processed through the CLI or MCP server. Short videos and clips fit the hosted web path.

## Frame Selection

`top-k` sorts candidate frames by score and returns the highest scoring frames.

`density` treats salience scores as a timeline density and samples across weighted buckets. This usually gives a more representative sequence across the whole video while still preferring information-rich moments.

The score combines:

- OpenAI vision salience
- semantic novelty from frame descriptions
- visual scene-change novelty
- nearby transcript density
- colorfulness

## OpenAI Models

Defaults are set in `.env.example`:

```bash
OPENAI_TRANSCRIBE_MODEL=whisper-1
OPENAI_VISION_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

`whisper-1` is used by default because it supports verbose JSON with segment timestamps.

## Notes

Only process videos you have the right to download and analyze. YouTube availability and extractor behavior can change; `youtube-dl-exec` bundles `yt-dlp`, which is more robust than browser-only download libraries.
