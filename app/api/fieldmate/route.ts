import { NextResponse } from "next/server";
import { SITE_TELEMETRY } from "@/lib/fieldmate-data";

const FM_SYSTEM = `You are FieldMate, Zuttoo's field technician copilot. Ground every answer ONLY in this telemetry:\n${JSON.stringify(SITE_TELEMETRY)}\nBe concise and practical. Cite specific readings. Never instruct switching without noting safety/LOTO. If asked in Hindi/Odia/Arabic, reply in that language.`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 500 });
  }

  const { messages } = await req.json();

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      system: FM_SYSTEM,
      messages,
    }),
  });

  const data = await r.json();
  if (!r.ok) {
    return NextResponse.json({ error: data?.error?.message ?? "Anthropic API error" }, { status: r.status });
  }
  return NextResponse.json(data);
}
