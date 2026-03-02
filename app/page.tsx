"use client";

import { useState } from "react";

type Message = {
    role: "user" | "model";
    content: string;
};

export default function Home() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg.content }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch response");
            }

            const data = await response.json();
            setMessages((prev) => [...prev, { role: "model", content: data.reply }]);
        } catch (error) {
            console.error(error);
            setMessages((prev) => [
                ...prev,
                { role: "model", content: "Error: Unable to connect to backend." },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
            <h1 style={{ textAlign: "center", marginBottom: "2rem" }}>Financial Planner AI</h1>

            <div style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                height: "500px",
                overflowY: "auto",
                padding: "1rem",
                marginBottom: "1rem",
                backgroundColor: "#fff",
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
            }}>
                {messages.length === 0 && (
                    <p style={{ color: "#888", textAlign: "center", marginTop: "10rem" }}>
                        Ask me about financial planning...
                    </p>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        style={{
                            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                            backgroundColor: msg.role === "user" ? "#0070f3" : "#eee",
                            color: msg.role === "user" ? "#fff" : "#000",
                            padding: "0.75rem 1rem",
                            borderRadius: "1rem",
                            maxWidth: "80%",
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap"
                        }}
                    >
                        {msg.content}
                    </div>
                ))}
                {isLoading && (
                    <div style={{ alignSelf: "flex-start", color: "#888", padding: "0.5rem" }}>
                        Agent is typing...
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    style={{
                        flex: 1,
                        padding: "0.75rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        fontSize: "1rem"
                    }}
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: "#0070f3",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "1rem",
                        cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                        opacity: isLoading || !input.trim() ? 0.6 : 1
                    }}
                >
                    Send
                </button>
            </form>
        </main>
    );
}
