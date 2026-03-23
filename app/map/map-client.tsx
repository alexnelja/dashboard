'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Link from 'next/link';
import { COMMODITY_CONFIG, MineWithGeo, HarbourWithGeo, ListingWithDetails, CommodityType } from '@/lib/types';
import { fetchRoadRoute, generateOceanRoute, buildRailRoute, RouteSegment } from '@/lib/routes';
import type { RouteRow } from '@/lib/queries';
import { ListingsPanel } from './listings-panel';
import { FilterBar, Filters } from './filter-bar';

const DEFAULT_FILTERS: Filters = {
  commodities: [],
  verifiedOnly: false,
  priceMin: null,
  priceMax: null,
  volumeMin: null,
  incoterm: null,
};

function applyFilters(listings: ListingWithDetails[], filters: Filters): ListingWithDetails[] {
  return listings.filter((l) => {
    if (filters.commodities.length > 0 && !filters.commodities.includes(l.commodity_type as CommodityType)) {
      return false;
    }
    if (filters.verifiedOnly && !l.is_verified) {
      return false;
    }
    if (filters.priceMin !== null && l.price_per_tonne < filters.priceMin) {
      return false;
    }
    if (filters.priceMax !== null && l.price_per_tonne > filters.priceMax) {
      return false;
    }
    if (filters.volumeMin !== null && l.volume_tonnes < filters.volumeMin) {
      return false;
    }
    if (filters.incoterm !== null && !l.incoterms.includes(filters.incoterm)) {
      return false;
    }
    return true;
  });
}

// Representative global destination port (Shanghai)
const SHANGHAI: { lng: number; lat: number } = { lng: 121.47, lat: 31.23 };

