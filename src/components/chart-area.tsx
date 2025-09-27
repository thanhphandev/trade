"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";
import { AnimatePresence, animate, motion } from "framer-motion";
import type { AnimationPlaybackControls } from "framer-motion";
import { calculateMACD, calculateRSI } from "@/lib/indicators";
import { type Candle, useTradingStore } from "@/lib/trading-store";
import { cn } from "@/lib/utils";

function clampChannel(channel: number) {
  return Math.round(Math.max(0, Math.min(255, channel * 255)));
}

function formatRgb(r: number, g: number, b: number) {
  return `rgb(${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)})`;
}

function parseLab(color: string): string | null {
  const match = color.match(/lab\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1]
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;
  const lRaw = parts[0];
  const l = parseFloat(lRaw.replace("%", ""));
  const a = parseFloat(parts[1]);
  const b = parseFloat(parts[2]);
  if (Number.isNaN(l) || Number.isNaN(a) || Number.isNaN(b)) return null;
  const L = lRaw.includes("%") ? l : l * 100;

  const y = (L + 16) / 116;
  const x = a / 500 + y;
  const z = y - b / 200;

  const cubed = (value: number) => {
    const v3 = value ** 3;
    const epsilon = 0.008856;
    const kappa = 903.3;
    return v3 > epsilon ? v3 : (116 * value - 16) / kappa;
  };

  const X = 95.047 * cubed(x);
  const Y = 100 * cubed(y);
  const Z = 108.883 * cubed(z);

  const xr = X / 100;
  const yr = Y / 100;
  const zr = Z / 100;

  const toLinear = (value: number) => {
    return value > 0.0031308 ? 1.055 * Math.pow(value, 1 / 2.4) - 0.055 : 12.92 * value;
  };

  const r = toLinear(xr * 3.2406 + yr * -1.5372 + zr * -0.4986);
  const g = toLinear(xr * -0.9689 + yr * 1.8758 + zr * 0.0415);
  const bl = toLinear(xr * 0.0557 + yr * -0.204 + zr * 1.057);

  return formatRgb(r, g, bl);
}

function parseOklch(color: string): string | null {
  const match = color.match(/oklch\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1]
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;

  const lRaw = parts[0];
  const cRaw = parts[1];
  const hRaw = parts[2];
  let l = parseFloat(lRaw.replace("%", ""));
  const c = parseFloat(cRaw);
  const h = parseFloat(hRaw);
  if (Number.isNaN(l) || Number.isNaN(c) || Number.isNaN(h)) return null;
  if (lRaw.includes("%")) {
    l /= 100;
  }

  const rad = (h * Math.PI) / 180;
  const a = Math.cos(rad) * c;
  const b = Math.sin(rad) * c;

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  return formatRgb(r, g, bl);
}

function resolveCanvasColor(value: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const color = value.trim();
  if (!color) return fallback;

  if (color.startsWith("lab")) {
    const converted = parseLab(color);
    if (converted) return converted;
  }

  if (color.startsWith("oklch")) {
    const converted = parseOklch(color);
    if (converted) return converted;
  }

  if (color.startsWith("oklab")) {
    return resolveCanvasColor(color.replace("oklab", "oklch"), fallback);
  }

  const element = document.createElement("span");
  element.style.color = color;
  element.style.position = "absolute";
  element.style.left = "-9999px";
  document.body.appendChild(element);
  const computed = getComputedStyle(element).color;
  element.remove();
  return computed || fallback;
}

