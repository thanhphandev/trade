"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Candle = {
  time: number; // seconds since epoch, UTC
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
};

export type Direction = "CALL" | "PUT";

export type TradingPair = {
  label: string;
  value: string;
};

export type ActiveOrder = {
  id: string;
  symbol: string;
  direction: Direction;
  amount: number;
  entryPrice: number;
  payout: number; // expressed as decimal e.g. 0.85
  expiry: number; // unix ms timestamp
  openedAt: number; // unix ms
};

export type TradeOutcome = "win" | "loss";

export type TradeHistoryEntry = {
  id: string;
  symbol: string;
  direction: Direction;
  amount: number;
  entryPrice: number;
  payout: number;
  expiry: number;
  openedAt: number;
  closedAt: number;
  exitPrice: number;
  outcome: TradeOutcome;
  profit: number;
};

type ConnectionStatus = "connecting" | "connected" | "disconnected";

export type NotificationVariant = "success" | "error" | "info" | "warning";

export type TradingNotification = {
  id: string;
  title: string;
  description?: string;
  variant: NotificationVariant;
  createdAt: number;
  spotlight?: boolean;
};

type NotificationInput = {
  id?: string;
  title: string;
  description?: string;
  variant: NotificationVariant;
  spotlight?: boolean;
};

type PlaceOrderInput = {
  direction: Direction;
  amount: number;
  expiryMinutes: number;
  payout: number;
};

type PlaceOrderResult = {
  success: boolean;
  message?: string;
};

