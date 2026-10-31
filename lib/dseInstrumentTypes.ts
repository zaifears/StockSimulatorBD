/**
 * Instrument classification for DSE listings.
 *
 * The only per-symbol data this repo holds is `{ symbol, name }` (see
 * `lib/dseCompanyNames.ts`). Everything here is derived from the registered
 * company name string, never guessed and never fetched. That keeps
 * `/stocks/[symbol]` pages genuinely differentiated without inventing
 * financial data we do not have.
 */

export type InstrumentType = 'mutual-fund' | 'bond' | 'insurance' | 'bank' | 'company';

export type InstrumentProfile = {
  type: InstrumentType;
  /** Short noun used inline in prose, e.g. "mutual fund". */
  label: string;
  /** Badge text. */
  badge: string;
  /** What this kind of listing is, in plain language. */
  explainer: string;
  /** What a learner should watch for when practising with this instrument. */
  practiceNote: string;
};

export function classifyInstrument(symbol: string, name: string): InstrumentType {
  const n = name.toLowerCase();
  const s = symbol.toUpperCase();

  if (n.includes('mutual fund') || /MF$/.test(s)) return 'mutual-fund';
  if (n.includes('bond') || s.includes('BOND')) return 'bond';
  if (n.includes('insurance') || n.includes('assurance')) return 'insurance';
  if (n.includes('bank')) return 'bank';
  return 'company';
}

const PROFILES: Record<InstrumentType, Omit<InstrumentProfile, 'type'>> = {
  'mutual-fund': {
    label: 'mutual fund',
    badge: 'Mutual fund',
    explainer:
      'A listed mutual fund pools money from many investors and holds a basket of securities on their behalf. Units trade on the exchange like shares, so the market price can sit above or below the fund net asset value per unit. Closed-end funds on the DSE also carry a stated maturity, and their unit price often behaves differently from an ordinary company share.',
    practiceNote:
      'When you practise with fund units, watch how the traded price drifts against the underlying asset value rather than against company earnings. That gap is the thing most first-time buyers of listed funds are surprised by.',
  },
  bond: {
    label: 'bond',
    badge: 'Bond',
    explainer:
      'A listed bond is a debt instrument. Buying it means lending to the issuer in exchange for a coupon rather than owning a share of the business. Perpetual bonds have no maturity date and pay a coupon indefinitely, subject to the issuer terms. Bonds usually trade far less frequently than ordinary shares, so quoted prices can be stale and orders can be hard to fill.',
    practiceNote:
      'Thin trading is the lesson here. Practise noticing how a listing with few daily trades behaves compared with an actively traded share, because that difference matters more than the headline price.',
  },
  insurance: {
    label: 'insurance company',
    badge: 'Insurance',
    explainer:
      'Insurance is one of the larger listed sectors on the Dhaka Stock Exchange by company count, covering both general and life insurers. Insurers earn from premiums and from investing the float they hold, which means their results respond to claims experience and to investment markets at the same time.',
    practiceNote:
      'The sector contains many small listings that can move sharply on modest volume. It is a useful place to practise position sizing before you do it with real money.',
  },
  bank: {
    label: 'bank',
    badge: 'Bank',
    explainer:
      'Listed banks are among the most heavily traded names on the Dhaka Stock Exchange. A bank earns from the spread between what it pays depositors and what it charges borrowers, so its results move with interest rates, loan growth and the quality of its loan book.',
    practiceNote:
      'Bank shares tend to trade actively, which makes them a reasonable starting point for practising order placement and holding a position through the settlement wait.',
  },
  company: {
    label: 'company',
    badge: 'Company',
    explainer:
      'This is an ordinary equity listing on the Dhaka Stock Exchange. Buying a share means owning a small stake in the business, and the share price responds to earnings, dividends, sector conditions and overall market sentiment.',
    practiceNote:
      'Ordinary shares are the most straightforward instrument to learn on, which is why most people start here before touching funds or bonds.',
  },
};

export function getInstrumentProfile(symbol: string, name: string): InstrumentProfile {
  const type = classifyInstrument(symbol, name);
  return { type, ...PROFILES[type] };
}

/**
 * Pick the longest candidate that fits within `max` characters, falling back to
 * the last (shortest) candidate truncated on a word boundary.
 */
export function pickFitting(candidates: string[], max: number): string {
  for (const candidate of candidates) {
    if (candidate.length <= max) return candidate;
  }

  const shortest = candidates[candidates.length - 1] ?? '';
  if (shortest.length <= max) return shortest;

  const cut = shortest.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