function toCandleData(candles: Candle[]): CandlestickData[] {
  return candles.map((candle) => ({
    time: candle.time as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

export function ChartArea() {
  const candles = useTradingStore((state) => state.candles);
  const price = useTradingStore((state) => state.price);
  const previousPrice = useTradingStore((state) => state.previousPrice);
  const selectedSymbol = useTradingStore((state) => state.selectedSymbol);

  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  const candleContainerRef = useRef<HTMLDivElement | null>(null);
  const rsiContainerRef = useRef<HTMLDivElement | null>(null);
  const macdContainerRef = useRef<HTMLDivElement | null>(null);

  const candleChartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const rsiChartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const macdChartRef = useRef<IChartApi | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSignalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const didFitRef = useRef(false);
  const initializedSeriesRef = useRef(false);
  const lastSyncedTimeRef = useRef<number | null>(null);
  const previousLengthRef = useRef(0);
  const lastCandleSnapshotRef = useRef<Candle | null>(null);
  const candleAnimationRef = useRef<AnimationPlaybackControls | null>(null);

  const metricsFormatter = useMemo(() => {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
  }, []);

  const analytics = useMemo(() => {
    if (!candles.length) {
      return {
        swingHigh: null as number | null,
        swingLow: null as number | null,
        totalVolume: null as number | null,
        averageBody: null as number | null,
        momentum: null as number | null,
      };
    }

    const windowCandles = candles.slice(-90);
    const highs = windowCandles.map((candle) => candle.high);
    const lows = windowCandles.map((candle) => candle.low);
    const swingHigh = highs.length ? Math.max(...highs) : null;
    const swingLow = lows.length ? Math.min(...lows) : null;
    const totalVolume = windowCandles.reduce((acc, candle) => acc + candle.volume, 0);
    const averageBodySum = windowCandles.reduce((acc, candle) => acc + Math.abs(candle.close - candle.open), 0);
    const momentum =
      windowCandles.length >= 2
        ? ((windowCandles.at(-1)!.close - windowCandles[0].close) / windowCandles[0].close) * 100
        : 0;

    return {
      swingHigh,
      swingLow,
      totalVolume,
      averageBody: windowCandles.length ? averageBodySum / windowCandles.length : null,
      momentum,
    };
  }, [candles]);

  const range = analytics.swingHigh != null && analytics.swingLow != null ? analytics.swingHigh - analytics.swingLow : null;
  const momentumNumber = analytics.momentum ?? 0;
  const formattedVolume = analytics.totalVolume != null ? metricsFormatter.format(analytics.totalVolume) : "-";
  const formattedRange = range != null ? range.toFixed(2) : "-";
  const formattedBody = analytics.averageBody != null ? analytics.averageBody.toFixed(2) : "-";
  const formattedMomentum = Math.abs(momentumNumber) > 0 ? Math.abs(momentumNumber).toFixed(2) : "0.00";
  const statTiles = useMemo(
    () => [
      { label: "Range", value: formattedRange, accent: null as number | null },
      { label: "Avg Body", value: formattedBody, accent: null as number | null },
      {
        label: "Momentum",
        value: `${momentumNumber >= 0 ? "+" : "-"}${formattedMomentum}%`,
        accent: momentumNumber,
      },
      { label: "Volume", value: formattedVolume, accent: null as number | null },
    ],
    [formattedRange, formattedBody, formattedMomentum, formattedVolume, momentumNumber]
  );

  useEffect(() => {
    if (!candleContainerRef.current || candleChartRef.current) return;

    const textColor = resolveCanvasColor(
      getComputedStyle(document.documentElement).getPropertyValue("--foreground"),
      "rgb(226, 232, 240)"
    );

    const baseOptions = {
      layout: {
        background: { type: ColorType.Solid as const, color: "rgba(0,0,0,0)" },
        textColor: textColor || "#e2e8f0",
        fontFamily: "var(--font-geist-mono)",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.12)" },
        horzLines: { color: "rgba(148, 163, 184, 0.12)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderVisible: false,
        textColor: textColor || "#e2e8f0",
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
    };

    const candleChart = createChart(candleContainerRef.current, {
      width: candleContainerRef.current.clientWidth,
      height: candleContainerRef.current.clientHeight,
      ...baseOptions,
    });
    const candlestickSeries = candleChart.addSeries(CandlestickSeries, {
      upColor: "#01f1d0",
      borderUpColor: "#0bf9ff",
      wickUpColor: "#0bf9ff",
      downColor: "#ff3b8d",
      borderDownColor: "#ff5f6d",
      wickDownColor: "#ff5f6d",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });

    const rsiChart = createChart(rsiContainerRef.current!, {
      width: rsiContainerRef.current!.clientWidth,
      height: rsiContainerRef.current!.clientHeight,
      ...baseOptions,
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.3, bottom: 0.1 },
        textColor: textColor || "#e2e8f0",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.08)" },
        horzLines: { color: "rgba(148, 163, 184, 0.08)" },
      },
    });
    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: "#22d3ee",
      lineWidth: 2,
      priceLineVisible: false,
    });

    const macdChart = createChart(macdContainerRef.current!, {
      width: macdContainerRef.current!.clientWidth,
      height: macdContainerRef.current!.clientHeight,
      ...baseOptions,
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.3, bottom: 0.1 },
        textColor: textColor || "#e2e8f0",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.08)" },
        horzLines: { color: "rgba(148, 163, 184, 0.08)" },
      },
    });
    const macdSeries = macdChart.addSeries(LineSeries, {
      color: "#818cf8",
      lineWidth: 2,
      priceLineVisible: false,
    });
    const macdSignalSeries = macdChart.addSeries(LineSeries, {
      color: "#f472b6",
      lineWidth: 2,
      priceLineVisible: false,
    });
    const macdHistogramSeries = macdChart.addSeries(HistogramSeries, {
      base: 0,
      color: "#22d3ee",
      priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
    });

    candleChartRef.current = candleChart;
    candleSeriesRef.current = candlestickSeries;
    rsiChartRef.current = rsiChart;
    rsiSeriesRef.current = rsiSeries;
    macdChartRef.current = macdChart;
    macdSeriesRef.current = macdSeries;
    macdSignalSeriesRef.current = macdSignalSeries;
    macdHistogramSeriesRef.current = macdHistogramSeries;

    const observers: ResizeObserver[] = [];

    const attachObserver = (dom: HTMLElement, chart: IChartApi) => {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          chart.applyOptions({ width, height });
          chart.timeScale().fitContent();
        }
      });
      observer.observe(dom);
      observers.push(observer);
    };

    attachObserver(candleContainerRef.current, candleChart);
    attachObserver(rsiContainerRef.current!, rsiChart);
    attachObserver(macdContainerRef.current!, macdChart);

    return () => {
      observers.forEach((observer) => observer.disconnect());
      candleChart.remove();
      rsiChart.remove();
      macdChart.remove();
      candleChartRef.current = null;
      candleSeriesRef.current = null;
      rsiChartRef.current = null;
      rsiSeriesRef.current = null;
      macdChartRef.current = null;
      macdSeriesRef.current = null;
      macdSignalSeriesRef.current = null;
      macdHistogramSeriesRef.current = null;
      didFitRef.current = false;
      lastCandleSnapshotRef.current = null;
      candleAnimationRef.current?.stop?.();
      candleAnimationRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candles.length || !candleSeriesRef.current) {
      previousLengthRef.current = candles.length;
      lastCandleSnapshotRef.current = candles.at(-1) ?? null;
      return;
    }

    const series = candleSeriesRef.current;
    const latest = candles[candles.length - 1];
    const previousLength = previousLengthRef.current;
  const lastSyncedTime = lastSyncedTimeRef.current;

    const datasetReset =
      !initializedSeriesRef.current ||
  !lastSyncedTime ||
      candles.length < 3 ||
  candles.length < previousLength ||
  latest.time < lastSyncedTime ||
      candles.length - previousLength > 2;

    if (datasetReset) {
      series.setData(toCandleData(candles));
      initializedSeriesRef.current = true;
      lastSyncedTimeRef.current = latest.time;
      previousLengthRef.current = candles.length;
      lastCandleSnapshotRef.current = latest;
      candleChartRef.current?.timeScale().fitContent();
      didFitRef.current = true;
      return;
    }

  const previousSnapshot = lastCandleSnapshotRef.current ?? latest;
  const isNewBar = lastSyncedTime != null && latest.time > lastSyncedTime;

    candleAnimationRef.current?.stop?.();

    const startingValues = isNewBar
      ? {
          open: latest.open,
          high: latest.open,
          low: latest.open,
          close: latest.open,
        }
      : {
          open: previousSnapshot.open,
          high: previousSnapshot.high,
          low: previousSnapshot.low,
          close: previousSnapshot.close,
        };

    series.update({
      time: latest.time as UTCTimestamp,
      ...startingValues,
    });

    candleAnimationRef.current = animate(0, 1, {
      duration: 0.6,
      ease: "easeInOut",
      onUpdate: (progress) => {
        const interpolate = (start: number, end: number) => start + (end - start) * progress;
        series.update({
          time: latest.time as UTCTimestamp,
          open: interpolate(startingValues.open, latest.open),
          high: interpolate(startingValues.high, latest.high),
          low: interpolate(startingValues.low, latest.low),
          close: interpolate(startingValues.close, latest.close),
        });
      },
      onComplete: () => {
        series.update({
          time: latest.time as UTCTimestamp,
          open: latest.open,
          high: latest.high,
          low: latest.low,
          close: latest.close,
        });
      },
    });

    lastCandleSnapshotRef.current = latest;

    lastSyncedTimeRef.current = latest.time;
    previousLengthRef.current = candles.length;
  }, [candles]);

  useEffect(() => {
    initializedSeriesRef.current = false;
    lastSyncedTimeRef.current = null;
    previousLengthRef.current = 0;
    didFitRef.current = false;
    lastCandleSnapshotRef.current = null;
    candleAnimationRef.current?.stop?.();
    candleAnimationRef.current = null;
  }, [selectedSymbol]);

  useEffect(() => {
    return () => {
      candleAnimationRef.current?.stop?.();
    };
  }, []);

  const rsiData = useMemo<LineData[]>(() => {
    const values = calculateRSI(candles);
    return values.map((point) => ({
      time: point.time as UTCTimestamp,
      value: Number(point.value.toFixed(2)),
    }));
  }, [candles]);

  const macdData = useMemo(() => {
    const values = calculateMACD(candles);
    return values;
  }, [candles]);

  useEffect(() => {
    if (rsiSeriesRef.current && rsiData.length) {
      rsiSeriesRef.current.setData(rsiData);
      rsiChartRef.current?.timeScale().fitContent();
    }
  }, [rsiData]);

  useEffect(() => {
    if (!macdData.length || !macdSeriesRef.current || !macdHistogramSeriesRef.current || !macdSignalSeriesRef.current) {
      return;
    }
    const macdLine: LineData[] = macdData.map((point) => ({
      time: point.time as UTCTimestamp,
      value: point.macd,
    }));
    const macdSignal: LineData[] = macdData.map((point) => ({
      time: point.time as UTCTimestamp,
      value: point.signal,
    }));
    const macdHistogram: HistogramData[] = macdData.map((point) => ({
      time: point.time as UTCTimestamp,
      value: point.histogram,
      color: point.histogram >= 0 ? "#22d3ee" : "#f43f5e",
    }));

    macdSeriesRef.current.setData(macdLine);
    macdSignalSeriesRef.current.setData(macdSignal);
    macdHistogramSeriesRef.current.setData(macdHistogram);
    macdChartRef.current?.timeScale().fitContent();
  }, [macdData]);

  useEffect(() => {
    if (price && previousPrice && price !== previousPrice) {
      setFlash(price > previousPrice ? "up" : "down");
      const timeout = window.setTimeout(() => setFlash(null), 420);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [price, previousPrice]);

  const priceDelta = price && previousPrice ? price - previousPrice : 0;
  const priceDeltaPercent = price && previousPrice ? (priceDelta / previousPrice) * 100 : 0;

  return (
    <section className="relative flex flex-col gap-6 overflow-hidden rounded-[32px] border border-border/60 bg-gradient-to-br from-[#04060f]/95 via-[#070c1d]/85 to-[#132038]/70 p-5 shadow-[0_60px_180px_-90px_rgba(56,189,248,0.65)] sm:gap-7 sm:p-6 lg:gap-8 lg:p-8">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[28rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.18),_transparent_65%)] blur-3xl"
        animate={{ scale: [1, 1.08, 0.96, 1], opacity: [0.7, 1, 0.8, 0.7] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-10 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.22),_transparent_70%)] blur-3xl"
        animate={{ rotate: [0, 8, -6, 0], scale: [0.9, 1.05, 0.98, 0.9] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

  <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[0.65rem] uppercase tracking-[0.32em] text-sky-200/80 backdrop-blur">
            Quantum Flux Feed
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <motion.span
              key={price}
              layout
              className={cn(
                "text-6xl font-semibold tracking-tight text-slate-100 drop-shadow",
                flash === "up" && "text-emerald-300",
                flash === "down" && "text-rose-300"
              )}
              animate={{
                scale: flash ? [1, 1.03, 0.99, 1] : [1, 1],
                opacity: [0.82, 1],
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {price ? price.toFixed(2) : "-"}
            </motion.span>
            <AnimatePresence mode="popLayout">
              {price && previousPrice && (
                <motion.span
                  key={`${priceDelta.toFixed(2)}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium shadow-sm",
                    priceDelta >= 0
                      ? "bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/30"
                      : "bg-rose-500/10 text-rose-200 ring-1 ring-rose-300/30"
                  )}
                >
                  <span>{priceDelta >= 0 ? "▲" : "▼"}</span>
                  <span>
                    {priceDelta >= 0 ? "+" : ""}
                    {priceDelta.toFixed(2)}
                  </span>
                  <span className="text-xs opacity-80">
                    ({priceDeltaPercent >= 0 ? "+" : ""}
                    {priceDeltaPercent.toFixed(2)}%)
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[0.7rem] uppercase tracking-[0.28em] text-slate-400 sm:flex sm:flex-row sm:items-center sm:gap-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-[0.32em] text-slate-100">
              {selectedSymbol}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-[0.32em] text-slate-200">
              1m cadence
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-[0.32em] text-slate-200">
              90-bar scope
            </div>
          </div>
        </div>

        <motion.div
          className="grid w-full max-w-xl grid-cols-2 gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur xl:grid-cols-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {statTiles.map((item) => (
            <div key={item.label} className="flex flex-col gap-1 rounded-2xl bg-slate-900/40 px-3 py-2">
              <span className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">{item.label}</span>
              <span
                className={cn(
                  "text-lg font-semibold text-slate-100",
                  item.label === "Momentum" && (item.accent ?? 0) > 0 && "text-emerald-300",
                  item.label === "Momentum" && (item.accent ?? 0) < 0 && "text-rose-300"
                )}
              >
                {item.value}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col gap-6">
        <motion.div
          ref={candleContainerRef}
          className="relative h-[240px] overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-900/40 to-slate-900/20 shadow-inner sm:h-[320px] lg:h-[360px] xl:h-[400px]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/70 via-slate-900/30 to-transparent" />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.06),_transparent_60%)]"
            animate={{ scale: [1, 1.02, 0.98, 1], opacity: [0.6, 0.85, 0.7, 0.6] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.08 }}
          >
            <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.32em] text-slate-400">
              <span>RSI</span>
              <span className="text-slate-400/80">Relative Strength</span>
            </div>
            <div
              ref={rsiContainerRef}
              className="h-36 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/70 via-slate-900/30 to-slate-900/40"
            />
          </motion.div>
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.14 }}
          >
            <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.32em] text-slate-400">
              <span>MACD</span>
              <span className="text-slate-400/80">Momentum</span>
            </div>
            <div
              ref={macdContainerRef}
              className="h-36 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/70 via-slate-900/30 to-slate-900/40"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
