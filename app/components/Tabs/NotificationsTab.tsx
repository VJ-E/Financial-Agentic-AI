import React from 'react';
import { Bell, Check, Trash2, IndianRupee } from 'lucide-react';

interface NotificationsTabProps {
    pendingTransactions: any[];
    handleApprove: (id: string) => void;
    handleReject: (id: string) => void;
    handleApproveAll: () => void;
    handleRejectAll: () => void;
}

export default function NotificationsTab({
    pendingTransactions,
    handleApprove,
    handleReject,
    handleApproveAll,
    handleRejectAll
}: NotificationsTabProps) {
    const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24 max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
                <h1 className="text-4xl font-black uppercase tracking-tight text-black flex items-center gap-3">
                    <Bell className="w-8 h-8" strokeWidth={3} /> Notifications
                </h1>
                <div className="bg-[#008CD4] text-black px-3 py-1 font-black text-xl border-2 border-black">
                    {pendingTransactions.length}
                </div>
            </div>

            {pendingTransactions.length > 0 ? (
                <>
                    <div className="flex gap-4">
                        <button 
                            onClick={handleApproveAll}
                            className="flex-1 brutalist-button bg-[#4ecdc4] flex items-center justify-center gap-2"
                        >
                            <Check className="w-5 h-5" strokeWidth={3} /> Approve All
                        </button>
                        <button 
                            onClick={handleRejectAll}
                            className="flex-1 brutalist-button bg-[#ff6b6b] flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-5 h-5" strokeWidth={3} /> Reject All
                        </button>
                    </div>

                    <div className="space-y-4">
                        {pendingTransactions.map((tx) => (
                            <div key={tx._id} className="bg-white border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="font-bold text-lg leading-tight uppercase">{tx.description}</p>
                                        <p className="font-mono text-sm text-gray-600 mt-1">{new Date(tx.date).toLocaleString()}</p>
                                    </div>
                                    <div className={`font-black text-xl ${tx.category === 'Income' ? 'text-[#008CD4]' : 'text-black'} bg-[#f4f4f4] px-2 py-1 border-2 border-black flex items-center`}>
                                        <IndianRupee className="w-4 h-4 mr-1" /> {tx.category === 'Income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleApprove(tx._id)}
                                        className="flex-1 bg-black text-white font-bold uppercase py-2 border-2 border-black hover:bg-[#4ecdc4] hover:text-black transition-colors flex justify-center items-center gap-1"
                                    >
                                        <Check className="w-4 h-4" /> Approve
                                    </button>
                                    <button 
                                        onClick={() => handleReject(tx._id)}
                                        className="flex-1 bg-white text-black font-bold uppercase py-2 border-2 border-black hover:bg-[#ff6b6b] hover:text-black transition-colors flex justify-center items-center gap-1"
                                    >
                                        <Trash2 className="w-4 h-4" /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="bg-white border-[3px] border-black p-12 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <Check className="w-16 h-16 mx-auto mb-4 text-[#008CD4]" strokeWidth={3} />
                    <h3 className="text-2xl font-black uppercase mb-2">All Caught Up!</h3>
                    <p className="font-mono text-gray-600">You have no pending transactions to approve.</p>
                </div>
            )}
        </div>
    );
}
