import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Star,
  Plus,
  X,
  Search,
  Globe,
  ExternalLink,
  Home,
  Lock,
  Bookmark,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/Button';
import { cn, uid } from '../os/utils';
import { useLocalStorage } from '../os/useLocalStorage';

/**
 * A simulated, sandboxed browser for PromptOS.
 *
 * Real external sites can't be embedded (cross-origin framing is blocked), so
 * every "page" here is rendered by us: a styled site card for URLs, a fake
 * search-results page for queries, and a polished new-tab start page. Anything
 * the user actually wants to reach opens in a real browser tab via window.open.
 */

/** Kinds of simulated page the browser can display. */
type PageKind = 'home' | 'site' | 'search';

interface Page {
  kind: PageKind;
  /** Canonical address shown in the address bar. */
  address: string;
  /** Normalized full URL (site pages only). */
  url?: string;
  /** The query string (search pages only). */
  query?: string;
  /** Display title for tab + bookmarks. */
  title: string;
}

interface Tab {
  id: string;
  history: Page[];
  /** Index into `history` of the currently shown page. */
  index: number;
}

interface BookmarkEntry {
  id: string;
  title: string;
  url: string;
}

const HOME_PAGE: Page = {
  kind: 'home',
  address: '',
  title: 'New Tab',
};

const DEFAULT_BOOKMARKS: BookmarkEntry[] = [
  { id: 'bm_home', title: 'PromptOS Home', url: 'home' },
  { id: 'bm_example', title: 'Example', url: 'https://example.com' },
  { id: 'bm_wiki', title: 'Wikipedia', url: 'https://wikipedia.org' },
  { id: 'bm_search', title: 'Search: prompt engineering', url: 'prompt engineering' },
];

/** Heuristic: does the typed text look like a domain/URL rather than a query? */
function looksLikeUrl(raw: string): boolean {
  const t = raw.trim();
  if (!t || /\s/.test(t)) return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (t.startsWith('localhost')) return true;
  // Contains a dot followed by at least two letters (a TLD-ish suffix).
  return /\.[a-z]{2,}($|\/|:|\?|#)/i.test(t);
}

/** Add https:// if the user omitted a scheme. */
function normalizeUrl(raw: string): string {
  const t = raw.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/** Extract a clean hostname from a full URL (fallback to the raw input). */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0];
  }
}

/** Turn arbitrary input into a simulated Page. */
function resolvePage(raw: string): Page {
  const input = raw.trim();
  if (!input || input.toLowerCase() === 'home') return HOME_PAGE;

  if (looksLikeUrl(input)) {
    const url = normalizeUrl(input);
    const host = hostnameOf(url);
    return {
      kind: 'site',
      address: url,
      url,
      title: host,
    };
  }

  return {
    kind: 'search',
    address: input,
    query: input,
    title: `${input} — Search`,
  };
}

/** A short, plausible blurb for a simulated site card. */
function siteBlurb(host: string): string {
  const root = host.split('.')[0];
  return `${root[0]?.toUpperCase()}${root.slice(1)} is an external website. PromptOS runs in a sandbox and can't embed live pages, so here's a preview instead. Use the button below to open it in a real browser tab.`;
}

/** Deterministic-ish fake search results derived from a query. */
function fakeResults(query: string): Array<{ title: string; url: string; snippet: string }> {
  const q = query.trim();
  const slug = encodeURIComponent(q.toLowerCase().replace(/\s+/g, '-'));
  return [
    {
      title: `${q} — Overview & Guide`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(q.replace(/\s+/g, '_'))}`,
      snippet: `An introductory overview of ${q}, covering the key concepts, history, and common uses. A great starting point for anyone exploring the topic.`,
    },
    {
      title: `The complete ${q} handbook`,
      url: `https://guides.example.com/${slug}`,
      snippet: `Step-by-step explanations and practical examples for ${q}. Includes tips, common pitfalls, and curated further reading.`,
    },
    {
      title: `${q}: news, discussion and community`,
      url: `https://community.example.org/t/${slug}`,
      snippet: `Join the conversation about ${q}. Browse questions, answers, and the latest discussions from people who care about it.`,
    },
    {
      title: `Best tools & resources for ${q}`,
      url: `https://tools.example.net/search?q=${encodeURIComponent(q)}`,
      snippet: `A hand-picked collection of tools, references, and resources to help you get more done with ${q}.`,
    },
  ];
}

