import { assembleVideo } from "./video";
import { fetchTrendingTopics, uploadVideoToYouTube } from "./youtube";
import { generateScript } from "./script";
import { generateVisualPlan } from "./visuals";
import { synthesizeVoiceover } from "./voiceover";
import {
  PipelineConfig,
  PipelineProgressUpdate,
  PipelineResult,
  PipelineStage
} from "./types";
import { logger } from "./logger";

type ProgressEmitter = (update: PipelineProgressUpdate) => void | Promise<void>;

export async function runPipeline(params: {
  config: PipelineConfig;
  onUpdate?: ProgressEmitter;
}): Promise<PipelineResult> {
  const logs: PipelineProgressUpdate[] = [];
  const emit = async (
    stage: PipelineStage,
    message: string,
    data?: Record<string, unknown>
  ) => {
    const update = { stage, message, data } satisfies PipelineProgressUpdate;
    logs.push(update);
    if (params.onUpdate) {
      await params.onUpdate(update);
    }
  };

  const { config } = params;

  try {
    await emit("topic", "Searching for high-potential topics");
    const topics = await fetchTrendingTopics({
      niche: config.niche,
      maxResults: 5
    });

    if (!topics.length) {
      throw new Error("No trending topics found for the selected niche");
    }

    const selectedTopic = topics[0];
    await emit("topic", `Selected topic: ${selectedTopic.title}`, {
      topicId: selectedTopic.id
    });

    await emit("script", "Generating long-form narrative script");
    const script = await generateScript({
      config,
      topic: selectedTopic
    });

    await emit("voiceover", "Synthesizing voiceover with TTS");
    const voiceoverPath = await synthesizeVoiceover(script);

    await emit("visuals", "Generating b-roll and thumbnail visuals");
    const visuals = await generateVisualPlan(script);

    await emit("video", "Compositing video with FFmpeg");
    const video = await assembleVideo({
      visuals,
      voiceoverPath,
      script
    });

    await emit("upload", "Publishing to YouTube");
    const upload = await uploadVideoToYouTube({
      videoPath: video.videoPath,
      thumbnailPath: video.thumbnailPath,
      config,
      scriptTitle: script.title,
      scriptDescription: [script.hook, ...script.sections.map((s) => s.content)]
        .join("\n\n"),
      tags: config.keywords
    });

    await emit("complete", "Pipeline completed successfully", {
      youtubeUrl: upload.youtubeUrl
    });

    return {
      topic: selectedTopic,
      script,
      visuals,
      video,
      upload,
      logs
    };
  } catch (error) {
    logger.error({ err: error }, "Pipeline execution failed");
    await emit("failed", (error as Error).message);
    throw error;
  }
}
