"use client";

import { motion } from "framer-motion";
import { Activity, Coins, Radio } from "lucide-react";
import { useTradingStore } from "@/lib/trading-store";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-controller";

const statusMap = {
  connecting: {
    label: "Connecting",
    color: "text-amber-400",
    dot: "bg-amber-400/80",
  },
  connected: {
    label: "Live",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  disconnected: {
    label: "Offline",
    color: "text-rose-500",
    dot: "bg-rose-500",
  },
} as const;

export function GlobalHeader() {
  const balance = useTradingStore((state) => state.balance);
  const pnl = useTradingStore((state) => state.pnl);
  const connectionStatus = useTradingStore((state) => state.connectionStatus);
  const selectedSymbol = useTradingStore((state) => state.selectedSymbol);
  const symbols = useTradingStore((state) => state.symbols);
  const setSelectedSymbol = useTradingStore((state) => state.setSelectedSymbol);

  const status = statusMap[connectionStatus];

  return (
    <header className="sticky top-0 z-20 border-b border-border/40 bg-background/92 px-4 py-4 backdrop-blur-md md:px-6 lg:static lg:px-8 lg:py-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex w-full flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[0.65rem] uppercase tracking-[0.35em] text-muted-foreground/70">Account overview</div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <motion.span
                  key={balance}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="text-3xl font-semibold tracking-tight sm:text-4xl"
                >
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </motion.span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  PNL {pnl >= 0 ? "+" : ""}
                  {pnl.toFixed(2)} USD
                </span>
              </div>
            </div>
            <ThemeToggle className="shrink-0 lg:hidden" />
          </div>

          <div className="lg:hidden">
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto pb-1 pl-1 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-[220px] flex-col gap-3 rounded-2xl border border-border/40 bg-background/70 px-4 py-3 shadow-sm">
                <label className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">Asset</label>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={selectedSymbol}
                    onChange={(event) => setSelectedSymbol(event.target.value)}
                    className="w-full rounded-lg border border-border/40 bg-background/90 px-3 py-2 text-sm font-semibold tracking-wide text-foreground focus:border-primary/60 focus:outline-none"
                    aria-label="Select market"
                  >
                    {symbols.map((symbol) => (
                      <option key={symbol.value} value={symbol.value}>
                        {symbol.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex min-w-[180px] items-center gap-3 rounded-2xl border border-border/40 bg-background/70 px-4 py-3 text-sm shadow-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">Volatility</div>
                  <div className="font-semibold tracking-wide text-cyan-400">Moderate</div>
                </div>
              </div>

              <div className="flex min-w-[180px] items-center gap-3 rounded-2xl border border-border/40 bg-background/70 px-4 py-3 text-sm shadow-sm">
                <div className={cn("h-2.5 w-2.5 rounded-full", status.dot)} />
                <div>
                  <div className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">Feed</div>
                  <div className={cn("font-semibold tracking-wide", status.color)}>{status.label}</div>
                </div>
              </div>

              <motion.div
                className="flex min-w-[200px] items-center gap-3 rounded-2xl border border-primary/60 bg-primary/10 px-4 py-3 text-sm text-primary shadow-sm"
                animate={{ opacity: connectionStatus === "connected" ? 1 : 0.45 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <Radio className="h-4 w-4" />
                <div>
                  <div className="text-[0.65rem] uppercase tracking-[0.3em] text-primary/80">Latency</div>
                  <div className="font-semibold tracking-wide">Optimized</div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="hidden w-full gap-3 sm:grid-cols-2 lg:flex lg:w-auto lg:items-center lg:justify-end lg:gap-4 xl:gap-5">
          <div className="hidden items-center gap-2 rounded-xl border border-border/40 bg-background/60 px-4 py-2 text-sm lg:flex">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Asset</div>
              <div className="font-semibold tracking-wide">{selectedSymbol}</div>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-border/40 bg-background/60 px-4 py-2 text-sm sm:flex">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Volatility</div>
              <div className="font-semibold tracking-wide text-cyan-400">Moderate</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/60 px-4 py-2 text-sm">
            <div className={cn("h-2.5 w-2.5 rounded-full", status.dot)} />
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Feed</div>
              <div className={cn("font-semibold tracking-wide", status.color)}>{status.label}</div>
            </div>
          </div>

          <motion.div
            className="flex items-center gap-3 rounded-xl border border-primary/60 bg-primary/10 px-4 py-2 text-sm text-primary"
            animate={{ opacity: connectionStatus === "connected" ? 1 : 0.4, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <Radio className="h-4 w-4" />
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-primary/80">Latency</div>
              <div className="font-semibold tracking-wide">Optimized</div>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
