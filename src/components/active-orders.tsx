"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTradingStore } from "@/lib/trading-store";
import { cn } from "@/lib/utils";

function formatCountdown(ms: number) {
  if (ms <= 0) return "Expiring";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function ActiveOrdersTable() {
  const orders = useTradingStore((state) => state.activeOrders);
  const price = useTradingStore((state) => state.price);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(() => {
    return orders
      .slice()
      .sort((a, b) => a.expiry - b.expiry)
      .map((order) => {
        const remaining = order.expiry - now;
        return {
          ...order,
          remaining,
          countdown: formatCountdown(remaining),
          inTheMoney:
            price !== undefined &&
            ((order.direction === "CALL" && price >= order.entryPrice) ||
              (order.direction === "PUT" && price <= order.entryPrice)),
        };
      });
  }, [orders, now, price]);

  return (
    <section className="rounded-3xl border border-border/40 bg-background/70 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Active orders</div>
          <div className="text-sm text-muted-foreground/70">Auto settles on expiry</div>
        </div>
        <div className="rounded-full border border-border/40 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {orders.length} open
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border/30">
        <div className="hidden grid-cols-[1fr_0.8fr_0.8fr_0.6fr_0.6fr] bg-background/80 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground md:grid">
          <span>Asset</span>
          <span>Direction</span>
          <span>Stake</span>
          <span>Entry</span>
          <span>Countdown</span>
        </div>
        <AnimatePresence initial={false}>
          {rows.length ? (
            rows.map((row) => (
              <motion.div
                key={row.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-2 gap-4 border-t border-border/20 bg-background/60 px-4 py-4 text-sm md:grid-cols-[1fr_0.8fr_0.8fr_0.6fr_0.6fr] md:items-center"
              >
                <div className="col-span-2 flex flex-col gap-1 md:col-span-1">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70 md:hidden">Asset</span>
                  <span className="font-semibold tracking-wide">{row.symbol}</span>
                  <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70 md:hidden">
                    Stake ${row.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70 md:hidden">Direction</span>
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-[0.4em]",
                      row.direction === "CALL" ? "text-emerald-300" : "text-rose-300"
                    )}
                  >
                    {row.direction}
                  </span>
                </div>
                <div className="hidden md:block">${row.amount.toLocaleString()}</div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70 md:hidden">Entry</span>
                  <span className="text-muted-foreground/80">{row.entryPrice.toFixed(2)}</span>
                </div>
                <div className="col-span-2 flex flex-col gap-1 text-sm font-medium md:col-span-1">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70 md:hidden">Countdown</span>
                  <span
                    className={cn(
                      row.remaining <= 0
                        ? "text-amber-300"
                        : row.inTheMoney
                        ? "text-emerald-300"
                        : "text-rose-300"
                    )}
                  >
                    {row.countdown}
                  </span>
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
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">No active orders</div>
              <div>Execute a Call or Put to populate the feed.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
