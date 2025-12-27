# Agentic YouTube Automation

Autonomous Next.js platform that ideates trending topics, writes scripts with GPT, generates visuals, composes full videos via FFmpeg, and uploads directly to YouTube.

## Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the orchestration dashboard. The UI streams real-time pipeline progress over Server-Sent Events.

## Environment

Create a `.env.local` for the web app (and `.env` for CLI) with:

```bash
OPENAI_API_KEY=sk-...
YOUTUBE_API_KEY=...
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...
```

Optional CLI overrides:

```bash
PIPELINE_NICHE="AI productivity tools"
PIPELINE_AUDIENCE="Solo creators leveraging automation"
PIPELINE_TONE=informative # informative | entertaining | inspirational | educational
PIPELINE_DURATION=6
PIPELINE_CTA="Subscribe for more AI workflows."
PIPELINE_KEYWORDS="ai automation,youtube automation"
PIPELINE_INCLUDE_BROLL=true
PIPELINE_ASPECT=16:9 # or 9:16
```

## Scripts

- `npm run dev` – Next.js dev server
- `npm run build` – Production build
- `npm start` – Serve production build
- `npm run lint` – ESLint
- `npm run pipeline` – Headless run (`scripts/run-pipeline.ts`)

## Pipeline Stages

1. **Topic intelligence** – YouTube Data API search ranked by views
2. **Script authoring** – GPT-4.1 generates structured JSON script with timestamps
3. **Voiceover synthesis** – `gpt-4o-mini-tts` produces narration track
4. **Visual generation** – `gpt-image-1` outputs B-roll frames + thumbnail
5. **Video compositing** – FFmpeg slideshow with synced voiceover
6. **YouTube upload** – OAuth2 `videos.insert` + `thumbnails.set` in private mode

## Deployment

```bash
npm run build
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-504f269c
```

Verify: `curl https://agentic-504f269c.vercel.app`

## Notes

- Requires FFmpeg-compatible environment (bundled via `ffmpeg-static`)
- Long-running server actions stream progress back to the client
- CLI runner mirrors the UI automation for scheduling or CRON usage
