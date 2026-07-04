import React, { useMemo } from 'react';
import { IndianRupee, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface HomeTabProps {
    financeData: any;
}

export default function HomeTab({ financeData }: HomeTabProps) {
    // Compute credited vs debited for past 30 days from recentTransactions
    const { credited30, debited30 } = useMemo(() => {
        let credited = 0;
        let debited = 0;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        if (financeData?.recentTransactions) {
            financeData.recentTransactions.forEach((tx: any) => {
                const txDate = new Date(tx.date);
                if (txDate >= thirtyDaysAgo) {
                    if (tx.category === 'Income') credited += Math.abs(tx.amount);
                    else debited += Math.abs(tx.amount);
                }
            });
        }
        return { credited30: credited, debited30: debited };
    }, [financeData]);

    const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24 max-w-4xl mx-auto">
            <h1 className="text-4xl font-black uppercase tracking-tight text-black border-b-4 border-black pb-2">Home</h1>
            
            {/* Balance Card */}
            <div className="bg-[#008CD4] p-6 border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <p className="font-mono text-sm font-bold uppercase tracking-wider mb-1 text-black">Current Balance</p>
                <div className="text-5xl md:text-6xl font-black tracking-tighter break-words text-black">
                    {formatCurrency(financeData?.summary?.balance || 0)}
                </div>
            </div>

            {/* 30 Days Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-[#008CD4] p-1.5 border-2 border-black rounded-full">
                            <ArrowUpRight className="w-5 h-5 text-white" strokeWidth={3} />
                        </div>
                        <p className="font-bold uppercase text-sm">Credited (30d)</p>
                    </div>
                    <p className="text-2xl font-black text-[#008CD4]">{formatCurrency(credited30)}</p>
                </div>
                <div className="bg-white p-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-black p-1.5 border-2 border-black rounded-full">
                            <ArrowDownRight className="w-5 h-5 text-white" strokeWidth={3} />
                        </div>
                        <p className="font-bold uppercase text-sm">Debited (30d)</p>
                    </div>
                    <p className="text-2xl font-black text-black">{formatCurrency(debited30)}</p>
                </div>
            </div>

            {/* Recent Transactions */}
            <div>
                <h3 className="text-2xl font-black uppercase mb-4 flex items-center gap-2">
                    <Activity className="w-6 h-6" /> Recent Transactions
                </h3>
                {financeData?.recentTransactions && financeData.recentTransactions.length > 0 ? (
                    <div className="space-y-3">
                        {financeData.recentTransactions.slice(0, 10).map((tx: any, idx: number) => (
                            <div key={idx} className="bg-white border-[3px] border-black p-4 flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform cursor-pointer">
                                <div>
                                    <p className="font-bold text-lg leading-tight">{tx.description}</p>
                                    <p className="font-mono text-xs text-gray-500 mt-1">{new Date(tx.date).toLocaleDateString()} &bull; {tx.category || 'Expense'}</p>
                                </div>
                                <div className={`font-black text-xl ${tx.category === 'Income' ? 'text-[#008CD4]' : 'text-black'}`}>
                                    {tx.category === 'Income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
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
        </div>
    );
}
