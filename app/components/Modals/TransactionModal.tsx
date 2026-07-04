import React, { useState } from 'react';
import { X, Trash2, Save } from 'lucide-react';

interface TransactionModalProps {
    transaction: any;
    onClose: () => void;
    onRefresh: () => void;
    getAuthHeaders: () => any;
}

export default function TransactionModal({ transaction, onClose, onRefresh, getAuthHeaders }: TransactionModalProps) {
    const [description, setDescription] = useState(transaction.description || '');
    const [amount, setAmount] = useState(Math.abs(transaction.amount || 0));
    const [category, setCategory] = useState(transaction.category || 'Variable');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        setIsLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/finance/transaction/${transaction._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ description, amount: Number(amount), category })
            });
            const data = await res.json();
            if (res.ok) {
                onRefresh();
                onClose();
            } else {
                setError(data.message || data.detail || "Failed to update transaction.");
            }
        } catch (e) {
            setError("Network error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) return;
        
        setIsLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/finance/transaction/${transaction._id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (res.ok) {
                onRefresh();
                onClose();
            } else {
                setError(data.message || data.detail || "Failed to delete transaction.");
            }
        } catch (e) {
            setError("Network error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md">
                <div className="flex justify-between items-center bg-black text-white p-3 border-b-4 border-black">
                    <h3 className="font-black uppercase text-xl">Edit Transaction</h3>
                    <button onClick={onClose} className="hover:text-red-400 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-500 text-white font-bold p-3 border-2 border-black uppercase text-sm">
                            ⚠ {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="text-xs font-bold font-mono uppercase tracking-widest text-black">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isLoading}
                            className="w-full bg-[#f4f4f4] border-[3px] border-black p-3 font-bold focus:outline-none focus:bg-white transition-colors mt-1 text-black"
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold font-mono uppercase tracking-widest text-black">Amount</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            disabled={isLoading}
                            min="0"
                            step="0.01"
                            className="w-full bg-[#f4f4f4] border-[3px] border-black p-3 font-bold focus:outline-none focus:bg-white transition-colors mt-1 text-black"
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold font-mono uppercase tracking-widest text-black">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            disabled={isLoading}
                            className="w-full bg-[#f4f4f4] border-[3px] border-black p-3 font-bold focus:outline-none focus:bg-white transition-colors mt-1 text-black"
                        >
                            <option value="Income">Income</option>
                            <option value="Variable">Variable (Expense)</option>
                            <option value="Fixed">Fixed (Expense)</option>
                        </select>
                    </div>
                    
                    <div className="flex gap-4 pt-4 border-t-2 border-black border-dashed mt-4">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="flex-1 bg-black text-white font-black uppercase py-3 border-[3px] border-black flex justify-center items-center gap-2 hover:bg-[#008CD4] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" /> Save
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="flex-1 bg-white text-black font-black uppercase py-3 border-[3px] border-black flex justify-center items-center gap-2 hover:bg-red-500 hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                        >
                            <Trash2 className="w-5 h-5" /> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