type TradingStore = {
  balance: number;
  pnl: number;
  selectedSymbol: string;
  symbols: TradingPair[];
  candles: Candle[];
  price?: number;
  previousPrice?: number;
  connectionStatus: ConnectionStatus;
  activeOrders: ActiveOrder[];
  notifications: TradingNotification[];
  tradeHistory: TradeHistoryEntry[];
  placeOrder: (input: PlaceOrderInput) => PlaceOrderResult;
  setSelectedSymbol: (symbol: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setCandles: (payload: Candle[]) => void;
  upsertCandle: (candle: Candle) => void;
  finalizeOrders: (price: number, timestamp: number) => void;
  pushNotification: (input: NotificationInput) => string;
  dismissNotification: (id: string) => void;
  clearTradeHistory: () => void;
};

const INITIAL_SYMBOLS: TradingPair[] = [
  { label: "BTC / USDT", value: "BTCUSDT" },
  { label: "ETH / USDT", value: "ETHUSDT" },
  { label: "SOL / USDT", value: "SOLUSDT" },
  { label: "XRP / USDT", value: "XRPUSDT" },
  { label: "ADA / USDT", value: "ADAUSDT" },

  // --- Thêm các cặp phổ biến khác từ Binance ---
  { label: "BNB / USDT", value: "BNBUSDT" },
  { label: "DOGE / USDT", value: "DOGEUSDT" },
  { label: "MATIC / USDT", value: "MATICUSDT" },
  { label: "DOT / USDT", value: "DOTUSDT" },
  { label: "LTC / USDT", value: "LTCUSDT" },
  { label: "TRX / USDT", value: "TRXUSDT" },
  { label: "AVAX / USDT", value: "AVAXUSDT" },
  { label: "SHIB / USDT", value: "SHIBUSDT" },
  { label: "LINK / USDT", value: "LINKUSDT" }
];


const MAX_CANDLES = 720; // 12 hours of 1 minute candles
const MAX_NOTIFICATIONS = 5;
const MAX_TRADE_HISTORY = 500;

const createNotification = (input: NotificationInput): TradingNotification => ({
  id: input.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: input.title,
  description: input.description,
  variant: input.variant,
  createdAt: Date.now(),
  spotlight: input.spotlight ?? false,
});

const mergeNotifications = (
  existing: TradingNotification[],
  incoming: TradingNotification[]
): TradingNotification[] => {
  if (!incoming.length) return existing;
  const map = new Map<string, TradingNotification>();
  for (const notification of [...incoming, ...existing]) {
    if (!map.has(notification.id)) {
      map.set(notification.id, notification);
    }
  }
  const combined = Array.from(map.values());
  const spotlight = combined
    .filter((notification) => notification.spotlight)
    .sort((a, b) => b.createdAt - a.createdAt);
  const standard = combined
    .filter((notification) => !notification.spotlight)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, Math.max(0, MAX_NOTIFICATIONS - spotlight.length));
  return [...spotlight, ...standard];
};

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      balance: 10000,
      pnl: 0,
      selectedSymbol: INITIAL_SYMBOLS[0]?.value ?? "BTCUSDT",
      symbols: INITIAL_SYMBOLS,
      candles: [],
      price: undefined,
      previousPrice: undefined,
      connectionStatus: "connecting",
      activeOrders: [],
      notifications: [],
      tradeHistory: [],

      setSelectedSymbol: (symbol) => {
        if (symbol === get().selectedSymbol) return;
        set({
          selectedSymbol: symbol,
          candles: [],
          price: undefined,
          previousPrice: undefined,
          connectionStatus: "connecting",
        });
      },

      setConnectionStatus: (status) => set({ connectionStatus: status }),

      setCandles: (payload) => {
        const sorted = [...payload].sort((a, b) => a.time - b.time).slice(-MAX_CANDLES);
        set((state) => ({
          candles: sorted,
          previousPrice: state.price,
          price: sorted.at(-1)?.close ?? state.price,
        }));
      },

      upsertCandle: (candle) => {
        set((state) => {
          const candles = [...state.candles];
          const index = candles.findIndex((c) => c.time === candle.time);
          if (index >= 0) {
            candles[index] = candle;
          } else {
            candles.push(candle);
          }
          const trimmed = candles.sort((a, b) => a.time - b.time).slice(-MAX_CANDLES);
          const nextPrice = candle.close;
          return {
            candles: trimmed,
            previousPrice: state.price,
            price: nextPrice,
          };
        });
      },

      placeOrder: ({ direction, amount, expiryMinutes, payout }) => {
        const { balance, selectedSymbol, price } = get();
        if (!price) {
          set((state) => ({
            notifications: mergeNotifications(state.notifications, [
              createNotification({
                variant: "error",
                title: "Chưa có giá trực tiếp",
                description: "Vui lòng đợi cập nhật giá trước khi đặt lệnh.",
              }),
            ]),
          }));
          return { success: false, message: "Waiting for live price." };
        }
        if (amount <= 0) {
          set((state) => ({
            notifications: mergeNotifications(state.notifications, [
              createNotification({
                variant: "error",
                title: "Giá trị không hợp lệ",
                description: "Số tiền phải lớn hơn 0.",
              }),
            ]),
          }));
          return { success: false, message: "Enter a valid amount." };
        }
        if (amount > balance) {
          set((state) => ({
            notifications: mergeNotifications(state.notifications, [
              createNotification({
                variant: "error",
                title: "Không đủ số dư",
                description: "Vui lòng giảm số tiền hoặc nạp thêm vốn.",
              }),
            ]),
          }));
          return { success: false, message: "Insufficient balance." };
        }

        const now = Date.now();
        const expiry = now + expiryMinutes * 60 * 1000;
        const order: ActiveOrder = {
          id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
          symbol: selectedSymbol,
          direction,
          amount,
          entryPrice: price,
          payout,
          expiry,
          openedAt: now,
        };

        set((state) => ({
          balance: state.balance - amount,
          activeOrders: [...state.activeOrders, order],
          notifications: mergeNotifications(state.notifications, [
            createNotification({
              variant: "success",
              title: direction === "CALL" ? "Đặt lệnh Call thành công" : "Đặt lệnh Put thành công",
              description: `${selectedSymbol} • ${amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} USD • Tất toán trong ${expiryMinutes} phút`,
            }),
          ]),
        }));

        return {
          success: true,
        };
      },

      finalizeOrders: (price, timestamp) => {
        set((state) => {
          if (!state.activeOrders.length) return state;
          const remaining: ActiveOrder[] = [];
          let nextBalance = state.balance;
          let nextPnl = state.pnl;
          const notifications: TradingNotification[] = [];
          const historyEntries: TradeHistoryEntry[] = [];

          for (const order of state.activeOrders) {
            if (order.expiry > timestamp) {
              remaining.push(order);
              continue;
            }

            const won =
              (order.direction === "CALL" && price >= order.entryPrice) ||
              (order.direction === "PUT" && price <= order.entryPrice);

            const gross = order.amount * (1 + order.payout);
            const profit = won ? order.amount * order.payout : -order.amount;

            if (won) {
              nextBalance += gross;
              nextPnl += order.amount * order.payout;
              notifications.push(
                createNotification({
                  variant: "success",
                  title: "Lệnh thắng",
                  description: `${order.symbol} • +${profit.toFixed(2)} USD (Payout ${Math.round(
                    order.payout * 100
                  )}%)`,
                  spotlight: true,
                })
              );
            } else {
              nextPnl += profit; // profit is negative here
              notifications.push(
                createNotification({
                  variant: "error",
                  title: "Lệnh thua",
                  description: `${order.symbol} • ${profit.toFixed(2)} USD`,
                  spotlight: true,
                })
              );
            }

            historyEntries.push({
              id: order.id,
              symbol: order.symbol,
              direction: order.direction,
              amount: order.amount,
              entryPrice: order.entryPrice,
              payout: order.payout,
              expiry: order.expiry,
              openedAt: order.openedAt,
              closedAt: timestamp,
              exitPrice: price,
              outcome: won ? "win" : "loss",
              profit,
            });
          }

          const nextNotifications = notifications.length
            ? mergeNotifications(state.notifications, notifications)
            : state.notifications;

          const nextHistory = historyEntries.length
            ? [...historyEntries, ...state.tradeHistory]
                .sort((a, b) => b.closedAt - a.closedAt)
                .slice(0, MAX_TRADE_HISTORY)
            : state.tradeHistory;

          return {
            activeOrders: remaining,
            balance: nextBalance,
            pnl: nextPnl,
            notifications: nextNotifications,
            tradeHistory: nextHistory,
          };
        });
      },

      pushNotification: (input) => {
        const notification = createNotification(input);
        set((state) => ({
          notifications: mergeNotifications(state.notifications, [notification]),
        }));
        return notification.id;
      },

      dismissNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((notification) => notification.id !== id),
        }));
      },

      clearTradeHistory: () => {
        set({ tradeHistory: [] });
      },
    }),
    {
      name: "bo-trade-storage",
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({ tradeHistory: state.tradeHistory }),
    }
  )
);
