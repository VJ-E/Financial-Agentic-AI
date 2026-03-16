"use client";

import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Send, Plus, ArrowUpRight, ArrowDownRight, CreditCard, DollarSign, Briefcase } from 'lucide-react';

type Message = {
    role: "user" | "assistant";
    content: string;
};

// --- INITIAL MOCK DATA ---
const initialSummaryData = {
    income: 12450.00,
    expenses: 8320.00,
    balance: 24500.00,
};

const initialTopSpendingData = [
    { category: "Housing", amount: 2500, icon: <Briefcase className="w-6 h-6" /> },
    { category: "Food & Dining", amount: 1200, icon: <CreditCard className="w-6 h-6" /> },
    { category: "Transportation", amount: 800, icon: <DollarSign className="w-6 h-6" /> },
];

const initialCashFlowData = [
    { month: 'Jan', cashflow: 3000 },
    { month: 'Feb', cashflow: 2500 },
    { month: 'Mar', cashflow: 4000 },
    { month: 'Apr', cashflow: 3200 },
    { month: 'May', cashflow: 5000 },
    { month: 'Jun', cashflow: 4130 },
];

const initialExpensesBarData = [
    { category: 'Housing', val: 2500 },
    { category: 'Food', val: 1200 },
    { category: 'Trans.', val: 800 },
    { category: 'Utils', val: 400 },
    { category: 'Ent.', val: 300 },
];

