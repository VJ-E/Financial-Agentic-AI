import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const authHeader = req.headers.get("authorization") || "";
        const geminiHeader = req.headers.get("x-gemini-api-keys") || "";
        
        const response = await fetch(`${BACKEND_URL}/finance/chat/undo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
                'X-Gemini-Api-Keys': geminiHeader,
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const text = await response.text();
            console.error("Backend error:", response.status, text);
            return NextResponse.json({ success: false, message: `Backend error: ${text}` }, { status: response.status });
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Undo error in proxy:", error);
        return NextResponse.json({ success: false, message: "Failed to undo chat actions." }, { status: 500 });
    }
}
