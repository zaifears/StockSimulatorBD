'use client';
import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi } from 'lightweight-charts';

interface ChartCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function StockChart({ symbol }: { symbol: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initChart = async () => {
      try {
        const response = await fetch(`/api/chart-data?symbol=${symbol}`);
        if (!response.ok) throw new Error('Failed to load chart data');

        const raw = await response.json();
        const data: ChartCandle[] = Array.isArray(raw) ? raw : raw.data ?? [];

        if (!isMounted) return; // Guard: user may have navigated away during fetch

        const validData = data.filter(
          (d) => d.date?.match(/^\d{4}-\d{2}-\d{2}$/) && d.close
        );

        if (validData.length === 0) throw new Error('No historical data available');

        const candleData = validData.map((d, index) => {
          let actualOpen = d.open || (index > 0 ? validData[index - 1].close : d.close);
          const maxBody = Math.max(actualOpen, d.close);
          const minBody = Math.min(actualOpen, d.close);
          const prevClose = index > 0 ? validData[index - 1].close : actualOpen;
          const trendColor = d.close >= prevClose ? '#26a69a' : '#ef5350';
          return {
            time: d.date as string,
            open: actualOpen,
            high: d.high < maxBody || d.high === 0 ? maxBody : d.high,
            low: d.low > minBody || d.low === 0 ? minBody : d.low,
            close: d.close,
            color: trendColor,
            borderColor: trendColor,
            wickColor: trendColor,
          };
        });

        const volumeData = candleData.map((d, index) => ({
          time: d.time,
          value: validData[index].volume || 0,
          color: d.color,
        }));

        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#94a3b8',
          },
          grid: {
            vertLines: { color: '#334155', style: 1 },
            horzLines: { color: '#334155', style: 1 },
          },
          crosshair: { mode: CrosshairMode.Normal },
          rightPriceScale: { borderColor: '#334155' },
          timeScale: { borderColor: '#334155', timeVisible: true },
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });

        const mainSeries = chart.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
        mainSeries.setData(candleData);

        const volumeSeries = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: '',
        });
        volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        volumeSeries.setData(volumeData);

        chart.timeScale().fitContent();
        chartRef.current = chart;

        if (isMounted) setLoading(false);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    initChart();
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol]);

  if (error) {
    return (
      <div className="flex h-64 sm:h-96 w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900">
        <p className="text-red-500 font-medium">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}
      <div
        ref={chartContainerRef}
        className="w-full aspect-[4/3] sm:aspect-[16/9] md:h-[500px]"
      />
    </div>
  );
}