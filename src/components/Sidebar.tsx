"use client";

import { motion } from "framer-motion";
import { useTradingStore } from "@/lib/trading-store";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-controller";

export function Sidebar() {
  const symbols = useTradingStore((state) => state.symbols);
  const selectedSymbol = useTradingStore((state) => state.selectedSymbol);
  const setSelectedSymbol = useTradingStore((state) => state.setSelectedSymbol);

  return (
    <aside className="hidden h-dvh w-64 flex-col border-r border-border/40 bg-gradient-to-b from-background via-background/80 to-background/50 px-5 py-6 lg:flex xl:w-72">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">NeoTrade</div>
          <div className="text-lg font-semibold text-primary">Binary Options</div>
        </div>
        <ThemeToggle />
      </div>

      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Markets</div>
      <div className="mt-4 space-y-2">
        {symbols.map((symbol) => {
          const active = symbol.value === selectedSymbol;
          return (
            <motion.button
              key={symbol.value}
              onClick={() => setSelectedSymbol(symbol.value)}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "group relative w-full overflow-hidden rounded-xl border border-border/40 bg-background/60 px-4 py-3 text-left transition",
                active
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              {active && (
                <motion.span
                  layoutId="activeGlow"
                  transition={{ type: "spring", stiffness: 220, damping: 30 }}
                  className="pointer-events-none absolute inset-0 rounded-xl bg-primary/10 blur-lg"
                />
              )}
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="font-medium tracking-wide">{symbol.label}</div>
                  <div className="text-xs text-muted-foreground/80">1m • Neo feeds</div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  BO
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-auto rounded-xl border border-border/40 bg-gradient-to-br from-primary/10 via-primary/5 to-background/40 p-4 text-xs text-muted-foreground">
        <div className="mb-2 text-sm font-semibold text-foreground">Latency Monitor</div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em]">
          <span>avg ping</span>
          <span className="text-emerald-400">18ms</span>
        </div>
        <div className="mt-3 text-[11px] uppercase tracking-[0.3em] text-muted-foreground/70">
          Optimized for rapid binary execution.
        </div>
      </div>
    </aside>
  );
}
