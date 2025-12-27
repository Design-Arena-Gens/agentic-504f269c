import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { downloadToTemp } from "./files";
import { ScriptResult, VideoAssemblyResult, VisualAsset } from "./types";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export async function assembleVideo(params: {
  visuals: VisualAsset[];
  voiceoverPath: string;
  script: ScriptResult;
}): Promise<VideoAssemblyResult> {
  const { visuals, voiceoverPath, script } = params;

  const workingDir = join(tmpdir(), "agentic-youtube", randomUUID());
  await mkdir(workingDir, { recursive: true });

  const broll = visuals.filter((asset) => asset.type === "broll");
  if (!broll.length) {
    throw new Error("No visual assets available to assemble video");
  }

  const imagePaths = await Promise.all(
    broll.map(async (asset) => downloadToTemp(asset.url, "png"))
  );

  const frameListPath = join(workingDir, "frames.txt");
  const perSectionDuration = Math.max(
    script.totalDuration / Math.max(imagePaths.length, 1),
    5
  );

  const listContent = imagePaths
    .map(
      (path) =>
        `file '${path.replace(/'/g, "'\\''")}'\nduration ${perSectionDuration.toFixed(
          2
        )}\n`
    )
    .join("") + `file '${imagePaths[imagePaths.length - 1]}'\n`;

  await writeFile(frameListPath, listContent, "utf-8");

  const silentVideoPath = join(workingDir, "visuals.mp4");
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(frameListPath)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions([
        "-vf",
        "scale=1920:1080:force_original_aspect_ratio=cover",
        "-pix_fmt yuv420p",
        "-r 30"
      ])
      .on("end", () => resolve())
      .on("error", (error) => reject(error))
      .save(silentVideoPath);
  });

  const finalVideoPath = join(workingDir, "final.mp4");
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .addInput(silentVideoPath)
      .addInput(voiceoverPath)
      .outputOptions([
        "-c:v libx264",
        "-c:a aac",
        "-shortest",
        "-movflags +faststart"
      ])
      .on("end", () => resolve())
      .on("error", (error) => reject(error))
      .save(finalVideoPath);
  });

  const thumbnailAsset = visuals.find((asset) => asset.type === "thumbnail");
  const thumbnailPath = thumbnailAsset
    ? await downloadToTemp(thumbnailAsset.url, "png")
    : imagePaths[0];

  return {
    videoPath: finalVideoPath,
    thumbnailPath,
    durationSeconds: script.totalDuration
  };
}
