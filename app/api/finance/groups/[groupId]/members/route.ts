import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
    try {
        const authHeader = req.headers.get("authorization") || "";
        const body = await req.json();
        const resolvedParams = await params;
        const groupId = resolvedParams.groupId;

        const response = await fetch(`${BACKEND_URL}/api/finance/groups/${groupId}/members`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": authHeader,
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ success: false, detail: "Failed to connect to Python backend." }, { status: 500 });
    }
}
