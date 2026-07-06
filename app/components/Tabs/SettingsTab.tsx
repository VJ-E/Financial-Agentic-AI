import React, { useState, useEffect } from 'react';
import { Settings, Key, LogOut, Plus, X, AlertTriangle, Bomb } from 'lucide-react';

interface SettingsTabProps {
    authUser: any;
    handleLogout: () => void;
    apiKeys: string[];
    setApiKeys: (keys: string[]) => void;
    geminiApiKeys: string[];
    setGeminiApiKeys: (keys: string[]) => void;
    openRouterApiKeys: string[];
    setOpenRouterApiKeys: (keys: string[]) => void;
    passwordForm: any;
    setPasswordForm: (form: any) => void;
    handleChangePassword: (e: React.FormEvent) => void;
    saveKeysToBackend: () => void;
    getAuthHeaders: () => any;
}

export default function SettingsTab({
    authUser,
    handleLogout,
    apiKeys,
    setApiKeys,
    geminiApiKeys,
    setGeminiApiKeys,
    openRouterApiKeys,
    setOpenRouterApiKeys,
    passwordForm,
    setPasswordForm,
    handleChangePassword,
    saveKeysToBackend,
    getAuthHeaders
}: SettingsTabProps) {
    const [settingsTab, setSettingsTab] = useState<'api_keys' | 'account'>('api_keys');
    const [showNukeModal, setShowNukeModal] = useState(false);
    const [nukeCountdown, setNukeCountdown] = useState(10);
    const [isNuking, setIsNuking] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showNukeModal && nukeCountdown > 0) {
            timer = setInterval(() => {
                setNukeCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [showNukeModal, nukeCountdown]);

    const handleNukeData = async () => {
        setIsNuking(true);
        try {
            const res = await fetch('/api/finance/nuke', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
            });
            if (res.ok) {
                window.location.reload();
            }
        } catch (e) {
            console.error(e);
        }
        setIsNuking(false);
    };

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24 max-w-4xl mx-auto">
            <h1 className="text-4xl font-black uppercase tracking-tight text-black border-b-4 border-black pb-2 flex items-center gap-3">
                <Settings className="w-8 h-8" strokeWidth={3} /> Settings
            </h1>

            <div className="flex border-4 border-black bg-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
                <button 
                    onClick={() => setSettingsTab('api_keys')}
                    className={`flex-1 py-4 font-black uppercase text-sm md:text-base border-r-4 border-black transition-colors flex items-center justify-center gap-2 ${settingsTab === 'api_keys' ? 'bg-[#008CD4] text-black' : 'hover:bg-gray-100 text-black'}`}
                >
                    <Key className="w-5 h-5" /> API Keys
                </button>
                <button 
                    onClick={() => setSettingsTab('account')}
                    className={`flex-1 py-4 font-black uppercase text-sm md:text-base transition-colors flex items-center justify-center gap-2 ${settingsTab === 'account' ? 'bg-[#008CD4] text-black' : 'hover:bg-gray-100 text-black'}`}
                >
                    <Settings className="w-5 h-5" /> Account
                </button>
            </div>

            <div className="bg-white border-[3px] border-black p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                {settingsTab === 'api_keys' ? (
                    <div className="space-y-8">
                        {/* Gemini Keys */}
                        <div>
                            <h3 className="text-2xl font-black uppercase mb-2">Gemini API Keys</h3>
                            <p className="font-mono text-sm text-gray-600 mb-4">Fallback keys required for Vector Embeddings. Saved to your account.</p>
                            <div className="space-y-3">
                                {geminiApiKeys.map((key, index) => (
                                    <div key={`gemini-${index}`} className="flex items-center gap-2">
                                        <input 
                                            type="password" 
                                            value={key} 
                                            onChange={(e) => {
                                                const newKeys = [...geminiApiKeys];
                                                newKeys[index] = e.target.value;
                                                setGeminiApiKeys(newKeys);
                                            }}
                                            placeholder="AIzaSy..." 
                                            className="flex-1 p-3 border-4 border-black font-mono text-sm focus:outline-none focus:bg-[#f4f4f4]"
                                        />
                                        <button 
                                            onClick={() => {
                                                const newKeys = geminiApiKeys.filter((_, i) => i !== index);
                                                setGeminiApiKeys(newKeys);
                                            }}
                                            className="bg-black text-white p-3 border-4 border-black hover:bg-red-500 hover:text-black transition-colors font-bold uppercase"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => {
                                        const newKeys = [...geminiApiKeys, ""];
                                        setGeminiApiKeys(newKeys);
                                    }}
                                    className="brutalist-button w-full flex items-center justify-center gap-2 mt-2"
                                >
                                    <Plus className="w-5 h-5" /> Add Gemini Key
                                </button>
                            </div>
                        </div>

                        <hr className="border-2 border-black" />

                        {/* Groq Keys */}
                        <div>
                            <h3 className="text-2xl font-black uppercase mb-2">Groq API Keys</h3>
                            <p className="font-mono text-sm text-gray-600 mb-4">Primary agent keys.</p>
                            <div className="space-y-3">
                                {apiKeys.map((key, index) => (
                                    <div key={`groq-${index}`} className="flex items-center gap-2">
                                        <input 
                                            type="password" 
                                            value={key} 
                                            onChange={(e) => {
                                                const newKeys = [...apiKeys];
                                                newKeys[index] = e.target.value;
                                                setApiKeys(newKeys);
                                            }}
                                            placeholder="gsk_..." 
                                            className="flex-1 p-3 border-4 border-black font-mono text-sm focus:outline-none focus:bg-[#f4f4f4]"
                                        />
                                        <button 
                                            onClick={() => {
                                                const newKeys = apiKeys.filter((_, i) => i !== index);
                                                setApiKeys(newKeys);
                                            }}
                                            className="bg-black text-white p-3 border-4 border-black hover:bg-red-500 hover:text-black transition-colors font-bold uppercase"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => {
                                        const newKeys = [...apiKeys, ""];
                                        setApiKeys(newKeys);
                                    }}
                                    className="brutalist-button w-full flex items-center justify-center gap-2 mt-2"
                                >
                                    <Plus className="w-5 h-5" /> Add Groq Key
                                </button>
                            </div>
                        </div>

                        <hr className="border-2 border-black" />

                        {/* OpenRouter Keys */}
                        <div>
                            <h3 className="text-2xl font-black uppercase mb-2">OpenRouter API Keys</h3>
                            <p className="font-mono text-sm text-gray-600 mb-4">Fallback Layer 2.</p>
                            <div className="space-y-3">
                                {openRouterApiKeys.map((key, index) => (
                                    <div key={`openrouter-${index}`} className="flex items-center gap-2">
                                        <input 
                                            type="password" 
                                            value={key} 
                                            onChange={(e) => {
                                                const newKeys = [...openRouterApiKeys];
                                                newKeys[index] = e.target.value;
                                                setOpenRouterApiKeys(newKeys);
                                            }}
                                            placeholder="sk-or-v1-..." 
                                            className="flex-1 p-3 border-4 border-black font-mono text-sm focus:outline-none focus:bg-[#f4f4f4]"
                                        />
                                        <button 
                                            onClick={() => {
                                                const newKeys = openRouterApiKeys.filter((_, i) => i !== index);
                                                setOpenRouterApiKeys(newKeys);
                                            }}
                                            className="bg-black text-white p-3 border-4 border-black hover:bg-red-500 hover:text-black transition-colors font-bold uppercase"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => {
                                        const newKeys = [...openRouterApiKeys, ""];
                                        setOpenRouterApiKeys(newKeys);
                                    }}
                                    className="brutalist-button w-full flex items-center justify-center gap-2 mt-2"
                                >
                                    <Plus className="w-5 h-5" /> Add OpenRouter Key
                                </button>
                            </div>
                        </div>

                        <hr className="border-2 border-black" />
                        
                        <button 
                            onClick={saveKeysToBackend}
                            className="w-full bg-[#008CD4] text-black font-black uppercase py-4 border-[3px] border-black hover:bg-[#4ecdc4] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg"
                        >
                            Save API Keys
                        </button>
                    </div>
                ) : (
                    <div>
                        <h3 className="text-2xl font-black uppercase mb-6">Account Settings</h3>
                        
                        <div className="mb-8 p-4 bg-[#f4f4f4] border-4 border-black">
                            <p className="font-bold uppercase text-sm text-gray-600 mb-1">Logged in as</p>
                            <p className="text-xl font-black">{authUser?.username || authUser?.email || "User"}</p>
                        </div>
                        
                        <form onSubmit={handleChangePassword} className="space-y-4 mb-8">
                            <h4 className="font-bold uppercase border-b-2 border-black pb-2 mb-4">Change Password</h4>
                            <div>
                                <label className="block font-bold uppercase text-sm mb-1">Old Password</label>
                                <input 
                                    type="password"
                                    value={passwordForm.oldPassword}
                                    onChange={e => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                                    className="w-full p-3 border-4 border-black focus:bg-[#f4f4f4] focus:outline-none font-mono"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block font-bold uppercase text-sm mb-1">New Password</label>
                                <input 
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                    className="w-full p-3 border-4 border-black focus:bg-[#f4f4f4] focus:outline-none font-mono"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block font-bold uppercase text-sm mb-1">Confirm New Password</label>
                                <input 
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                                    className="w-full p-3 border-4 border-black focus:bg-[#f4f4f4] focus:outline-none font-mono"
                                    required
                                />
                            </div>
                            <button type="submit" className="brutalist-button w-full mt-4">
                                Update Password
                            </button>
                        </form>
                        
                        <hr className="border-2 border-black mb-8" />
                        
                        <button 
                            onClick={handleLogout}
                            className="w-full bg-[#ff6b6b] text-black font-black uppercase p-4 border-4 border-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-5 h-5" /> Logout
                        </button>

                        <hr className="border-2 border-black my-8" />
                        
                        <div className="bg-[#ff6b6b] border-[4px] border-black p-6">
                            <h4 className="font-black uppercase text-xl flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-6 h-6" /> Danger Zone
                            </h4>
                            <p className="font-mono text-sm text-black font-bold mb-4">
                                This action will permanently delete all your financial data (transactions, queue, etc.) and reset your balances to 0. It cannot be undone.
                            </p>
                            <button 
                                onClick={() => {
                                    setNukeCountdown(10);
                                    setShowNukeModal(true);
                                }}
                                className="w-full bg-black text-white font-black uppercase p-4 border-4 border-black hover:-translate-y-1 transition-transform flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)]"
                            >
                                <Bomb className="w-5 h-5 text-red-500" /> Nuke All Data
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* NUKE MODAL */}
            {showNukeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
                    <div className="bg-[#ff6b6b] border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-6 md:p-10 max-w-lg w-full relative">
                        <button 
                            onClick={() => !isNuking && setShowNukeModal(false)} 
                            className="absolute top-4 right-4 bg-white border-[3px] border-black p-1 hover:bg-black hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex justify-center mb-6">
                            <Bomb className="w-20 h-20 text-black animate-pulse" />
                        </div>
                        
                        <h2 className="text-3xl font-black uppercase text-center mb-4 leading-tight border-b-4 border-black pb-4">
                            Are you absolutely sure?
                        </h2>
                        
                        <p className="font-mono font-bold text-lg text-center mb-8">
                            This will irrevocably wipe all transactions, pending records, and vectors, setting your balance to $0. Your account login will remain.
                        </p>

                        <button 
                            onClick={handleNukeData}
                            disabled={nukeCountdown > 0 || isNuking}
                            className={`w-full font-black uppercase p-5 border-4 border-black flex items-center justify-center gap-3 transition-all text-xl ${
                                nukeCountdown > 0 
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                    : 'bg-black text-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-[2px]'
                            }`}
                        >
                            {isNuking ? 'Nuking...' : (nukeCountdown > 0 ? `Wait ${nukeCountdown}s` : 'CONFIRM NUKE')}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
