import { createReadStream } from "fs";
import { google, youtube_v3 } from "googleapis";
import type { GaxiosResponse } from "googleapis-common";
import { logger } from "./logger";
import {
  PipelineConfig,
  TopicRecommendation,
  UploadResult
} from "./types";

const apiKey = process.env.YOUTUBE_API_KEY;

const youtubeReadonlyClient = google.youtube({
  version: "v3",
  auth: apiKey
});

const requiredUploadEnv = [
  "YOUTUBE_CLIENT_ID",
  "YOUTUBE_CLIENT_SECRET",
  "YOUTUBE_REFRESH_TOKEN"
] as const;

function ensureUploadEnv() {
  const missing = requiredUploadEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing YouTube upload credentials: ${missing.join(", ")}`
    );
  }
}

export async function fetchTrendingTopics(params: {
  niche: string;
  maxResults?: number;
}): Promise<TopicRecommendation[]> {
  if (!apiKey) {
    throw new Error("Missing YOUTUBE_API_KEY environment variable");
  }

  const { niche, maxResults = 5 } = params;
  const searchResponse = await youtubeReadonlyClient.search.list({
    part: ["snippet"],
    q: niche,
    order: "viewCount",
    maxResults
  });

  const items = searchResponse.data.items ?? [];

  if (!items.length) {
    return [];
  }

  const videoIds = items
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));

  if (!videoIds.length) {
    return [];
  }

  const videosResponse = await youtubeReadonlyClient.videos.list({
    part: ["statistics", "snippet", "topicDetails"],
    id: videoIds
  });

  const recommendations: TopicRecommendation[] =
    videosResponse.data.items?.map((video) => ({
      id: video.id ?? "",
      title: video.snippet?.title ?? "Untitled",
      description: video.snippet?.description ?? "",
      channelTitle: video.snippet?.channelTitle ?? "",
      viewCount: Number(video.statistics?.viewCount ?? 0),
      publishedAt: video.snippet?.publishedAt ?? "",
      keywords: (video.snippet?.tags ?? []).slice(0, 10)
    })) ?? [];

  return recommendations;
}

function createOAuthClient() {
  ensureUploadEnv();
  const oauth2Client = new google.auth.OAuth2({
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET
  });

  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
  });

  return oauth2Client;
}

export async function uploadVideoToYouTube(params: {
  videoPath: string;
  thumbnailPath?: string;
  config: PipelineConfig;
  scriptTitle: string;
  scriptDescription: string;
  tags: string[];
}): Promise<UploadResult> {
  const oauthClient = createOAuthClient();
  const youtube = google.youtube({
    version: "v3",
    auth: oauthClient
  });

  const requestBody: youtube_v3.Schema$Video = {
    snippet: {
      title: params.scriptTitle,
      description: params.scriptDescription,
      tags: params.tags,
      categoryId: "24"
    },
    status: {
      privacyStatus: "private"
    }
  };

  const media = {
    body: createReadStream(params.videoPath)
  };

  let insertResponse: GaxiosResponse<youtube_v3.Schema$Video> | undefined;
  try {
    insertResponse = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody,
      media
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to upload video to YouTube");
    throw error;
  }

  const videoId = insertResponse.data.id;
  if (!videoId) {
    throw new Error("YouTube API did not return a video ID");
  }

  if (params.thumbnailPath) {
    try {
      await youtube.thumbnails.set({
        videoId,
        media: {
          body: createReadStream(params.thumbnailPath)
        }
      });
    } catch (error) {
      logger.warn({ err: error, videoId }, "Failed to upload thumbnail");
    }
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return {
    youtubeUrl,
    videoId
  };
}
