import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
        const authHeader = req.headers.get("authorization") || "";
        const geminiHeader = req.headers.get("x-gemini-api-keys") || "";

        const response = await fetch(`${BACKEND_URL}/finance`, {
            headers: { 
                "Authorization": authHeader,
                "X-Gemini-Api-Keys": geminiHeader 
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("Finance API Proxy Error (Non-200):", text);
            return NextResponse.json(
                { success: false, message: "Backend returned an error.", details: text },
                { status: response.status }
            );
        }

        const payload = await response.json();

        // FastAPI returns { success: true, data: { profile, recentTransactions } }
        // Next.js frontend natively expects { profile, recentTransactions }
        const unwrappedData = payload.data ? payload.data : payload;

        return NextResponse.json(unwrappedData);
    } catch (error) {
        console.error("Finance API Proxy Error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to connect to Python backend." },
            { status: 500 }
        );
    }
}