export default function Home() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Dynamic State
    const [summaryData, setSummaryData] = useState(initialSummaryData);
    const [topSpendingData, setTopSpendingData] = useState(initialTopSpendingData);
    const [cashFlowData, setCashFlowData] = useState(initialCashFlowData);
    const [expensesBarData, setExpensesBarData] = useState(initialExpensesBarData);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: "user", content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            // SIMULATING API COMMUNICATING WITH BACKEND AGENT
            await new Promise(resolve => setTimeout(resolve, 1500));
            const promptLower = input.toLowerCase();

            let replyText = "Query processed. No actionable financial updates identified.";

            // Extremely basic intent parsing simulation
            if (promptLower.includes('add') && (promptLower.includes('groceries') || promptLower.includes('food'))) {
                const amountMatch = input.match(/\$(\d+)/);
                const amount = amountMatch ? parseInt(amountMatch[1]) : 50;

                setSummaryData(prev => ({
                    ...prev,
                    expenses: prev.expenses + amount,
                    balance: prev.balance - amount
                }));

                setTopSpendingData(prev => prev.map(item =>
                    item.category === "Food & Dining" ? { ...item, amount: item.amount + amount } : item
                ));

                setExpensesBarData(prev => prev.map(item =>
                    item.category === 'Food' ? { ...item, val: item.val + amount } : item
                ));

                replyText = `SUCCESS: Added $${amount} to Food & Dining. Dashboard data dynamically updated.`;
            } else if (promptLower.includes('add') && promptLower.includes('income')) {
                const amountMatch = input.match(/\$(\d+)/);
                const amount = amountMatch ? parseInt(amountMatch[1]) : 1000;

                setSummaryData(prev => ({
                    ...prev,
                    income: prev.income + amount,
                    balance: prev.balance + amount
                }));

                replyText = `SUCCESS: Registered $${amount} as new income. Balance recalculated.`;
            } else if (promptLower.includes('reset') || promptLower.includes('clear')) {
                setSummaryData(initialSummaryData);
                setTopSpendingData(initialTopSpendingData);
                setExpensesBarData(initialExpensesBarData);
                setCashFlowData(initialCashFlowData);
                replyText = "SUCCESS: Reverted dashboard to initial mock state.";
            }

            setMessages((prev) => [...prev, { role: "assistant", content: replyText }]);

        } catch (error) {
            console.error(error);
            setMessages((prev) => [...prev, { role: "assistant", content: "CRITICAL ERROR: Unable to synchronize with mainframe." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col font-sans bg-white text-black overflow-hidden relative">
            {/* BACKGROUND PATTERN */}
            <div className="absolute inset-0 pointer-events-none opacity-5 z-0"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)', backgroundSize: '40px 40px' }}>
            </div>

            {/* MAIN DASHBOARD AREA - Scrollable top 80% */}
            <main className="h-[80vh] w-full overflow-y-auto border-b-4 border-black z-10 p-4 md:p-8">
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
                        </div>
                    </header>

                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="brutalist-card bg-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                <DollarSign className="w-16 h-16" />
                            </div>
                            <h2 className="text-xl font-bold uppercase mb-2">Net Balance</h2>
                            <p className="text-5xl md:text-6xl font-black tracking-tighter">${summaryData.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="brutalist-card bg-[#f4f4f4]">
                            <h2 className="text-xl font-bold uppercase mb-2 flex items-center gap-2">
                                <ArrowUpRight className="w-6 h-6 border-2 border-black rounded-sm p-0.5 bg-black text-white" /> Total Income
                            </h2>
                            <p className="text-4xl font-black tracking-tighter">${summaryData.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            <div className="mt-4 h-2 w-full bg-white border-2 border-black relative">
                                <div className="absolute top-0 left-0 h-full bg-black" style={{ width: '70%' }}></div>
                            </div>
                        </div>
                        <div className="brutalist-card bg-[#f4f4f4]">
                            <h2 className="text-xl font-bold uppercase mb-2 flex items-center gap-2">
                                <ArrowDownRight className="w-6 h-6 border-2 border-black rounded-sm p-0.5 bg-white text-black" /> Total Expenses
                            </h2>
                            <p className="text-4xl font-black tracking-tighter">${summaryData.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            <div className="mt-4 h-2 w-full bg-white border-2 border-black relative">
                                <div className="absolute top-0 left-0 h-full bg-black shadow-[2px_0_0_0_#FFF] border-[url('data:image/svg+xml;base64,...')]" style={{ width: '45%' }}></div>
                            </div>
                        </div>
                    </div>

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
                                        <span className="font-black text-lg">${item.amount}</span>
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
                    {/* Padding at bottom to ensure scroll clears fixed area */}
                    <div className="h-8"></div>
                </div>
            </main>

            {/* AI CHAT AREA - Fixed bottom 25% for better visibility */}
            <section className="h-[25vh] w-full bg-black text-white z-20 flex flex-col p-4 shadow-[0_-8px_0_0_rgba(0,0,0,1)] relative font-mono">
                {/* Drawer Handle / Title */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black text-white border-2 border-black px-6 py-1 font-bold text-sm uppercase z-30 flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    System // Terminal
                </div>

                <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-4 custom-scrollbar-dark mt-2">
                    {messages.length === 0 && (
                        <div>
                            <p className="text-gray-400">INITIATING SECURE CONNECTION...</p>
                            <p className="text-gray-400">CONNECTION ESTABLISHED.</p>
                            <p className="text-white mt-2">Awaiting command input...</p>
                        </div>
                    )}
                    {messages.map((msg, idx) => (
                        <div key={idx} className="flex flex-col">
                            {msg.role === 'user' ? (
                                <div className="flex gap-2 text-gray-300">
                                    <span className="font-bold whitespace-nowrap">{'>'} EXEC:</span>
                                    <span>{msg.content}</span>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <span className="font-bold whitespace-nowrap pt-1">{'['}SYS{']'}:</span>
                                    <div className="bg-white text-black p-2 border-2 border-white shadow-brutalist-sm font-sans font-medium w-full md:w-fit max-w-[90%]">
                                        {msg.content}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-2 text-white items-center">
                            <span className="font-bold whitespace-nowrap">{'['}SYS{']'}:</span>
                            <span className="flex items-center gap-1 font-bold">
                                PROCESSING <span className="inline-block w-3 h-5 bg-white animate-pulse"></span>
                            </span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="flex border-2 border-white bg-black focus-within:ring-2 focus-within:ring-white focus-within:ring-offset-2 focus-within:ring-offset-black transition-all">
                    <div className="px-3 py-3 font-bold text-white flex items-center bg-transparent border-r-2 border-white">
                        {'>'}
                    </div>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="ENTER COMMAND..."
                        className="flex-1 bg-transparent text-white uppercase text-sm placeholder-gray-500 p-3 focus:outline-none focus:ring-0"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-white text-black font-bold px-6 py-3 uppercase hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border-l-2 border-white"
                    >
                        Execute
                    </button>
                </form>
            </section>
        </div>
    );
}
