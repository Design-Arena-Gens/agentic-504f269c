import { getOpenAIClient } from "./openai";
import { ScriptResult, VisualAsset } from "./types";

export async function generateVisualPlan(script: ScriptResult): Promise<
  VisualAsset[]
> {
  const client = getOpenAIClient();
  const prompts = script.sections.map((section, index) => ({
    prompt: `B-roll for section ${index + 1}: ${section.heading}`,
    description: section.content.substring(0, 180)
  }));

  const responses = await Promise.all(
    prompts.map(async ({ prompt, description }) => {
      const result = await client.images.generate({
        model: "gpt-image-1",
        prompt: `${prompt}. ${description}. Cinematic lighting, 4k, realistic.`,
        size: "1792x1024"
      });

      const image = result.data?.[0];

      return {
        prompt,
        url: image?.url ?? "",
        type: "broll" as const
      };
    })
  );

  const thumbnail = await client.images.generate({
    model: "gpt-image-1",
    prompt: `High-impact YouTube thumbnail for video titled "${script.title}". Include dramatic lighting, bold composition, no text, ${script.sections
      .map((section) => section.heading)
      .slice(0, 3)
      .join(", ")}`,
    size: "1024x1024"
  });

  const thumbnailImage = thumbnail.data?.[0];

  return [
    ...responses,
    {
      prompt: `Thumbnail for ${script.title}`,
      url: thumbnailImage?.url ?? "",
      type: "thumbnail"
    }
  ];
}
