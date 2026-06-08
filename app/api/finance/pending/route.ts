import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET() {
    try {
        const response = await fetch(`${BACKEND_URL}/finance/pending`);
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to fetch pending queue" }, { status: 500 });
    }
}
