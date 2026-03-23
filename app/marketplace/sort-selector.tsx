'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export type SortOption = 'price_asc' | 'price_desc' | 'volume_desc' | 'newest';

const SORT_LABELS: Record<SortOption, string> = {
  price_asc: 'Price (low → high)',
  price_desc: 'Price (high → low)',
  volume_desc: 'Volume (high → low)',
  newest: 'Newest',
};

interface SortSelectorProps {
  currentSort: SortOption;
}

export function SortSelector({ currentSort }: SortSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', e.target.value);
    router.push(`/marketplace?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Sort by:</span>
      <select
        value={currentSort}
        onChange={handleChange}
        className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-gray-500"
      >
        {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  );
}
