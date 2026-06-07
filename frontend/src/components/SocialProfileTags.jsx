import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';

const POPOVER_WIDTH = 320;
const POPOVER_GAP = 6;

function profileKey(url) {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    return `${host}${path}`;
  } catch {
    return url.toLowerCase().trim();
  }
}

function socialLabel(url) {
  if (/instagram/i.test(url)) return 'Instagram';
  if (/facebook/i.test(url)) return 'Facebook';
  if (/twitter|x\.com/i.test(url)) return 'X';
  if (/tiktok/i.test(url)) return 'TikTok';
  if (/linkedin/i.test(url)) return 'LinkedIn';
  if (/youtube/i.test(url)) return 'YouTube';
  return 'Social';
}

function findScrape(url, socialScrapes) {
  if (!socialScrapes?.length) return null;

  const key = profileKey(url);
  const exact = socialScrapes.find((s) => profileKey(s.url) === key);
  if (exact) return exact;

  const label = socialLabel(url).toLowerCase();
  const platformMatches = socialScrapes.filter(
    (s) => socialLabel(s.url).toLowerCase() === label,
  );
  if (platformMatches.length === 1) return platformMatches[0];

  return null;
}

function getPopoverPosition(rect) {
  if (!rect) return null;

  let left = rect.left;
  if (left + POPOVER_WIDTH > window.innerWidth - 16) {
    left = Math.max(16, rect.right - POPOVER_WIDTH);
  }
  left = Math.max(16, left);

  const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP;
  const showAbove = spaceBelow < 220 && rect.top > spaceBelow;

  return {
    top: showAbove ? rect.top - POPOVER_GAP : rect.bottom + POPOVER_GAP,
    left,
    width: POPOVER_WIDTH,
    transform: showAbove ? 'translateY(-100%)' : undefined,
  };
}

