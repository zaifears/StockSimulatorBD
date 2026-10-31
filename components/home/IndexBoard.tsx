'use client';

// components/home/IndexBoard.tsx
// The homepage hero visual: DSE's own broad index (DSEX) and Shariah index
// (DSES), with market-wide breadth and session totals. Deliberately shows no
// individual company. The server passes the first reading; the board refreshes
// every minute while the tab is visible. Styles live in app/home.css (.hm-board).
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { fetchVpsWithFallback } from '@/lib/vpsClient';
import { pickMarketOverview, type IndexQuote, type MarketOverview } from '@/lib/marketOverview';

const REFRESH_MS = 60_000;

const fmt = (n: number, dp = 2) => n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const signed = (n: number, dp = 2) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n), dp)}`;
/** DSE reports turnover in BDT million; Bangladeshi readers count in crore (10 million). */
const crore = (millions: number) => `${fmt(millions / 10, 2)} cr`;
const croreShares = (shares: number) => `${fmt(shares / 10_000_000, 2)} cr`;

function sessionLabel(key: string | null): string {
  if (!key) return 'last session';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function Move({ quote }: { quote: IndexQuote }) {
  const dir = quote.change > 0 ? 'up' : quote.change < 0 ? 'down' : 'flat';
  const Icon = dir === 'down' ? ArrowDownRight : ArrowUpRight;
  return (
    <span className="hm-board__move num" data-dir={dir}>
      {dir !== 'flat' && <Icon size={16} aria-hidden="true" />}
      {signed(quote.change)} ({signed(quote.percent)}%)
    </span>
  );
}

export default function IndexBoard({ initial }: { initial: MarketOverview | null }) {
  const [data, setData] = useState<MarketOverview | null>(initial);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetchVpsWithFallback('/api/market_overview', '/api/market-overview');
        if (!res.ok) return;
        const next = pickMarketOverview(await res.json());
        if (alive && next) setData(next);
      } catch {
        // keep the last good reading
      }
    };
    if (!initial) load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [initial]);

  const dsex = data?.indices.find((i) => i.key === 'DSEX');
  const dses = data?.indices.find((i) => i.key === 'DSES');
  const breadth = data?.breadth;
  const breadthTotal = breadth ? breadth.advanced + breadth.declined + breadth.unchanged : 0;

  return (
    <figure className="hm-board" aria-labelledby="board-title">
      <div className="hm-board__top">
        <p id="board-title" className="hm-board__src">Dhaka Stock Exchange</p>
        {data && (
          <p className="hm-board__state" data-open={data.session.isOpen}>
            {data.session.isOpen ? 'Market open' : `Closed · ${sessionLabel(data.session.sessionDate)}`}
          </p>
        )}
      </div>

      {dsex ? (
        <>
          <div className="hm-board__main">
            <p className="hm-board__label">DSEX <span>Broad index</span></p>
            <p className="hm-board__value num">{fmt(dsex.value)}</p>
            <Move quote={dsex} />
          </div>

          {dses && (
            <div className="hm-board__row">
              <p className="hm-board__label">DSES <span>Shariah index</span></p>
              <p className="num">{fmt(dses.value)}</p>
              <Move quote={dses} />
            </div>
          )}

          {breadth && breadthTotal > 0 && (
            <div className="hm-board__breadth">
              <div className="hm-board__bar" role="img" aria-label={`${breadth.advanced} issues advanced, ${breadth.declined} declined, ${breadth.unchanged} unchanged`}>
                <span data-dir="up" style={{ flexGrow: breadth.advanced }} />
                <span data-dir="flat" style={{ flexGrow: breadth.unchanged }} />
                <span data-dir="down" style={{ flexGrow: breadth.declined }} />
              </div>
              <p className="hm-board__legend">
                <span data-dir="up"><b className="num">{breadth.advanced}</b> advanced</span>
                <span data-dir="flat"><b className="num">{breadth.unchanged}</b> unchanged</span>
                <span data-dir="down"><b className="num">{breadth.declined}</b> declined</span>
              </p>
            </div>
          )}

          {data?.totals && (
            <dl className="hm-board__totals">
              <div><dt>Turnover</dt><dd><span className="hm-board__cur">৳</span><span className="num">{crore(data.totals.turnover)}</span></dd></div>
              <div><dt>Trades</dt><dd className="num">{fmt(data.totals.trades, 0)}</dd></div>
              <div><dt>Volume</dt><dd className="num">{croreShares(data.totals.volume)}</dd></div>
            </dl>
          )}
        </>
      ) : (
        <p className="hm-board__empty">Live index figures are unavailable right now. The trading floor still has every listed price.</p>
      )}

      <figcaption>
        <span>Figures published by DSE, refreshed every minute.</span>
        <Link href="/trade" className="hm-link">
          Open the trading floor <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </figcaption>
    </figure>
  );
}
