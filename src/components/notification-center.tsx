"use client";

import { type ComponentType, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradingStore, type TradingNotification } from "@/lib/trading-store";

type NotificationStyle = {
  icon: ComponentType<{ className?: string }>;
  accent: string;
  border: string;
  glow: string;
};

const STYLES: Record<TradingNotification["variant"], NotificationStyle> = {
  success: {
    icon: CheckCircle2,
    accent: "text-emerald-300",
    border: "border-emerald-400/40 bg-emerald-500/10",
    glow: "shadow-[0_48px_180px_-68px_rgba(16,185,129,0.65)]",
  },
  error: {
    icon: AlertCircle,
    accent: "text-rose-300",
    border: "border-rose-500/40 bg-rose-500/10",
    glow: "shadow-[0_48px_180px_-68px_rgba(244,63,94,0.65)]",
  },
  info: {
    icon: Info,
    accent: "text-sky-300",
    border: "border-sky-400/40 bg-sky-500/10",
    glow: "shadow-[0_48px_180px_-72px_rgba(14,165,233,0.45)]",
  },
  warning: {
    icon: AlertCircle,
    accent: "text-amber-300",
    border: "border-amber-400/40 bg-amber-500/10",
    glow: "shadow-[0_48px_180px_-72px_rgba(250,204,21,0.45)]",
  },
};

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  if (diff < 1000) return "vừa xong";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s trước`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m trước`;
  return `${Math.floor(diff / 3_600_000)}h trước`;
}

type ToastProps = {
  notification: TradingNotification;
  spotlight?: boolean;
  stackIndex?: number;
  stackCount?: number;
};

function ToastItem({ notification, spotlight = false, stackIndex = 0, stackCount = 1 }: ToastProps) {
  const dismiss = useTradingStore((state) => state.dismissNotification);
  const style = STYLES[notification.variant];
  const Icon = style.icon;

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(notification.id), spotlight ? 6200 : 4800);
    return () => window.clearTimeout(timer);
  }, [notification.id, dismiss, spotlight]);

  if (spotlight) {
    return (
      <motion.div
        layout
        key={notification.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className={cn(
          "pointer-events-auto w-full max-w-xl overflow-hidden rounded-[32px] border-2 px-10 py-10 text-center backdrop-blur-3xl",
          style.border,
          style.glow
        )}
      >
        <div className="flex flex-col items-center gap-6">
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-black/20 text-foreground",
              style.accent
            )}
          >
            <Icon className="h-10 w-10" />
          </div>
          <div className="space-y-3">
            <span className="block text-xs uppercase tracking-[0.5em] text-muted-foreground/70">
              Kết quả giao dịch
            </span>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{notification.title}</p>
            {notification.description ? (
              <p className="text-base text-muted-foreground/90">{notification.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
            <span>{formatRelativeTime(notification.createdAt)}</span>
            <button
              type="button"
              onClick={() => dismiss(notification.id)}
              className="rounded-full border border-current/20 px-4 py-2 text-[0.7rem] font-semibold tracking-[0.3em] text-foreground transition hover:bg-foreground/10"
              aria-label="Đóng thông báo"
            >
              Đóng
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const depth = Math.min(stackIndex, 3);
  const translate = depth * 14;
  const scale = 1 - depth * 0.04;
  const opacity = 1 - depth * 0.12;
  const marginTop = stackIndex === 0 ? 0 : -32;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: Math.max(opacity, 0.55), y: translate, scale, zIndex: stackCount - stackIndex }}
      exit={{ opacity: 0, y: -18, scale: 0.94 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "pointer-events-auto overflow-hidden rounded-2xl border px-4 py-4 shadow-[0_20px_68px_-32px_rgba(14,242,182,0.35)] backdrop-blur",
        style.border
      )}
      style={{ marginTop, transformOrigin: "top right" }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-1", style.accent)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold leading-tight text-foreground">{notification.title}</p>
            <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>
          {notification.description ? (
            <p className="mt-2 text-sm text-muted-foreground/90">{notification.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => dismiss(notification.id)}
          className="rounded-full p-1 text-muted-foreground transition hover:text-foreground"
          aria-label="Đóng thông báo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function NotificationCenter() {
  const notifications = useTradingStore((state) => state.notifications);
  const spotlight = notifications.filter((notification) => notification.spotlight);
  const standard = notifications.filter((notification) => !notification.spotlight);
  const STACK_LIMIT = 4;
  const visibleStandard = standard.slice(0, STACK_LIMIT);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-end px-4 py-6 sm:px-8 sm:py-8">
        <div className="relative flex w-full max-w-sm flex-col items-end">
          <AnimatePresence initial={false}>
            {visibleStandard.map((notification, index) => (
              <ToastItem
                key={notification.id}
                notification={notification}
                stackIndex={index}
                stackCount={visibleStandard.length}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
        <AnimatePresence>
          {spotlight.map((notification) => (
            <ToastItem key={notification.id} notification={notification} spotlight />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
