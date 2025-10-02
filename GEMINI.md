# 📘 GEMINI.md

## 🧠 Overview

Gemini CLI is a coding agent that generates a complete working application based on structured prompts. The application must be fully functional with `pnpm run dev` and deployable to GitHub Pages.

## Development Guidelines
- Think in English, but generate responses in Japanese (思考は英語、回答の生成は日本語で行うように)

## 🧩 Tech Stack

- **Frontend**: React 19 + Vite + TypeScript  
- **Styling**: TailwindCSS + daisyUI
- **Package Manager**: pnpm  
- **Deployment Target**: GitHub Pages  

## 🎯 Application Purpose

The application visualizes progression paths from a given starting rank to Rank 1. Each rank has a defined range of ranks it can challenge next, based on the following logic:

```ts
function getNextRankRange(currentRank: number): [number, number] {
  if (currentRank > 13) return [Math.floor(currentRank * 0.95), Math.floor(currentRank * 0.7)];
  if (currentRank > 10) return [currentRank - 2, currentRank - 4];
  if (currentRank > 4) return [currentRank - 1, currentRank - 3];
  if (currentRank > 1) return [currentRank - 1, 1];
  return [1, 1];
}
```

The app must compute and visualize two distinct paths:

- **Efficient Path**: The shortest route to Rank 1  
- **Match-Heavy Path**: The route with the most matches (maximum steps)

## 📊 Visualization Requirements

- Each rank range is represented as a bar  
- Bars are stacked to show progression  
- Efficient and match-heavy paths must be Each path should be toggleable via checkbox.
- Layout must be responsive and semantically clear  

## 🧪 Development Requirements

- TailwindCSS + daisyUI must be used for styling  
- No external state management libraries should be used  

## 🧭 Responsibility Boundaries

- This document defines the general scope and constraints of the project  
- All design decisions, component structures, and implementation details will be handled via the prompt provided to Gemini CLI  
