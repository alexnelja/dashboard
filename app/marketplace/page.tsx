import Link from 'next/link';
import { Suspense } from 'react';
import { getActiveListings, getActiveRequirements } from '@/lib/queries';
import { ListingCard } from './listing-card';
import { RequirementCard } from './requirement-card';
import { SortSelector, type SortOption } from './sort-selector';

interface MarketplacePageProps {
  searchParams: Promise<{ tab?: string; sort?: string }>;
}

function sortListings<T extends { price_per_tonne: number; volume_tonnes: number; created_at: string }>(
  listings: T[],
  sort: SortOption
): T[] {
  const copy = [...listings];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => a.price_per_tonne - b.price_per_tonne);
    case 'price_desc':
      return copy.sort((a, b) => b.price_per_tonne - a.price_per_tonne);
    case 'volume_desc':
      return copy.sort((a, b) => b.volume_tonnes - a.volume_tonnes);
    case 'newest':
    default:
      return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = await searchParams;
  const tab = params.tab ?? 'listings';
  const sortParam = (params.sort ?? 'newest') as SortOption;

  const [allListings, requirements] = await Promise.all([
    getActiveListings(),
    getActiveRequirements(),
  ]);

  // Filter out obviously broken listings (test/dmtu prices for non-aggregates)
  const validListings = allListings.filter(l => {
    if (l.commodity_type === 'aggregates') return true;
    return l.price_per_tonne >= 5;
  });

  const listings = sortListings(validListings, sortParam);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-gray-400 text-sm mt-1">Browse listings and buyer requirements.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/marketplace/new-listing"
            className="bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + New Listing
          </Link>
          <Link
            href="/marketplace/new-requirement"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + New Requirement
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-gray-800">
        <Link
          href="/marketplace?tab=listings"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'listings'
              ? 'text-white border-b-2 border-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Listings ({listings.length})
        </Link>
        <Link
          href="/marketplace?tab=requirements"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'requirements'
              ? 'text-white border-b-2 border-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Requirements ({requirements.length})
        </Link>
      </div>

      {/* Sort control — only shown on listings tab */}
      {tab === 'listings' && listings.length > 0 && (
        <div className="flex justify-end">
          <Suspense fallback={null}>
            <SortSelector currentSort={sortParam} />
          </Suspense>
        </div>
      )}

      {/* Content grid */}
      {tab === 'listings' ? (
        listings.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
            No active listings at the moment. Be the first to post one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )
      ) : (
        requirements.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
            No active requirements at the moment. Post what you&apos;re looking for.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {requirements.map((requirement) => (
              <RequirementCard key={requirement.id} requirement={requirement} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
