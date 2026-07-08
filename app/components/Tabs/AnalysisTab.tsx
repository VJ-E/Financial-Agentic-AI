import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { IndianRupee } from 'lucide-react';
import TransactionModal from '../Modals/TransactionModal';

interface AnalysisTabProps {
    financeData: any;
    getAuthHeaders: () => any;
    fetchDashboardData: () => void;
    transactionSource: 'all' | 'bank' | 'cash';
    setTransactionSource: (val: 'all' | 'bank' | 'cash') => void;
    rawProfile: any;
}

export default function AnalysisTab({ financeData, getAuthHeaders, fetchDashboardData, transactionSource, setTransactionSource, rawProfile }: AnalysisTabProps) {
    const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'overall'>('month');
    const [baseDate, setBaseDate] = useState<Date>(new Date());
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    const [selectedTx, setSelectedTx] = useState<any>(null);
    const [limit, setLimit] = useState(10);

    // Reset limit when timeframe changes
    useEffect(() => {
        setLimit(10);
    }, [timeframe]);

    const { metrics, filteredTxs } = useMemo(() => {
        let income = 0;
        let expense = 0;
        const txs = financeData?.recentTransactions || [];
        const filtered: any[] = [];

        // Determine start and end of the current timeframe based on baseDate
        let start = new Date(baseDate);
        start.setHours(0, 0, 0, 0);
        let end = new Date(baseDate);
        end.setHours(23, 59, 59, 999);

        if (timeframe === 'week') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            end = new Date(start);
            end.setDate(end.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (timeframe === 'month') {
            start.setDate(1);
            end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        txs.forEach((tx: any) => {
            const txSource = tx.source || 'bank';
            if (transactionSource !== 'all' && txSource !== transactionSource) return;

            const txDate = new Date(tx.date);
            let include = false;

            if (timeframe === 'overall') {
                include = true;
            } else {
                if (txDate >= start && txDate <= end) {
                    include = true;
                }
            }

            if (include) {
                filtered.push(tx);
                if (tx.type === 'credit') income += Math.abs(tx.amount);
                else expense += Math.abs(tx.amount);
            }
        });

        // Use backend summary for overall metrics if 'all' sources are selected
        if (timeframe === 'overall' && transactionSource === 'all') {
            income = financeData?.summary?.income || 0;
            expense = financeData?.summary?.expenses || 0;
        }

        return { 
            metrics: { income, expense, net: income - expense },
            filteredTxs: filtered
        };
    }, [financeData, timeframe, baseDate, transactionSource]);

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
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
                <h1 className="text-4xl font-black uppercase tracking-tight text-black">Analysis</h1>
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
            
            {/* Timeframe Toggle */}
            <div className="flex border-4 border-black bg-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {['day', 'week', 'month', 'overall'].map((tf) => (
                    <button
                        key={tf}
                        onClick={() => {
                            setTimeframe(tf as any);
                            setBaseDate(new Date()); // Reset date on toggle
                        }}
                        className={`flex-1 py-3 font-bold uppercase text-xs sm:text-sm border-r-4 border-black last:border-r-0 transition-colors ${
                            timeframe === tf ? 'bg-[#008CD4] text-white' : 'hover:bg-gray-100 text-black'
                        }`}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            {/* Time Travel Controls */}
            {timeframe !== 'overall' && (
                <div className="flex justify-between items-center bg-white border-4 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <button 
                        onClick={() => {
                            const newDate = new Date(baseDate);
                            if (timeframe === 'day') newDate.setDate(newDate.getDate() - 1);
                            if (timeframe === 'week') newDate.setDate(newDate.getDate() - 7);
                            if (timeframe === 'month') newDate.setMonth(newDate.getMonth() - 1);
                            setBaseDate(newDate);
                        }}
                        className="p-2 border-2 border-black hover:bg-gray-200 transition-colors font-black text-xl leading-none"
                    >
                        &lt;
                    </button>
                    
                    <div className="flex flex-col items-center">
                        <span 
                            className="font-bold uppercase text-sm cursor-pointer hover:text-[#008CD4] transition-colors"
                            onClick={() => setIsDatePickerVisible(!isDatePickerVisible)}
                        >
                            {timeframe === 'day' && baseDate.toLocaleDateString()}
                            {timeframe === 'week' && `Week of ${baseDate.toLocaleDateString()}`}
                            {timeframe === 'month' && baseDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        {isDatePickerVisible && (
                            <input 
                                type="date"
                                value={baseDate.toISOString().split('T')[0]}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setBaseDate(new Date(e.target.value));
                                        setIsDatePickerVisible(false);
                                    }
                                }}
                                className="mt-1 border-2 border-black p-1 text-xs font-mono focus:outline-none"
                            />
                        )}
                    </div>

                    <button 
                        onClick={() => {
                            const newDate = new Date(baseDate);
                            if (timeframe === 'day') newDate.setDate(newDate.getDate() + 1);
                            if (timeframe === 'week') newDate.setDate(newDate.getDate() + 7);
                            if (timeframe === 'month') newDate.setMonth(newDate.getMonth() + 1);
                            setBaseDate(newDate);
                        }}
                        className="p-2 border-2 border-black hover:bg-gray-200 transition-colors font-black text-xl leading-none"
                    >
                        &gt;
                    </button>
                </div>
            )}

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
                            <div key={idx} onClick={() => setSelectedTx(tx)} className="bg-white border-[3px] border-black p-4 flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform cursor-pointer">
                                <div>
                                    <p className="font-bold text-lg leading-tight uppercase">{tx.category || 'Unknown'}</p>
                                    <p className="font-mono text-xs text-gray-500 mt-1">
                                        {tx.name || tx.description} &bull; {new Date(tx.date).toLocaleDateString()} 
                                        <span className="ml-2 px-2 py-0.5 bg-gray-200 text-black border border-black font-bold uppercase text-[10px]">{tx.source || 'Bank'}</span>
                                    </p>
                                </div>
                                <div className={`font-black text-xl ${tx.type === 'credit' ? 'text-[#008CD4]' : 'text-black'}`}>
                                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
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
