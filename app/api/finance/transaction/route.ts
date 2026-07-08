import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const authHeader = req.headers.get("authorization") || "";
        
        const response = await fetch(`${BACKEND_URL}/finance/transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
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
        console.error("Add transaction error in proxy:", error);
        return NextResponse.json({ success: false, message: "Failed to add transaction." }, { status: 500 });
    }
}
