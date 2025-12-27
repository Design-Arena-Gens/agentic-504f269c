import { getOpenAIClient } from "./openai";
import { PipelineConfig, ScriptResult, TopicRecommendation } from "./types";

export async function generateScript(params: {
  config: PipelineConfig;
  topic: TopicRecommendation;
}): Promise<ScriptResult> {
  const openai = getOpenAIClient();
  const prompt = buildPrompt(params.config, params.topic);

  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      {
        role: "system",
        content:
          "You are a senior YouTube content strategist and script writer. Produce production-ready scripts with timestamps."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7
  });

  const content = response.output_text;
  return parseScript(content);
}

function buildPrompt(config: PipelineConfig, topic: TopicRecommendation) {
  return `
Target niche: ${config.niche}
Primary topic: ${topic.title}
Target audience: ${config.targetAudience}
Keywords: ${config.keywords.join(", ")}
Tone: ${config.tone}
Desired duration: ${config.durationMinutes} minutes
Call to action: ${config.callToAction}
Include B-roll cues: ${config.includeBroll ? "Yes" : "No"}

Deliver a JSON object with:
- title: engaging YouTube title
- hook: opening hook
- sections: array of sections with heading, content, durationSeconds and optional brollCue field
- outro: closing paragraph
- totalDuration: total runtime in seconds
`;
}

function parseScript(input: string): ScriptResult {
  try {
    const jsonStart = input.indexOf("{");
    const json = input.slice(jsonStart);
    const parsed = JSON.parse(json);
    return parsed as ScriptResult;
  } catch (error) {
    throw new Error(
      `Failed to parse script from model response: ${(error as Error).message}`
    );
  }
}
