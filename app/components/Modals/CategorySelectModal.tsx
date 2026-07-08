import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';

interface CategorySelectModalProps {
    categories: string[];
    selectedCategory: string;
    onSelect: (category: string) => void;
    onClose: () => void;
}

export default function CategorySelectModal({ categories, selectedCategory, onSelect, onClose }: CategorySelectModalProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newCategory, setNewCategory] = useState("");
    const defaultCategories = ["Unknown"];
    const initialCategories = categories && categories.length > 0 ? categories : defaultCategories;
    // Display in reverse order so the most recently pushed category is at the top
    const [localCategories, setLocalCategories] = useState<string[]>([...initialCategories].reverse());

    const handleAddCategory = async () => {
        const cat = newCategory.trim();
        if (cat) {
            handleSelect(cat);
            setNewCategory("");
            setIsAdding(false);
        }
    };

    const handleSelect = async (cat: string) => {
        if (!localCategories.includes(cat)) {
            setLocalCategories([cat, ...localCategories]);
        } else {
            setLocalCategories([cat, ...localCategories.filter(c => c !== cat)]);
        }
        onSelect(cat);
        onClose();
        
        // Update backend recency (fire and forget)
        const token = localStorage.getItem("auth_token");
        if (token) {
            fetch("/api/finance/categories", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ category: cat })
            }).then(() => {
                window.dispatchEvent(new Event('refreshDashboard'));
            }).catch(e => console.error(e));
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border-4 border-black w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center p-4 border-b-4 border-black bg-[#FFD700]">
                    <h3 className="font-black text-xl uppercase tracking-tighter">Select Category</h3>
                    <button onClick={onClose} className="p-1 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black rounded-full">
                        <X strokeWidth={3} />
                    </button>
                </div>
                
                <div className="p-4 overflow-y-auto space-y-2 flex-1">
                    {localCategories.map((c, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelect(c)}
                            className={`w-full text-left px-4 py-3 border-2 border-black font-bold uppercase transition-transform flex justify-between items-center ${selectedCategory === c ? 'bg-[#008CD4] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]' : 'bg-white text-black hover:bg-yellow-50 hover:translate-y-[-1px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'}`}
                        >
                            <span>{c}</span>
                            {selectedCategory === c && <Check size={18} strokeWidth={3} />}
                        </button>
                    ))}
                    {localCategories.length === 0 && (
                        <div className="text-center font-mono text-gray-500 py-4">No categories found.</div>
                    )}
                </div>

                <div className="p-4 border-t-4 border-black bg-gray-50">
                    {isAdding ? (
                        <div className="space-y-2">
                            <input 
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                autoFocus
                                placeholder="Category Name"
                                className="w-full border-2 border-black p-2 font-mono focus:outline-none focus:bg-yellow-50 bg-white"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddCategory();
                                    if (e.key === 'Escape') setIsAdding(false);
                                }}
                            />
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsAdding(false)}
                                    className="flex-1 font-bold uppercase border-2 border-transparent hover:bg-gray-200 transition-colors p-2"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleAddCategory}
                                    className="flex-1 bg-black text-white font-bold uppercase border-2 border-black hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] p-2 flex justify-center items-center gap-1"
                                >
                                    <Plus size={16} strokeWidth={3} /> Add
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-full bg-black text-white font-bold uppercase border-2 border-black hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-3 flex justify-center items-center gap-2"
                        >
                            <Plus size={18} strokeWidth={3} /> New Category
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
