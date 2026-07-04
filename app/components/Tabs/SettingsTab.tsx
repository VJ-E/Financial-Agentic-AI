import React, { useState } from 'react';
import { Settings, Key, LogOut, Plus, X } from 'lucide-react';

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
    handleChangePassword
}: SettingsTabProps) {
    const [settingsTab, setSettingsTab] = useState<'api_keys' | 'account'>('api_keys');

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
                            <p className="font-mono text-sm text-gray-600 mb-4">Fallback keys required for Vector Embeddings. Saved locally.</p>
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
                                                localStorage.setItem("gemini_api_keys", JSON.stringify(newKeys));
                                            }}
                                            placeholder="AIzaSy..." 
                                            className="flex-1 p-3 border-4 border-black font-mono text-sm focus:outline-none focus:bg-[#f4f4f4]"
                                        />
                                        <button 
                                            onClick={() => {
                                                const newKeys = geminiApiKeys.filter((_, i) => i !== index);
                                                setGeminiApiKeys(newKeys);
                                                localStorage.setItem("gemini_api_keys", JSON.stringify(newKeys));
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
                                        localStorage.setItem("gemini_api_keys", JSON.stringify(newKeys));
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
                                                localStorage.setItem("gpay_agent_api_keys", JSON.stringify(newKeys));
                                            }}
                                            placeholder="gsk_..." 
                                            className="flex-1 p-3 border-4 border-black font-mono text-sm focus:outline-none focus:bg-[#f4f4f4]"
                                        />
                                        <button 
                                            onClick={() => {
                                                const newKeys = apiKeys.filter((_, i) => i !== index);
                                                setApiKeys(newKeys);
                                                localStorage.setItem("gpay_agent_api_keys", JSON.stringify(newKeys));
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
                                        localStorage.setItem("gpay_agent_api_keys", JSON.stringify(newKeys));
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
                                                localStorage.setItem("openrouter_api_keys", JSON.stringify(newKeys));
                                            }}
                                            placeholder="sk-or-v1-..." 
                                            className="flex-1 p-3 border-4 border-black font-mono text-sm focus:outline-none focus:bg-[#f4f4f4]"
                                        />
                                        <button 
                                            onClick={() => {
                                                const newKeys = openRouterApiKeys.filter((_, i) => i !== index);
                                                setOpenRouterApiKeys(newKeys);
                                                localStorage.setItem("openrouter_api_keys", JSON.stringify(newKeys));
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
                                        localStorage.setItem("openrouter_api_keys", JSON.stringify(newKeys));
                                    }}
                                    className="brutalist-button w-full flex items-center justify-center gap-2 mt-2"
                                >
                                    <Plus className="w-5 h-5" /> Add OpenRouter Key
                                </button>
                            </div>
                        </div>
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
                    </div>
                )}
            </div>
        </div>
    );
}
