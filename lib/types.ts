export type TopicRecommendation = {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  viewCount: number;
  publishedAt: string;
  keywords: string[];
};

export type PipelineConfig = {
  niche: string;
  targetAudience: string;
  tone: "informative" | "entertaining" | "inspirational" | "educational";
  durationMinutes: number;
  callToAction: string;
  keywords: string[];
  includeBroll: boolean;
  aspectRatio: "16:9" | "9:16";
};

export type PipelineStage =
  | "topic"
  | "script"
  | "voiceover"
  | "visuals"
  | "video"
  | "upload"
  | "complete"
  | "failed";

export type PipelineProgressUpdate = {
  stage: PipelineStage;
  message: string;
  data?: Record<string, unknown>;
};

export type ScriptSection = {
  heading: string;
  content: string;
  durationSeconds: number;
};

export type ScriptResult = {
  title: string;
  hook: string;
  sections: ScriptSection[];
  outro: string;
  totalDuration: number;
};

export type VisualAsset = {
  prompt: string;
  url: string;
  type: "image" | "broll" | "thumbnail";
};

export type VideoAssemblyResult = {
  videoPath: string;
  thumbnailPath: string;
  durationSeconds: number;
};

export type UploadResult = {
  youtubeUrl: string;
  videoId: string;
};

export type PipelineResult = {
  topic: TopicRecommendation;
  script: ScriptResult;
  visuals: VisualAsset[];
  video: VideoAssemblyResult;
  upload: UploadResult;
  logs: PipelineProgressUpdate[];
};
