"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.detail || "Login failed.");
                return;
            }

            localStorage.setItem("auth_token", data.token);
            localStorage.setItem("auth_user", JSON.stringify(data.user));
            router.push("/");
        } catch (err) {
            setError("Unable to connect to the server.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-white font-sans relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-5 z-0"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)', backgroundSize: '40px 40px' }}>
            </div>

            <div className="relative z-10 w-full max-w-md p-4">
                {/* Logo Area */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-black tracking-tighter uppercase">FINAGENT</h1>
                    <div className="border-2 border-black inline-block px-3 py-1 font-bold text-sm bg-black text-white mt-2 uppercase tracking-widest">
                        Secure Terminal
                    </div>
                </div>

                {/* Login Card */}
                <form onSubmit={handleLogin} className="border-8 border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 space-y-6">
                    <h2 className="text-3xl font-black uppercase border-b-4 border-black pb-3">Login</h2>

                    {error && (
                        <div className="bg-red-500 text-white font-bold p-3 border-2 border-black uppercase text-sm">
                            ⚠ {error}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold font-mono uppercase tracking-widest">Username or Email</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            className="w-full bg-white border-[3px] border-black p-4 font-bold uppercase focus:outline-none focus:bg-[#FFDE00] transition-colors mt-1"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold font-mono uppercase tracking-widest">Password</label>
                        <div className="relative mt-1">
                            <input
                                type={showPw ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full border-4 border-black p-3 font-bold focus:outline-none focus:bg-[#FFDE00] transition-colors pr-12"
                            />
                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2">
                                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-black text-white font-black uppercase tracking-widest py-4 text-lg border-4 border-black hover:bg-[#FFDE00] hover:text-black transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        <LogIn className="w-6 h-6" />
                        {isLoading ? "AUTHENTICATING..." : "LOGIN"}
                    </button>

                    <p className="text-center font-bold text-sm uppercase">
                        No account?{" "}
                        <a href="/signup" className="underline underline-offset-4 decoration-4 hover:bg-[#FFDE00] px-1 transition-colors">
                            Sign Up
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
