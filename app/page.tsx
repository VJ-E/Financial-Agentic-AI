"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, Home as HomeIcon, MessageSquare, Bell, Settings, Briefcase, CreditCard, IndianRupee, Copy } from 'lucide-react';
import HomeTab from './components/Tabs/HomeTab';
import AnalysisTab from './components/Tabs/AnalysisTab';
import ChatTab from './components/Tabs/ChatTab';
import NotificationsTab from './components/Tabs/NotificationsTab';
import SettingsTab from './components/Tabs/SettingsTab';
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
    const router = useRouter();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'analysis' | 'home' | 'chat' | 'notifications' | 'settings'>('home');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [apiKeys, setApiKeys] = useState<string[]>([]);
    const [geminiApiKeys, setGeminiApiKeys] = useState<string[]>([]);
    const [openRouterApiKeys, setOpenRouterApiKeys] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [authUser, setAuthUser] = useState<any>(null);
    const [activeBatch, setActiveBatch] = useState<{ batchId: string, count: number } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [settingsTab, setSettingsTab] = useState<'api_keys' | 'account'>('api_keys');
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert("New passwords do not match.");
            return;
        }
        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({
                    old_password: passwordForm.oldPassword,
                    new_password: passwordForm.newPassword
                })
            });
            if (res.ok) {
                alert("Password changed successfully!");
                setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                const data = await res.json();
                alert(data.detail || "Failed to change password.");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred while changing password.");
        }
    };

    const getAuthHeaders = () => {
        const token = localStorage.getItem("auth_token");
        const headers: any = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (geminiApiKeys.length > 0) headers["X-Gemini-Api-Keys"] = JSON.stringify(geminiApiKeys);
        return headers;
    };

    const handleLogout = () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        router.push("/login");
    };

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
    const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
    const [isQueueOpen, setIsQueueOpen] = useState(false);

    const fetchDashboardData = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const res = await fetch("/api/finance", { signal: controller.signal, headers: { ...getAuthHeaders() } });
            clearTimeout(timeoutId);
            
            if (res.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
                return;
            }
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
                    income: calculatedIncome || 0,
                    expenses: calculatedExpenses || 0,
                    balance: data.profile.totalBalance || 0,
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

    const fetchPendingQueue = async () => {
        try {
            const res = await fetch("/api/finance/pending", { 
                headers: { ...getAuthHeaders() },
                cache: 'no-store'
            });
            if (res.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
                return;
            }
            if (res.ok) {
                const data = await res.json();
                if (data.data) {
                    setPendingTransactions(data.data);
                    
                    // Update activeBatch count if it's currently active
                    setActiveBatch(currentBatch => {
                        if (!currentBatch) return null;
                        const remaining = data.data.filter((tx: any) => tx.batchId === currentBatch.batchId).length;
                        if (remaining === 0) return null; // Auto-resolve the batch banner if all items are handled
                        return { ...currentBatch, count: remaining };
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        if (!token) {
            router.push("/login");
            return;
        }
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
            try { setAuthUser(JSON.parse(storedUser)); } catch(e) {}
        }
        fetchDashboardData();
        fetchPendingQueue();
        const storedKeys = localStorage.getItem("gpay_agent_api_keys");
        if (storedKeys) {
            try { setApiKeys(JSON.parse(storedKeys)); } catch(e) {}
        }
        const storedGemini = localStorage.getItem("gemini_api_keys");
        if (storedGemini) {
            try { setGeminiApiKeys(JSON.parse(storedGemini)); } catch(e) {}
        }
        const storedOpenRouter = localStorage.getItem("openrouter_api_keys");
        if (storedOpenRouter) {
            try { setOpenRouterApiKeys(JSON.parse(storedOpenRouter)); } catch(e) {}
        }
    }, []);

    const handleQueueChange = (idx: number, field: string, val: any) => {
        const newQueue = [...pendingTransactions];
        newQueue[idx][field] = val;
        setPendingTransactions(newQueue);
    };

    const handleApprove = async (tx: any) => {
        // Optimistic UI update
        setPendingTransactions(prev => prev.filter(p => p._id !== tx._id));
        try {
            await fetch("/api/finance/pending/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({ tx_id: tx._id, description: tx.description, amount: Number(tx.amount), category: tx.category })
            });
            fetchPendingQueue();
            fetchDashboardData();
        } catch (e) { console.error(e); }
    };

    const handleReject = async (tx_id: string) => {
        // Optimistic UI update
        setPendingTransactions(prev => prev.filter(p => p._id !== tx_id));
        try {
            await fetch("/api/finance/pending/reject", {
                method: "DELETE",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({ tx_id })
            });
            fetchPendingQueue();
        } catch (e) { console.error(e); }
    };

    const handleApproveAll = async () => {
        if (pendingTransactions.length === 0) return;
        const currentTxs = [...pendingTransactions];
        setPendingTransactions([]); // Optimistic clear
        try {
            await Promise.all(currentTxs.map(tx => 
                fetch("/api/finance/pending/approve", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                    body: JSON.stringify({ tx_id: tx._id, description: tx.description, amount: Number(tx.amount), category: tx.category })
                })
            ));
            fetchPendingQueue();
            fetchDashboardData();
        } catch (e) { console.error(e); }
    };

    const handleRejectAll = async () => {
        if (pendingTransactions.length === 0) return;
        const currentTxs = [...pendingTransactions];
        setPendingTransactions([]); // Optimistic clear
        try {
            await Promise.all(currentTxs.map(tx => 
                fetch("/api/finance/pending/reject", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                    body: JSON.stringify({ tx_id: tx._id })
                })
            ));
            fetchPendingQueue();
        } catch (e) { console.error(e); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Maximum size is 5MB.");
            return;
        }

        setSelectedImageFile(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleBatchApprove = async () => {
        if (!activeBatch) return;
        try {
            await fetch("/api/finance/pending/batch/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({ batch_id: activeBatch.batchId })
            });
            setActiveBatch(null);
            fetchDashboardData();
            fetchPendingQueue();
        } catch (err) { console.error(err); }
    };

    const handleBatchReject = async () => {
        if (!activeBatch) return;
        try {
            await fetch("/api/finance/pending/batch/reject", {
                method: "POST", // The proxy uses POST to forward as DELETE
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({ batch_id: activeBatch.batchId })
            });
            setActiveBatch(null);
            fetchPendingQueue();
        } catch (err) { console.error(err); }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !selectedImageFile) || isLoading || isUploading) return;

        // Implement CLEAR terminal command
        if (input.trim().toLowerCase() === "clear") {
            setMessages([]);
            setInput("");
            return;
        }

        let extractedTransactions = null;

        if (selectedImageFile) {
            setIsUploading(true);
            const formData = new FormData();
            formData.append("file", selectedImageFile);
            try {
                const res = await fetch("/api/finance/upload", {
                    method: "POST",
                    headers: { ...getAuthHeaders() },
                    body: formData
                });
                const data = await res.json();
                if (data.success && data.count > 0) {
                    setActiveBatch({ batchId: data.batchId, count: data.count });
                    fetchPendingQueue();
                    extractedTransactions = data.transactions;
                } else if (!res.ok) {
                    alert(data.detail || data.message || "Failed to analyze image.");
                    setIsUploading(false);
                    return;
                }
            } catch (err) {
                console.error(err);
                alert("Error uploading image.");
                setIsUploading(false);
                return;
            }
            setSelectedImageFile(null);
            setIsUploading(false);
        }

        let finalInput = input.trim();
        if (finalInput === "") {
            // If they just attached an image and hit enter, the image is uploaded and queued. We stop here.
            setInput("");
            return;
        }

        if (extractedTransactions) {
            finalInput += `\n\n[Extracted Image Data]:\n${JSON.stringify(extractedTransactions, null, 2)}`;
        }

        const userMsg: Message = { role: "user", content: finalInput };
        const newMessages: Message[] = [...messages, { role: "user", content: input.trim() }]; // Show original input to user visually
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            // Hit the actual LLM Agent backend
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({ messages: [...messages, userMsg], api_keys: apiKeys, openrouter_api_keys: openRouterApiKeys }),
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
                    setMessages((prev) => {
                        const lastMsg = prev[prev.length - 1];
                        return [
                            ...prev.slice(0, -1),
                            { ...lastMsg, content: lastMsg.content + chunkText }
                        ];
                    });
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

    const financeData = {
        summary: summaryData,
        recentTransactions: recentLedgerData
    };

    return (
        <div className="h-screen w-full flex flex-col font-sans bg-[#f4f4f4] text-black overflow-hidden relative">
            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-y-auto w-full relative z-10">
                {activeTab === 'analysis' && <AnalysisTab financeData={financeData} />}
                {activeTab === 'home' && <HomeTab financeData={financeData} />}
                {activeTab === 'chat' && (
                    <ChatTab 
                        messages={messages}
                        input={input}
                        setInput={setInput}
                        handleSubmit={handleSubmit}
                        isLoading={isLoading}
                        messagesEndRef={messagesEndRef}
                    />
                )}
                {activeTab === 'notifications' && (
                    <NotificationsTab 
                        pendingTransactions={pendingTransactions}
                        handleApprove={handleApprove}
                        handleReject={handleReject}
                        handleApproveAll={handleApproveAll}
                        handleRejectAll={handleRejectAll}
                    />
                )}
                {activeTab === 'settings' && (
                    <SettingsTab 
                        authUser={authUser}
                        handleLogout={handleLogout}
                        apiKeys={apiKeys}
                        setApiKeys={setApiKeys}
                        geminiApiKeys={geminiApiKeys}
                        setGeminiApiKeys={setGeminiApiKeys}
                        openRouterApiKeys={openRouterApiKeys}
                        setOpenRouterApiKeys={setOpenRouterApiKeys}
                        passwordForm={passwordForm}
                        setPasswordForm={setPasswordForm}
                        handleChangePassword={handleChangePassword}
                    />
                )}
            </main>

            {/* BOTTOM NAVIGATION BAR */}
            <nav className="border-t-4 border-black flex z-50 bg-white" style={{ minHeight: '70px' }}>
                <button 
                    onClick={() => setActiveTab('analysis')}
                    className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 border-r-4 border-black transition-colors ${activeTab === 'analysis' ? 'bg-[#0055ff] text-white' : 'hover:bg-gray-100 text-black'}`}
                >
                    <BarChart2 className="w-6 h-6" strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase hidden sm:block">Analysis</span>
                </button>
                <button 
                    onClick={() => setActiveTab('home')}
                    className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 border-r-4 border-black transition-colors ${activeTab === 'home' ? 'bg-[#0055ff] text-white' : 'hover:bg-gray-100 text-black'}`}
                >
                    <HomeIcon className="w-6 h-6" strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase hidden sm:block">Home</span>
                </button>
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 border-r-4 border-black transition-colors ${activeTab === 'chat' ? 'bg-[#0055ff] text-white' : 'hover:bg-gray-100 text-black'}`}
                >
                    <MessageSquare className="w-6 h-6" strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase hidden sm:block">Agent</span>
                </button>
                <button 
                    onClick={() => setActiveTab('notifications')}
                    className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 border-r-4 border-black relative transition-colors ${activeTab === 'notifications' ? 'bg-[#0055ff] text-white' : 'hover:bg-gray-100 text-black'}`}
                >
                    <div className="relative">
                        <Bell className="w-6 h-6" strokeWidth={3} />
                        {pendingTransactions.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-black"></span>
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-black uppercase hidden sm:block">Alerts</span>
                </button>
                <button 
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'settings' ? 'bg-[#0055ff] text-white' : 'hover:bg-gray-100 text-black'}`}
                >
                    <Settings className="w-6 h-6" strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase hidden sm:block">Settings</span>
                </button>
            </nav>
        </div>
    );
}
