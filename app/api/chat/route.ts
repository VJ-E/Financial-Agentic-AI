import { NextResponse } from "next/server";
import { generateText, tool } from "ai";
import { z } from "zod";
import { getFinancialData } from "../../../lib/mockData";

import { createOllama } from "ollama-ai-provider";

const ollama = createOllama({
    baseURL: 'http://localhost:11434/api'
});
const systemInstruction = `
You are a strict financial assistant.

Rules:
- If the user asks about balance, income, goals, or transactions → you MUST call get_financial_data.
- If the user records spending or earning → you MUST call add_transaction.
- If there is no function to call then answer the user directly.
- Never invent tools.
- Never output raw JSON.
- After tool execution, provide a final natural language answer.
`;
export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
        }

        // Call the local Ollama model using the Vercel AI SDK
        const { text } = await generateText({
            // @ts-expect-error: provider model version mismatch between ai sdk and ollama provider
            model: ollama('llama3.1'),
            system: systemInstruction,
            messages: messages,
            tools: {
                get_financial_data: tool({
                    description: "Fetches the user's current bank balance, income, goals, and recent transactions",
                    parameters: z.object({}),
                    execute: async (_args) => {
                        return getFinancialData();
                    },
                }),
                add_transaction: tool({
                    description: "Adds a new transaction to the user's financial record",
                    parameters: z.object({
                        description: z.string().describe("Description of the transaction"),
                        amount: z.number().describe("Amount of the transaction (negative for expenses)"),
                        category: z.enum(["Fixed", "Variable", "Impulse", "Income", "Gift"]).describe("Category of the transaction")
                    }),
                    execute: async ({ description, amount, category }) => {
                        return { status: "success", message: `Transaction '${description}' for $${amount} added under ${category} category.` };
                    }
                })
            },
            maxSteps: 5, // Allows the model to use tools and then respond
        });

        console.log("LLM Response Text:", text);
        return NextResponse.json({ reply: text });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Failed to generate response." },
            { status: 500 }
        );
    }
}
