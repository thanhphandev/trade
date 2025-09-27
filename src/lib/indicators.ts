import { Candle } from "./trading-store";

export type IndicatorPoint = {
  time: number;
  value: number;
};

export type MacdPoint = {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
};

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  values.forEach((value, index) => {
    if (index === 0) {
      emaArray.push(value);
    } else {
      const prev = emaArray[index - 1];
      emaArray.push(value * k + prev * (1 - k));
    }
  });
  return emaArray;
}

export function calculateRSI(candles: Candle[], period = 14): IndicatorPoint[] {
  if (candles.length <= period) return [];
  const closes = candles.map((c) => c.close);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  const result: IndicatorPoint[] = [];

  for (let i = period + 1; i < closes.length; i += 1) {
    const delta = closes[i] - closes[i - 1];
    const gain = Math.max(delta, 0);
    const loss = Math.max(-delta, 0);
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;

    const rs = averageLoss === 0 ? 100 : averageGain / averageLoss;
    const rsi = 100 - 100 / (1 + rs);
    result.push({ time: candles[i].time, value: Number(rsi.toFixed(2)) });
  }

  return result;
}

export function calculateMACD(
  candles: Candle[],
  shortPeriod = 12,
  longPeriod = 26,
  signalPeriod = 9
): MacdPoint[] {
  if (candles.length <= longPeriod + signalPeriod) return [];
  const closes = candles.map((c) => c.close);
  const short = ema(closes, shortPeriod);
  const long = ema(closes, longPeriod);
  const macdLine = closes.map((_, idx) => {
    if (idx < longPeriod - 1) return 0;
    return short[idx] - long[idx];
  });

  const macdForSignal = macdLine.slice(longPeriod - 1);
  const signalSeries = ema(macdForSignal, signalPeriod);
  const result: MacdPoint[] = [];

  for (let idx = longPeriod - 1; idx < macdLine.length; idx += 1) {
    const signalIdx = idx - (longPeriod - 1);
    if (signalIdx >= signalSeries.length) break;
    const macd = macdLine[idx];
    const signal = signalSeries[signalIdx];
    const histogram = macd - signal;
    result.push({
      time: candles[idx].time,
      macd: Number(macd.toFixed(4)),
      signal: Number(signal.toFixed(4)),
      histogram: Number(histogram.toFixed(4)),
    });
  }

  return result;
}
