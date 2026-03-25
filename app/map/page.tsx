import { getMines, getHarbours, getActiveListings, getRoutes } from '@/lib/queries';
import { getVesselPositions } from '@/lib/vessel-queries';
import { MapClient } from './map-client';

export default async function MapPage() {
  const [mines, harbours, listings, routes, vessels] = await Promise.all([
    getMines(),
    getHarbours(),
    getActiveListings(),
    getRoutes(),
    getVesselPositions(),
  ]);

  return <MapClient mines={mines} harbours={harbours} listings={listings} routes={routes} vessels={vessels} />;
}
