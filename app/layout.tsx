import "./globals.css";

import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: '#008CD4',
}

export const metadata: Metadata = {
    title: "Financial Agentic AI",
    description: "MVP for agentic AI financial planner",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Financial Agent",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
