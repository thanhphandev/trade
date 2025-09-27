## NeoTrade • Binary Options MVP UI

A high-fidelity, dark-first binary options trading terminal built with Next.js 15, Tailwind CSS v4, Shadcn-inspired components, Zustand state management, Framer Motion interactions, and lightweight-charts for real-time K-line visualisations.

### ✨ Highlights

- **Live market feed** via Binance 1-minute K-line WebSocket with graceful offline fallbacks
- **Candlestick, RSI, and MACD** visual stacks powered by `lightweight-charts`
- **Animated price ticker** with neon flash cues on every tick
- **Three-column desk layout** featuring: navigation sidebar, market analytics core, and execution panel
- **Actionable trade panel** with quick staking chips, expiry selectors, and neon Call/Put controls
- **Active orders board** with live countdowns and auto-settlement logic baked into the store
- **Theme toggle** (dark-first) persisting user preference

### 🚀 Quick start

```powershell
npm install
npm run dev
```

Visit http://localhost:3000 to explore the trading cockpit.

### 🧠 Architecture

- `src/lib/trading-store.ts` — centralized Zustand store for market data, session balances, and BO lifecycle
- `src/lib/hooks/use-price-feed.ts` — Binance WebSocket bootstrap + historical seeding + reconnection strategy
- `src/components/chart-area.tsx` — candlestick, RSI, MACD charts with responsive ResizeObservers
- `src/components/trade-panel.tsx` — Call/Put controls with payout projections and animated feedback
- `src/components/active-orders.tsx` — neon order tape with live countdowns and ITM/OTM status colouring
- `docs/feature-roadmap.md` — lộ trình phát triển tính năng chi tiết cho NeoTrade

### 🛠 Tooling

- `npm run dev` — start the Next.js dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — lint with ESLint 9 and TypeScript

### ⚠️ Notes

- The Binance WebSocket endpoint is configured for public markets. In restricted environments the app seeds synthetic candles so the UI remains demonstrable.
- Further integration (auth, order routing, persistence) can hook into the provided store without changing the UI contract.
