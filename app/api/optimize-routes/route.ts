import { NextRequest, NextResponse } from 'next/server';
import { optimizeRoutes } from '@/lib/route-optimizer';
import type { TradePoint } from '@/lib/forward-waterfall';
import type { CommodityType } from '@/lib/types';

const VALID_TRADE_POINTS: TradePoint[] = ['mine_gate', 'stockpile', 'port_gate', 'fob', 'cfr', 'cif'];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const commodity = params.get('commodity') as CommodityType | null;
  const buyPriceRaw = params.get('buy_price');
  const buyPointRaw = params.get('buy_point') as TradePoint | null;
  const sellPointRaw = params.get('sell_point') as TradePoint | null;
  const volumeRaw = params.get('volume');

  if (!commodity || !buyPriceRaw) {
    return NextResponse.json(
      { error: 'Missing required parameters: commodity, buy_price' },
      { status: 400 },
    );
  }

  const buyPrice = parseFloat(buyPriceRaw);
  if (isNaN(buyPrice) || buyPrice <= 0) {
    return NextResponse.json({ error: 'buy_price must be a positive number' }, { status: 400 });
  }

  const buyPoint: TradePoint = (buyPointRaw && VALID_TRADE_POINTS.includes(buyPointRaw)) ? buyPointRaw : 'mine_gate';
  const sellPoint: TradePoint = (sellPointRaw && VALID_TRADE_POINTS.includes(sellPointRaw)) ? sellPointRaw : 'cif';

  if (VALID_TRADE_POINTS.indexOf(sellPoint) <= VALID_TRADE_POINTS.indexOf(buyPoint)) {
    return NextResponse.json({ error: 'sell_point must come after buy_point in the corridor' }, { status: 400 });
  }

  const volumeTonnes = parseFloat(volumeRaw ?? '15000');

  // Optional mine coordinates
  const mineLat = params.get('mine_lat');
  const mineLng = params.get('mine_lng');
  const mineName = params.get('mine_name') || undefined;
  const mineCoords = mineLat && mineLng
    ? { lat: parseFloat(mineLat), lng: parseFloat(mineLng) }
    : undefined;

  // Index price: from param or try DB
  let indexCifPrice: number | undefined;
  const indexPriceRaw = params.get('index_price');
  if (indexPriceRaw) {
    indexCifPrice = parseFloat(indexPriceRaw);
  } else {
    try {
      const { createAdminSupabaseClient } = await import('@/lib/supabase-server');
      const supabase = createAdminSupabaseClient();
      const { data } = await supabase
        .from('commodity_prices')
        .select('price_usd')
        .eq('commodity', commodity)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      if (data?.price_usd) {
        indexCifPrice = data.price_usd;
      }
    } catch {
      // Ignore - indexCifPrice will be undefined
    }
  }

  const fxHedge = params.get('fx_hedge') || 'spot';
  const hedgeCommodityPrice = params.get('hedge_commodity') === 'true';
  const dealCurrency = params.get('deal_currency') || 'USD';

  const result = optimizeRoutes({
    commodity,
    buyPoint,
    sellPoint,
    buyPrice,
    volumeTonnes,
    mineCoords,
    mineName,
    indexCifPrice,
    fxHedge,
    hedgeCommodityPrice,
    dealCurrency,
  });

  return NextResponse.json(result);
}
