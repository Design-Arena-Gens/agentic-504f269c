import { createWriteStream } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import fetch from "node-fetch";

export async function downloadToTemp(url: string, extension: string) {
  const directory = join(tmpdir(), "agentic-youtube");
  await mkdir(directory, { recursive: true });
  const filepath = join(directory, `${randomUUID()}.${extension}`);

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download asset from ${url}`);
  }

  const body = response.body;
  if (!body) {
    throw new Error(`Downloaded asset has no response body: ${url}`);
  }

  await new Promise<void>((resolve, reject) => {
    const stream = body.pipe(createWriteStream(filepath));
    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });

  return filepath;
}

export async function writeJsonToTemp<T>(
  payload: T,
  filename = `data-${randomUUID()}.json`
) {
  const directory = join(tmpdir(), "agentic-youtube");
  await mkdir(directory, { recursive: true });
  const filepath = join(directory, filename);
  await writeFile(filepath, JSON.stringify(payload, null, 2), "utf-8");
  return filepath;
}
