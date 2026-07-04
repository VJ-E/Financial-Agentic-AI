import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const body = await req.json();
        const authHeader = req.headers.get("authorization") || "";
        const geminiHeader = req.headers.get("x-gemini-api-keys") || "";
        
        const response = await fetch(`${BACKEND_URL}/finance/transaction/${resolvedParams.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
                'X-Gemini-Api-Keys': geminiHeader,
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to update transaction" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const authHeader = req.headers.get("authorization") || "";
        const geminiHeader = req.headers.get("x-gemini-api-keys") || "";
        
        const response = await fetch(`${BACKEND_URL}/finance/transaction/${resolvedParams.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': authHeader,
                'X-Gemini-Api-Keys': geminiHeader,
            }
        });
        
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to delete transaction" }, { status: 500 });
    }
}
