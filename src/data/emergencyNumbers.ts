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
