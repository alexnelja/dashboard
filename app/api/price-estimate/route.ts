import { NextRequest, NextResponse } from 'next/server';
import { estimatePrice } from '@/lib/price-engine';
import { getSubtypeByKey } from '@/lib/commodity-subtypes';
import type { CommodityType } from '@/lib/types';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const commodity = params.get('commodity') as CommodityType | null;
  const subtype = params.get('subtype');
  const grade = parseFloat(params.get('grade') ?? '');
  const incoterm = params.get('incoterm') ?? 'FOB';
  const loadingPort = params.get('loading_port') ?? '';
  const destLat = params.get('dest_lat') ? parseFloat(params.get('dest_lat')!) : undefined;
  const destLng = params.get('dest_lng') ? parseFloat(params.get('dest_lng')!) : undefined;
  const loadingLat = params.get('loading_lat') ? parseFloat(params.get('loading_lat')!) : undefined;
  const loadingLng = params.get('loading_lng') ? parseFloat(params.get('loading_lng')!) : undefined;
  const volume = parseFloat(params.get('volume') ?? '10000');

  if (!commodity || !subtype) {
    return NextResponse.json(
      { error: 'Missing required parameters: commodity, subtype' },
      { status: 400 },
    );
  }

  if (isNaN(grade) || grade <= 0) {
    return NextResponse.json(
      { error: 'Invalid or missing grade parameter' },
      { status: 400 },
    );
  }

  const subtypeConfig = getSubtypeByKey(subtype);
  if (!subtypeConfig) {
    return NextResponse.json(
      { error: `Unknown subtype: ${subtype}` },
      { status: 400 },
    );
  }

  // Use a default index price and grade based on subtype.
  // In production this would come from a price feed / database.
  // For now we use placeholder index values per commodity.
  const indexDefaults = getIndexDefaults(commodity, subtype);

  const estimate = estimatePrice({
    commodity,
    subtype,
    grade,
    indexGrade: indexDefaults.indexGrade,
    indexPrice: indexDefaults.indexPrice,
    indexDate: indexDefaults.indexDate,
    incoterm,
    loadingPort,
    destinationLat: destLat,
    destinationLng: destLng,
    loadingPortLat: loadingLat,
    loadingPortLng: loadingLng,
    volumeTonnes: volume,
  });

  return NextResponse.json({
    ...estimate,
    subtype: subtypeConfig.label,
    commodity: subtypeConfig.commodity,
    priceIndex: subtypeConfig.priceIndex,
    priceIndexType: subtypeConfig.priceIndexType,
  });
}

/**
 * Default index prices per commodity. In production these would come from
 * a price feed table (commodity_prices) or external API.
 */
function getIndexDefaults(commodity: CommodityType, _subtype: string): {
  indexPrice: number;
  indexGrade: number;
  indexDate: string;
} {
  // Use rough mid-2025 indicative prices
  const defaults: Record<string, { indexPrice: number; indexGrade: number; indexDate: string }> = {
    chrome: { indexPrice: 185, indexGrade: 42, indexDate: '2026-03-20' },
    manganese: { indexPrice: 5.2, indexGrade: 44, indexDate: '2026-03-20' },
    iron_ore: { indexPrice: 108, indexGrade: 62, indexDate: '2026-03-24' },
    coal: { indexPrice: 95, indexGrade: 6000, indexDate: '2026-03-21' },
    platinum: { indexPrice: 980, indexGrade: 99.95, indexDate: '2026-03-24' },
    gold: { indexPrice: 2950, indexGrade: 99.5, indexDate: '2026-03-24' },
    copper: { indexPrice: 9200, indexGrade: 99.99, indexDate: '2026-03-24' },
    vanadium: { indexPrice: 6.50, indexGrade: 98, indexDate: '2026-03-18' },
    titanium: { indexPrice: 320, indexGrade: 54, indexDate: '2026-03-15' },
    aggregates: { indexPrice: 12, indexGrade: 100, indexDate: '2026-03-01' },
  };

  return defaults[commodity] ?? { indexPrice: 100, indexGrade: 100, indexDate: '2026-03-01' };
}
