import { useState } from 'react';

export default function ServiceTags({ label, items, onChange, placeholder = 'Add item...' }) {
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
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-2 flex flex-wrap gap-2 min-h-[2.5rem] p-3 rounded-lg border border-gray-300 bg-gray-50">
        {items.length === 0 && (
          <span className="text-sm text-gray-400 italic">No items yet — add one below</span>
        )}
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-hookline-100 text-hookline-800 text-sm font-medium rounded-full"
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-hookline-200 text-hookline-600"
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