interface MapClientProps {
  mines: MineWithGeo[];
  harbours: HarbourWithGeo[];
  listings: ListingWithDetails[];
  routes: RouteRow[];
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export function MapClient({ mines, harbours, listings, routes }: MapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const roadRouteCacheRef = useRef<RouteSegment[]>([]);
  const mapReadyRef = useRef(false);
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<ListingWithDetails | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const filteredListings = applyFilters(listings, filters);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [26, -29],
      zoom: 5,
    });

    mapRef.current = map;

    // Navigation controls bottom-right
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    map.on('style.load', () => {
      mapReadyRef.current = true;

      // --- Rail corridors source + layer (amber solid) ---
      map.addSource('rail-routes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'rail-routes-layer',
        type: 'line',
        source: 'rail-routes',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#f59e0b',
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });

      // --- Road haul source + layer (gray dashed, thinner) ---
      map.addSource('road-routes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'road-routes-layer',
        type: 'line',
        source: 'road-routes',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#6b7280',
          'line-width': 1.5,
          'line-dasharray': [4, 4],
          'line-opacity': 0.65,
        },
      });

      // --- Ocean freight source + layer (blue dashed) ---
      map.addSource('ocean-routes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'ocean-routes-layer',
        type: 'line',
        source: 'ocean-routes',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.6,
        },
      });

      // --- Mine markers ---
      for (const mine of mines) {
        const primaryCommodity = mine.commodities[0] as CommodityType | undefined;
        const color = primaryCommodity ? COMMODITY_CONFIG[primaryCommodity]?.color ?? '#9ca3af' : '#9ca3af';

        const el = document.createElement('div');
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = color;
        el.style.border = '2px solid rgba(255,255,255,0.25)';
        el.style.cursor = 'pointer';
        el.style.boxShadow = `0 0 6px ${color}80`;

        const popupHtml = `
          <div style="font-family: sans-serif; padding: 4px 2px;">
            <div style="font-weight: 600; font-size: 13px; color: #f9fafb; margin-bottom: 2px;">${mine.name}</div>
            <div style="font-size: 11px; color: #9ca3af;">${mine.region}, ${mine.country}</div>
            <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">
              ${mine.commodities.map((c) => COMMODITY_CONFIG[c as CommodityType]?.label ?? c).join(' · ')}
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 10, closeButton: false })
          .setHTML(popupHtml);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([mine.location.lng, mine.location.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          popup.addTo(map);
        });

        markersRef.current.push(marker);
      }

      // --- Harbour markers ---
      for (const harbour of harbours) {
        const el = document.createElement('div');
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.borderRadius = '2px';
        el.style.backgroundColor = '#10b981';
        el.style.border = '2px solid rgba(255,255,255,0.25)';
        el.style.cursor = 'pointer';

        const popupHtml = `
          <div style="font-family: sans-serif; padding: 4px 2px;">
            <div style="font-weight: 600; font-size: 13px; color: #f9fafb; margin-bottom: 2px;">${harbour.name}</div>
            <div style="font-size: 11px; color: #9ca3af;">${harbour.country} · ${harbour.type}</div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 10, closeButton: false })
          .setHTML(popupHtml);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([harbour.location.lng, harbour.location.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          popup.addTo(map);
        });

        markersRef.current.push(marker);
      }

      // --- Render rail corridors immediately from stored geometry ---
      renderRailRoutes(map);

      // --- Fetch road routes from Mapbox Directions API ---
      fetchRoadRoutesSequentially(map);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Render rail corridors from stored route_geometry (no API calls needed).
   */
  function renderRailRoutes(map: mapboxgl.Map) {
    const source = map.getSource('rail-routes') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    const railRows = routes.filter((r) => r.transport_mode === 'rail');
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

    for (const row of railRows) {
      const mine = mines.find((m) => m.id === row.origin_mine_id);
      const harbour = harbours.find((h) => h.id === row.harbour_id);
      if (!mine || !harbour) continue;

      const label = `${mine.name} → ${harbour.name}`;
      const seg = buildRailRoute(
        row.mine_location,
        row.harbour_location,
        row.route_geometry,
        label,
        0
      );

      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: seg.coordinates },
        properties: { label: seg.label },
      });
    }

    source.setData({ type: 'FeatureCollection', features });
  }

  /**
   * Build a deduplicated list of road mine→harbour pairs from routes data,
   * then fetch Mapbox Directions routes sequentially to avoid rate limiting.
   * Results are cached in roadRouteCacheRef.
   */
  async function fetchRoadRoutesSequentially(map: mapboxgl.Map) {
    // If already cached, just render
    if (roadRouteCacheRef.current.length > 0) {
      renderRoadRoutes(map, roadRouteCacheRef.current);
      return;
    }

    // Use routes table data for road routes; fall back to listing-derived pairs
    const roadRows = routes.filter((r) => r.transport_mode === 'road');
    const seen = new Set<string>();
    const pairs: Array<{ mine: MineWithGeo; harbour: HarbourWithGeo }> = [];

    if (roadRows.length > 0) {
      for (const row of roadRows) {
        const key = `${row.origin_mine_id}:${row.harbour_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const mine = mines.find((m) => m.id === row.origin_mine_id);
        const harbour = harbours.find((h) => h.id === row.harbour_id);
        if (mine && harbour) pairs.push({ mine, harbour });
      }
    } else {
      // Fallback: derive road pairs from listings
      for (const listing of listings) {
        const mine = mines.find((m) => m.id === listing.source_mine_id);
        const harbour = harbours.find((h) => h.id === listing.loading_port_id);
        if (!mine || !harbour) continue;
        const key = `${mine.id}:${harbour.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({ mine, harbour });
      }
    }

    const segments: RouteSegment[] = [];

    for (const { mine, harbour } of pairs) {
      const segment = await fetchRoadRoute(
        mine.location,
        harbour.location,
        `${mine.name} → ${harbour.name}`
      );
      if (segment) {
        segments.push(segment);
      }
      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    roadRouteCacheRef.current = segments;
    renderRoadRoutes(map, segments);
  }

  function renderRoadRoutes(map: mapboxgl.Map, segments: RouteSegment[]) {
    const source = map.getSource('road-routes') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    const features: GeoJSON.Feature<GeoJSON.LineString>[] = segments.map((seg) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: seg.coordinates },
      properties: { label: seg.label, distance_km: seg.distance_km },
    }));

    source.setData({ type: 'FeatureCollection', features });
  }

  function renderOceanRoute(map: mapboxgl.Map, listing: ListingWithDetails) {
    const harbour = harbours.find((h) => h.id === listing.loading_port_id);
    const from = harbour ? harbour.location : listing.mine_location;

    const segment = generateOceanRoute(
      from,
      SHANGHAI,
      `${listing.harbour_name} → Shanghai`
    );

    const source = map.getSource('ocean-routes') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: segment.coordinates },
          properties: { label: segment.label, distance_km: segment.distance_km },
        },
      ],
    });
  }

  function clearOceanRoute() {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource('ocean-routes') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({ type: 'FeatureCollection', features: [] });
  }

  function handleListingHover(id: string | null) {
    setHoveredListingId(id);

    if (!mapRef.current) return;

    if (!id) {
      clearOceanRoute();
      return;
    }

    const listing = listings.find((l) => l.id === id);
    if (!listing) return;

    mapRef.current.easeTo({
      center: [listing.mine_location.lng, listing.mine_location.lat],
      duration: 400,
    });
  }

  function handleListingClick(listing: ListingWithDetails) {
    if (!mapRef.current) return;

    setSelectedListing(listing);

    mapRef.current.flyTo({
      center: [listing.mine_location.lng, listing.mine_location.lat],
      zoom: 8,
      duration: 1000,
    });

    renderOceanRoute(mapRef.current, listing);
  }

  const [panelWidth, setPanelWidth] = useState(380);
  const isDragging = useRef(false);

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    isDragging.current = true;

    function onMove(ev: MouseEvent) {
      if (!isDragging.current) return;
      // Account for sidebar width (224px on md+)
      const sidebarWidth = window.innerWidth >= 768 ? 224 : 0;
      const newWidth = Math.max(280, Math.min(ev.clientX - sidebarWidth, window.innerWidth * 0.6));
      setPanelWidth(newWidth);
    }

    function onUp() {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  return (
    <div className="relative h-[calc(100vh-5rem)] -m-6 md:-m-10 overflow-hidden">
      {/* Map fills ENTIRE area behind everything */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Filter bar - floating at top, transparent */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gray-950/20 backdrop-blur-xl border-b border-white/5">
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          listingCount={filteredListings.length}
        />
      </div>

      {/* Listings panel - left overlay, transparent, below filter bar */}
      <div
        className="absolute top-[88px] bottom-0 left-0 z-10 flex"
        style={{ width: panelWidth }}
      >
        {/* Panel content */}
        <div className="flex-1 bg-gray-950/20 backdrop-blur-xl border-r border-white/5 overflow-y-auto">
          <ListingsPanel
            listings={filteredListings}
            hoveredListingId={hoveredListingId}
            onListingHover={handleListingHover}
            onListingClick={handleListingClick}
          />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={handleDragStart}
          className="w-1.5 cursor-col-resize flex-shrink-0 group relative hover:bg-white/10 transition-colors"
        >
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center">
            <div className="w-0.5 h-8 bg-white/20 rounded-full group-hover:bg-white/40 transition-colors" />
          </div>
        </div>
      </div>

      {/* Listing detail popup — floating on map when a listing is clicked */}
      {selectedListing && (() => {
        const config = COMMODITY_CONFIG[selectedListing.commodity_type];
        const spec = selectedListing.spec_sheet;
        const mainSpec = Object.entries(spec).find(([k]) => !k.includes('moisture'));
        return (
          <div
            className="absolute top-24 z-30 bg-gray-950/20 backdrop-blur-xl border border-white/10 rounded-xl p-4 w-72 shadow-2xl"
            style={{ left: panelWidth + 24 }}
          >
            {/* Close button */}
            <button
              onClick={() => { setSelectedListing(null); clearOceanRoute(); }}
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-sm w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10"
            >
              ×
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
              <span className="text-sm font-semibold text-white">
                {config.label} {mainSpec ? `${mainSpec[1]}%` : ''}
              </span>
              {selectedListing.is_verified && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">✓ Verified</span>
              )}
            </div>

            {/* Route */}
            <p className="text-xs text-gray-400 mb-3">
              {selectedListing.mine_name} → {selectedListing.harbour_name}
            </p>

            {/* Price + Volume */}
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-lg font-bold text-amber-400">
                ${selectedListing.price_per_tonne}/t
              </span>
              <span className="text-sm text-gray-400">
                {selectedListing.volume_tonnes >= 1000
                  ? `${(selectedListing.volume_tonnes / 1000).toFixed(0)}kt`
                  : `${selectedListing.volume_tonnes}t`}
              </span>
            </div>

            {/* Incoterms */}
            <div className="flex gap-1.5 mb-3">
              {selectedListing.incoterms.map((term) => (
                <span key={term} className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                  {term}
                </span>
              ))}
              <span className="text-[10px] text-gray-500 ml-auto">{selectedListing.currency}</span>
            </div>

            {/* Spec sheet */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 text-xs">
              {Object.entries(spec).map(([key, val]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-500">{key.replace(/_/g, ' ')}</span>
                  <span className="text-gray-300">{String(val)}</span>
                </div>
              ))}
            </div>

            {/* Seller */}
            <p className="text-xs text-gray-500 mb-3">
              Seller: <span className="text-gray-300">{selectedListing.seller_company}</span>
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <Link
                href={`/marketplace/listings/${selectedListing.id}`}
                className="flex-1 text-center text-xs bg-white text-black rounded-lg px-3 py-1.5 font-medium hover:bg-gray-200 transition-colors"
              >
                View Details
              </Link>
              <button className="flex-1 text-center text-xs bg-white/10 text-white rounded-lg px-3 py-1.5 font-medium hover:bg-white/20 transition-colors border border-white/10">
                Express Interest
              </button>
            </div>
          </div>
        );
      })()}

      {/* Legend overlay bottom-right of map area */}
        <div className="absolute bottom-8 right-3 z-10 bg-gray-950/20 border border-white/5 rounded-lg p-3 space-y-2 text-xs backdrop-blur-xl">
          <div className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Legend</div>
          {(Object.entries(COMMODITY_CONFIG) as [CommodityType, { label: string; color: string }][]).map(
            ([, config]) => (
              <div key={config.label} className="flex items-center gap-2 text-gray-300">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-none"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
              </div>
            )
          )}
          <div className="flex items-center gap-2 text-gray-300 pt-1 border-t border-gray-700/50">
            <span className="w-2.5 h-2.5 rounded flex-none bg-emerald-500" />
            Harbour
          </div>
          <div className="pt-1 border-t border-gray-700/50 space-y-1.5">
            <div className="flex items-center gap-2 text-gray-300">
              <span className="flex-none w-5 h-0.5 rounded" style={{ backgroundColor: '#f59e0b' }} />
              Rail corridor
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span
                className="flex-none w-5 h-0.5 rounded"
                style={{
                  background: `repeating-linear-gradient(to right, #6b7280 0, #6b7280 4px, transparent 4px, transparent 8px)`,
                }}
              />
              Road haul
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span
                className="flex-none w-5 h-0.5 rounded"
                style={{
                  background: `repeating-linear-gradient(to right, #3b82f6 0, #3b82f6 4px, transparent 4px, transparent 7px)`,
                }}
              />
              Ocean freight
            </div>
          </div>
      </div>
    </div>
  );
}
