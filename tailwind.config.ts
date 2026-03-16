import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                black: "#000000",
                white: "#ffffff",
                gray: {
                    100: "#f4f4f4",
                    300: "#d1d1d1",
                    500: "#737373",
                    700: "#404040",
                    900: "#171717",
                },
                accent: "#FFDE00",
                alert: "#FF0000",
            },
            fontFamily: {
                sans: ['Space Grotesk', 'Inter', 'sans-serif'],
                mono: ['IBM Plex Mono', 'monospace'],
                display: ['Archivo Black', 'sans-serif'],
            },
            boxShadow: {
                'brutal': '4px 4px 0px 0px rgba(0,0,0,1)',
                'brutal-lg': '8px 8px 0px 0px rgba(0,0,0,1)',
                'brutal-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
            },
            borderWidth: {
                '2': '2px',
                '3': '3px',
                '4': '4px',
            },
            borderRadius: {
                'none': '0px',
            }
        },
    },
    plugins: [],
};

export default config;
