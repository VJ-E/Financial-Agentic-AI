import { NextResponse } from 'next/server';
import { getFinancialSummary } from '../../../lib/financialTools';

export async function GET() {
    try {
        // Hardcoded generic user mapping for MVP until Auth is integrated
        const MOCK_USER_ID = "user_123";

        // Fetch the user's live profile and recent transactions natively from Mongoose
        const financeData = await getFinancialSummary(MOCK_USER_ID);

        if (!financeData.success) {
            return NextResponse.json({ error: financeData.message }, { status: 404 });
        }

        return NextResponse.json(financeData.data);
    } catch (error) {
        console.error("Database fetch error:", error);
        return NextResponse.json(
            { error: "Failed to retrieve financial dashboard data." },
            { status: 500 }
        );
    }
}
