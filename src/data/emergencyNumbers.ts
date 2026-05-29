export interface EmergencyNumbers {
  primary: string;
  primaryLabel: string;
  police: string;
  fire: string;
  ambulance: string;
}

const NUMBERS: Record<string, EmergencyNumbers> = {
  DEFAULT: { primary: '112', primaryLabel: 'International Emergency', police: '112', fire: '112', ambulance: '112' },

  // Americas
  US: { primary: '911', primaryLabel: '911 Emergency', police: '911', fire: '911', ambulance: '911' },
  CA: { primary: '911', primaryLabel: '911 Emergency', police: '911', fire: '911', ambulance: '911' },
  MX: { primary: '911', primaryLabel: '911 Emergencias', police: '911', fire: '911', ambulance: '911' },
  BR: { primary: '190', primaryLabel: 'Polícia (Brazil)', police: '190', fire: '193', ambulance: '192' },
  AR: { primary: '911', primaryLabel: '911 Emergencias', police: '911', fire: '100', ambulance: '107' },
  CO: { primary: '123', primaryLabel: 'Línea de Emergencias', police: '123', fire: '119', ambulance: '125' },
  CL: { primary: '133', primaryLabel: 'Carabineros', police: '133', fire: '132', ambulance: '131' },
  PE: { primary: '105', primaryLabel: 'Policía', police: '105', fire: '116', ambulance: '117' },
  VE: { primary: '911', primaryLabel: '911 Emergencia', police: '171', fire: '171', ambulance: '171' },
  EC: { primary: '911', primaryLabel: '911 Emergencia', police: '911', fire: '911', ambulance: '911' },

  // Europe
  GB: { primary: '999', primaryLabel: '999 Emergency', police: '999', fire: '999', ambulance: '999' },
  IE: { primary: '999', primaryLabel: '999 Emergency', police: '999', fire: '999', ambulance: '999' },
  DE: { primary: '112', primaryLabel: 'Notruf', police: '110', fire: '112', ambulance: '112' },
  FR: { primary: '112', primaryLabel: 'Urgences', police: '17', fire: '18', ambulance: '15' },
  ES: { primary: '112', primaryLabel: 'Emergencias', police: '091', fire: '080', ambulance: '061' },
  IT: { primary: '112', primaryLabel: 'Emergenze', police: '113', fire: '115', ambulance: '118' },
  PL: { primary: '112', primaryLabel: 'Pogotowie', police: '997', fire: '998', ambulance: '999' },
  NL: { primary: '112', primaryLabel: 'Alarmnummer', police: '112', fire: '112', ambulance: '112' },
  SE: { primary: '112', primaryLabel: 'SOS Alarm', police: '112', fire: '112', ambulance: '112' },
  NO: { primary: '112', primaryLabel: 'Nødnummer', police: '112', fire: '110', ambulance: '113' },
  DK: { primary: '112', primaryLabel: 'Alarmcentralen', police: '112', fire: '112', ambulance: '112' },
  FI: { primary: '112', primaryLabel: 'Hätänumero', police: '112', fire: '112', ambulance: '112' },
  CH: { primary: '112', primaryLabel: 'Notruf', police: '117', fire: '118', ambulance: '144' },
  AT: { primary: '112', primaryLabel: 'Notruf', police: '133', fire: '122', ambulance: '144' },
  BE: { primary: '112', primaryLabel: 'Urgences', police: '101', fire: '100', ambulance: '100' },
  PT: { primary: '112', primaryLabel: 'Emergência', police: '112', fire: '112', ambulance: '112' },
  GR: { primary: '112', primaryLabel: 'Έκτακτη Ανάγκη', police: '100', fire: '199', ambulance: '166' },
  RO: { primary: '112', primaryLabel: 'SNUAU', police: '112', fire: '112', ambulance: '112' },
  HU: { primary: '112', primaryLabel: 'Segélyhívó', police: '107', fire: '105', ambulance: '104' },
  CZ: { primary: '112', primaryLabel: 'Tísňové Volání', police: '158', fire: '150', ambulance: '155' },
  SK: { primary: '112', primaryLabel: 'Tiesňová Linka', police: '158', fire: '150', ambulance: '155' },
  UA: { primary: '112', primaryLabel: 'Екстрений Виклик', police: '102', fire: '101', ambulance: '103' },
  RU: { primary: '112', primaryLabel: 'Экстренный Вызов', police: '102', fire: '101', ambulance: '103' },
  TR: { primary: '112', primaryLabel: 'Acil Yardım', police: '155', fire: '110', ambulance: '112' },
  HR: { primary: '112', primaryLabel: 'Hitna Pomoć', police: '192', fire: '193', ambulance: '194' },
  RS: { primary: '112', primaryLabel: 'Hitna Pomoć', police: '192', fire: '193', ambulance: '194' },
  BG: { primary: '112', primaryLabel: 'Спешен Номер', police: '166', fire: '160', ambulance: '150' },

  // Asia / Pacific
  AU: { primary: '000', primaryLabel: '000 Emergency', police: '000', fire: '000', ambulance: '000' },
  NZ: { primary: '111', primaryLabel: '111 Emergency', police: '111', fire: '111', ambulance: '111' },
  JP: { primary: '110', primaryLabel: '警察 (Keisatsu)', police: '110', fire: '119', ambulance: '119' },
  CN: { primary: '110', primaryLabel: '报警 (Bàojǐng)', police: '110', fire: '119', ambulance: '120' },
  HK: { primary: '999', primaryLabel: '999 Emergency', police: '999', fire: '999', ambulance: '999' },
  TW: { primary: '110', primaryLabel: '警察 (Jǐngchá)', police: '110', fire: '119', ambulance: '119' },
  KR: { primary: '112', primaryLabel: '경찰 (Gyeongchal)', police: '112', fire: '119', ambulance: '119' },
  IN: { primary: '112', primaryLabel: 'Emergency', police: '100', fire: '101', ambulance: '108' },
  SG: { primary: '999', primaryLabel: '999 Emergency', police: '999', fire: '995', ambulance: '995' },
  MY: { primary: '999', primaryLabel: '999 Emergency', police: '999', fire: '994', ambulance: '999' },
  PH: { primary: '911', primaryLabel: '911 Emergency', police: '117', fire: '160', ambulance: '911' },
  ID: { primary: '112', primaryLabel: 'Darurat', police: '110', fire: '113', ambulance: '118' },
  TH: { primary: '191', primaryLabel: 'ตำรวจ (Police)', police: '191', fire: '199', ambulance: '1669' },
  VN: { primary: '113', primaryLabel: 'Công An', police: '113', fire: '114', ambulance: '115' },
  BD: { primary: '999', primaryLabel: 'Emergency', police: '999', fire: '199', ambulance: '199' },
  PK: { primary: '15', primaryLabel: 'Police', police: '15', fire: '16', ambulance: '115' },
  LK: { primary: '119', primaryLabel: 'Police', police: '119', fire: '110', ambulance: '110' },
  NP: { primary: '100', primaryLabel: 'Police', police: '100', fire: '101', ambulance: '102' },
  MM: { primary: '999', primaryLabel: 'Emergency', police: '199', fire: '191', ambulance: '192' },
  KH: { primary: '117', primaryLabel: 'Police', police: '117', fire: '118', ambulance: '119' },

  // Middle East
  AE: { primary: '999', primaryLabel: '999 Emergency', police: '999', fire: '997', ambulance: '998' },
  SA: { primary: '999', primaryLabel: 'طوارئ', police: '999', fire: '998', ambulance: '997' },
  IL: { primary: '100', primaryLabel: 'משטרה (Police)', police: '100', fire: '102', ambulance: '101' },
  JO: { primary: '911', primaryLabel: '911 Emergency', police: '911', fire: '911', ambulance: '911' },
  LB: { primary: '112', primaryLabel: 'Emergency', police: '112', fire: '175', ambulance: '140' },
  IQ: { primary: '104', primaryLabel: 'Police', police: '104', fire: '115', ambulance: '122' },
  IR: { primary: '110', primaryLabel: 'اورژانس', police: '110', fire: '125', ambulance: '115' },

  // Africa
  ZA: { primary: '10111', primaryLabel: 'Police (SA)', police: '10111', fire: '10177', ambulance: '10177' },
  NG: { primary: '199', primaryLabel: 'Emergency', police: '199', fire: '199', ambulance: '199' },
  KE: { primary: '999', primaryLabel: '999 Emergency', police: '999', fire: '999', ambulance: '999' },
  EG: { primary: '122', primaryLabel: 'Police', police: '122', fire: '180', ambulance: '123' },
  GH: { primary: '191', primaryLabel: 'Police', police: '191', fire: '192', ambulance: '193' },
  ET: { primary: '911', primaryLabel: '911 Emergency', police: '911', fire: '939', ambulance: '907' },
  TZ: { primary: '112', primaryLabel: 'Emergency', police: '112', fire: '112', ambulance: '112' },
  UG: { primary: '999', primaryLabel: '999 Emergency', police: '999', fire: '999', ambulance: '999' },
  MA: { primary: '19', primaryLabel: 'Police', police: '19', fire: '15', ambulance: '15' },
  DZ: { primary: '17', primaryLabel: 'Police', police: '17', fire: '14', ambulance: '14' },
};

