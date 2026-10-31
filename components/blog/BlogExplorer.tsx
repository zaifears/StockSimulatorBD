'use client';

import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, X } from 'lucide-react';

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

// Styles: app/blog/blog.css (.bl-*), on the homepage system in app/home.css.
export default function BlogExplorer({ posts, intro }: { posts: ExplorerPost[]; intro?: ReactNode }) {
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

  const [lead, ...rest] = results;

  return (
    <>
      <section className="hm bl-hero" aria-labelledby="blog-title">
        <div className="hm-wrap bl-hero__grid">
          {intro}

          {/* Controls */}
          <div className="bl-find" role="search">
            <label htmlFor="blog-search" className="bl-find__label">
              Search the guides
            </label>

            <div className="bl-find__field">
              <Search className="bl-find__icon" size={18} aria-hidden="true" />
              <input
                id="blog-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try BO account, broker, circuit breaker, T+2"
                className="bl-find__input"
              />
              {query !== '' && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="bl-find__clear"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>

            <p className="bl-find__help">
              Search by topic, broker name or a term you ran into, such as BO account, lot size or
              settlement. Words are matched against the title, summary and tags.
            </p>

            {topTags.length > 0 && (
              <fieldset className="bl-group">
                <legend>Popular topics</legend>
                <div className="bl-chips">
                  {topTags.map((tag) => {
                    const active = activeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        aria-pressed={active}
                        className="bl-chip"
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <fieldset className="bl-group">
              <legend>Published</legend>
              <div className="bl-chips">
                {TIME_FILTERS.map((filter) => {
                  const active = time === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setTime(filter.id)}
                      aria-pressed={active}
                      className="bl-chip bl-chip--time"
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="bl-find__status">
              <p role="status" aria-live="polite">
                {results.length === posts.length
                  ? `Showing all ${posts.length} ${posts.length === 1 ? 'guide' : 'guides'}`
                  : `${results.length} of ${posts.length} ${posts.length === 1 ? 'guide' : 'guides'}`}
              </p>
              {filtersActive && (
                <button type="button" onClick={clearAll} className="bl-clear">
                  <X size={16} aria-hidden="true" />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="hm hm-sec bl-results" aria-label="Guides">
        <div className="hm-wrap">
          {!lead ? (
            <div className="bl-empty">
              <h2>No guides match that</h2>
              <p className="hm-lead">
                Try a shorter search, remove a topic, or widen the published range. Every guide is
                available under Any time with no topics selected.
              </p>
              <button type="button" onClick={clearAll} className="hm-btn">
                Show all guides
              </button>
            </div>
          ) : (
            <>
              <article className="bl-lead">
                <Link href={`/blog/${lead.slug}`} className="bl-cover" aria-label={`Read ${lead.title}`}>
                  <Cover post={lead} sizes="(max-width: 960px) 100vw, 680px" priority />
                </Link>
                <div className="bl-lead__text">
                  <p className="bl-tags">{lead.category}</p>
                  <h2>
                    <Link href={`/blog/${lead.slug}`}>{lead.title}</Link>
                  </h2>
                  <p className="bl-lead__excerpt">{lead.excerpt}</p>
                  <Meta post={lead} />
                  <Link href={`/blog/${lead.slug}`} className="hm-btn hm-btn--outline">
                    Read guide
                  </Link>
                </div>
              </article>

              {rest.length > 0 && (
                <ul className="bl-index" role="list">
                  {rest.map((post) => (
                    <li key={post.id}>
                      <article>
                        <Link href={`/blog/${post.slug}`} className="bl-row">
                          <span className="bl-row__thumb">
                            <Cover post={post} sizes="(max-width: 640px) 96px, 176px" />
                          </span>
                          <span className="bl-row__body">
                            <span className="bl-tags">{post.category}</span>
                            <h3 className="bl-row__title">{post.title}</h3>
                            <span className="bl-row__excerpt">{post.excerpt}</span>
                          </span>
                          <Meta post={post} />
                        </Link>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function Cover({ post, sizes, priority = false }: { post: ExplorerPost; sizes: string; priority?: boolean }) {
  if (!post.coverImage) {
    return <span className="bl-cover__none">{post.category}</span>;
  }
  return (
    <Image
      src={post.coverImage.url}
      alt={post.coverImageAlt}
      width={post.coverImage.width}
      height={post.coverImage.height}
      sizes={sizes}
      priority={priority}
    />
  );
}

function Meta({ post }: { post: ExplorerPost }) {
  return (
    <span className="bl-meta">
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
      <span>{post.readingTime} min read</span>
      {post.featured && <span>Featured</span>}
    </span>
  );
}
