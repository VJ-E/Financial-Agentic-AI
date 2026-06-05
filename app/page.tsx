"use client";

import { useState, useEffect, useRef } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Send, Plus, ArrowUpRight, ArrowDownRight, CreditCard, IndianRupee, Briefcase, MessageSquare, Settings, X, Key } from 'lucide-react';

type Message = {
    role: "user" | "assistant";
    content: string;
};

// --- DEFAULT FALLBACK DATA (While Loading) ---
const fallbackSummaryData = {
    income: 0,
    expenses: 0,
    balance: 0,
};

const defaultTopSpending = [
    { category: "Housing", amount: 0, icon: <Briefcase className="w-6 h-6" /> },
    { category: "Food", amount: 0, icon: <CreditCard className="w-6 h-6" /> },
    { category: "Transport", amount: 0, icon: <IndianRupee className="w-6 h-6" /> },
];

export default function Home() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [apiKeys, setApiKeys] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Dynamic State mapped to Backend
    const [summaryData, setSummaryData] = useState(fallbackSummaryData);
    const [topSpendingData, setTopSpendingData] = useState(defaultTopSpending);
    const [cashFlowData, setCashFlowData] = useState([]);
    const [expensesBarData, setExpensesBarData] = useState([]);
    const [recentLedgerData, setRecentLedgerData] = useState([]);
    const [vaultsData, setVaultsData] = useState([]);

    const fetchDashboardData = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const res = await fetch("/api/finance", { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!res.ok) throw new Error("Failed to fetch dashboard data");
            const data = await res.json();

            if (data.profile) {
                let calculatedIncome = 0;
                let calculatedExpenses = 0;

                if (data.recentTransactions) {
                    data.recentTransactions.forEach((t: any) => {
                        if (t.category === 'Income') calculatedIncome += t.amount;
                        else if (t.category === 'Fixed' || t.category === 'Variable') calculatedExpenses += Math.abs(t.amount);
                    });
                }

                setSummaryData({
                    income: calculatedIncome,
                    expenses: calculatedExpenses,
                    balance: data.profile.totalBalance,
                });

                if (data.profile.activeSavingsGoals) {
                    const uniqueVaults = Array.from(new Map(data.profile.activeSavingsGoals.map((item: any) => [item.title, item])).values());
                    setVaultsData(uniqueVaults as any);
                }
            }

            // In a production app, we would dynamically aggregate transactions here
            // For MVP, if there are transactions, we group them rudimentary or map them.
            if (data.recentTransactions && data.recentTransactions.length > 0) {
                // Basic mapping of recent transactions to the Top Spending format for visual verification
                const recentAsSpending = data.recentTransactions.slice(0, 3).map((t: any) => ({
                    category: t.description || t.category,
                    amount: t.amount,
                    icon: <IndianRupee className="w-6 h-6" />
                }));
                setTopSpendingData(recentAsSpending);

                const formattedBarData = data.recentTransactions.filter((t: any) => t.category !== 'Income').map((t: any) => ({
                    category: t.description.substring(0, 8),
                    val: t.amount
                }));
                setExpensesBarData(formattedBarData);

                const cashFlowByMonth: { [key: string]: number } = {};
                const reversedTransactions = [...data.recentTransactions].reverse();
                reversedTransactions.forEach((t: any) => {
                    const date = new Date(t.date);
                    const month = date.toLocaleString('default', { month: 'short' });
                    const flow = t.category === 'Income' ? t.amount : -Math.abs(t.amount);
                    cashFlowByMonth[month] = (cashFlowByMonth[month] || 0) + flow;
                });
                const cashFlowMvPData = Object.keys(cashFlowByMonth).map(month => ({
                    month,
                    cashflow: cashFlowByMonth[month]
                }));
                setCashFlowData(cashFlowMvPData as any);

                // Store raw transactions for the ledger
                setRecentLedgerData(data.recentTransactions);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsPageLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        const storedKeys = localStorage.getItem("gpay_agent_api_keys");
        if (storedKeys) {
            try { setApiKeys(JSON.parse(storedKeys)); } catch(e) {}
        }
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        // Implement CLEAR terminal command
        if (input.trim().toLowerCase() === "clear") {
            setMessages([]);
            setInput("");
            return;
        }

        const userMsg: Message = { role: "user", content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            // Hit the actual LLM Agent backend
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: newMessages, api_keys: apiKeys }),
            });

            if (!response.ok) throw new Error("Agent failed to respond.");

            // Append empty assistant message for streaming
            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

            if (response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunkText = decoder.decode(value, { stream: true });
                    const lines = chunkText.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataText = line.substring(6);
                            setMessages((prev) => {
                                const lastMsg = prev[prev.length - 1];
                                return [
                                    ...prev.slice(0, -1),
                                    { ...lastMsg, content: lastMsg.content + dataText }
                                ];
                            });
                        }
                    }
                }
            }

            // CRITICAL: Force the dashboard to securely pull the new mathematical truth from MongoDB
            await fetchDashboardData();

        } catch (error) {
            console.error(error);
            setMessages((prev) => [...prev, { role: "assistant", content: "CRITICAL ERROR: Unable to communicate with agent." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (isPageLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-white text-black font-mono text-xl font-bold uppercase tracking-widest border-8 border-black">
                INITIALIZING SYSTEM CORE...
            </div>
        )
    }

    return (
        <div className="h-screen w-full flex font-sans bg-white text-black overflow-hidden relative">
            {/* BACKGROUND PATTERN */}
            <div className="absolute inset-0 pointer-events-none opacity-5 z-0"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)', backgroundSize: '40px 40px' }}>
            </div>

            {/* MAIN DASHBOARD AREA */}
            <main className={`h-full overflow-y-auto z-10 p-4 md:p-8 transition-all duration-300 ${isChatOpen ? 'w-[70%]' : 'w-full'}`}>
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* HEADER */}
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-4 mb-8">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2">My Dashboard</h1>
                            <p className="border-2 border-black inline-block px-2 py-1 font-bold text-sm bg-black text-white">AGENT ACTIVE</p>
                        </div>
                        <div className="mt-4 md:mt-0 flex gap-4">
                            <button className="brutalist-button flex items-center gap-2">
                                <Send className="w-5 h-5" /> Send Money
                            </button>
                            <button className="brutalist-button flex items-center gap-2">
                                <Plus className="w-5 h-5" /> Add Funds
                            </button>
                            <button onClick={() => setIsSettingsOpen(true)} className="brutalist-button flex items-center justify-center !px-3">
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </header>

                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="brutalist-card bg-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                <IndianRupee className="w-16 h-16" />
                            </div>
                            <h2 className="text-xl font-bold uppercase mb-2">Net Balance</h2>
                            <p className="text-5xl md:text-6xl font-black tracking-tighter">₹{summaryData.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="brutalist-card bg-[#f4f4f4]">
                            <h2 className="text-xl font-bold uppercase mb-2 flex items-center gap-2">
                                <ArrowUpRight className="w-6 h-6 border-2 border-black rounded-sm p-0.5 bg-black text-white" /> Total Income
                            </h2>
                            <p className="text-4xl font-black tracking-tighter">₹{summaryData.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            <div className="mt-4 h-2 w-full bg-white border-2 border-black relative">
                                <div className="absolute top-0 left-0 h-full bg-black" style={{ width: '70%' }}></div>
                            </div>
                        </div>
                        <div className="brutalist-card bg-[#f4f4f4]">
                            <h2 className="text-xl font-bold uppercase mb-2 flex items-center gap-2">
                                <ArrowDownRight className="w-6 h-6 border-2 border-black rounded-sm p-0.5 bg-white text-black" /> Total Expenses
                            </h2>
                            <p className="text-4xl font-black tracking-tighter">₹{summaryData.expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            <div className="mt-4 h-2 w-full bg-white border-2 border-black relative">
                                <div className="absolute top-0 left-0 h-full bg-black shadow-[2px_0_0_0_#FFF] border-[url('data:image/svg+xml;base64,...')]" style={{ width: '45%' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* SAVINGS VAULTS WIDGET */}
                    {vaultsData.length > 0 && (
                        <div className="brutalist-card mt-8 border-t-[8px] border-black">
                            <h2 className="text-2xl font-bold uppercase mb-6 pb-2 border-b-4 border-black inline-block">Savings Vaults</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {vaultsData.map((vault: any) => {
                                    const percentComplete = vault.targetAmount > 0
                                        ? Math.min(100, Math.max(0, (vault.currentAmount / vault.targetAmount) * 100))
                                        : 0;

                                    return (
                                        <div key={vault.shortId} className="p-4 border-4 border-black bg-white shadow-brutalist flex flex-col justify-between hover:-translate-y-1 transition-transform">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-black text-xl uppercase truncate pr-2">{vault.title}</h3>
                                                    <span className="bg-black text-white text-xs font-mono px-2 py-1 font-bold tracking-widest uppercase">
                                                        ID: {vault.shortId}
                                                    </span>
                                                </div>
                                                <p className="text-3xl font-black mb-1">
                                                    ₹{vault.currentAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                                    <span className="text-lg text-gray-500"> / ₹{vault.targetAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                                                </p>
                                            </div>

                                            {/* Brutalist Progress Bar */}
                                            <div className="mt-4">
                                                <div className="flex justify-between text-xs font-bold font-mono mb-1 uppercase">
                                                    <span>Progress</span>
                                                    <span>{percentComplete.toFixed(1)}%</span>
                                                </div>
                                                <div className="h-6 w-full border-2 border-black bg-white p-0.5">
                                                    <div
                                                        className="h-full bg-black transition-all duration-500 ease-out"
                                                        style={{ width: `${percentComplete}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* TOP SPENDING */}
                        <div className="brutalist-card col-span-1 border-t-[8px] border-black">
                            <h2 className="text-2xl font-bold uppercase mb-6 pb-2 border-b-4 border-black inline-block">Top Spending</h2>
                            <div className="space-y-4">
                                {topSpendingData.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 border-2 border-black bg-white group hover:-translate-y-1 hover:shadow-brutalist transition-all cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 border-2 border-black bg-[#f4f4f4] group-hover:bg-black group-hover:text-white transition-colors">
                                                {item.icon}
                                            </div>
                                            <span className="font-bold uppercase tracking-wider">{item.category}</span>
                                        </div>
                                        <span className="font-black text-lg">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                ))}
                            </div>
                            <button className="brutalist-button w-full mt-6 !py-2 !text-sm">View All Categories</button>
                        </div>

                        {/* FINANCIAL PLOTS */}
                        <div className="col-span-1 md:col-span-2 space-y-6">
                            {/* SVG Definitions for Brutalist Patterns */}
                            <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
                                <defs>
                                    <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                        <line x1="0" y1="0" x2="0" y2="8" stroke="#000" strokeWidth="3" />
                                    </pattern>
                                    <pattern id="dotPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                                        <circle cx="2" cy="2" r="2" fill="#000"></circle>
                                    </pattern>
                                </defs>
                            </svg>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Cash Flow Plot */}
                                <div className="brutalist-card p-4">
                                    <h3 className="text-lg font-bold uppercase mb-4 border-b-2 border-black pb-1">Cash Flow Over Time</h3>
                                    <div className="w-full h-64 border-2 border-black p-2 bg-white relative">
                                        {/* Pure brutalist chart styling using recharts */}
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={cashFlowData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" strokeWidth={1} />
                                                <XAxis dataKey="month" stroke="#000" tick={{ fill: '#000', fontWeight: 'bold' }} axisLine={{ strokeWidth: 2 }} tickLine={{ strokeWidth: 2 }} />
                                                <YAxis stroke="#000" tick={{ fill: '#000', fontWeight: 'bold' }} axisLine={{ strokeWidth: 2 }} tickLine={{ strokeWidth: 2 }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#fff',
                                                        border: '2px solid #000',
                                                        boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
                                                        borderRadius: '0px',
                                                        fontWeight: 'bold',
                                                        textTransform: 'uppercase'
                                                    }}
                                                />
                                                <Line type="monotone" dataKey="cashflow" stroke="url(#diagonalHatch)" strokeWidth={4} dot={{ stroke: '#000', strokeWidth: 3, fill: '#fff', r: 5 }} activeDot={{ stroke: '#000', strokeWidth: 4, fill: '#000', r: 8 }} />
                                                <Line type="step" dataKey="cashflow" stroke="#000" strokeWidth={4} dot={false} activeDot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                {/* Expenses Bar Chart */}
                                <div className="brutalist-card p-4">
                                    <h3 className="text-lg font-bold uppercase mb-4 border-b-2 border-black pb-1">Expenses Breakdown</h3>
                                    <div className="w-full h-64 border-2 border-black p-2 bg-[#f4f4f4] relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={expensesBarData}>
                                                <CartesianGrid strokeDasharray="0" stroke="#000" strokeWidth={1} />
                                                <XAxis dataKey="category" stroke="#000" tick={{ fill: '#000', fontWeight: 'bold', fontSize: 12 }} axisLine={{ strokeWidth: 2 }} tickLine={false} />
                                                <YAxis hide />
                                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} contentStyle={{ backgroundColor: '#fff', color: '#000', border: '3px solid #000', borderRadius: '0px', fontWeight: 'black', textTransform: 'uppercase', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }} />
                                                <Bar dataKey="val" fill="url(#diagonalHatch)" stroke="#000" strokeWidth={2}>
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RECENT LEDGER WIDGET */}
                    <div className="brutalist-card mt-8 border-t-[8px] border-black">
                        <div className="flex items-center justify-between mb-6 pb-2 border-b-4 border-black">
                            <h2 className="text-2xl font-bold uppercase">Recent Ledger</h2>
                            <span className="bg-black text-white px-3 py-1 font-bold text-sm uppercase">Live Sync</span>
                        </div>

                        <div className="space-y-3">
                            {recentLedgerData.length === 0 ? (
                                <p className="font-mono text-gray-500 uppercase">No recent transactions found.</p>
                            ) : (
                                recentLedgerData.slice(0, 5).map((t: any) => {
                                    const shortId = t._id ? t._id.slice(-4).toUpperCase() : "ERR";
                                    return (
                                        <div key={t._id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-2 border-black bg-white group hover:bg-[#f4f4f4] transition-colors gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-black text-white font-mono font-bold px-2 py-1 text-sm border-2 border-transparent group-hover:border-black group-hover:bg-white group-hover:text-black transition-colors">
                                                    #{shortId}
                                                </div>
                                                <div>
                                                    <p className="font-bold uppercase tracking-wide text-lg">{t.description}</p>
                                                    <p className="text-sm font-mono text-gray-600 uppercase">{new Date(t.date).toLocaleDateString()} // {t.category}</p>
                                                </div>
                                            </div>
                                            <div className={`font-black text-2xl ${(t.category === 'Fixed' || t.category === 'Variable') ? 'text-black' : 'text-black'}`}>
                                                {(t.category === 'Fixed' || t.category === 'Variable') ? '-' : '+'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* Padding at bottom to ensure scroll clears fixed area */}
                    <div className="h-8"></div>
                </div>
            </main>

            {/* AI CHAT AREA - Responsive Sidecar */}
            <section className={`h-full border-l-[4px] border-black bg-white flex flex-col font-mono relative z-20 transition-all duration-300 ${isChatOpen ? 'w-[30%] opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                {/* Header */}
                <div className="bg-black text-white border-b-[4px] border-black px-6 py-4 font-bold text-sm uppercase flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    System // Terminal
                </div>

                <div className="flex-1 overflow-y-auto mb-4 p-4 space-y-4 custom-scrollbar text-black">
                    {messages.length === 0 && (
                        <div>
                            <p className="text-gray-500 font-bold">INITIATING SECURE CONNECTION...</p>
                            <p className="text-gray-500 font-bold">CONNECTION ESTABLISHED.</p>
                            <p className="text-black font-bold mt-2">Awaiting command input...</p>
                        </div>
                    )}
                    {messages.map((msg, idx) => (
                        <div key={idx} className="flex flex-col">
                            {msg.role === 'user' ? (
                                <div className="flex gap-2 text-black/80 font-bold">
                                    <span className="whitespace-nowrap">{'>'} EXEC:</span>
                                    <span>{msg.content}</span>
                                </div>
                            ) : (
                                <div className="flex gap-2 text-black mt-2">
                                    <span className="font-bold whitespace-nowrap pt-1">{'['}SYS{']'}:</span>
                                    <div className="bg-[#f4f4f4] text-black p-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-sans font-bold w-full md:w-fit max-w-[90%]">
                                        {msg.content}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-2 text-black items-center mt-2 font-bold whitespace-nowrap">
                            <span>{'['}SYS{']'}:</span>
                            <span className="flex items-center gap-1">
                                PROCESSING <span className="inline-block w-3 h-5 bg-black animate-pulse"></span>
                            </span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="flex border-t-[4px] border-black bg-white focus-within:bg-[#f4f4f4] transition-all">
                    <div className="px-4 py-4 font-black text-black flex items-center text-lg">
                        {'>'}
                    </div>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="ENTER COMMAND..."
                        className="flex-1 bg-transparent text-black uppercase font-bold text-sm placeholder-gray-500 p-4 focus:outline-none focus:ring-0"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-black text-white font-bold px-6 py-4 uppercase hover:bg-[#FFDE00] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center border-l-[4px] border-black"
                    >
                        Execute
                    </button>
                </form>
            </section>

            {/* Floating Action Button (Orb) */}
            <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`fixed bottom-8 right-8 w-16 h-16 rounded-full border-[4px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFDE00] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all z-50 flex items-center justify-center ${isChatOpen ? 'bg-[#FFDE00]' : ''}`}
            >
                <MessageSquare className="w-7 h-7" />
            </button>

            {/* SETTINGS MODAL */}
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white border-8 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-4xl h-[600px] flex flex-col md:flex-row relative">
                        <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 z-10 bg-black text-white hover:bg-[#FFDE00] hover:text-black transition-colors p-1 border-2 border-transparent hover:border-black">
                            <X className="w-6 h-6" />
                        </button>
                        
                        <div className="w-full md:w-1/3 border-b-4 md:border-b-0 md:border-r-4 border-black bg-[#f4f4f4] p-6">
                            <h2 className="text-3xl font-black uppercase mb-8 border-b-4 border-black pb-2">Settings</h2>
                            <div className="space-y-2">
                                <button className="w-full flex items-center gap-3 p-3 bg-black text-white font-bold uppercase tracking-wider">
                                    <Key className="w-5 h-5" /> API Keys
                                </button>
                            </div>
                        </div>
                        
                        <div className="w-full md:w-2/3 p-6 md:p-8 overflow-y-auto">
                            <h3 className="text-2xl font-black uppercase mb-2">Groq API Keys</h3>
                            <p className="font-mono text-sm text-gray-600 mb-6">Enter fallback keys to bypass rate limits during heavy usage. Saved locally.</p>
                            
                            <div className="space-y-4">
                                {apiKeys.map((key, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            value={key} 
                                            onChange={(e) => {
                                                const newKeys = [...apiKeys];
                                                newKeys[index] = e.target.value;
                                                setApiKeys(newKeys);
                                                localStorage.setItem("gpay_agent_api_keys", JSON.stringify(newKeys));
                                            }}
                                            placeholder="gsk_..." 
                                            className="flex-1 p-3 border-4 border-black font-mono text-sm focus:outline-none focus:bg-[#f4f4f4]"
                                        />
                                        <button 
                                            onClick={() => {
                                                const newKeys = apiKeys.filter((_, i) => i !== index);
                                                setApiKeys(newKeys);
                                                localStorage.setItem("gpay_agent_api_keys", JSON.stringify(newKeys));
                                            }}
                                            className="bg-black text-white p-3 border-4 border-black hover:bg-red-500 hover:text-black transition-colors font-bold uppercase"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => {
                                        const newKeys = [...apiKeys, ""];
                                        setApiKeys(newKeys);
                                        localStorage.setItem("gpay_agent_api_keys", JSON.stringify(newKeys));
                                    }}
                                    className="brutalist-button w-full flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-5 h-5" /> Add Another Key
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
