import { requireAuth } from '@/lib/auth';
import { getDealsByUser, getDealMilestones } from '@/lib/deal-queries';
import { getMines, getHarbours } from '@/lib/queries';
import { getNextStatusesForRole } from '@/lib/deal-helpers';
import { PipelineTab } from './pipeline-tab';
import { ShipmentTab } from './shipment-tab';
import { DealsTabSwitcher } from './deals-tab-switcher';
import type { DealMilestone, GeoPoint } from '@/lib/types';

export default async function DealsPage() {
  const user = await requireAuth();
  const deals = await getDealsByUser(user.id);

  // Fetch milestones for in-transit deals
  const transitDeals = deals.filter((d) =>
    ['loading', 'in_transit', 'delivered'].includes(d.status)
  );
  const milestonesEntries = await Promise.all(
    transitDeals.map(async (d) => {
      const milestones = await getDealMilestones(d.id);
      return [d.id, milestones] as [string, DealMilestone[]];
    })
  );
  const milestonesMap = Object.fromEntries(milestonesEntries);

  // Get mine and harbour locations for map
  const [mines, harbours] = await Promise.all([getMines(), getHarbours()]);
  const mineLocations: Record<string, GeoPoint> = {};
  mines.forEach((m) => { mineLocations[m.name] = m.location; });
  const harbourLocations: Record<string, GeoPoint> = {};
  harbours.forEach((h) => { harbourLocations[h.name] = h.location; });

  // Summary stats
  const activeDealsCount = deals.filter(d => !['completed', 'cancelled'].includes(d.status)).length;
  const totalValue = deals
    .filter(d => !['completed', 'cancelled'].includes(d.status))
    .reduce((sum, d) => sum + d.agreed_price * d.volume_tonnes, 0);
  const totalValueDisplay = totalValue >= 1_000_000
    ? `${(totalValue / 1_000_000).toFixed(1)}M`
    : totalValue >= 1_000
    ? `${(totalValue / 1_000).toFixed(0)}K`
    : totalValue.toLocaleString();
  const inTransitCount = deals.filter(d => ['loading', 'in_transit', 'delivered'].includes(d.status)).length;
  const pendingCount = deals.filter(d => {
    if (['completed', 'cancelled'].includes(d.status)) return false;
    const role = d.buyer_id === user.id ? 'buyer' as const : 'seller' as const;
    const nextStatuses = getNextStatusesForRole(d.status, role);
    return nextStatuses.length > 0;
  }).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deal Tracker</h1>
          <p className="text-gray-400 text-sm">
            {deals.length} deal{deals.length !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Active Deals</p>
          <p className="text-2xl font-bold text-white">{activeDealsCount}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total Value</p>
          <p className="text-2xl font-bold text-amber-400">${totalValueDisplay}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Pending Actions</p>
          <p className="text-2xl font-bold text-white">{pendingCount}</p>
          {pendingCount > 0 && <p className="text-xs text-amber-400 mt-0.5">Needs your attention</p>}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">In Transit</p>
          <p className="text-2xl font-bold text-cyan-400">{inTransitCount}</p>
        </div>
      </div>

      <DealsTabSwitcher
        pipelineContent={<PipelineTab deals={deals} />}
        shipmentContent={
          <ShipmentTab
            deals={deals}
            milestonesMap={milestonesMap}
            harbourLocations={harbourLocations}
            mineLocations={mineLocations}
          />
        }
      />
    </div>
  );
}