function ScrapePopover({ scrape, url, label, onEnter, onLeave, isDark, position }) {
  if (!position) return null;

  return createPortal(
    <div
      className="fixed z-[200] pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        transform: position.transform,
      }}
    >
      {/* Invisible bridge so moving from tag → popover doesn't flicker */}
      <div
        className="pointer-events-auto h-2 -mb-2"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        aria-hidden="true"
      />
      <div
        className={`pointer-events-auto rounded-xl border p-3 shadow-xl animate-in fade-in duration-150 ${
          isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
        role="tooltip"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
            {label} — AI summary
          </span>
          {scrape?.mock && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                isDark ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' : 'bg-amber-100 text-amber-700'
              }`}
            >
              Demo
            </span>
          )}
        </div>

        <div className="flex gap-1.5 mb-3">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              isDark ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {scrape.source || 'unknown'}
          </span>
        </div>

        {scrape?.summary?.topics || scrape?.summary?.engagement ? (
          <div className="space-y-3">
            {scrape.summary.topics && (
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                  What they post about
                </p>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                  {scrape.summary.topics}
                </p>
              </div>
            )}
            {scrape.summary.engagement && (
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                  Engagement
                </p>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                  {scrape.summary.engagement}
                </p>
              </div>
            )}
          </div>
        ) : scrape?.content?.trim() ? (
          <p className={`text-xs italic ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
            AI summary unavailable for this profile. Re-run analysis to refresh.
          </p>
        ) : (
          <p className={`text-xs italic ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
            No scraped data for this profile yet.
          </p>
        )}

        <p className={`text-[10px] mt-2 truncate ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{url}</p>

        <div
          className={`absolute left-4 w-3 h-3 rotate-45 border-l border-t ${
            position.transform
              ? `-bottom-1.5 border-b border-r border-l-0 border-t-0 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'}`
              : `-top-1.5 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'}`
          }`}
        />
      </div>
    </div>,
    document.body,
  );
}

export default function SocialProfileTags({ items, socialScrapes = [], onChange }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [input, setInput] = useState('');
  const [hovered, setHovered] = useState(null);
  const [pinned, setPinned] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const hideTimer = useRef(null);
  const anchorRefs = useRef({});

  const activeUrl = pinned || hovered;

  const cancelHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = setTimeout(() => {
      if (!pinned) setHovered(null);
    }, 120);
  };

  const updatePopoverPosition = useCallback(() => {
    if (!activeUrl) {
      setPopoverPosition(null);
      return;
    }
    const anchor = anchorRefs.current[profileKey(activeUrl)];
    if (!anchor) {
      setPopoverPosition(null);
      return;
    }
    setPopoverPosition(getPopoverPosition(anchor.getBoundingClientRect()));
  }, [activeUrl]);

  useEffect(() => {
    updatePopoverPosition();
    if (!activeUrl) return undefined;

    window.addEventListener('scroll', updatePopoverPosition, true);
    window.addEventListener('resize', updatePopoverPosition);
    return () => {
      window.removeEventListener('scroll', updatePopoverPosition, true);
      window.removeEventListener('resize', updatePopoverPosition);
    };
  }, [activeUrl, updatePopoverPosition]);

  const addItem = () => {
    const trimmed = input.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setInput('');
  };

  const removeItem = (index) => {
    const removed = items[index];
    onChange(items.filter((_, i) => i !== index));
    if (activeUrl && profileKey(activeUrl) === profileKey(removed)) {
      setHovered(null);
      setPinned(null);
    }
  };

  const showPopover = (url) => {
    cancelHide();
    setHovered(url);
  };

  const togglePin = (e, url) => {
    e.preventDefault();
    e.stopPropagation();
    setPinned((prev) => (prev && profileKey(prev) === profileKey(url) ? null : url));
    setHovered(url);
  };

  const activeScrape = activeUrl ? findScrape(activeUrl, socialScrapes) : null;
  const activeLabel = activeUrl ? socialLabel(activeUrl) : '';

  return (
    <div className="relative">
      <label className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
        Social Profiles
        <span className={`font-normal ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}> (optional)</span>
      </label>
      <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
        Hover a profile to preview scraped data
      </p>

      <div
        className={`mt-2 flex flex-wrap gap-2 min-h-[2.5rem] p-3 rounded-lg border ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-300'
        }`}
      >
        {items.length === 0 && (
          <span className={`text-sm italic ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            No profiles yet — add one below
          </span>
        )}
        {items.map((item, i) => {
          const scrape = findScrape(item, socialScrapes);
          const hasData = Boolean(
            scrape?.summary?.topics || scrape?.summary?.engagement || scrape?.content?.trim(),
          );
          const isActive = activeUrl && profileKey(activeUrl) === profileKey(item);
          const label = socialLabel(item);
          const key = profileKey(item);

          const tagClass = isActive
            ? 'bg-hookline-500 text-white border-hookline-400 shadow-md shadow-hookline-500/20'
            : hasData
              ? isDark
                ? 'bg-hookline-900/40 text-hookline-200 border-hookline-800/40 hover:bg-hookline-900/60'
                : 'bg-hookline-100 text-hookline-900 hover:bg-hookline-200 border-hookline-200'
              : isDark
                ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300 border-gray-300';

          return (
            <div
              key={`${item}-${i}`}
              className="inline-flex"
              onMouseEnter={() => showPopover(item)}
              onMouseLeave={scheduleHide}
            >
              <div
                ref={(el) => {
                  if (el) anchorRefs.current[key] = el;
                  else delete anchorRefs.current[key];
                }}
                role="button"
                tabIndex={0}
                onClick={(e) => togglePin(e, item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') togglePin(e, item);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border-2 transition-colors select-none ${tagClass}`}
              >
                <span>{label}</span>
                {hasData && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Data available" />
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeItem(i);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      removeItem(i);
                    }
                  }}
                  className={`w-4 h-4 flex items-center justify-center rounded-full text-base leading-none ${
                    isActive ? 'hover:bg-hookline-600' : 'hover:bg-black/10'
                  }`}
                  aria-label={`Remove ${item}`}
                >
                  ×
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activeUrl && (
        <ScrapePopover
          scrape={activeScrape}
          url={activeUrl}
          label={activeLabel}
          onEnter={cancelHide}
          onLeave={scheduleHide}
          isDark={isDark}
          position={popoverPosition}
        />
      )}

      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="e.g. instagram.com/yourbusiness"
          className={`flex-1 px-3 py-2 rounded-lg border outline-none text-sm transition focus:ring-2 focus:ring-hookline-500 ${
            isDark
              ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500'
              : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
          }`}
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!input.trim()}
          className={`px-4 py-2 bg-hookline-500 hover:bg-hookline-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition ${
            isDark ? 'disabled:bg-zinc-800 disabled:text-zinc-500' : ''
          }`}
        >
          Add
        </button>
      </div>
    </div>
  );
}
