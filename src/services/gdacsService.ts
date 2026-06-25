export type GDACSEventType = 'TC' | 'EQ' | 'FL' | 'VO' | 'WF' | 'DR';
export type GDACSAlertLevel = 'Red' | 'Orange' | 'Green';

export interface GDACSAlert {
  id: string;
  type: GDACSEventType;
  title: string;
  alertLevel: GDACSAlertLevel;
  country: string;
  latitude: number;
  longitude: number;
  fromDate: string;
  toDate: string;
  url: string;
  isCurrent: boolean;
}

const GDACS_URL =
  'https://www.gdacs.org/gdacsapi/api/Events/geteventlist/EVENTS4APP';

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

function isValidEventType(t: string): t is GDACSEventType {
  return ['TC', 'EQ', 'FL', 'VO', 'WF', 'DR'].includes(t);
}

function isValidAlertLevel(l: string): l is GDACSAlertLevel {
  return ['Red', 'Orange', 'Green'].includes(l);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function featureToAlert(feature: any): GDACSAlert | null {
  try {
    const p = feature.properties ?? {};
    const geo = feature.geometry ?? {};

    const type = String(p.eventtype ?? '').toUpperCase();
    if (!isValidEventType(type)) return null;

    const alertLevel = String(p.alertlevel ?? '');
    const level: GDACSAlertLevel = isValidAlertLevel(alertLevel) ? alertLevel : 'Green';

    const rawTitle =
      p.name ??
      p.htmldescription ??
      `${type} Event`;
    const title = stripHtml(String(rawTitle));

    const coords: number[] = geo.coordinates ?? [0, 0];
    const longitude = typeof coords[0] === 'number' ? coords[0] : 0;
    const latitude  = typeof coords[1] === 'number' ? coords[1] : 0;

    const fromDate = String(p.fromdate ?? new Date().toISOString());
    const toDate   = String(p.todate   ?? new Date().toISOString());

    const urlObj = p.url ?? {};
    const url = String(urlObj.report ?? urlObj.details ?? '');

    const toMs = new Date(toDate).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const isCurrent = toMs > Date.now() - dayMs;

    return {
      id: String(p.eventid ?? `${type}-${fromDate}`),
      type,
      title,
      alertLevel: level,
      country: String(p.country ?? ''),
      latitude,
      longitude,
      fromDate,
      toDate,
      url,
      isCurrent,
    };
  } catch {
    return null;
  }
}

export async function fetchGDACSAlerts(): Promise<GDACSAlert[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(GDACS_URL, { signal: controller.signal });
    if (!response.ok) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await response.json();
    const features: unknown[] = Array.isArray(json.features) ? json.features : [];

    const alerts = features
      .map(featureToAlert)
      .filter((a): a is GDACSAlert => a !== null)
      .filter((a) => a.alertLevel === 'Red' || a.alertLevel === 'Orange')
      .sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime())
      .slice(0, 20);

    return alerts;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
