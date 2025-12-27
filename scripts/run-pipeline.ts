import "dotenv/config";
import { runPipeline } from "../lib/pipeline";
import type { PipelineConfig } from "../lib/types";

const config: PipelineConfig = {
  niche: process.env.PIPELINE_NICHE ?? "AI productivity tools",
  targetAudience:
    process.env.PIPELINE_AUDIENCE ??
    "Ambitious solo creators scaling with automation",
  tone:
    (process.env.PIPELINE_TONE as PipelineConfig["tone"]) ?? "informative",
  durationMinutes: Number(process.env.PIPELINE_DURATION ?? 6),
  callToAction:
    process.env.PIPELINE_CTA ??
    "Subscribe to stay ahead with the latest AI automation playbooks.",
  keywords: (process.env.PIPELINE_KEYWORDS ?? "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 12),
  includeBroll: process.env.PIPELINE_INCLUDE_BROLL !== "false",
  aspectRatio: (process.env.PIPELINE_ASPECT ?? "16:9") as PipelineConfig["aspectRatio"]
};

if (config.keywords.length === 0) {
  config.keywords = ["ai automation", "youtube automation", "content workflow"];
}

async function main() {
  console.log("Bootstrapping autonomous YouTube pipeline...\n");

  const result = await runPipeline({
    config,
    onUpdate: async (update) => {
      console.log(`[${update.stage.toUpperCase()}] ${update.message}`);
    }
  });

  console.log("\nPipeline completed successfully.");
  console.log(`Title: ${result.script.title}`);
  console.log(`YouTube URL: ${result.upload.youtubeUrl}`);
}

main().catch((error) => {
  console.error("Pipeline failed:", error);
  process.exit(1);
});
