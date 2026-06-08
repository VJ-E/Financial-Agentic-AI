import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const authHeader = req.headers.get("authorization") || "";
        const { tx_id, description, amount, category } = body;

        const response = await fetch(`${BACKEND_URL}/finance/pending/${tx_id}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify({ description, amount, category })
        });
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to approve transaction" }, { status: 500 });
    }
}
