import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { tx_id } = body;

        const response = await fetch(`${BACKEND_URL}/finance/pending/${tx_id}/reject`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to reject transaction" }, { status: 500 });
    }
}
