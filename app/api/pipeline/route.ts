import { NextRequest } from "next/server";
import { z } from "zod";
import { runPipeline } from "@/lib/pipeline";

const configSchema = z.object({
  niche: z.string().min(2),
  targetAudience: z.string().min(2),
  tone: z.enum(["informative", "entertaining", "inspirational", "educational"]),
  durationMinutes: z.number().min(1).max(60),
  callToAction: z.string().min(5),
  keywords: z.array(z.string().min(1)).min(1).max(12),
  includeBroll: z.boolean(),
  aspectRatio: z.enum(["16:9", "9:16"])
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parse = configSchema.safeParse(body);

  if (!parse.success) {
    return Response.json(
      { error: "Invalid pipeline configuration", details: parse.error.flatten() },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
          )
        );
      };

      try {
        const result = await runPipeline({
          config: parse.data,
          onUpdate: async (update) => emit("progress", update)
        });
        emit("result", result);
      } catch (error) {
        emit("error", {
          message: (error as Error).message ?? "Pipeline failed unexpectedly"
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform"
    }
  });
}
