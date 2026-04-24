import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
        }

        const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ messages })
        });

        return new Response(response.body, {
            headers: {
                "Content-Type": "text/event-stream",
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
