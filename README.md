# Financial Agentic AI

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel AI SDK" />
</p>

## Description

A powerful, agentic financial assistant and full-fledged personal financial dashboard built with a strict, high-contrast Neo-Brutalist design system. The application features a dynamic frontend providing real-time data visualizations (cash flow and expenses) powered by custom SVG charting patterns. Operating at the core is a terminal-hybrid AI chat interface acting as the command center for the financial planner. The agent actively parses commands, updates the local financial data context instantly, and simulates autonomous backend queries mapped directly to the dashboard state.

## Tech Stack

*   **Next.js**: Framework for the web application architecture (App Router).
*   **React**: UI component library for building the dashboard and terminal chat interface natively.
*   **Tailwind CSS (v3)**: Core styling engine strictly configured for the monochrome, high-contrast Neo-Brutalist aesthetic.
*   **Recharts**: Mathematical data visualization library utilized for high-contrast, step-based SVG pattern charts.
*   **Lucide React**: Vector library providing sharp, minimalist iconography.
*   **Vercel AI SDK**: Core AI integration library used to orchestrate tool definitions and the dialogue.
*   **Ollama AI Provider**: Local LLM driver executing the core intelligence (using the local Llama 3.1 model).
*   **TypeScript**: Ensures type safety across project components, dashboard states, and APIs.
*   **Zod**: Validates structured outputs and function call parameters required by the language model.

## Project Architecture

The architecture is designed to reflect an autonomous financial workstation:

1.  **Frontend Layout (`app/page.tsx`)**: 
    A strictly structured, flexible React grid rendering a Neo-Brutalist dashboard. The upper viewport presents dynamic, high-contrast summary cards, categorized spending views, and custom SVG-patterned Rechart graphs. The lower viewport houses a sticky, terminal-hybrid AI agent command center simulating real-time system connections.
2.  **State Management & Reactivity**:
    The main client layer (`app/page.tsx`) maintains cohesive `useState` mapping for all mock financial entities (Summary, Top Spending, Plots). The interface executes simulated API parsing; when a user issues an intent-driven command via the AI Terminal (e.g., 'Add $50 to groceries'), the frontend dynamically intercepts the command, simulating an agentic API response, applying hard mathematical updates to the components, and executing the visual chart re-renders instantly without page loads.
3.  **API Gateway & Orchestration Layer (`app/api/chat/route.ts`)**:
    The hub managing asynchronous requests between the interface and the local intelligence provider. It injects rigorous procedural bounds via system prompts.
4.  **Local Intelligence Engine**:
    Vercel AI SDK interacting with a local Ollama daemon. The model acts upon tool calls and safely segregated backend mock logic (`lib/mockData.ts`), executing tasks, managing database states, and synthesizing final actions sent back to the terminal.
