'use client';

import { COMMODITY_CONFIG, ListingWithDetails, CommodityType } from '@/lib/types';
import { timeAgo } from '@/lib/format';

interface ListingsPanelProps {
  listings: ListingWithDetails[];
  hoveredListingId: string | null;
  onListingHover: (id: string | null) => void;
  onListingClick: (listing: ListingWithDetails) => void;
}

function formatVolume(tonnes: number): string {
  if (tonnes >= 1_000_000) return `${(tonnes / 1_000_000).toFixed(1)}Mt`;
  if (tonnes >= 1_000) return `${(tonnes / 1_000).toFixed(0)}kt`;
  return `${tonnes}t`;
}

function getPrimarySpec(commodity: string, spec: Record<string, number>): string {
  const keys: Record<string, string[]> = {
    chrome: ['cr2o3_pct', 'cr2o3', 'Cr2O3'],
    manganese: ['mn_pct', 'mn', 'Mn'],
    iron_ore: ['fe_pct', 'fe', 'Fe'],
    coal: ['cv_kcal', 'cv_gar', 'CV'],
    aggregates: ['particle_size_mm', 'size_mm'],
  };
  const searchKeys = keys[commodity] || [];
  for (const k of searchKeys) {
    if (spec[k] !== undefined) {
      const val = spec[k];
      if (commodity === 'coal') return `${val} kcal`;
      return `${val}%`;
    }
  }
  // Fallback: first non-moisture value
  const entry = Object.entries(spec).find(([k]) => !k.includes('moisture'));
  return entry ? `${entry[1]}%` : '';
}

export function ListingsPanel({
  listings,
  hoveredListingId,
  onListingHover,
  onListingClick,
}: ListingsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 text-sm gap-2 p-8">
            <span className="text-2xl">—</span>
            <span>No listings match your filters</span>
          </div>
        ) : (
          <ul className="divide-y divide-gray-800/60">
            {listings.map((listing) => {
              const config = COMMODITY_CONFIG[listing.commodity_type as CommodityType];
              const grade = getPrimarySpec(listing.commodity_type, listing.spec_sheet);
              const isHovered = listing.id === hoveredListingId;

              return (
                <li
                  key={listing.id}
                  onMouseEnter={() => onListingHover(listing.id)}
                  onMouseLeave={() => onListingHover(null)}
                  onClick={() => onListingClick(listing)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    isHovered ? 'bg-gray-800/70' : 'hover:bg-gray-900'
                  }`}
                >
                  {/* Top row: commodity dot + name + verified */}
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-none"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-sm font-medium text-gray-100 flex-1 truncate">
                      {config.label}
                      {grade ? (
                        <span className="ml-1 text-gray-400 font-normal">{grade}</span>
                      ) : null}
                    </span>
                    {listing.is_verified && (
                      <span className="flex-none text-xs px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-400 border border-emerald-800">
                        Verified
                      </span>
                    )}
                  </div>

                  {/* Route text */}
                  <div className="text-xs text-gray-500 mb-2 truncate">
                    {listing.mine_name} → {listing.harbour_name}
                  </div>

                  {/* Bottom row: price, volume, incoterms, time */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-100">
                      ${listing.price_per_tonne.toLocaleString()}/t
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatVolume(listing.volume_tonnes)}
                    </span>
                    <div className="flex gap-1 flex-1">
                      {listing.incoterms.map((term) => (
                        <span
                          key={term}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-gray-600 flex-none">
                      {timeAgo(listing.created_at)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