/** A colored favicon-style letter badge. */
function FaviconBadge({ label, size = 'md' }: { label: string; size?: 'sm' | 'md' | 'lg' }) {
  const letter = (label.trim()[0] || '?').toUpperCase();
  // Hash the label to a stable hue so each site gets its own color.
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  const dims =
    size === 'lg' ? 'w-14 h-14 text-2xl' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold text-white shadow-inner',
        dims,
      )}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 70% 35%))` }}
    >
      {letter}
    </span>
  );
}

function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function BrowserApp() {
  const [tabs, setTabs] = useState<Tab[]>(() => [
    { id: uid('tab'), history: [HOME_PAGE], index: 0 },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [bookmarks, setBookmarks] = useLocalStorage<BookmarkEntry[]>(
    'browser:bookmarks',
    DEFAULT_BOOKMARKS,
  );
  const [omnibox, setOmnibox] = useState('');
  const addressRef = useRef<HTMLInputElement>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId],
  );
  const currentPage = activeTab.history[activeTab.index];
  const canBack = activeTab.index > 0;
  const canForward = activeTab.index < activeTab.history.length - 1;

  // Keep the address bar in sync with whatever page the active tab shows.
  useEffect(() => {
    setOmnibox(currentPage.kind === 'home' ? '' : currentPage.address);
  }, [activeTabId, currentPage.address, currentPage.kind]);

  /** Push a new page into the active tab, truncating any forward history. */
  const navigate = useCallback(
    (raw: string) => {
      const page = resolvePage(raw);
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t;
          const truncated = t.history.slice(0, t.index + 1);
          // Avoid stacking duplicate consecutive pages.
          const last = truncated[truncated.length - 1];
          if (last && last.address === page.address && last.kind === page.kind) {
            return { ...t, history: truncated, index: truncated.length - 1 };
          }
          const history = [...truncated, page];
          return { ...t, history, index: history.length - 1 };
        }),
      );
    },
    [activeTabId],
  );

  const goBack = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId && t.index > 0 ? { ...t, index: t.index - 1 } : t,
      ),
    );
  }, [activeTabId]);

  const goForward = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId && t.index < t.history.length - 1
          ? { ...t, index: t.index + 1 }
          : t,
      ),
    );
  }, [activeTabId]);

  const reload = useCallback(() => {
    // Re-resolve the current address; for home this is a no-op, but it gives
    // the reload button real, observable behavior (state object identity).
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;
        const page = t.history[t.index];
        const fresh = resolvePage(page.kind === 'home' ? 'home' : page.address);
        const history = [...t.history];
        history[t.index] = fresh;
        return { ...t, history };
      }),
    );
  }, [activeTabId]);

  const goHome = useCallback(() => navigate('home'), [navigate]);

  const submitOmnibox = useCallback(() => {
    const value = omnibox.trim();
    if (!value) {
      navigate('home');
      return;
    }
    navigate(value);
    addressRef.current?.blur();
  }, [omnibox, navigate]);

  // ---- Tab management -----------------------------------------------------

  const newTab = useCallback(() => {
    const tab: Tab = { id: uid('tab'), history: [HOME_PAGE], index: 0 };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length === 1) {
          // Never leave zero tabs: reset the lone tab to home instead.
          const reset: Tab = { id: uid('tab'), history: [HOME_PAGE], index: 0 };
          setActiveTabId(reset.id);
          return [reset];
        }
        const idx = prev.findIndex((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);
        if (id === activeTabId) {
          const neighbor = next[Math.min(idx, next.length - 1)];
          setActiveTabId(neighbor.id);
        }
        return next;
      });
    },
    [activeTabId],
  );

  // ---- Bookmarks ----------------------------------------------------------

  const isBookmarked = useMemo(() => {
    const key = currentPage.kind === 'home' ? 'home' : currentPage.address;
    return bookmarks.some((b) => b.url === key);
  }, [bookmarks, currentPage]);

  const toggleBookmark = useCallback(() => {
    const key = currentPage.kind === 'home' ? 'home' : currentPage.address;
    setBookmarks((prev) => {
      if (prev.some((b) => b.url === key)) {
        return prev.filter((b) => b.url !== key);
      }
      const title =
        currentPage.kind === 'home'
          ? 'PromptOS Home'
          : currentPage.kind === 'search'
            ? `Search: ${currentPage.query}`
            : currentPage.title;
      return [...prev, { id: uid('bm'), title, url: key }];
    });
  }, [currentPage, setBookmarks]);

  const removeBookmark = useCallback(
    (id: string) => setBookmarks((prev) => prev.filter((b) => b.id !== id)),
    [setBookmarks],
  );

  // ---- Render -------------------------------------------------------------

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Tab strip */}
      <div className="flex items-end gap-1 px-2 pt-2 bg-black/40 border-b border-white/10">
        <div className="flex flex-1 items-end gap-1 overflow-x-auto scroll-thin">
          {tabs.map((tab) => {
            const page = tab.history[tab.index];
            const active = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={cn(
                  'group flex items-center gap-2 min-w-[120px] max-w-[200px] px-3 py-2 rounded-t-lg text-xs transition-colors',
                  active
                    ? 'bg-slate-900 text-white border-x border-t border-white/10'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10',
                )}
                title={page.title}
              >
                {page.kind === 'home' ? (
                  <Home className="w-3.5 h-3.5 shrink-0 text-accent" />
                ) : page.kind === 'search' ? (
                  <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                ) : (
                  <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                )}
                <span className="truncate flex-1 text-left">{page.title}</span>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/15 transition-opacity"
                  aria-label="Close tab"
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={newTab}
          className="mb-1 ml-1 shrink-0 rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="New tab"
          title="New tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/80 backdrop-blur border-b border-white/10">
        <ToolbarIcon onClick={goBack} disabled={!canBack} label="Back">
          <ArrowLeft className="w-4 h-4" />
        </ToolbarIcon>
        <ToolbarIcon onClick={goForward} disabled={!canForward} label="Forward">
          <ArrowRight className="w-4 h-4" />
        </ToolbarIcon>
        <ToolbarIcon onClick={reload} label="Reload">
          <RotateCw className="w-4 h-4" />
        </ToolbarIcon>
        <ToolbarIcon onClick={goHome} label="Home">
          <Home className="w-4 h-4" />
        </ToolbarIcon>

        {/* Address / search bar */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {currentPage.kind === 'site' ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
          </span>
          <input
            ref={addressRef}
            value={omnibox}
            onChange={(e) => setOmnibox(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitOmnibox();
              if (e.key === 'Escape') {
                setOmnibox(currentPage.kind === 'home' ? '' : currentPage.address);
                addressRef.current?.blur();
              }
            }}
            onFocus={(e) => e.currentTarget.select()}
            placeholder="Search the web or enter an address"
            spellCheck={false}
            className={cn(
              'w-full rounded-full bg-black/40 pl-9 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500',
              'border border-white/10 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 transition',
            )}
          />
        </div>

        <ToolbarIcon
          onClick={toggleBookmark}
          label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          <Star className={cn('w-4 h-4', isBookmarked && 'fill-accent text-accent')} />
        </ToolbarIcon>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto scroll-thin">
        {currentPage.kind === 'home' && (
          <HomePage
            bookmarks={bookmarks}
            onNavigate={navigate}
            onRemoveBookmark={removeBookmark}
          />
        )}
        {currentPage.kind === 'site' && currentPage.url && (
          <SitePage url={currentPage.url} />
        )}
        {currentPage.kind === 'search' && currentPage.query && (
          <SearchPage query={currentPage.query} onNavigate={navigate} />
        )}
      </div>
    </div>
  );
}

/** A square toolbar button with consistent disabled styling. */
function ToolbarIcon({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'shrink-0 rounded-lg p-2 text-slate-300 transition-colors',
        'hover:bg-white/10 hover:text-white',
        'disabled:opacity-30 disabled:pointer-events-none',
      )}
    >
      {children}
    </button>
  );
}

// ---- Home / new-tab page --------------------------------------------------

function HomePage({
  bookmarks,
  onNavigate,
  onRemoveBookmark,
}: {
  bookmarks: BookmarkEntry[];
  onNavigate: (raw: string) => void;
  onRemoveBookmark: (id: string) => void;
}) {
  const [query, setQuery] = useState('');

  return (
    <div className="min-h-full flex flex-col items-center px-6 py-12">
      {/* Ambient glow background */}
      <div className="relative w-full max-w-2xl flex flex-col items-center">
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

        {/* Wordmark */}
        <div className="relative mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/40">
            <Globe className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-accent">Prompt</span>
            <span className="text-slate-200">Net</span>
          </h1>
        </div>

        {/* Big search box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onNavigate(query.trim() || 'home');
            setQuery('');
          }}
          className="relative w-full"
        >
          <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            spellCheck={false}
            placeholder="Search the web or type a URL"
            className={cn(
              'w-full rounded-2xl bg-white/5 pl-14 pr-28 py-4 text-base text-slate-100 placeholder:text-slate-500',
              'border border-white/10 shadow-xl shadow-black/30',
              'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 transition',
            )}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl"
          >
            <Search className="w-4 h-4" />
            Search
          </Button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Simulated, sandboxed browsing. Pages render locally; links open in a real tab.
        </p>
      </div>

      {/* Bookmarks grid */}
      <div className="relative mt-14 w-full max-w-3xl">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-400">
          <Bookmark className="w-4 h-4 text-accent" />
          Bookmarks
        </div>
        {bookmarks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-500">
            No bookmarks yet. Star a page to pin it here.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {bookmarks.map((bm) => (
              <div
                key={bm.id}
                className={cn(
                  'group relative flex flex-col items-center gap-3 rounded-2xl p-4',
                  'border border-white/10 bg-white/5 hover:bg-white/10 hover:border-accent/40 transition-colors',
                )}
              >
                <button
                  onClick={() => onNavigate(bm.url)}
                  className="flex w-full flex-col items-center gap-3 focus:outline-none"
                  title={bm.url}
                >
                  <FaviconBadge label={bm.title} size="lg" />
                  <span className="line-clamp-2 w-full text-center text-xs text-slate-300">
                    {bm.title}
                  </span>
                </button>
                <button
                  onClick={() => onRemoveBookmark(bm.id)}
                  aria-label="Remove bookmark"
                  className="absolute right-1.5 top-1.5 rounded-md p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-300 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Simulated site page --------------------------------------------------

function SitePage({ url }: { url: string }) {
  const host = hostnameOf(url);
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <div className="relative w-full max-w-lg">
        <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-accent/10 blur-2xl" />
        <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-4">
            <FaviconBadge label={host} size="lg" />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-slate-100">{host}</h2>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Lock className="w-3 h-3" />
                <span className="truncate text-slate-400">{url}</span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-slate-400">{siteBlurb(host)}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="md" onClick={() => openExternal(url)}>
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </Button>
            <span className="text-xs text-slate-500">Opens {host} in your real browser</span>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2 text-center">
            {['Sandboxed', 'No tracking', 'Local-only'].map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-white/5 bg-white/5 px-2 py-2 text-[11px] text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Simulated search-results page ----------------------------------------

function SearchPage({
  query,
  onNavigate,
}: {
  query: string;
  onNavigate: (raw: string) => void;
}) {
  const results = useMemo(() => fakeResults(query), [query]);
  const realUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Search className="w-4 h-4 text-accent" />
          Results for <span className="font-medium text-slate-200">&ldquo;{query}&rdquo;</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => openExternal(realUrl)}>
          <ExternalLink className="w-3.5 h-3.5" />
          Open real results in new tab
        </Button>
      </div>

      <p className="mb-4 text-xs text-slate-500">
        These are simulated results generated locally. Click a result to preview the site, or open
        real results above.
      </p>

      <div className="space-y-4">
        {results.map((r) => {
          const host = hostnameOf(r.url);
          return (
            <div
              key={r.url}
              className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-accent/40 hover:bg-white/10"
            >
              <button
                onClick={() => onNavigate(r.url)}
                className="block w-full text-left focus:outline-none"
              >
                <div className="mb-1 flex items-center gap-2">
                  <FaviconBadge label={host} size="sm" />
                  <span className="truncate text-xs text-slate-500">{r.url}</span>
                </div>
                <h3 className="text-base font-medium text-sky-300 group-hover:underline">
                  {r.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{r.snippet}</p>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
        <Trash2 className="w-3.5 h-3.5" />
        End of simulated results
      </div>
    </div>
  );
}
