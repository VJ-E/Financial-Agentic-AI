import "./globals.css";

export const metadata = {
    title: "Financial Agentic AI",
    description: "MVP for agentic AI financial planner",
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
