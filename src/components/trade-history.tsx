"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, History } from "lucide-react";
import { useTradingStore } from "@/lib/trading-store";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 12;

function formatElapsed(from: number, now: number) {
  const delta = now - from;
  if (delta < 0) return "just now";
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TradeHistoryPanel() {
  const history = useTradingStore((state) => state.tradeHistory);
  const clearHistory = useTradingStore((state) => state.clearTradeHistory);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(() => history.slice(0, MAX_VISIBLE), [history]);

  return (
    <section className="rounded-3xl border border-border/40 bg-background/70 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/40 bg-background/40">
            <History className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Trade history</div>
            <div className="text-sm text-muted-foreground/70">Latest {rows.length} of {history.length} trades</div>
          </div>
        </div>
        <button
          type="button"
          onClick={clearHistory}
          disabled={!history.length}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] transition",
            history.length
              ? "border-border/40 text-muted-foreground hover:border-primary/40 hover:text-primary"
              : "cursor-not-allowed border-border/20 text-muted-foreground/50"
          )}
        >
          Clear
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border/30">
        <div className="hidden grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr] bg-background/80 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground md:grid">
          <span>Asset</span>
          <span>Direction</span>
          <span>Exit</span>
          <span>Result</span>
          <span>Closed</span>
        </div>
        <AnimatePresence initial={false}>
          {rows.length ? (
            rows.map((trade) => (
              <motion.div
                key={trade.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-2 gap-4 border-t border-border/20 bg-background/60 px-4 py-4 text-sm md:grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr] md:items-center"
              >
                <div className="col-span-2 flex flex-col gap-1 md:col-span-1">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70 md:hidden">Asset</span>
                  <span className="font-semibold tracking-wide">{trade.symbol}</span>
                  <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">${trade.amount.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1 md:items-center">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70 md:hidden">Direction</span>
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.35em]",
                      trade.direction === "CALL" ? "text-emerald-300" : "text-rose-300"
                    )}
                  >
                    {trade.direction}
                    {trade.direction === "CALL" ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-muted-foreground/80">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70 md:hidden">Exit</span>
                  <span>{trade.exitPrice.toFixed(3)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70 md:hidden">Result</span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      trade.outcome === "win" ? "text-emerald-300" : "text-rose-300"
                    )}
                  >
                    {trade.profit > 0 ? `+${trade.profit.toFixed(2)}` : trade.profit.toFixed(2)} USD
                  </span>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground/70 md:col-span-1">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70 md:hidden">Closed</span>
                  <div>{formatElapsed(trade.closedAt, now)}</div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2 border-t border-border/20 bg-background/50 py-12 text-sm text-muted-foreground"
            >
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">No settled trades yet</div>
              <div>Completed positions will appear here.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
