import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get("authorization") || "";
        
        const response = await fetch(`${BACKEND_URL}/finance/keys`, {
            headers: {
                'Authorization': authHeader
            }
        });
        
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to fetch keys" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const authHeader = req.headers.get("authorization") || "";
        
        const response = await fetch(`${BACKEND_URL}/finance/keys`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to update keys" }, { status: 500 });
    }
}
