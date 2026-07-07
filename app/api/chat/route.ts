import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { messages, chat_id, api_keys, openrouter_api_keys } = await req.json();
        const authHeader = req.headers.get("authorization") || "";
        const geminiHeader = req.headers.get("x-gemini-api-keys") || "";

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
        }

        const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader,
                "X-Gemini-Api-Keys": geminiHeader,
            },
            body: JSON.stringify({ messages, chat_id, api_keys: api_keys || [], openrouter_api_keys: openrouter_api_keys || [] })
        });

        return new Response(response.body, {
            status: response.status,
            headers: {
                "Content-Type": response.ok ? "text/plain" : "application/json",
                "Cache-Control": "no-cache",
            }
        });
    } catch (error) {
        console.error("Chat API Proxy Error:", error);
        return NextResponse.json(
            { error: "Failed to communicate with backend service." },
            { status: 500 }
        );
    }
}
