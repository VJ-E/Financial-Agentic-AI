"use client";
import { useRouter } from "next/navigation";
import { ArrowRight, MessageSquare, PieChart, Shield } from "lucide-react";

export default function LandingPage() {
    const router = useRouter();

    return (
        <div className="min-h-[100dvh] bg-[#f4f4f4] text-black font-sans selection:bg-[#008CD4] selection:text-white pb-20">
            {/* Nav */}
            <nav className="flex items-center justify-between p-6 md:p-10 max-w-[1400px] mx-auto border-b-4 border-black mb-10 md:mb-20">
                <div className="font-black text-2xl uppercase tracking-tighter">FinAgent</div>
                <button 
                    onClick={() => router.push('/login')}
                    className="border-[3px] border-black bg-white hover:bg-[#008CD4] hover:text-white text-black font-bold uppercase text-sm px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all"
                >
                    Log In
                </button>
            </nav>

            {/* Hero Split */}
            <main className="max-w-[1400px] mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-8 items-center mb-32">
                <div className="space-y-8">
                    <h1 className="font-display font-black text-6xl md:text-8xl leading-[0.9] tracking-tighter uppercase">
                        Stop <span className="text-[#008CD4]">typing.</span><br/>
                        Stop manually tracking.
                    </h1>
                    <p className="text-xl md:text-2xl font-medium max-w-[20ch] leading-snug text-gray-800">
                        Talk to your ledger. Financial Agentic AI parses, categorizes, and tracks your money entirely through conversation.
                    </p>
                    <button 
                        onClick={() => router.push('/login')}
                        className="border-4 border-black bg-[#008CD4] text-white font-black uppercase text-xl px-8 py-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[8px] hover:translate-x-[8px] transition-all flex items-center gap-3 w-fit"
                    >
                        Get Started <ArrowRight strokeWidth={3} />
                    </button>
                </div>
                
                {/* Hero Asset - Fake Chat Interface */}
                <div className="relative">
                    <div className="w-full aspect-[4/5] md:aspect-square bg-white border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-8 flex flex-col justify-between">
                        <div className="font-black uppercase text-2xl border-b-4 border-black pb-4 mb-8">Agent Terminal</div>
                        
                        <div className="space-y-6 flex-1 flex flex-col justify-center">
                            <div className="bg-gray-100 border-[3px] border-black p-4 font-bold self-end w-3/4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                Uploaded receipt.jpg
                            </div>
                            <div className="bg-[#008CD4] text-white border-[3px] border-black p-4 font-bold w-5/6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                Parsed receipt. Added ₹450 for Groceries to your ledger.
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t-4 border-black flex gap-4">
                            <div className="flex-1 bg-gray-100 border-[3px] border-black p-4 font-bold font-mono text-gray-500">
                                AWAITING COMMAND_
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Features Bento */}
            <section className="max-w-[1400px] mx-auto px-6 md:px-10">
                <h2 className="font-black text-4xl md:text-6xl uppercase tracking-tighter mb-12">How it works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 flex flex-col gap-6">
                        <div className="w-16 h-16 bg-[#008CD4] border-4 border-black flex items-center justify-center">
                            <MessageSquare className="text-white w-8 h-8" strokeWidth={3} />
                        </div>
                        <div>
                            <h3 className="font-black text-2xl uppercase mb-3">Chat Native</h3>
                            <p className="font-medium text-lg leading-relaxed">Simply tell the agent what you spent. It understands natural language and categorizes expenses automatically.</p>
                        </div>
                    </div>
                    
                    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 flex flex-col gap-6">
                        <div className="w-16 h-16 bg-[#008CD4] border-4 border-black flex items-center justify-center">
                            <Shield className="text-white w-8 h-8" strokeWidth={3} />
                        </div>
                        <div>
                            <h3 className="font-black text-2xl uppercase mb-3">Vision AI</h3>
                            <p className="font-medium text-lg leading-relaxed">Drop a photo of a receipt or invoice. The agent extracts line items and adds them to your database.</p>
                        </div>
                    </div>

                    <div className="bg-black text-white border-4 border-black shadow-[8px_8px_0px_0px_#008CD4] p-8 flex flex-col gap-6">
                        <div className="w-16 h-16 bg-white border-4 border-white flex items-center justify-center">
                            <PieChart className="text-black w-8 h-8" strokeWidth={3} />
                        </div>
                        <div>
                            <h3 className="font-black text-2xl uppercase mb-3 text-[#008CD4]">Actionable Insights</h3>
                            <p className="font-medium text-lg leading-relaxed text-gray-300">View clean, brutalist data visualizations. No fluff, just the math that matters.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
