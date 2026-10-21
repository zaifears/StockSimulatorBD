'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchVpsWithFallback } from '@/lib/vpsClient';
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  Time,
} from 'lightweight-charts';

interface ChartCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LegendValues {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changePercent: number;
}

const UP_COLOR = '#26a69a';
const DOWN_COLOR = '#ef5350';

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

export default function StockChart({ symbol }: { symbol: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const lastPriceLineRef = useRef<IPriceLine | null>(null);
  const latestCandleRef = useRef<LegendValues | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [legend, setLegend] = useState<LegendValues | null>(null);

  useEffect(() => {
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;

    const initChart = async () => {
      try {
        const encodedSymbol = encodeURIComponent(symbol.trim().toUpperCase());
        const response = await fetchVpsWithFallback(
          `/api/dse_chart?symbol=${encodedSymbol}`,
          `/api/chart-data?symbol=${encodedSymbol}`,
          { timeoutMs: 8000 }
        );
        if (!response.ok) throw new Error('Failed to load chart data');

        const raw = await response.json();
        const data: ChartCandle[] = Array.isArray(raw) ? raw : raw.data ?? [];
        if (!isMounted) return;

        const validData = data.filter(
          (d) => d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && d.close > 0
        );
        if (validData.length === 0) throw new Error('No historical data available');

        // Sanitize DSE's occasionally-broken high/low against the candle body,
        // so a bad scrape can never draw a wick that contradicts open/close.
        const candleData = validData.map((d, index) => {
          const prevClose = index > 0 ? validData[index - 1].close : d.open || d.close;
          const actualOpen = d.open > 0 ? d.open : prevClose;
          const maxBody = Math.max(actualOpen, d.close);
          const minBody = Math.min(actualOpen, d.close);
          const isUp = d.close >= prevClose;
          const trendColor = isUp ? UP_COLOR : DOWN_COLOR;

          return {
            time: d.date as Time,
            open: actualOpen,
            high: d.high > 0 ? Math.max(d.high, maxBody) : maxBody,
            low: d.low > 0 ? Math.min(d.low, minBody) : minBody,
            close: d.close,
            volume: d.volume || 0,
            color: trendColor,
            borderColor: trendColor,
            wickColor: trendColor,
          };
        });

        const volumeData = candleData.map((d) => ({
          time: d.time,
          value: d.volume,
          color: d.color,
        }));

        if (!chartContainerRef.current) return;

        const lastCandle = candleData[candleData.length - 1];
        const prevCandle = candleData.length > 1 ? candleData[candleData.length - 2] : lastCandle;
        const initialLegend: LegendValues = {
          date: lastCandle.time as string,
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
          volume: lastCandle.volume,
          changePercent: prevCandle.close > 0 ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100 : 0,
        };
        latestCandleRef.current = initialLegend;
        if (isMounted) setLegend(initialLegend);

        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#94a3b8', // slate-400
            fontSize: 12,
          },
          grid: {
            vertLines: { color: 'rgba(51, 65, 85, 0.5)', style: 1 }, // slate-700, softened
            horzLines: { color: 'rgba(51, 65, 85, 0.5)', style: 1 },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: { color: '#64748b', width: 1, style: 3, labelBackgroundColor: '#334155' },
            horzLine: { color: '#64748b', width: 1, style: 3, labelBackgroundColor: '#334155' },
          },
          rightPriceScale: {
            borderColor: 'rgba(51, 65, 85, 0.8)',
            scaleMargins: { top: 0.1, bottom: 0.3 },
          },
          timeScale: {
            borderColor: 'rgba(51, 65, 85, 0.8)',
            timeVisible: false,
            rightOffset: 4,
            barSpacing: 8,
          },
          watermark: {
            visible: true,
            text: symbol,
            color: 'rgba(148, 163, 184, 0.08)',
            fontSize: 64,
            horzAlign: 'center',
            vertAlign: 'center',
          },
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
        chartRef.current = chart;

        const candleSeries = chart.addCandlestickSeries({
          upColor: UP_COLOR,
          downColor: DOWN_COLOR,
          borderVisible: false,
          wickUpColor: UP_COLOR,
          wickDownColor: DOWN_COLOR,
          priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });
        candleSeries.setData(candleData);
        candleSeriesRef.current = candleSeries;

        lastPriceLineRef.current = candleSeries.createPriceLine({
          price: lastCandle.close,
          color: lastCandle.close >= prevCandle.close ? UP_COLOR : DOWN_COLOR,
          lineWidth: 1,
          lineStyle: 2, // dashed
          axisLabelVisible: true,
          title: 'Last',
        });

        const volumeSeries = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: '', // overlay, own hidden scale
        });
        volumeSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 }, // bottom 20% of the pane
        });
        volumeSeries.setData(volumeData);
        volumeSeriesRef.current = volumeSeries;

        chart.timeScale().fitContent();

        chart.subscribeCrosshairMove((param) => {
          if (!isMounted) return;
          if (!param.time || !param.seriesData.size) {
            setLegend(latestCandleRef.current);
            return;
          }
          const bar = param.seriesData.get(candleSeries) as
            | { open: number; high: number; low: number; close: number }
            | undefined;
          const vol = param.seriesData.get(volumeSeries) as { value: number } | undefined;
          if (!bar) return;

          const index = candleData.findIndex((d) => d.time === param.time);
          const prev = index > 0 ? candleData[index - 1] : null;
          setLegend({
            date: param.time as string,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: vol?.value ?? 0,
            changePercent: prev && prev.close > 0 ? ((bar.close - prev.close) / prev.close) * 100 : 0,
          });
        });

        setLoading(false);

        // Keep the chart in sync with its container's actual size — window
        // 'resize' alone misses layout changes from sidebar toggles, font
        // loading, or grid reflow that don't fire a window resize event.
        resizeObserver = new ResizeObserver((entries) => {
          const entry = entries[0];
          if (!entry || !chartRef.current) return;
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            chartRef.current.applyOptions({ width, height });
          }
        });
        resizeObserver.observe(chartContainerRef.current);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    initChart();

    return () => {
      isMounted = false;
      if (resizeObserver) resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      lastPriceLineRef.current = null;
    };
  }, [symbol]);

  if (error) {
    return (
      <div className="flex h-64 sm:h-96 w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900">
        <p className="text-red-700 dark:text-red-400 font-medium">Error: {error}</p>
      </div>
    );
  }

  const isUp = (legend?.changePercent ?? 0) >= 0;

  return (
    <div className="relative w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {legend && !loading && (
        <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm px-3 py-1.5 text-[11px] sm:text-xs font-mono shadow-sm border border-slate-200 dark:border-slate-800 pointer-events-none">
          <span className="text-slate-400 dark:text-slate-500 font-sans font-semibold tracking-wide">{legend.date}</span>
          <span className="text-slate-600 dark:text-slate-300">O <b className="text-slate-800 dark:text-slate-100">{legend.open.toFixed(2)}</b></span>
          <span className="text-slate-600 dark:text-slate-300">H <b className="text-slate-800 dark:text-slate-100">{legend.high.toFixed(2)}</b></span>
          <span className="text-slate-600 dark:text-slate-300">L <b className="text-slate-800 dark:text-slate-100">{legend.low.toFixed(2)}</b></span>
          <span className="text-slate-600 dark:text-slate-300">C <b className="text-slate-800 dark:text-slate-100">{legend.close.toFixed(2)}</b></span>
          <span className={isUp ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
            {isUp ? '▲' : '▼'} {Math.abs(legend.changePercent).toFixed(2)}%
          </span>
          <span className="text-slate-400 dark:text-slate-500">Vol <b className="text-slate-600 dark:text-slate-300">{formatVolume(legend.volume)}</b></span>
        </div>
      )}

      {/* Mobile-first aspect ratio */}
      <div
        ref={chartContainerRef}
        className="w-full aspect-[4/3] sm:aspect-[16/9] md:h-[500px]"
      />
    </div>
  );
}
