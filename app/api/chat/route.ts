import { NextResponse } from "next/server";
import { generateText, tool } from "ai";
import { z } from "zod";
import { addTransaction, getFinancialSummary, deleteTransaction, updateTransaction, createGoal, fundGoal } from "../../../lib/financialTools";

import { createOllama } from "ollama-ai-provider";

const ollama = createOllama({
    baseURL: 'http://localhost:11434/api'
});

const systemInstruction = `
You are a highly strict, agentic financial advisor operating via a secure terminal interface.
Your job is to analyze the user's finances and execute the appropriate system tool.

CRITICAL RULES:
1. NEVER calculate the user's balance yourself. You are terrible at math. ALWAYS wait for the tool to execute, read the newBalance value returned by the tool, and quote that exact number in your final response.
2. Hypotheticals vs. Actions: If the user asks 'Can I afford X?' or 'Should I buy Y?', DO NOT call a modification tool. Instead, call 'get_financial_data', analyze their balance, and give them financial advice in a brutalist, direct tone. Only log a transaction if the user explicitly confirms they made the purchase.
3. If the user asks about their balance, spending, or financial summary, YOU MUST call 'get_financial_data'.
4. Concrete Actions: If the user explicitly wants to record spending, add income, or log a transaction, YOU MUST call 'add_transaction'.
   - Allowed categories: 'Fixed', 'Variable', 'Income'.
5. RULE: If the user is buying something or paying a bill, use add_transaction. IF the user wants to set money aside, save for a target, or stash funds in a vault, you MUST use fund_goal. If they want to start a new savings target, use create_goal.
6. Corrections: If the user says they made a mistake, use 'update_transaction' or 'delete_transaction' as appropriate.
   - IMPORTANT: The frontend only shows the last 4 characters of an ID (e.g., "#A7F2"). 
   - If the user provides a short 4-character ID, YOU MUST first call 'get_financial_data' to retrieve the recent transaction array and find the matching full MongoDB '_id' strings BEFORE calling delete or update.
7. After executing a tool, provide a concise, brutalist-style confirmation message summarizing the system's action or providing your stark financial advice.
8. Never invent tools or output raw JSON to the user.
9. The default currency for all transactions, balances, and advice is the Indian Rupee (INR / ₹). Never refer to dollars or $.
`;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
        }

        // Mock User ID mapping for MVP
        const MOCK_USER_ID = "user_123";

        // Call the local Ollama model using the Vercel AI SDK
        const { text } = await generateText({
            // @ts-expect-error: provider model version mismatch between ai sdk and ollama provider
            model: ollama('llama3.1'),
            system: systemInstruction,
            messages: messages,
            tools: {
                get_financial_data: tool({
                    description: "Fetches the user's current bank balance, income, savings goals, and recent transaction history from the database.",
                    parameters: z.object({}),
                    execute: async () => {
                        return await getFinancialSummary(MOCK_USER_ID);
                    },
                }),
                add_transaction: tool({
                    description: "Inserts a new transaction into the database. Do not calculate the balance; the system does this automatically.",
                    parameters: z.object({
                        description: z.string().describe("What the transaction was for (e.g., 'Groceries', 'Salary')"),
                        amount: z.number().describe("The absolute numerical amount of the transaction. Never negative."),
                        category: z.enum(["Fixed", "Variable", "Income"]).describe("The category mapping. 'Fixed' or 'Variable' for expenses, 'Income' for earnings.")
                    }),
                    execute: async ({ description, amount, category }) => {
                        return await addTransaction(MOCK_USER_ID, description, amount, category);
                    }
                }),
                delete_transaction: tool({
                    description: "Deletes a transaction by ID. The balance is automatically recalculated by the system.",
                    parameters: z.object({
                        transactionId: z.string().describe("The exact ID of the transaction to delete"),
                    }),
                    execute: async ({ transactionId }) => {
                        return await deleteTransaction(MOCK_USER_ID, transactionId);
                    }
                }),
                update_transaction: tool({
                    description: "Updates an existing transaction. Only provide the fields that need changing. The balance is automatically corrected.",
                    parameters: z.object({
                        transactionId: z.string().describe("The exact ID of the transaction to update"),
                        newAmount: z.number().optional().describe("The new absolute amount (if changing)."),
                        newDescription: z.string().optional().describe("The new description (if changing)."),
                        newCategory: z.enum(["Fixed", "Variable", "Income"]).optional().describe("The new category (if changing).")
                    }),
                    execute: async ({ transactionId, newAmount, newDescription, newCategory }) => {
                        return await updateTransaction(MOCK_USER_ID, transactionId, newAmount, newDescription, newCategory);
                    }
                }),
                create_goal: tool({
                    description: "Creates a new savings goal or vault for the user to fund. Provides a short ID for the vault.",
                    parameters: z.object({
                        title: z.string().describe("The title or name of the savings goal (e.g., 'Vacation', 'New Car')."),
                        targetAmount: z.number().describe("The explicit target financial amount the user aims to hit for this goal.")
                    }),
                    execute: async ({ title, targetAmount }) => {
                        return await createGoal(MOCK_USER_ID, title, targetAmount);
                    }
                }),
                fund_goal: tool({
                    description: "Transfers capital from the user's total balance specifically into one of their active savings goals.",
                    parameters: z.object({
                        shortId: z.string().describe("The exact 4-character short ID of the savings goal to fund."),
                        amount: z.number().describe("The numerical amount to transfer out of the total balance and into this goal.")
                    }),
                    execute: async ({ shortId, amount }) => {
                        return await fundGoal(MOCK_USER_ID, shortId, amount);
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
