import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
    try {
        const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
        const authHeader = req.headers.get("authorization") || "";
        const body = await req.json();

        const response = await fetch(`${BACKEND_URL}/finance/balance`, {
            method: 'PUT',
            headers: { 
                "Authorization": authHeader,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
            cache: 'no-store'
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("Finance API Proxy Error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to connect to Python backend." },
            { status: 500 }
        );
    }
}