export function getEmergencyNumbers(countryCode: string): EmergencyNumbers {
  return NUMBERS[countryCode.toUpperCase()] ?? NUMBERS.DEFAULT;
}

// ── Offline country detection from GPS coordinates ────────────────────────────
// Simple bounding-box lookup — no reverse geocode, no network call, no crash.
// ORDER MATTERS: first match wins, so small countries that are geographically
// enclosed by a larger one's box (e.g. SG inside MY, TW/HK inside CN) must be
// listed BEFORE the larger country.
// [minLat, maxLat, minLng, maxLng]
type BBox = [number, number, number, number];
const COUNTRY_BOUNDS: [string, BBox][] = [
  // Southeast Asia (primary target)
  ['PH', [4.5,  21.5,  114.0, 127.0]],
  ['SG', [1.1,   1.5,  103.6, 104.1]],  // before MY (enclosed)
  ['ID', [-11.0, 6.5,   95.0, 141.0]],
  ['MY', [0.8,   7.4,   99.6, 119.3]],
  ['TH', [5.5,  20.5,   97.3, 105.7]],
  ['VN', [8.2,  23.4,  102.1, 109.5]],
  ['KH', [10.0, 14.7,  102.3, 107.7]],
  ['MM', [9.8,  28.5,   92.2, 101.2]],
  // Asia-Pacific
  ['JP', [24.0, 46.0,  122.9, 153.0]],
  ['KR', [33.0, 38.7,  125.8, 130.0]],
  ['TW', [21.5, 26.0,  119.8, 122.1]],  // before CN (enclosed)
  ['HK', [22.1, 22.6,  113.8, 114.5]],  // before CN (enclosed)
  ['CN', [18.0, 53.6,   73.4, 135.1]],
  ['IN', [6.5,  36.0,   68.0,  97.5]],
  ['AU', [-55.0, -9.0, 112.0, 154.0]],
  ['NZ', [-47.3, -34.0, 166.4, 178.6]],
  ['BD', [20.6, 26.7,   88.0,  92.7]],
  ['PK', [23.5, 37.1,   60.9,  77.1]],
  ['LK', [5.9,   9.8,   79.7,  81.9]],
  ['NP', [26.4, 30.4,   80.1,  88.2]],
  // Middle East
  ['AE', [22.6, 26.1,   51.6,  56.4]],
  ['SA', [16.4, 32.2,   34.5,  55.7]],
  ['IL', [29.5, 33.4,   34.2,  35.9]],
  ['JO', [29.2, 33.4,   34.9,  39.3]],
  ['TR', [35.8, 42.1,   26.1,  44.8]],
  ['IR', [25.1, 39.8,   44.0,  63.3]],
  // Europe
  ['GB', [49.8, 61.0,   -8.6,   1.8]],
  ['IE', [51.4, 55.4,  -10.5,  -6.0]],
  ['FR', [41.3, 51.1,   -5.2,   9.6]],
  ['DE', [47.3, 55.1,    5.9,  15.0]],
  ['IT', [36.7, 47.1,    6.6,  18.5]],
  ['ES', [27.6, 43.8,  -18.2,   4.3]],
  ['PT', [36.8, 42.2,   -9.5,  -6.2]],
  ['NL', [50.8, 53.6,    3.3,   7.2]],
  ['BE', [49.5, 51.5,    2.5,   6.4]],
  ['CH', [45.8, 47.8,    5.9,  10.5]],
  ['AT', [46.4, 49.0,    9.5,  17.2]],
  ['PL', [49.0, 54.9,   14.1,  24.2]],
  ['SE', [55.3, 69.1,   11.1,  24.2]],
  ['NO', [57.9, 71.2,    4.0,  31.1]],
  ['DK', [54.6, 57.8,    8.1,  15.2]],
  ['FI', [59.8, 70.1,   19.5,  31.6]],
  ['GR', [34.8, 41.8,   19.4,  29.6]],
  ['RO', [43.6, 48.3,   20.3,  30.0]],
  ['HU', [45.7, 48.6,   16.1,  22.9]],
  ['CZ', [48.5, 51.1,   12.1,  18.9]],
  ['SK', [47.7, 49.6,   16.8,  22.6]],
  ['HR', [42.4, 46.6,   13.5,  19.5]],
  ['RS', [42.2, 46.2,   18.8,  23.0]],
  ['BG', [41.2, 44.2,   22.4,  28.6]],
  ['UA', [44.4, 52.4,   22.1,  40.2]],
  ['RU', [41.2, 82.0,   26.6, 180.0]],
  // Africa
  ['ZA', [-34.9, -22.1,  16.3,  32.9]],
  ['NG', [4.3,   14.0,    2.7,  14.7]],
  ['KE', [-4.7,   5.0,   33.9,  41.9]],
  ['EG', [22.0,  31.7,   24.7,  36.9]],
  ['ET', [3.4,   14.9,   33.0,  48.0]],
  ['TZ', [-11.8,  -0.9,  29.3,  40.4]],
  ['UG', [-1.5,   4.2,   29.5,  35.1]],
  ['GH', [4.7,   11.2,   -3.3,   1.2]],
  ['MA', [27.7,  36.1,  -13.2,  -1.0]],
  ['DZ', [18.9,  37.1,  -8.7,   11.8]],
  // Americas
  ['US', [18.0,  72.0, -180.0, -66.0]],
  ['CA', [41.7,  83.3, -141.0, -52.6]],
  ['MX', [14.5,  32.7, -117.3, -86.6]],
  ['BR', [-33.8,   5.3,  -73.9, -34.7]],
  ['AR', [-55.1, -21.8,  -73.6, -53.6]],
  ['CO', [-4.2,  13.0,  -79.0, -66.9]],
  ['CL', [-55.9, -17.5,  -75.7, -66.4]],
  ['PE', [-18.4,  -0.0,  -81.4, -68.7]],
  ['VE', [0.6,   12.2,  -73.4, -59.8]],
  ['EC', [-5.0,   1.5,  -81.1, -75.2]],
];

/**
 * Detect a country code from GPS coordinates using offline bounding boxes.
 * Returns an ISO-3166-1 alpha-2 code (e.g. 'PH') or '' if unknown.
 * No network call, no reverse geocode, no permissions needed.
 */
export function detectCountryFromCoords(lat: number, lng: number): string {
  for (const [code, [minLat, maxLat, minLng, maxLng]] of COUNTRY_BOUNDS) {
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return code;
    }
  }
  return '';
}
