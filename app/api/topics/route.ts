import { NextRequest } from "next/server";
import { fetchTrendingTopics } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const niche = searchParams.get("niche") ?? "technology";

  try {
    const topics = await fetchTrendingTopics({ niche, maxResults: 8 });
    return Response.json({ topics });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to load trending topics",
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}
