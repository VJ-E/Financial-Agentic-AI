"use client";
import React, { useEffect, useRef, useState } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'agent-robot-avatar': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { 
          size?: string, 
          color?: string, 
          motion?: string 
      };
    }
  }
}

interface AgentAvatarProps {
    size?: string;
    color?: string;
    state?: string;
    motion?: "auto" | "none";
}

export default function AgentAvatar({ 
    size = "120", 
    color = "#008CD4", 
    state = "idle",
    motion = "auto"
}: AgentAvatarProps) {
    const avatarRef = useRef<any>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        import("agent-robot-avatar").then(() => {
            setIsClient(true);
        }).catch(e => console.error("Failed to load agent-robot-avatar", e));
    }, []);

    useEffect(() => {
        if (avatarRef.current && isClient) {
            try {
                // Call the play method on the underlying custom element
                avatarRef.current.play(state);
            } catch(e) {
                console.error("Avatar failed to play state:", state, e);
            }
        }
    }, [state, isClient]);

    if (!isClient) return <div style={{ width: size, height: size }} />;

    return (
        <div style={{ width: size, height: size, display: 'inline-block', lineHeight: 0 }}>
            {React.createElement('agent-robot-avatar', {
                ref: avatarRef,
                size,
                color,
                motion
            })}
        </div>
    );
}
