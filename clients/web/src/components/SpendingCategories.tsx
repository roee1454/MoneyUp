import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const categories = [
  { name: 'מזון', emoji: '🍔', amount: 1240 },
  { name: 'ביגוד', emoji: '👗', amount: 640 },
  { name: 'בידור', emoji: '🎬', amount: 280 },
  { name: 'דלק/תחבורה', emoji: '⛽', amount: 420 },
  { name: 'סופר', emoji: '🛒', amount: 890 },
  { name: 'מנויים', emoji: '📱', amount: 180 },
];

export function SpendingCategories() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 shadow-sm p-5 space-y-4">
      <h2 className="text-lg font-black text-zinc-950 dark:text-white">הוצאות לפי קטגוריה</h2>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((category) => (
          <div
            key={category.name}
            className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 px-3 py-3 space-y-1"
          >
            <div className="text-xl">{category.emoji}</div>
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{category.name}</p>
            <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">
              {category.amount.toLocaleString('he-IL', { style: 'currency', currency: 'ILS' })}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        <span>ראה הכל</span>
      </button>

      {expanded && (
        <p className="text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500">
          עוד תנועות בקרוב...
        </p>
      )}
    </div>
  );
}
