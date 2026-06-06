import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ServiceTags({ label, items, onChange, placeholder = 'Add item...' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [input, setInput] = useState('');

  const addItem = () => {
    const trimmed = input.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setInput('');
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div>
      <label className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{label}</label>
      <div className={`mt-2 flex flex-wrap gap-2 min-h-[2.5rem] p-3 rounded-lg border transition-all duration-300 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-300'}`}>
        {items.length === 0 && (
          <span className="text-sm text-gray-400 italic">No items yet — add one below</span>
        )}
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border transition-all duration-300 ${isDark ? 'bg-hookline-900/40 text-hookline-200 border-hookline-800/40' : 'bg-hookline-100 border-hookline-200 text-hookline-900'}`}
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(i)}
              className={`w-4 h-4 flex items-center justify-center rounded-full transition-colors ${isDark ? 'hover:bg-hookline-900/60 text-hookline-300' : 'hover:bg-hookline-200 text-hookline-700'}`}
              aria-label={`Remove ${item}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`flex-1 px-3 py-2 rounded-lg border outline-none text-sm transition focus:ring-2 focus:ring-hookline-500 ${isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!input.trim()}
          className={`px-4 py-2 bg-hookline-500 hover:bg-hookline-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition ${isDark ? 'disabled:bg-zinc-800 disabled:text-zinc-500' : ''}`}
        >
          Add
        </button>
      </div>
    </div>
  );
}
