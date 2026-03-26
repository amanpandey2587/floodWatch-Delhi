// app/api/complaint-assistant/route.ts

import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are a multilingual flood complaint assistant for FloodWatch Delhi.
Citizens describe flooding in Hindi, Tamil, Bengali, Telugu, Punjabi, or English — by typing OR by voice.

CORE RULES:
1. Reply in the SAME language the user used. If Hindi → reply Hindi. If Tamil → Tamil. If English → English.
2. Keep replies short and conversational (2-4 sentences max).
3. After extracting fields, look at missing_fields and naturally ask for ONE missing field at a time.
4. NEVER ask for photo via text — that must be uploaded by the user from the form. Instead remind them once if photo is missing.
5. Be warm and empathetic — this is a distress situation.

FIELD EXTRACTION:
Extract whatever the user mentions and return as JSON. Missing fields stay null.

PHOTO RULE:
Photo is mandatory for complaint submission. If photo_uploaded is false and the user seems ready to submit, remind them once in the reply.

MISSING FIELDS PRIORITY ORDER:
1. location (where is the flooding?)
2. description (what is happening exactly?)
3. category (type: waterlogging / drainage / road damage / garbage / other)
4. ward_number (which ward number? 1-272)
5. priority (how urgent? low/medium/high/urgent)
6. photo (remind to upload if missing)

ALWAYS respond in this exact format:

[Your reply in user's language]

---JSON---
{
  "title": "short English title or null",
  "description": "English description of flooding or null",
  "category": "Waterlogging|Drainage Issue|Road Damage|Garbage Accumulation|Other or null",
  "ward_number": integer 1-272 or null,
  "priority": "low|medium|high|urgent or null",
  "fields_filled": ["list of field names updated this turn"]
}

Priority detection:
- low: minor waterlogging, passable
- medium: road flooded, some vehicles affected
- high: homes flooded, residents stuck
- urgent: life risk, elderly/children trapped, rescue needed`;

export async function POST(req: NextRequest) {
  try {
    const { messages, currentFormState } = await req.json();

    // Build a rich context so the AI knows exactly what's filled and what's missing
    const missingList = (currentFormState.missing_fields as string[] || []);
    const nextMissing = missingList.filter((f: string) => f !== "photo")[0] || null;

    const systemWithState = `${SYSTEM_PROMPT}

CURRENT FORM STATE:
- Title: ${currentFormState.title || "❌ MISSING"}
- Description: ${currentFormState.description || "❌ MISSING"}
- Category: ${currentFormState.category || "❌ MISSING"}
- Ward number: ${currentFormState.ward_number || "❌ MISSING"}
- Priority: ${currentFormState.priority || "❌ MISSING"}
- Photo uploaded: ${currentFormState.photo_uploaded ? "✅ YES" : "❌ NO — MANDATORY"}

Missing fields: ${missingList.length > 0 ? missingList.join(", ") : "none — all complete!"}
${nextMissing ? `Next field to ask for: ${nextMissing}` : "All text fields filled — remind about photo if not uploaded."}

INSTRUCTION: After extracting what the user said, ask naturally for: ${nextMissing || (currentFormState.photo_uploaded ? "nothing — all done!" : "photo upload")}`;

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
        generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
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