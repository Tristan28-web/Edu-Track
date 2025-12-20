import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server configuration error: missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null) as { question?: string } | null;
    const question = typeof body?.question === "string" ? body!.question.trim() : "";
    if (!question) {
      return NextResponse.json(
        { error: "Invalid request: 'question' must be a non-empty string" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(question);
    const answer = result.response.text();

    return NextResponse.json({ answer });
  } catch (err) {
    return NextResponse.json(
      {
        answer:
          "Sorry, I couldn't process that question right now. Please try again later.",
      },
      { status: 200 }
    );
  }
}

