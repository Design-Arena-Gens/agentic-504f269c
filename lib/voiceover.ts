import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { getOpenAIClient } from "./openai";
import { ScriptResult } from "./types";

export async function synthesizeVoiceover(
  script: ScriptResult
): Promise<string> {
  const client = getOpenAIClient();
  const filepath = join(tmpdir(), `voiceover-${randomUUID()}.mp3`);

  const response = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: [script.hook, ...script.sections.map((s) => s.content), script.outro].join(
      "\n\n"
    )
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(filepath, buffer);
  return filepath;
}
