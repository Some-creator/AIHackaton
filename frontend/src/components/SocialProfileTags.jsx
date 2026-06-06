import { useRef, useState } from 'react';

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
    (s) => socialLabel(s.url).toLowerCase() === label
  );
  if (platformMatches.length === 1) return platformMatches[0];

  return null;
}

function ScrapePopover({ scrape, url, label, onEnter, onLeave }) {
  return (
    <div
      className="absolute left-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-lg p-3"
      role="tooltip"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-900">{label} — scraped data</span>
        {scrape?.mock && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">Demo</span>
        )}
      </div>

      {scrape?.content?.trim() ? (
        <>
          <div className="flex gap-1.5 mb-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {scrape.source || 'unknown'}
            </span>
          </div>
          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {scrape.content}
          </p>
        </>
      ) : (
        <p className="text-xs text-gray-500 italic">
          No scraped data for this profile yet.
        </p>
      )}

      <p className="text-[10px] text-gray-400 mt-2 truncate">{url}</p>

      <div className="absolute left-4 -top-1.5 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45" />
    </div>
  );
}

export default function SocialProfileTags({ items, socialScrapes = [], onChange }) {
  const [input, setInput] = useState('');
  const [hovered, setHovered] = useState(null);
  const [pinned, setPinned] = useState(null);
  const hideTimer = useRef(null);

  const activeUrl = pinned || hovered;

  const cancelHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = setTimeout(() => {
      if (!pinned) setHovered(null);
    }, 150);
  };

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

  return (
    <div>
      <label className="text-sm font-medium text-gray-700">Social Profiles</label>
      <p className="text-xs text-gray-400 mt-0.5">Hover a profile to preview scraped data</p>

      <div className="mt-2 flex flex-wrap gap-2 min-h-[2.5rem] p-3 rounded-lg border border-gray-300 bg-gray-50 overflow-visible">
        {items.length === 0 && (
          <span className="text-sm text-gray-400 italic">No profiles yet — add one below</span>
        )}
        {items.map((item, i) => {
          const scrape = findScrape(item, socialScrapes);
          const hasData = Boolean(scrape?.content?.trim());
          const isActive = activeUrl && profileKey(activeUrl) === profileKey(item);
          const label = socialLabel(item);

          return (
            <div
              key={`${item}-${i}`}
              className="relative inline-flex"
              onMouseEnter={() => showPopover(item)}
              onMouseLeave={scheduleHide}
            >
              {isActive && (
                <ScrapePopover
                  scrape={scrape}
                  url={item}
                  label={label}
                  onEnter={cancelHide}
                  onLeave={scheduleHide}
                />
              )}

              <div
                role="button"
                tabIndex={0}
                onClick={(e) => togglePin(e, item)}
                onKeyDown={(e) => { if (e.key === 'Enter') togglePin(e, item); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition select-none ${
                  isActive
                    ? 'bg-hookline-500 text-white ring-2 ring-hookline-300'
                    : hasData
                      ? 'bg-hookline-100 text-hookline-800 hover:bg-hookline-200 cursor-default'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300 cursor-default'
                }`}
              >
                <span>{label}</span>
                {hasData && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Data available" />
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeItem(i); }}
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

      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          placeholder="e.g. instagram.com/yourbusiness"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-hookline-500 outline-none text-sm"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!input.trim()}
          className="px-4 py-2 bg-hookline-500 hover:bg-hookline-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition"
        >
          Add
        </button>
      </div>
    </div>
  );
}
