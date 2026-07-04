import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { IndianRupee } from 'lucide-react';
import TransactionModal from '../Modals/TransactionModal';

interface AnalysisTabProps {
    financeData: any;
    getAuthHeaders: () => any;
    fetchDashboardData: () => void;
}

export default function AnalysisTab({ financeData, getAuthHeaders, fetchDashboardData }: AnalysisTabProps) {
    const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'overall'>('month');
    const [selectedTx, setSelectedTx] = useState<any>(null);
    const [limit, setLimit] = useState(10);

    // Reset limit when timeframe changes
    useEffect(() => {
        setLimit(10);
    }, [timeframe]);

    const { metrics, filteredTxs } = useMemo(() => {
        let income = 0;
        let expense = 0;
        const now = new Date();
        const txs = financeData?.recentTransactions || [];
        const filtered: any[] = [];

        txs.forEach((tx: any) => {
            const txDate = new Date(tx.date);
            const diffTime = Math.abs(now.getTime() - txDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let include = false;
            if (timeframe === 'overall') include = true;
            else if (timeframe === 'day' && diffDays <= 1) include = true;
            else if (timeframe === 'week' && diffDays <= 7) include = true;
            else if (timeframe === 'month' && diffDays <= 30) include = true;

            if (include) {
                filtered.push(tx);
                if (tx.category === 'Income') income += Math.abs(tx.amount);
                else expense += Math.abs(tx.amount);
            }
        });

        // Use backend summary for overall metrics instead of computing
        if (timeframe === 'overall') {
            income = financeData?.summary?.income || 0;
            expense = financeData?.summary?.expenses || 0;
        }

        return { 
            metrics: { income, expense, net: income - expense },
            filteredTxs: filtered
        };
    }, [financeData, timeframe]);

    const chartData = useMemo(() => {
        return [
            { name: 'Income', amount: metrics.income, fill: '#008CD4' },
            { name: 'Expense', amount: metrics.expense, fill: '#000000' }
        ];
    }, [metrics]);

    const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24 max-w-4xl mx-auto">
            <h1 className="text-4xl font-black uppercase tracking-tight text-black border-b-4 border-black pb-2">Analysis</h1>
            
            {/* Timeframe Toggle */}
            <div className="flex border-4 border-black bg-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {['day', 'week', 'month', 'overall'].map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setTimeframe(tf as any)}
                        className={`flex-1 py-3 font-bold uppercase text-xs sm:text-sm border-r-4 border-black last:border-r-0 transition-colors ${
                            timeframe === tf ? 'bg-[#008CD4] text-white' : 'hover:bg-gray-100 text-black'
                        }`}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-bold uppercase text-xs text-gray-500 mb-1">Income</p>
                    <p className="text-xl md:text-2xl font-black text-black break-words">{formatCurrency(metrics.income)}</p>
                </div>
                <div className="bg-white border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-bold uppercase text-xs text-gray-500 mb-1">Expense</p>
                    <p className="text-xl md:text-2xl font-black text-black break-words">{formatCurrency(metrics.expense)}</p>
                </div>
                <div className="col-span-2 md:col-span-1 bg-[#008CD4] text-white border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-bold uppercase text-xs text-black mb-1">Net Cashflow</p>
                    <p className="text-xl md:text-2xl font-black text-black break-words">{formatCurrency(metrics.net)}</p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] h-80">
                <h3 className="font-black uppercase mb-4 text-center">Cashflow Comparison</h3>
                <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#000" vertical={false} />
                        <XAxis dataKey="name" stroke="#000" tick={{ fill: '#000', fontWeight: 'bold', fontFamily: 'monospace' }} />
                        <YAxis stroke="#000" tick={{ fill: '#000', fontFamily: 'monospace' }} tickFormatter={(val) => `₹${val/1000}k`} />
                        <Tooltip 
                            cursor={{ fill: '#f4f4f4' }}
                            contentStyle={{ backgroundColor: '#fff', border: '3px solid #000', borderRadius: 0, boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', fontWeight: 'bold' }}
                            formatter={(value: number) => formatCurrency(value)}
                        />
                        <Bar dataKey="amount" fill="#008CD4" stroke="#000" strokeWidth={3} radius={0} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Transaction List */}
            <div className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-black uppercase mb-4 text-center border-b-2 border-black pb-2">Transactions</h3>
                {filteredTxs.length > 0 ? (
                    <div className="space-y-3">
                        {filteredTxs.slice(0, limit).map((tx: any, idx: number) => (
                            <div key={idx} onClick={() => setSelectedTx(tx)} className="bg-white border-[3px] border-black p-3 flex justify-between items-center hover:-translate-y-1 transition-transform cursor-pointer">
                                <div>
                                    <p className="font-bold text-md leading-tight">{tx.description}</p>
                                    <p className="font-mono text-xs text-gray-500 mt-1">{new Date(tx.date).toLocaleDateString()} &bull; {tx.category || 'Expense'}</p>
                                </div>
                                <div className={`font-black text-lg ${tx.category === 'Income' ? 'text-[#008CD4]' : 'text-black'}`}>
                                    {tx.category === 'Income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                                </div>
                            </div>
                        ))}
                        {filteredTxs.length > limit && (
                            <button 
                                onClick={() => setLimit(l => l + 10)}
                                className="w-full mt-4 py-3 bg-[#008CD4] text-black font-black uppercase border-2 border-black hover:bg-blue-400 transition-colors flex items-center justify-center gap-2"
                            >
                                See more <span>v</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="text-center font-bold font-mono text-gray-500 py-8">
                        No transactions found for this period.
                    </div>
                )}
            </div>

            {selectedTx && (
                <TransactionModal
                    transaction={selectedTx}
                    onClose={() => setSelectedTx(null)}
                    onRefresh={fetchDashboardData}
                    getAuthHeaders={getAuthHeaders}
                />
            )}
        </div>
    );
}
