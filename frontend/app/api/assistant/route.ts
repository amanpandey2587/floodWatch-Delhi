// app/api/assistant/route.ts
// Understands what the user wants to do and returns structured intent + reply

import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are a multilingual navigation assistant for FloodWatch Delhi — a civic flood management website for Delhi citizens.

The site has these pages and capabilities:
- HOME (/): Overview, flood alerts, news
- MAP (/map): Live flood risk map, safe routing, ward risk visualization, safe parking
- ROUTE PLANNER (/map): Inside the map page — user inputs origin and destination to get a flood-safe route
- FILE COMPLAINT (/complaints/file): Report flooding with location, ward, water depth, priority, photos
- MY COMPLAINTS (/complaints): View all your filed complaints
- TRACK COMPLAINT (/complaints/track/[id]): Track status of a specific complaint by ID
- COMPLAINT DETAIL (/complaints/[id]): View a specific complaint
- ADMIN DASHBOARD (/admin): Ward officer panel — manage complaints, broadcast alerts
- SIGN IN (/sign-in), SIGN OUT

INSTRUCTIONS:
1. Detect the user's language from their message
2. Reply warmly in the SAME language (Hindi → Hindi, Tamil → Tamil, English → English, etc.)
3. Understand their intent — what do they want to do?
4. Return structured JSON with the action and any extracted parameters

ALWAYS respond in this format — reply first, then ---JSON---:

[Your conversational reply in user's language, 1-3 sentences, helpful and warm]

---JSON---
{
  "action": "route|complaint|map|ward_risk|track_complaint|navigate|idle",
  "targetPath": "/path or null",
  "reply_language": "en|hi|ta|bn|te|pa",
  "route": {
    "origin": "place name or null",
    "destination": "place name or null"
  },
  "complaint": {
    "location": "place name in English or null",
    "ward": "ward name in English or null",
    "wardNumber": number or null,
    "priority": "low|medium|high|urgent or null",
    "description": "brief English description or null"
  },
  "map": {
    "location": "place name to fly to or null"
  },
  "ward": "ward name for risk info or null",
  "complaintId": "complaint ID string or null",
  "confidence": 0.0-1.0,
  "suggestions": ["array of 2-3 quick follow-up actions in user's language"]
}

ACTION RULES:
- "route": user wants directions, navigation, route from A to B, safe path
- "complaint": user wants to report flooding, file a complaint, report waterlogging
- "map": user wants to see the map, check flood risk, find safe parking, fly to a location
- "ward_risk": user asks about risk level of a specific ward or area
- "track_complaint": user wants to track/check status of a complaint (extract ID if mentioned)
- "navigate": user wants to go to a specific page (admin, complaints list, sign out, home)
- "idle": greeting, unclear, or general question

EXAMPLES:
- "मुझे करोल बाग से कनॉट प्लेस का रास्ता चाहिए" → action: route, origin: Karol Bagh, destination: Connaught Place
- "rohini mein paani hai" → action: complaint, location: Rohini
- "show me flood risk in dwarka" → action: ward_risk, ward: Dwarka
- "track FW-DEL-2024-1234" → action: track_complaint, complaintId: FW-DEL-2024-1234
- "i want to file a complaint" → action: complaint, targetPath: /complaints/file
- "take me to admin" → action: navigate, targetPath: /admin
- "safe route from lajpat nagar to saket" → action: route, origin: Lajpat Nagar, destination: Saket`;

export async function POST(req: NextRequest) {
  try {
    const { messages, currentPage } = await req.json();

    const systemWithPage = `${SYSTEM_PROMPT}\n\nUser is currently on: ${currentPage || "/"}`;

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemWithPage }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: err.error?.message || "Gemini error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const parts = fullText.split("---JSON---");
    const reply = parts[0].trim();
    let intent = null;

    if (parts[1]) {
      try {
        intent = JSON.parse(parts[1].trim().replace(/```json|```/g, ""));
      } catch {
        // return reply even if JSON fails
      }
    }

    return NextResponse.json({ reply, intent });
  } catch (err) {
    console.error("Assistant error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}