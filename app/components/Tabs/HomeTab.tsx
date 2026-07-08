import React, { useMemo, useState } from 'react';
import { IndianRupee, ArrowUpRight, ArrowDownRight, Activity, Plus } from 'lucide-react';
import TransactionModal from '../Modals/TransactionModal';
import AddTransactionModal from '../Modals/AddTransactionModal';

interface HomeTabProps {
    financeData: any;
    getAuthHeaders: () => any;
    fetchDashboardData: () => void;
    transactionSource: 'all' | 'bank' | 'cash';
    setTransactionSource: (val: 'all' | 'bank' | 'cash') => void;
    rawProfile: any;
}

export default function HomeTab({ financeData, getAuthHeaders, fetchDashboardData, transactionSource, setTransactionSource, rawProfile }: HomeTabProps) {
    const [selectedTx, setSelectedTx] = useState<any>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditingBalance, setIsEditingBalance] = useState(false);
    const [editBalanceAmount, setEditBalanceAmount] = useState('');
    const [isSavingBalance, setIsSavingBalance] = useState(false);
    
    const filteredTransactions = useMemo(() => {
        if (!financeData?.recentTransactions) return [];
        if (transactionSource === 'all') return financeData.recentTransactions;
        return financeData.recentTransactions.filter((tx: any) => (tx.source || 'bank') === transactionSource);
    }, [financeData?.recentTransactions, transactionSource]);

    // Compute credited vs debited for past 30 days from filteredTransactions
    const { credited30, debited30 } = useMemo(() => {
        let credited = 0;
        let debited = 0;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        filteredTransactions.forEach((tx: any) => {
            const txDate = new Date(tx.date);
            if (txDate >= thirtyDaysAgo) {
                if (tx.type === 'credit' || tx.category === 'Income') credited += Math.abs(tx.amount);
                else debited += Math.abs(tx.amount);
            }
        });
        return { credited30: credited, debited30: debited };
    }, [filteredTransactions]);

    const displayBalance = useMemo(() => {
        if (transactionSource === 'bank') return rawProfile?.bankBalance || 0;
        if (transactionSource === 'cash') return rawProfile?.cashBalance || 0;
        return rawProfile?.totalBalance || 0;
    }, [transactionSource, rawProfile]);

    const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    const handleSaveBalance = async () => {
        setIsSavingBalance(true);
        try {
            const res = await fetch('/api/finance/balance', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ source: transactionSource, amount: Number(editBalanceAmount) })
            });
            if (res.ok) {
                fetchDashboardData();
                setIsEditingBalance(false);
            } else {
                const text = await res.text();
                alert("Save Failed (Did you restart the Python backend?): " + text);
            }
        } catch (e) {
            console.error(e);
            alert("Network error: " + String(e));
        }
        setIsSavingBalance(false);
    };

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24 max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
                <h1 className="text-4xl font-black uppercase tracking-tight text-black">Home</h1>
                <select 
                    value={transactionSource} 
                    onChange={(e) => setTransactionSource(e.target.value as any)}
                    className="bg-white border-[3px] border-black font-bold uppercase text-sm p-2 cursor-pointer focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] transition-transform"
                >
                    <option value="all">All</option>
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                </select>
            </div>
            
            {/* Balance Card */}
            <div className="bg-[#008CD4] p-6 border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <p className="font-mono text-sm font-bold uppercase tracking-wider mb-1 text-black">Current Balance {transactionSource !== 'all' ? `(${transactionSource})` : ''}</p>
                {isEditingBalance ? (
                    <div className="flex items-center gap-2 mt-2">
                        <input 
                            type="number"
                            value={editBalanceAmount}
                            onChange={(e) => setEditBalanceAmount(e.target.value)}
                            disabled={isSavingBalance}
                            className="bg-white border-2 border-black p-2 text-3xl font-black w-full max-w-[200px] focus:outline-none"
                            autoFocus
                        />
                        <button 
                            onClick={handleSaveBalance}
                            disabled={isSavingBalance}
                            className="bg-black text-white p-3 border-2 border-black hover:bg-gray-800 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </button>
                    </div>
                ) : (
                    <div 
                        className="text-5xl md:text-6xl font-black tracking-tighter break-words text-black cursor-pointer hover:opacity-80 transition-opacity inline-block"
                        onClick={() => {
                            setEditBalanceAmount(displayBalance.toString());
                            setIsEditingBalance(true);
                        }}
                    >
                        {formatCurrency(displayBalance)}
                    </div>
                )}
            </div>

            {/* 30 Days Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-[#008CD4] p-1.5 border-2 border-black rounded-full">
                            <ArrowUpRight className="w-5 h-5 text-white" strokeWidth={3} />
                        </div>
                        <p className="font-bold uppercase text-sm">Credited</p>
                    </div>
                    <p className="text-2xl font-black text-black">{formatCurrency(credited30)}</p>
                </div>
                <div className="bg-white p-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-black p-1.5 border-2 border-black rounded-full">
                            <ArrowDownRight className="w-5 h-5 text-white" strokeWidth={3} />
                        </div>
                        <p className="font-bold uppercase text-sm">Debited</p>
                    </div>
                    <p className="text-2xl font-black text-black">{formatCurrency(debited30)}</p>
                </div>
            </div>

            {/* Recent Transactions */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-black uppercase flex items-center gap-2">
                        <Activity className="w-6 h-6" /> Recent Transactions
                    </h3>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-black text-white font-bold uppercase text-sm px-4 py-2 flex items-center gap-2 hover:bg-gray-800 transition-colors border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    >
                        <Plus size={16} strokeWidth={3} /> Add
                    </button>
                </div>
                {filteredTransactions.length > 0 ? (
                    <div className="space-y-3">
                        {filteredTransactions.slice(0, 10).map((tx: any, idx: number) => (
                            <div key={idx} onClick={() => setSelectedTx(tx)} className="bg-white border-[3px] border-black p-4 flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform cursor-pointer">
                                <div>
                                    <p className="font-bold text-lg leading-tight uppercase">{tx.category || 'Unknown'}</p>
                                    <p className="font-mono text-xs text-gray-500 mt-1">
                                        {tx.name || tx.description} &bull; {new Date(tx.date).toLocaleDateString()} 
                                        <span className="ml-2 px-2 py-0.5 bg-gray-200 text-black border border-black font-bold uppercase text-[10px]">{tx.source || 'Bank'}</span>
                                    </p>
                                </div>
                                <div className={`font-black text-xl ${tx.type === 'credit' || tx.category === 'Income' ? 'text-[#008CD4]' : 'text-black'}`}>
                                    {tx.type === 'credit' || tx.category === 'Income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border-[3px] border-black p-8 text-center font-bold font-mono">
                        No recent transactions found.
                    </div>
                )}
            </div>
            
            {selectedTx && (
                <TransactionModal
                    transaction={selectedTx}
                    onClose={() => setSelectedTx(null)}
                    onRefresh={fetchDashboardData}
                    getAuthHeaders={getAuthHeaders}
                    rawProfile={rawProfile}
                />
            )}

            {isAddModalOpen && (
                <AddTransactionModal 
                    onClose={() => setIsAddModalOpen(false)}
                    onRefresh={fetchDashboardData}
                    getAuthHeaders={getAuthHeaders}
                    rawProfile={rawProfile}
                />
            )}
        </div>
    );
}
