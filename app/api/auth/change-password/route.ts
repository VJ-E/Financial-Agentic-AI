import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const authHeader = req.headers.get("authorization") || "";
        const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

        const response = await fetch(`${BACKEND_URL}/auth/change-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader,
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
