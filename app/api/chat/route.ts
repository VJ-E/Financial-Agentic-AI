import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI SDK.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
    try {
        const { message } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Call the specific Gemini 2.5 flash model
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: message,
        });

        return NextResponse.json({ reply: response.text });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Failed to generate response." },
            { status: 500 }
        );
    }
}
