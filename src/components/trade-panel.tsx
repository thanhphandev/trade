"use client";

import { type ComponentType, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Timer } from "lucide-react";
import { Direction, useTradingStore } from "@/lib/trading-store";
import { cn } from "@/lib/utils";

const EXPIRY_OPTIONS = [1, 5, 15];
const PAYOUT = 0.85;

export function TradePanel() {
  const [amount, setAmount] = useState(50);
  const [expiry, setExpiry] = useState<number>(EXPIRY_OPTIONS[0]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const placeOrder = useTradingStore((state) => state.placeOrder);
  const price = useTradingStore((state) => state.price);
  const selectedSymbol = useTradingStore((state) => state.selectedSymbol);

  const handleAmountChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setAmount(Math.max(1, Math.round(value)));
  };

  const handleTrade = (direction: Direction) => {
    const result = placeOrder({
      direction,
      amount,
      expiryMinutes: expiry,
      payout: PAYOUT,
    });
    if (result.success) {
      setFeedback({ type: "success", message: `${direction} order placed` });
    } else if (result.message) {
      setFeedback({ type: "error", message: result.message });
    }
  };

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  return (
    <section className="group relative flex h-full flex-col rounded-3xl border border-border/40 bg-gradient-to-br from-primary/10 via-background/60 to-background/20 p-5 shadow-[0_45px_120px_-80px_rgba(14,242,182,0.45)] sm:p-6 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto lg:pb-8">
      <div>
        <div className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Trade control</div>
        <div className="mt-2 text-xl font-semibold tracking-tight">{selectedSymbol}</div>
        <div className="text-xs text-muted-foreground">Live @ {price ? price.toFixed(3) : "-"} USD</div>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span>Amount</span>
            <span className="text-muted-foreground/70">Auto risk managed</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-2xl border border-border/50 bg-background/70 px-4 py-3 shadow-[inset_0_0_30px_rgba(56,189,248,0.08)]">
              <input
                type="number"
                value={amount}
                onChange={(event) => handleAmountChange(Number(event.target.value))}
                className="w-full bg-transparent text-lg font-semibold outline-none"
                min={1}
              />
            </div>
            <div className="flex h-full flex-col gap-2">
              {[25, 50, 100].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => handleAmountChange(amount + delta)}
                  className="rounded-xl border border-border/40 bg-background/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  +{delta}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span>Expiry</span>
            <span className="flex items-center gap-1 text-muted-foreground/70"><Timer className="h-3.5 w-3.5" /> Quick select</span>
          </div>
          <div className="flex gap-2">
            {EXPIRY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setExpiry(option)}
                className={cn(
                  "flex-1 rounded-2xl border border-border/40 px-4 py-3 text-sm font-semibold tracking-wide transition",
                  expiry === option
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-primary"
                )}
              >
                {option}M
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border/40 bg-background/60 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span>Deal summary</span>
            <span>Payout {Math.round(PAYOUT * 100)}%</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1 rounded-2xl border border-border/20 bg-background/70 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Stake</div>
              <div className="text-lg font-semibold">${amount.toLocaleString()}</div>
            </div>
            <div className="space-y-1 rounded-2xl border border-border/20 bg-background/70 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Potential return</div>
              <div className="text-lg font-semibold text-emerald-300">
                ${(amount * (1 + PAYOUT)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-4 pb-4 lg:pb-0">
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.div
              key={feedback.message}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-medium",
                feedback.type === "success"
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-200"
              )}
            >
              {feedback.message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-3">
          <TradeActionButton
            label="Call"
            subLabel="Buy • Higher"
            icon={ArrowUpRight}
            palette={{
              background: "from-emerald-400/30 via-emerald-500/20 to-cyan-500/40",
              border: "border-emerald-300/60",
              text: "text-emerald-50",
              shadow: "shadow-[0_25px_80px_-30px_rgba(16,185,129,0.65)]",
            }}
            onClick={() => handleTrade("CALL")}
          />
          <TradeActionButton
            label="Put"
            subLabel="Sell • Lower"
            icon={ArrowDownRight}
            palette={{
              background: "from-rose-500/40 via-fuchsia-500/20 to-orange-500/30",
              border: "border-rose-400/60",
              text: "text-rose-50",
              shadow: "shadow-[0_25px_80px_-30px_rgba(244,63,94,0.65)]",
            }}
            onClick={() => handleTrade("PUT")}
          />
        </div>
      </div>
    </section>
  );
}

type TradeActionButtonProps = {
  label: string;
  subLabel: string;
  icon: ComponentType<{ className?: string }>;
  palette: {
    background: string;
    border: string;
    text: string;
    shadow: string;
  };
  onClick: () => void;
};

function TradeActionButton({
  label,
  subLabel,
  icon: Icon,
  palette,
  onClick
}: TradeActionButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        // Layout & spacing
        "relative flex flex-col justify-between gap-3 rounded-2xl border px-6 py-7 text-left",
        "transition-colors duration-200",
        // Palette
        palette.background,
        palette.border,
        palette.text,
        palette.shadow
      )}
    >
      {/* Icon + title */}
      <div className="flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight">{label}</span>
        <Icon className="h-6 w-6 opacity-80" />
      </div>

      {/* Sub label */}
      <div className="text-sm font-medium text-foreground/60">
        {subLabel}
      </div>

      {/* Optional info */}
      <div className="text-xs font-medium text-foreground/70">
        Payout +85%
      </div>
    </motion.button>
  );
}
