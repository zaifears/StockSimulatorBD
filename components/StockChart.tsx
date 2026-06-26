'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let chart: any = null;

    const initChart = async () => {
      try {
        // 1. Fetch data from our Gatekeeper
        const response = await fetch(`/api/chart-data?symbol=${symbol}`);
        if (!response.ok) throw new Error('Failed to load chart data');
        
        const raw = await response.json();
console.log('[StockChart] raw response:', raw);
const data: ChartCandle[] = Array.isArray(raw) ? raw : raw.data ?? [];
        if (!data || data.length === 0) throw new Error('No historical data available');

        // 2. Map data and SANITIZE DSE's broken High/Low values
// 2. Map data and SANITIZE DSE's broken High/Low/Open values
        const validData = data.filter((d) => {
          if (!d.date || !d.date.match(/^\d{4}-\d{2}-\d{2}$/)) return false;
          if (!d.close) return false; // DSE often misses open, so only require close
          return true;
        });

        const candleData = validData.map((d, index) => {
          // Fallback to yesterday's close if open is broken or 0
          let actualOpen = d.open;
          if (!actualOpen || actualOpen === 0) {
            actualOpen = index > 0 ? validData[index - 1].close : d.close;
          }

          const maxBody = Math.max(actualOpen, d.close);
          const minBody = Math.min(actualOpen, d.close);
          
          // REAL CHART LOGIC: Color based on if price went up from YESTERDAY'S close
          const prevClose = index > 0 ? validData[index - 1].close : actualOpen;
          const isUp = d.close >= prevClose;
          const trendColor = isUp ? '#26a69a' : '#ef5350'; // Green if up, Red if down
          
          return {
            time: d.date as string,
            open: actualOpen,
            high: d.high < maxBody || d.high === 0 ? maxBody : d.high,
            low: d.low > minBody || d.low === 0 ? minBody : d.low,
            close: d.close,
            // Force the exact color per candle based on actual market trend
            color: trendColor,
            borderColor: trendColor,
            wickColor: trendColor,
          };
        });

        const volumeData = candleData.map((d, index) => ({
          time: d.time as string,
          value: validData[index].volume || 0,
          color: d.color, // Match the volume bar directly to the candle color
        }));

console.log('[StockChart] raw sample:', JSON.stringify(data.slice(0, 3), null, 2));
if (candleData.length === 0) throw new Error('No valid candles after filtering');

        setLoading(false);

        // 3. Initialize Canvas Chart
        if (chartContainerRef.current) {
          chart = createChart(chartContainerRef.current, {
            layout: {
              background: { type: ColorType.Solid, color: 'transparent' },
              textColor: '#94a3b8', // slate-400
            },
            grid: {
              vertLines: { color: '#334155', style: 1 }, // slate-700
              horzLines: { color: '#334155', style: 1 },
            },
            crosshair: {
              mode: CrosshairMode.Normal,
            },
            rightPriceScale: {
              borderColor: '#334155',
            },
            timeScale: {
              borderColor: '#334155',
              timeVisible: true,
            },
            // Auto-resize handler
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });

          // 4. Add Series
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
            priceScaleId: '', // Set as overlay
          });
          volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 }, // Push volume to bottom 20%
          });
          volumeSeries.setData(volumeData);

          chart.timeScale().fitContent();

          // 5. Handle Window Resize
          const handleResize = () => {
            if (chartContainerRef.current) {
              chart.applyOptions({
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
              });
            }
          };
          window.addEventListener('resize', handleResize);
          
          // Satisfy TS compiler. Actual cleanup is handled at the bottom of the useEffect.
          return;
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    initChart();

    return () => {
      if (chart) chart.remove();
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
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