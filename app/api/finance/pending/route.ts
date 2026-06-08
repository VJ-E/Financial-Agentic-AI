import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get("authorization") || "";
        const geminiHeader = req.headers.get("x-gemini-api-keys") || "";
        const response = await fetch(`${BACKEND_URL}/finance/pending`, {
            headers: { 
                "Authorization": authHeader,
                "X-Gemini-Api-Keys": geminiHeader 
            }
        });
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to fetch pending queue" }, { status: 500 });
    }
}
