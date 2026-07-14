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
            },
            fontSize: {
                xs: ['calc(0.75rem * var(--text-scale, 1))', { lineHeight: 'calc(1rem * var(--text-scale, 1))' }],
                sm: ['calc(0.875rem * var(--text-scale, 1))', { lineHeight: 'calc(1.25rem * var(--text-scale, 1))' }],
                base: ['calc(1rem * var(--text-scale, 1))', { lineHeight: 'calc(1.5rem * var(--text-scale, 1))' }],
                lg: ['calc(1.125rem * var(--text-scale, 1))', { lineHeight: 'calc(1.75rem * var(--text-scale, 1))' }],
                xl: ['calc(1.25rem * var(--text-scale, 1))', { lineHeight: 'calc(1.75rem * var(--text-scale, 1))' }],
                '2xl': ['calc(1.5rem * var(--text-scale, 1))', { lineHeight: 'calc(2rem * var(--text-scale, 1))' }],
                '3xl': ['calc(1.875rem * var(--text-scale, 1))', { lineHeight: 'calc(2.25rem * var(--text-scale, 1))' }],
                '4xl': ['calc(2.25rem * var(--text-scale, 1))', { lineHeight: 'calc(2.5rem * var(--text-scale, 1))' }],
                '5xl': ['calc(3rem * var(--text-scale, 1))', { lineHeight: '1' }],
                '6xl': ['calc(3.75rem * var(--text-scale, 1))', { lineHeight: '1' }],
                '7xl': ['calc(4.5rem * var(--text-scale, 1))', { lineHeight: '1' }],
                '8xl': ['calc(6rem * var(--text-scale, 1))', { lineHeight: '1' }],
                '9xl': ['calc(8rem * var(--text-scale, 1))', { lineHeight: '1' }],
                '[10px]': ['calc(0.625rem * var(--text-scale, 1))', { lineHeight: 'calc(1rem * var(--text-scale, 1))' }]
            }
        },
    },
    plugins: [],
};

export default config;
