import { NextResponse } from "next/server";
import {
  runATSScan,
  runCandidateRank,
  runMatchmaking,
  runOwnerForecast,
  runPricingRecommend,
  runProfileOptimize,
  runResumeArchitect,
  runServiceOptimize,
  runSkillsPredict,
  isAIConfigured,
} from "@/lib/ai/engine";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = await request.json() as { action: string; payload: Record<string, unknown> };

    switch (body.action) {
      case "profile-optimize":
        return json(await runProfileOptimize(body.payload as unknown as Parameters<typeof runProfileOptimize>[0]));
      case "skills-predict":
        return json(await runSkillsPredict((body.payload.locale as "en" | "ar") ?? "en"));
      case "resume-architect":
        return json(
          await runResumeArchitect(
            body.payload.profile as Parameters<typeof runResumeArchitect>[0],
            (body.payload.locale as "en" | "ar") ?? "en"
          )
        );
      case "ats-scan":
        return json(await runATSScan(body.payload as unknown as Parameters<typeof runATSScan>[0]));
      case "candidate-rank":
        return json(await runCandidateRank(body.payload as unknown as Parameters<typeof runCandidateRank>[0]));
      case "service-optimize":
        return json(await runServiceOptimize(body.payload as unknown as Parameters<typeof runServiceOptimize>[0]));
      case "pricing-recommend":
        return json(await runPricingRecommend(body.payload as unknown as Parameters<typeof runPricingRecommend>[0]));
      case "owner-forecast":
        return json(await runOwnerForecast());
      case "matchmaking":
        return json(await runMatchmaking(body.payload as unknown as Parameters<typeof runMatchmaking>[0]));
      default:
        return NextResponse.json({ error: "Unknown AI action" }, { status: 400 });
    }
  } catch (error) {
    console.error("AI error:", error);
    return NextResponse.json({ error: "AI processing failed" }, { status: 500 });
  }
}

function json(data: unknown) {
  return NextResponse.json({
    data,
    meta: { source: isAIConfigured() ? "openai" : "demo" },
  });
}

export async function GET() {
  return NextResponse.json({
    configured: isAIConfigured(),
    actions: [
      "profile-optimize",
      "skills-predict",
      "resume-architect",
      "ats-scan",
      "candidate-rank",
      "service-optimize",
      "pricing-recommend",
      "owner-forecast",
      "matchmaking",
    ],
  });
}
