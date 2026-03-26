import { createServerSupabaseClient } from './supabase-server';
import type { CommodityType } from './types';

export interface CommodityPrice {
  id: string;
  commodity: string;
  price_usd: number;
  unit: string;
  source: string;
  period: string;
  recorded_at: string;
}

export interface CommodityPriceDisplay {
  price: number;
  source: string;
  period: string;
  trend: { text: string; positive: boolean } | null;
}

/**
 * Returns the latest price record for each commodity.
 */
export async function getLatestPrices(): Promise<Record<string, CommodityPrice>> {
  const supabase = await createServerSupabaseClient();

  // Fetch the most recent price for each commodity
  const commodities: CommodityType[] = ['chrome', 'manganese', 'iron_ore', 'coal', 'aggregates', 'platinum', 'gold', 'copper', 'vanadium', 'titanium'];
  const result: Record<string, CommodityPrice> = {};

  // Single query: get recent prices ordered by recorded_at desc
  const { data } = await supabase
    .from('commodity_prices')
    .select('*')
    .order('recorded_at', { ascending: false });

  if (!data) return result;

  const preciousMetals = ['gold', 'silver', 'platinum', 'palladium'];

  // Pick first (most recent) for each commodity, preferring LBMA for precious metals
  for (const row of data) {
    const commodity = row.commodity as string;
    if (!commodities.includes(commodity as CommodityType)) continue;

    if (!result[commodity]) {
      result[commodity] = row as CommodityPrice;
    } else if (
      preciousMetals.includes(commodity) &&
      result[commodity].source !== 'lbma' &&
      (row as CommodityPrice).source === 'lbma'
    ) {
      // Prefer LBMA for precious metals even if another source was seen first
      result[commodity] = row as CommodityPrice;
    }
  }

  return result;
}

/**
 * Returns price time series for a commodity over N months.
 */
export async function getPriceHistory(
  commodity: CommodityType,
  months: number = 24,
): Promise<CommodityPrice[]> {
  const supabase = await createServerSupabaseClient();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  const { data } = await supabase
    .from('commodity_prices')
    .select('*')
    .eq('commodity', commodity)
    .gte('recorded_at', cutoff.toISOString())
    .order('recorded_at', { ascending: true });

  return (data ?? []) as CommodityPrice[];
}

/**
 * Returns a display-ready price for a commodity, including trend vs previous month.
 */
export async function getCommodityPriceForDisplay(
  commodity: CommodityType,
): Promise<CommodityPriceDisplay | null> {
  const supabase = await createServerSupabaseClient();

  // Try LBMA source first (authoritative for precious metals), then fall back to any source
  const preciousMetals = ['gold', 'silver', 'platinum', 'palladium'];
  const preferLbma = preciousMetals.includes(commodity);

  let data: CommodityPrice[] | null = null;

  if (preferLbma) {
    const { data: lbmaData } = await supabase
      .from('commodity_prices')
      .select('*')
      .eq('commodity', commodity)
      .eq('source', 'lbma')
      .order('period', { ascending: false })
      .limit(2);
    if (lbmaData && lbmaData.length > 0) {
      data = lbmaData as CommodityPrice[];
    }
  }

  if (!data) {
    const { data: allData } = await supabase
      .from('commodity_prices')
      .select('*')
      .eq('commodity', commodity)
      .order('recorded_at', { ascending: false })
      .limit(2);
    data = (allData as CommodityPrice[] | null);
  }

  if (!data || data.length === 0) return null;

  const latest = data[0];
  let trend: CommodityPriceDisplay['trend'] = null;

  if (data.length >= 2) {
    const previous = data[1];
    if (previous.price_usd > 0) {
      const pct = ((latest.price_usd - previous.price_usd) / previous.price_usd) * 100;
      trend = {
        text: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        positive: pct >= 0,
      };
    }
  }

  return {
    price: latest.price_usd,
    source: latest.source,
    period: latest.period,
    trend,
  };
}
