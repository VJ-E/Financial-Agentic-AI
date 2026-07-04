import React from 'react';
import { Send, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatTabProps {
    messages: any[];
    input: string;
    setInput: (val: string) => void;
    handleSubmit: (e: React.FormEvent) => void;
    isLoading: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement>;
}

export default function ChatTab({ messages, input, setInput, handleSubmit, isLoading, messagesEndRef }: ChatTabProps) {
    return (
        <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto bg-white border-x-4 border-black">
            {/* Header */}
            <div className="p-4 border-b-4 border-black bg-[#0055ff] flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Agent Chat</h2>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white" style={{ 
                backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0'
            }}>
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm text-center">
                            <h3 className="text-xl font-black uppercase mb-2">Initialize Link</h3>
                            <p className="font-mono text-sm text-gray-700">Type a message to boot up the agent protocol. Awaiting command...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {messages.map((m, idx) => (
                            <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-start gap-2 max-w-[90%] md:max-w-[80%]">
                                    {m.role === 'assistant' && (
                                        <span className="font-bold whitespace-nowrap pt-1 text-black">{'['}SYS{']'}:</span>
                                    )}
                                    <div className={`p-4 border-[3px] border-black font-sans w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                                        m.role === 'user' ? 'bg-[#0055ff] text-white font-bold' : 'bg-white text-black font-medium'
                                    }`}>
                                        {m.role === 'assistant' ? (
                                            <ReactMarkdown
                                                components={{
                                                    p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                                                    strong: ({node, ...props}) => <strong className="font-extrabold" {...props} />,
                                                    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3" {...props} />,
                                                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3" {...props} />,
                                                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                                    h1: ({node, ...props}) => <h1 className="text-2xl font-black uppercase mb-3 border-b-2 border-black pb-1" {...props} />,
                                                    h2: ({node, ...props}) => <h2 className="text-xl font-black uppercase mb-2" {...props} />,
                                                    h3: ({node, ...props}) => <h3 className="text-lg font-bold uppercase mb-2" {...props} />,
                                                    em: ({node, ...props}) => <em className="italic bg-yellow-200 px-1" {...props} />,
                                                    code: ({node, ...props}) => <code className="bg-gray-200 px-1 font-mono text-sm border border-black" {...props} />
                                                }}
                                            >
                                                {m.content}
                                            </ReactMarkdown>
                                        ) : (
                                            m.content
                                        )}
                                    </div>
                                    {m.role === 'user' && (
                                        <span className="font-bold whitespace-nowrap pt-1 text-black">:{'['}USR{']'}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex flex-col items-start">
                                <div className="flex items-start gap-2">
                                    <span className="font-bold whitespace-nowrap pt-1 text-black">{'['}SYS{']'}:</span>
                                    <div className="bg-white text-black p-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono font-bold animate-pulse">
                                        PROCESSING_QUERY...
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                )}
            </div>
            
            {/* Input Area */}
            <div className="p-4 bg-white border-t-4 border-black">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        className="flex-1 p-3 md:p-4 font-mono font-bold text-sm md:text-base border-4 border-black bg-[#f4f4f4] focus:outline-none focus:bg-white transition-colors placeholder:text-gray-500 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="EXECUTE COMMAND..."
                        disabled={isLoading}
                    />
                    <button 
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-black text-white p-3 md:p-4 border-4 border-black hover:bg-[#0055ff] disabled:opacity-50 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group"
                    >
                        <Send className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
}
