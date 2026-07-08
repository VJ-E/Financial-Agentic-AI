import React from 'react';
import { Bell, Check, Trash2, IndianRupee, ChevronDown } from 'lucide-react';
import CategorySelectModal from '../Modals/CategorySelectModal';

interface NotificationsTabProps {
    pendingTransactions: any[];
    handleApprove: (tx: any) => void;
    handleReject: (id: string) => void;
    handleApproveAll: () => void;
    handleRejectAll: () => void;
    rawProfile?: any;
}

const PendingTransactionCard = ({ tx, handleApprove, handleReject, customCategories }: any) => {
    const [type, setType] = React.useState(tx.type || 'debit');
    const [category, setCategory] = React.useState(tx.category || 'Unknown');
    const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
    
    const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    return (
        <div className="bg-white border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="font-bold text-lg leading-tight">{tx.name || tx.description}</p>
                    <p className="font-mono text-sm text-gray-600 mt-1">{new Date(tx.createdAt || tx.date).toLocaleString()}</p>
                </div>
                <div className={`font-black text-xl ${type === 'credit' ? 'text-[#008CD4]' : 'text-black'} bg-[#f4f4f4] px-2 py-1 border-2 border-black flex items-center`}>
                    <IndianRupee className="w-4 h-4 mr-1" /> {type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                </div>
            </div>

            <div className="flex gap-2 mb-4">
                <select 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="flex-1 border-2 border-black p-2 font-mono focus:outline-none bg-white text-sm uppercase"
                >
                    <option value="debit">Debit (-)</option>
                    <option value="credit">Credit (+)</option>
                </select>
                <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="flex-1 border-2 border-black p-2 font-mono bg-white text-left flex justify-between items-center hover:bg-yellow-50 text-sm uppercase"
                >
                    <span>{category}</span>
                    <ChevronDown size={16} />
                </button>
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={() => handleApprove({ ...tx, type, category })}
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
            
            {isCategoryModalOpen && (
                <CategorySelectModal
                    categories={customCategories}
                    selectedCategory={category}
                    onSelect={setCategory}
                    onClose={() => setIsCategoryModalOpen(false)}
                />
            )}
        </div>
    );
};

export default function NotificationsTab({
    pendingTransactions,
    handleApprove,
    handleReject,
    handleApproveAll,
    handleRejectAll,
    rawProfile
}: NotificationsTabProps) {
    const customCategories = rawProfile?.customCategories || [];

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
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                            onClick={handleApproveAll}
                            className="flex-1 bg-white text-black hover:bg-[#008CD4] hover:text-black font-black uppercase py-4 border-[3px] border-black flex justify-center items-center gap-2 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <Check className="w-6 h-6" strokeWidth={3} /> Approve All
                        </button>
                        <button 
                            onClick={handleRejectAll}
                            className="flex-1 bg-white text-black hover:bg-red-500 hover:text-white font-black uppercase py-4 border-[3px] border-black flex justify-center items-center gap-2 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <Trash2 className="w-6 h-6" strokeWidth={3} /> Reject All
                        </button>
                    </div>

                    <div className="space-y-4">
                        {pendingTransactions.map((tx) => (
                            <PendingTransactionCard 
                                key={tx._id} 
                                tx={tx} 
                                handleApprove={handleApprove} 
                                handleReject={handleReject} 
                                customCategories={customCategories}
                            />
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
