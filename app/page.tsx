'use client';

import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  PipelineConfig,
  PipelineProgressUpdate,
  PipelineResult,
  TopicRecommendation
} from "@/lib/types";

const defaultConfig: PipelineConfig = {
  niche: "AI productivity tools",
  targetAudience: "Busy content creators looking for automation tips",
  tone: "informative",
  durationMinutes: 6,
  callToAction: "Subscribe for more AI-powered content automation strategies.",
  keywords: ["ai automation", "content creation", "youtube automation"],
  includeBroll: true,
  aspectRatio: "16:9"
};

type PipelineStatus =
  | { state: "idle" }
  | { state: "running"; progress: PipelineProgressUpdate[] }
  | { state: "error"; error: string; progress: PipelineProgressUpdate[] }
  | { state: "complete"; result: PipelineResult; progress: PipelineProgressUpdate[] };

export default function HomePage() {
  const [config, setConfig] = useState<PipelineConfig>(defaultConfig);
  const [topics, setTopics] = useState<TopicRecommendation[]>([]);
  const [status, setStatus] = useState<PipelineStatus>({ state: "idle" });
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  useEffect(() => {
    loadTopics(config.niche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = useMemo(() => {
    if (status.state === "idle") return [];
    return status.progress;
  }, [status]);

  async function loadTopics(niche: string) {
    setIsLoadingTopics(true);
    try {
      const response = await fetch(`/api/topics?niche=${encodeURIComponent(niche)}`);
      const data = await response.json();
      setTopics(data.topics ?? []);
    } catch (error) {
      console.error("Failed to load topics", error);
    } finally {
      setIsLoadingTopics(false);
    }
  }

  async function runPipeline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const updates: PipelineProgressUpdate[] = [];
    setStatus({ state: "running", progress: updates });

    const response = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });

    if (!response.ok || !response.body) {
      setStatus({
        state: "error",
        error: "Failed to start pipeline",
        progress: updates
      });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let pipelineResult: PipelineResult | null = null;
    let pipelineError: string | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");

        if (!chunk.startsWith("event:")) continue;
        const [eventLine, dataLine] = chunk.split("\n").map((line) => line.trim());
        const event = eventLine.replace("event: ", "");
        const data = JSON.parse(dataLine.replace("data: ", ""));

        if (event === "progress") {
          updates.push(data);
          setStatus({ state: "running", progress: [...updates] });
        } else if (event === "result") {
          pipelineResult = data as PipelineResult;
        } else if (event === "error") {
          pipelineError = (data as { message: string }).message;
        }
      }
    }

    if (buffer.trim().length > 0) {
      const events = buffer.split("\n\n");
      for (const chunk of events) {
        if (!chunk) continue;
        const [eventLine, dataLine] = chunk.split("\n").map((line) => line.trim());
        if (!eventLine || !dataLine) continue;
        const event = eventLine.replace("event: ", "");
        const data = JSON.parse(dataLine.replace("data: ", ""));

        if (event === "result") {
          pipelineResult = data as PipelineResult;
        } else if (event === "error") {
          pipelineError = (data as { message: string }).message;
        }
      }
    }

    if (pipelineResult) {
      setStatus({
        state: "complete",
        result: pipelineResult,
        progress: updates
      });
    } else {
      setStatus({
        state: "error",
        error: pipelineError ?? "Pipeline terminated unexpectedly",
        progress: updates
      });
    }
  }

  const selectedTopicTitle =
    status.state === "complete" ? status.result.topic.title : topics[0]?.title;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">
          Autonomous YouTube Automation Agent
        </h1>
        <p className="mt-2 text-slate-300">
          Configure the creative brief, run the AI pipeline, and publish a finished
          video to YouTube without manual intervention.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          onSubmit={runPipeline}
          className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Creative Brief</h2>
            <button
              type="button"
              onClick={() => loadTopics(config.niche)}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-primary hover:text-primary"
            >
              Refresh Topics
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Niche focus</span>
            <input
              value={config.niche}
              onChange={(event) =>
                setConfig((prev) => ({ ...prev, niche: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Target audience</span>
            <input
              value={config.targetAudience}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  targetAudience: event.target.value
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Call to action</span>
            <textarea
              value={config.callToAction}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  callToAction: event.target.value
                }))
              }
              className="mt-1 h-20 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-primary focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">Tone</span>
              <select
                value={config.tone}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    tone: event.target.value as PipelineConfig["tone"]
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-primary focus:outline-none"
              >
                <option value="informative">Informative</option>
                <option value="entertaining">Entertaining</option>
                <option value="inspirational">Inspirational</option>
                <option value="educational">Educational</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Duration (minutes)
              </span>
              <input
                type="number"
                min={1}
                max={45}
                value={config.durationMinutes}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    durationMinutes: Number(event.target.value)
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">
              Primary keywords (comma separated)
            </span>
            <input
              value={config.keywords.join(", ")}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  keywords: event.target.value
                    .split(",")
                    .map((k) => k.trim())
                    .filter(Boolean)
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-primary focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={config.includeBroll}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    includeBroll: event.target.checked
                  }))
                }
                className="h-4 w-4 rounded border border-slate-700 bg-slate-900"
              />
              Include B-roll cues
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <span>Aspect ratio</span>
              <select
                value={config.aspectRatio}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    aspectRatio: event.target.value as PipelineConfig["aspectRatio"]
                  }))
                }
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1 text-slate-100 focus:border-primary focus:outline-none"
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={status.state === "running"}
          >
            {status.state === "running" ? "Running pipeline..." : "Run pipeline"}
          </button>
        </form>

        <aside className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Topic Intelligence</h2>
            {isLoadingTopics && (
              <span className="text-xs text-slate-400">Refreshing...</span>
            )}
          </div>
          <p className="text-sm text-slate-300">
            Real-time intelligence from YouTube to guide autonomous topic selection.
          </p>
          <div className="space-y-3">
            {topics.map((topic) => (
              <article
                key={topic.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <h3 className="text-sm font-semibold text-white">{topic.title}</h3>
                <p className="mt-1 line-clamp-3 text-xs text-slate-400">
                  {topic.description}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    <dt className="uppercase tracking-wide text-slate-500">Channel</dt>
                    <dd>{topic.channelTitle}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-slate-500">Views</dt>
                    <dd>{topic.viewCount.toLocaleString()}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </aside>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Pipeline Timeline</h2>
            <p className="text-sm text-slate-300">
              Live stream of every automation stage, from ideation to publishing.
            </p>
          </div>
          {selectedTopicTitle && (
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm text-slate-300">
              Current focus: <span className="text-white">{selectedTopicTitle}</span>
            </div>
          )}
        </div>

        <ol className="mt-6 space-y-4">
          {progress.length === 0 && (
            <li className="text-sm text-slate-400">
              Pipeline idle. Configure a brief and run the pipeline.
            </li>
          )}
          {progress.map((entry, index) => (
            <li
              key={`${entry.stage}-${index}`}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold capitalize text-white">
                  {entry.stage}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{entry.message}</p>
            </li>
          ))}
        </ol>
      </section>

      {status.state === "complete" && (
        <section className="rounded-3xl border border-emerald-700 bg-emerald-900/20 p-6">
          <h2 className="text-xl font-semibold text-emerald-200">
            Deployment ready. Video published successfully.
          </h2>
          <p className="mt-2 text-sm text-emerald-100">
            Review the generated assets and the published link below.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-800/70 bg-emerald-900/40 p-4">
              <h3 className="text-sm font-semibold text-emerald-100">Title</h3>
              <p className="mt-1 text-emerald-50">{status.result.script.title}</p>
            </div>
            <div className="rounded-2xl border border-emerald-800/70 bg-emerald-900/40 p-4">
              <h3 className="text-sm font-semibold text-emerald-100">YouTube URL</h3>
              <a
                href={status.result.upload.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-emerald-50 underline underline-offset-2"
              >
                {status.result.upload.youtubeUrl}
              </a>
            </div>
          </div>
        </section>
      )}

      {status.state === "error" && (
        <section className="rounded-3xl border border-rose-800 bg-rose-950/50 p-6">
          <h2 className="text-xl font-semibold text-rose-200">
            Pipeline failed during execution
          </h2>
          <p className="mt-1 text-sm text-rose-100">{status.error}</p>
        </section>
      )}
    </main>
  );
}
