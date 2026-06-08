import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const authHeader = req.headers.get("authorization") || "";
        const geminiHeader = req.headers.get("x-gemini-api-keys") || "";

        const response = await fetch(`${BACKEND_URL}/finance/upload`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'X-Gemini-Api-Keys': geminiHeader,
            },
            body: formData
        });
        
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to upload image" }, { status: 500 });
    }
}
