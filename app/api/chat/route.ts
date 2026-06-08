import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { messages, api_keys } = await req.json();
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
            body: JSON.stringify({ messages, api_keys: api_keys || [] })
        });

        return new Response(response.body, {
            headers: {
                "Content-Type": "text/plain",
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
