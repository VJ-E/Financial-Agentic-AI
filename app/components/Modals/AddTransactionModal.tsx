import React, { useState } from 'react';
import { X, Save, ChevronDown } from 'lucide-react';
import CategorySelectModal from './CategorySelectModal';

interface AddTransactionModalProps {
    onClose: () => void;
    onRefresh: () => void;
    getAuthHeaders: () => any;
    rawProfile: any;
}

export default function AddTransactionModal({ onClose, onRefresh, getAuthHeaders, rawProfile }: AddTransactionModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('debit');
    const [category, setCategory] = useState('Unknown');
    const [source, setSource] = useState('bank');
    
    const customCategories = rawProfile?.customCategories || [];
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    
    // Default to current date and time
    const now = new Date();
    // For date input we need YYYY-MM-DD
    const [date, setDate] = useState(now.toISOString().split('T')[0]);
    // For time input we need HH:MM (24-hour format)
    const [time, setTime] = useState(now.toTimeString().slice(0, 5));
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (!name || !amount || !date || !time) {
            setError("Name, Amount, Date, and Time are required.");
            return;
        }

        setIsLoading(true);
        setError("");
        
        // Combine date and time into a single ISO string
        const combinedDateTime = new Date(`${date}T${time}:00`);

        try {
            const res = await fetch(`/api/finance/transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ 
                    name, 
                    description, 
                    amount: Number(amount), 
                    type,
                    category: category || "Unknown", 
                    source,
                    date: combinedDateTime.toISOString()
                })
            });
            const data = await res.json();
            if (res.ok) {
                onRefresh();
                onClose();
            } else {
                setError(data.message || data.detail || "Failed to add transaction.");
            }
        } catch (e) {
            setError("Network error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border-4 border-black w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b-4 border-black bg-[#FFD700]">
                    <h3 className="font-black text-xl uppercase tracking-tighter">Add Transaction</h3>
                    <button onClick={onClose} className="p-1 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black rounded-full">
                        <X strokeWidth={3} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto">
                    {error && (
                        <div className="bg-red-100 text-red-700 p-3 font-bold text-sm border-2 border-red-700">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-1">
                        <label className="font-bold text-sm uppercase">Category</label>
                        <button
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="w-full border-2 border-black p-2 font-mono bg-white text-left flex justify-between items-center hover:bg-yellow-50 uppercase"
                        >
                            <span>{category}</span>
                            <ChevronDown size={16} />
                        </button>
                    </div>

                    <div className="space-y-1">
                        <label className="font-bold text-sm uppercase">Name</label>
                        <input 
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border-2 border-black p-2 font-mono focus:outline-none focus:bg-yellow-50"
                            placeholder="e.g. Grocery"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="font-bold text-sm uppercase">Description <span className="text-gray-400 text-xs">(Optional)</span></label>
                        <input 
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border-2 border-black p-2 font-mono focus:outline-none focus:bg-yellow-50"
                            placeholder="More details..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="font-bold text-sm uppercase">Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 font-bold">₹</span>
                            <input 
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full border-2 border-black p-2 pl-8 font-mono focus:outline-none focus:bg-yellow-50"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="font-bold text-sm uppercase">Type</label>
                            <select 
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full border-2 border-black p-2 font-mono focus:outline-none bg-white"
                            >
                                <option value="debit">Debit (-)</option>
                                <option value="credit">Credit (+)</option>
                            </select>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="font-bold text-sm uppercase">Source</label>
                            <select 
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                className="w-full border-2 border-black p-2 font-mono focus:outline-none bg-white"
                            >
                                <option value="bank">Bank</option>
                                <option value="cash">Cash</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="font-bold text-sm uppercase">Date</label>
                            <input 
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border-2 border-black p-2 font-mono focus:outline-none focus:bg-yellow-50"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="font-bold text-sm uppercase">Time</label>
                            <input 
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full border-2 border-black p-2 font-mono focus:outline-none focus:bg-yellow-50"
                            />
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t-4 border-black bg-gray-50 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 font-bold uppercase hover:bg-gray-200 transition-colors border-2 border-transparent border-black"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-6 py-2 bg-[#008CD4] text-white font-black uppercase border-2 border-black hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                    >
                        <Save size={18} />
                        {isLoading ? 'Saving...' : 'Add'}
                    </button>
                </div>
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
}
