"use client";
import React, { useState, useEffect } from 'react';
import AgentAvatar from './AgentAvatar';

const DIALOGS = [
    { text: "Your finances are looking sharp!", emotion: "success" },
    { text: "Hmm, let me crunch these numbers...", emotion: "inspect" },
    { text: "Wow, that's an interesting trend!", emotion: "surprise" },
    { text: "A penny saved is a penny earned.", emotion: "idle" },
    { text: "I'm keeping an eye on your budget.", emotion: "inspect" },
    { text: "Excellent job tracking this!", emotion: "success" }
];

export default function FloatingAvatar() {
    const [dialog, setDialog] = useState<string | null>(null);
    const [emotion, setEmotion] = useState<string>("idle");
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Randomly trigger a dialog every 10-25 seconds
        const triggerRandomDialog = () => {
            const randomItem = DIALOGS[Math.floor(Math.random() * DIALOGS.length)];
            setDialog(randomItem.text);
            setEmotion(randomItem.emotion);
            setIsVisible(true);

            // Hide the dialog after 5 seconds
            setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => setEmotion("idle"), 500);
            }, 5000);

            // Schedule the next one
            const nextDelay = 10000 + Math.random() * 15000;
            timeoutId = setTimeout(triggerRandomDialog, nextDelay);
        };

        let timeoutId = setTimeout(triggerRandomDialog, 5000); // First one after 5s

        return () => clearTimeout(timeoutId);
    }, []);

    return (
        <div className="hidden md:flex fixed top-24 right-8 z-50 flex-col items-end pointer-events-none">
            {isVisible && (
                <div className="mb-4 bg-white border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce relative max-w-[200px]">
                    <p className="font-bold text-sm uppercase">{dialog}</p>
                    {/* Speech bubble tail */}
                    <div className="absolute -bottom-3 right-8 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-black border-r-[12px] border-r-transparent"></div>
                    <div className="absolute -bottom-1.5 right-[33px] w-0 h-0 border-l-[10px] border-l-transparent border-t-[10px] border-t-white border-r-[10px] border-r-transparent"></div>
                </div>
            )}
            <div className="pointer-events-auto cursor-pointer hover:scale-110 transition-transform">
                <AgentAvatar size="100px" color="#000000" state={emotion as any} />
            </div>
        </div>
    );
}
