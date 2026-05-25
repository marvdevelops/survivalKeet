import { getDb } from '../db/database';
import type { POI, POIType } from '../db/schema';

export type { POI, POIType };

export const POI_COLORS: Record<POIType, string> = {
  hospital:       '#E74C3C',
  clinic:         '#E67E22',
  pharmacy:       '#27AE60',
  police:         '#3498DB',
  fire_station:   '#F39C12',
  assembly_point: '#9B59B6',
};

export const POI_ICONS: Record<POIType, string> = {
  hospital:       '🏥',
  clinic:         '🩺',
  pharmacy:       '💊',
  police:         '🚔',
  fire_station:   '🚒',
  assembly_point: '🏳️',
};

// Four public Overpass mirrors — tried in order
const OVERPASS_SERVERS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

// Nodes only — much lighter query, avoids 429 from way/relation lookups
const buildQuery = (lat: number, lon: number, radius: number) =>
  `[out:json][timeout:20];node["amenity"~"^(hospital|clinic|pharmacy|police|fire_station)$"](around:${radius},${lat},${lon});out;`;

function osmTypeToPoiType(amenity: string): POIType | null {
  switch (amenity) {
    case 'hospital':     return 'hospital';
    case 'clinic':       return 'clinic';
    case 'pharmacy':     return 'pharmacy';
    case 'police':       return 'police';
    case 'fire_station': return 'fire_station';
    default:             return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms / 1000}s`)), ms);
    fetch(url, options)
      .then((res) => { clearTimeout(timer); resolve(res); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

export function getCachedPOIs(): POI[] {
  try {
    return getDb().getAllSync<POI>('SELECT osm_id, type, name, lat, lon FROM poi_cache');
  } catch {
    return [];
  }
}

export function clearPOICache(): void {
  try {
    getDb().runSync('DELETE FROM poi_cache');
    getDb().runSync("DELETE FROM app_meta WHERE key IN ('poi_cache_lat','poi_cache_lon','poi_cache_at')");
  } catch {}
}

export function isPOICacheStale(lat: number, lon: number): boolean {
  try {
    const db = getDb();
    const at = db.getFirstSync<{ value: string }>("SELECT value FROM app_meta WHERE key = 'poi_cache_at'");
    if (!at) return true;
    if (Date.now() - new Date(at.value).getTime() > 7 * 24 * 60 * 60 * 1000) return true;
    const cachedLat = db.getFirstSync<{ value: string }>("SELECT value FROM app_meta WHERE key = 'poi_cache_lat'");
    const cachedLon = db.getFirstSync<{ value: string }>("SELECT value FROM app_meta WHERE key = 'poi_cache_lon'");
    if (!cachedLat || !cachedLon) return true;
    const dlat = parseFloat(cachedLat.value) - lat;
    const dlon = parseFloat(cachedLon.value) - lon;
    return Math.sqrt(dlat * dlat + dlon * dlon) > 0.045;
  } catch {
    return true;
  }
}

export async function fetchAndCachePOIs(
  lat: number,
  lon: number,
  radiusMeters = 10000,
  signal?: { aborted: boolean },
): Promise<POI[]> {
  const query = buildQuery(lat, lon, radiusMeters);
  const body = `data=${encodeURIComponent(query)}`;
  const errors: string[] = [];

  for (let i = 0; i < OVERPASS_SERVERS.length; i++) {
    if (signal?.aborted) throw new Error('Cancelled');

    // Small delay between attempts so we don't hammer all servers at once
    if (i > 0) await delay(800);
    if (signal?.aborted) throw new Error('Cancelled');

    const server = OVERPASS_SERVERS[i];
    try {
      const res = await fetchWithTimeout(
        server,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body },
        22000,
      );

      if (res.status === 429 || res.status === 504) {
        errors.push(`${new URL(server).hostname}: ${res.status}`);
        continue; // try next server
      }
      if (!res.ok) {
        errors.push(`${new URL(server).hostname}: HTTP ${res.status}`);
        continue;
      }

      const json = await res.json() as {
        elements: { type: string; id: number; lat?: number; lon?: number; tags?: Record<string, string> }[];
      };

      if (signal?.aborted) throw new Error('Cancelled');

      const pois: POI[] = [];
      for (const el of json.elements) {
        const tags = el.tags ?? {};
        const poiType = osmTypeToPoiType(tags.amenity ?? '');
        if (!poiType || el.lat === undefined || el.lon === undefined) continue;
        pois.push({
          osm_id: `${el.type}_${el.id}`,
          type: poiType,
          name: tags.name ?? tags['name:en'] ?? poiType.replace('_', ' '),
          lat: el.lat,
          lon: el.lon,
        });
      }

      // Save to SQLite cache
      const db = getDb();
      db.runSync('DELETE FROM poi_cache');
      for (const poi of pois) {
        db.runSync(
          'INSERT OR REPLACE INTO poi_cache (osm_id, type, name, lat, lon) VALUES (?, ?, ?, ?, ?)',
          poi.osm_id, poi.type, poi.name, poi.lat, poi.lon,
        );
      }
      db.runSync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('poi_cache_lat', ?)", String(lat));
      db.runSync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('poi_cache_lon', ?)", String(lon));
      db.runSync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('poi_cache_at', ?)", new Date().toISOString());

      return pois;
    } catch (e) {
      if (signal?.aborted) throw new Error('Cancelled');
      errors.push(`${new URL(server).hostname}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(`All servers busy — try again in a minute.\n${errors.join(' · ')}`);
}
