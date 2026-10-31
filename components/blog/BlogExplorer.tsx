'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock, Search, X } from 'lucide-react';

export type ExplorerPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  publishedAt: string;
  featured: boolean;
  readingTime: number;
  coverImage: { url: string; width: number; height: number } | null;
  coverImageAlt: string;
};

type TimeFilter = 'any' | '30d' | '3m' | '1y';

const TIME_FILTERS: { id: TimeFilter; label: string; days: number | null }[] = [
  { id: 'any', label: 'Any time', days: null },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '3m', label: 'Last 3 months', days: 91 },
  { id: '1y', label: 'Last year', days: 365 },
];

const MAX_TAG_CHIPS = 10;

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Tag chips are derived from the posts themselves rather than hardcoded, so they
 * can never drift from what is actually publishable. Most-used first, then
 * alphabetical for a stable order between builds.
 */
function getTopTags(posts: ExplorerPost[]): string[] {
  const counts = new Map<string, { label: string; n: number }>();

  for (const post of posts) {
    for (const raw of [post.category, ...post.tags]) {
      const label = raw.trim();
      if (!label) continue;
      const key = label.toLocaleLowerCase();
      const existing = counts.get(key);
      counts.set(key, { label: existing?.label ?? label, n: (existing?.n ?? 0) + 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .slice(0, MAX_TAG_CHIPS)
    .map((entry) => entry.label);
}

export default function BlogExplorer({ posts }: { posts: ExplorerPost[] }) {
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [time, setTime] = useState<TimeFilter>('any');

  // Keeps typing responsive on the mid-range Android phones most readers use.
  const deferredQuery = useDeferredValue(query);

  const topTags = useMemo(() => getTopTags(posts), [posts]);

  const results = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase();
    const cutoffDays = TIME_FILTERS.find((f) => f.id === time)?.days ?? null;
    const cutoff = cutoffDays === null ? null : Date.now() - cutoffDays * 86400000;
    const wanted = activeTags.map((t) => t.toLocaleLowerCase());

    return posts.filter((post) => {
      if (cutoff !== null && new Date(post.publishedAt).getTime() < cutoff) return false;

      if (wanted.length > 0) {
        const haystack = [post.category, ...post.tags].map((t) => t.toLocaleLowerCase());
        if (!wanted.every((tag) => haystack.includes(tag))) return false;
      }

      if (needle) {
        const haystack = [post.title, post.excerpt, post.category, ...post.tags]
          .join(' ')
          .toLocaleLowerCase();
        if (!needle.split(/\s+/).every((word) => haystack.includes(word))) return false;
      }

      return true;
    });
  }, [posts, deferredQuery, activeTags, time]);

  const filtersActive = query.trim() !== '' || activeTags.length > 0 || time !== 'any';

  function toggleTag(tag: string) {
    setActiveTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    );
  }

  function clearAll() {
    setQuery('');
    setActiveTags([]);
    setTime('any');
  }

  return (
    <>
      {/* Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <label htmlFor="blog-search" className="block text-sm font-bold text-slate-900 dark:text-white">
          Search the guides
        </label>

        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="blog-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try BO account, broker, circuit breaker, T+2"
            className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-11 pr-11 text-base text-slate-900 transition placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950"
          />
          {query !== '' && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Search by topic, broker name or a term you ran into, such as BO account, lot size or
          settlement. Words are matched against the title, summary and tags.
        </p>

        {topTags.length > 0 && (
          <fieldset className="mt-5">
            <legend className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Popular topics
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {topTags.map((tag) => {
                const active = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-pressed={active}
                    className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold transition active:scale-95 ${
                      active
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-400'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <fieldset className="mt-5">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Published
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {TIME_FILTERS.map((filter) => {
              const active = time === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setTime(filter.id)}
                  aria-pressed={active}
                  className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold transition active:scale-95 ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400" role="status" aria-live="polite">
            {results.length === posts.length
              ? `Showing all ${posts.length} ${posts.length === 1 ? 'guide' : 'guides'}`
              : `${results.length} of ${posts.length} ${posts.length === 1 ? 'guide' : 'guides'}`}
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">No guides match that</h2>
          <p className="mx-auto mt-3 max-w-md text-slate-600 dark:text-slate-300">
            Try a shorter search, remove a topic, or widen the published range. Every guide is
            available under Any time with no topics selected.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-600 px-5 font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
          >
            Show all guides
          </button>
        </div>
      ) : (
        <div className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
          {results.map((post) => (
            <article
              key={post.id}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <Link
                href={`/blog/${post.slug}`}
                className="relative block aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800"
                aria-label={`Read ${post.title}`}
              >
                {post.coverImage ? (
                  <Image
                    src={post.coverImage.url}
                    alt={post.coverImageAlt}
                    width={post.coverImage.width}
                    height={post.coverImage.height}
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-center text-lg font-bold text-white">
                    StockSimulatorBD
                  </div>
                )}
              </Link>

              <div className="flex flex-1 flex-col p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {post.category}
                  </span>
                  {post.featured && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                      Featured
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold leading-snug tracking-tight">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-400"
                  >
                    {post.title}
                  </Link>
                </h2>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {post.excerpt}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(post.publishedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {post.readingTime} min read
                  </span>
                </div>

                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:gap-3 dark:text-emerald-400"
                >
                  Read guide
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
