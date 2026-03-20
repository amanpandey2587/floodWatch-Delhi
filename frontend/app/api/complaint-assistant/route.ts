// app/api/complaint-assistant/route.ts

import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are a multilingual flood complaint assistant for FloodWatch Delhi.
Citizens describe flooding in Hindi, Tamil, Bengali, Telugu, Punjabi, or English.

Reply in the SAME language the user used. Keep replies to 2-3 sentences — warm, helpful, urgent-aware.

ALWAYS respond in two sections separated by ---JSON---:

Section 1: Your conversational reply in the user's language.

---JSON---

Section 2: JSON with these exact keys (null if not mentioned):
{
  "title": "short English complaint title e.g. 'Severe waterlogging in Karol Bagh'",
  "description": "full English description of the flooding situation",
  "category": "one of: Waterlogging | Drainage Issue | Road Damage | Garbage Accumulation | Other",
  "ward_number": integer between 1-272 or null,
  "priority": "low | medium | high | urgent",
  "fields_filled": ["array of field names updated this turn"]
}

Priority rules:
- low: minor waterlogging, passable
- medium: road flooded, vehicles affected
- high: homes flooded, residents stuck
- urgent: life risk, elderly/children trapped, rescue needed`;

export async function POST(req: NextRequest) {
  try {
    const { messages, currentFormState } = await req.json();

    const systemWithState = `${SYSTEM_PROMPT}

Already filled (skip unless user corrects):
Title: ${currentFormState.title || "empty"}
Description: ${currentFormState.description || "empty"}
Category: ${currentFormState.category || "empty"}
Ward: ${currentFormState.ward_number || "empty"}
Priority: ${currentFormState.priority || "medium"}`;

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemWithState }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || "Gemini error" }, { status: res.status });
    }

    const data = await res.json();
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const parts = fullText.split("---JSON---");
    const reply = parts[0].trim();
    let extracted = null;

    if (parts[1]) {
      try {
        extracted = JSON.parse(parts[1].trim().replace(/```json|```/g, ""));
      } catch { /* return reply even if JSON fails */ }
    }

    return NextResponse.json({ reply, extracted });
  } catch (err) {
    console.error("Complaint assistant error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}