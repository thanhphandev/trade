"use client";

import { useEffect, useRef } from "react";
import { Candle, useTradingStore } from "../trading-store";

type BinanceRestKlineRow = [
  openTime: number,
  open: string,
  high: string,
  low: string,
  close: string,
  volume: string,
  closeTime: number,
  quoteAssetVolume: string,
  numberOfTrades: number,
  takerBuyBaseAssetVolume: string,
  takerBuyQuoteAssetVolume: string,
  ignore: string
];

type BinanceKlineStream = {
  t: number; // open time
  T: number; // close time
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
  x: boolean; // is final
};

type BinanceKlineEnvelope = {
  stream?: string;
  data?: { k: BinanceKlineStream };
  k?: BinanceKlineStream;
};

function isRestRow(row: unknown): row is BinanceRestKlineRow {
  return Array.isArray(row) && row.length >= 11;
}

function isKlineStream(value: unknown): value is BinanceKlineStream {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BinanceKlineStream>;
  return (
    typeof candidate.t === "number" &&
    typeof candidate.T === "number" &&
    typeof candidate.o === "string" &&
    typeof candidate.h === "string" &&
    typeof candidate.l === "string" &&
    typeof candidate.c === "string"
  );
}

const BINANCE_WS = (symbol: string) =>
  `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_1m`;

const BINANCE_REST = (symbol: string, limit = 300) =>
  `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=${limit}`;

const toCandle = (row: BinanceRestKlineRow): Candle => ({
  time: Math.floor(row[0] / 1000),
  open: Number(row[1]),
  high: Number(row[2]),
  low: Number(row[3]),
  close: Number(row[4]),
  volume: Number(row[5]),
  isClosed: true,
});

const fromKlineStream = (kline: BinanceKlineStream): Candle => ({
  time: Math.floor(kline.t / 1000),
  open: Number(kline.o),
  high: Number(kline.h),
  low: Number(kline.l),
  close: Number(kline.c),
  volume: Number(kline.v),
  isClosed: Boolean(kline.x),
});

export function usePriceFeed() {
  const selectedSymbol = useTradingStore((state) => state.selectedSymbol);
  const setCandles = useTradingStore((state) => state.setCandles);
  const upsertCandle = useTradingStore((state) => state.upsertCandle);
  const setConnectionStatus = useTradingStore((state) => state.setConnectionStatus);
  const finalizeOrders = useTradingStore((state) => state.finalizeOrders);
  const price = useTradingStore((state) => state.price);
  const priceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    priceRef.current = price;
  }, [price]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let cancelled = false;

    async function bootstrapHistory() {
      try {
        setConnectionStatus("connecting");
        const response = await fetch(BINANCE_REST(selectedSymbol, 500));
        const data = (await response.json()) as unknown;
        if (!cancelled && Array.isArray(data)) {
          const candles = data
            .filter(isRestRow)
            .map((row) => toCandle(row as BinanceRestKlineRow));
          if (candles.length) {
            setCandles(candles);
          }
        }
      } catch (error) {
        console.error("Failed to load historical candles", error);
        if (!cancelled) {
          // seeded synthetic data if network blocked
          const now = Math.floor(Date.now() / 1000);
          const fallback: Candle[] = Array.from({ length: 120 }, (_, idx) => {
            const base = now - (120 - idx) * 60;
            const open = 50000 + idx * 12;
            const close = open + (Math.random() - 0.5) * 200;
            const high = Math.max(open, close) + Math.random() * 120;
            const low = Math.min(open, close) - Math.random() * 120;
            return {
              time: base,
              open,
              high,
              low,
              close,
              volume: Math.random() * 5,
              isClosed: true,
            };
          });
          setCandles(fallback);
        }
      }
    }

    function connect() {
      if (cancelled) return;
      ws = new WebSocket(BINANCE_WS(selectedSymbol));
      setConnectionStatus("connecting");

      ws.onopen = () => {
        if (cancelled) return;
        setConnectionStatus("connected");
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnectionStatus("disconnected");
        reconnectTimer = window.setTimeout(() => {
          connect();
        }, 2000);
      };

      ws.onerror = () => {
        setConnectionStatus("disconnected");
        ws?.close();
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as BinanceKlineEnvelope;
          const klineCandidate = payload.k ?? payload.data?.k;
          if (!isKlineStream(klineCandidate)) return;
          const candle = fromKlineStream(klineCandidate);
          upsertCandle(candle);
          finalizeOrders(candle.close, Date.now());
        } catch (error) {
          console.error("Failed to process kline", error);
        }
      };
    }

    bootstrapHistory();
    connect();

    const timer = window.setInterval(() => {
      if (priceRef.current) {
        finalizeOrders(priceRef.current, Date.now());
      }
    }, 5_000);

    return () => {
      cancelled = true;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "component unmount");
      }
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      window.clearInterval(timer);
    };
  }, [selectedSymbol, setCandles, upsertCandle, setConnectionStatus, finalizeOrders]);
}
