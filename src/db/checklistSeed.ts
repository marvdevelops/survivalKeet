export interface ChecklistSeedItem {
  member_type: 'adult' | 'child' | 'baby' | 'pet' | 'all';
  category: string;
  label: string;
  notes?: string;
}

export const CHECKLIST_SEED: ChecklistSeedItem[] = [
  // ADULT
  { member_type: 'adult', category: 'Water & Food', label: 'Water (3L minimum)', notes: '1L per person per day' },
  { member_type: 'adult', category: 'Water & Food', label: 'Food (3-day supply)', notes: 'Non-perishable, no-cook items' },
  { member_type: 'adult', category: 'Water & Food', label: 'Manual can opener', notes: '' },
  { member_type: 'adult', category: 'First Aid', label: 'First Aid Kit', notes: 'Include bandages, antiseptic, gauze' },
  { member_type: 'adult', category: 'First Aid', label: 'Prescription medications (7-day supply)', notes: '' },
  { member_type: 'adult', category: 'First Aid', label: 'Pain reliever (Biogesic/Paracetamol)', notes: '' },
  { member_type: 'adult', category: 'Documents', label: 'Valid ID (photocopy)', notes: '' },
  { member_type: 'adult', category: 'Documents', label: 'Insurance documents', notes: '' },
  { member_type: 'adult', category: 'Documents', label: 'Cash (small bills)', notes: 'ATMs may not work' },
  { member_type: 'adult', category: 'Documents', label: 'Emergency contact list', notes: 'Written, not just in phone' },
  { member_type: 'adult', category: 'Communication', label: 'Fully charged power bank', notes: '' },
  { member_type: 'adult', category: 'Communication', label: 'Flashlight + extra batteries', notes: '' },
  { member_type: 'adult', category: 'Communication', label: 'Whistle', notes: 'Signal for rescue' },
  { member_type: 'adult', category: 'Communication', label: 'Battery-powered or hand-crank radio', notes: 'For PAGASA updates' },
  { member_type: 'adult', category: 'Shelter', label: 'Emergency blanket (mylar)', notes: '' },
  { member_type: 'adult', category: 'Shelter', label: 'Raincoat / poncho', notes: '' },
  { member_type: 'adult', category: 'Shelter', label: 'Tarp / plastic sheeting', notes: '' },
  { member_type: 'adult', category: 'Clothing', label: 'Complete change of clothes', notes: '' },
  { member_type: 'adult', category: 'Clothing', label: 'Sturdy closed shoes', notes: 'Avoid slippers during evacuation' },
  { member_type: 'adult', category: 'Tools', label: 'Multi-tool / Swiss knife', notes: '' },
  { member_type: 'adult', category: 'Tools', label: 'Duct tape', notes: '' },
  { member_type: 'adult', category: 'Tools', label: 'Dust mask / N95', notes: '' },
  { member_type: 'adult', category: 'Tools', label: 'Garbage bags (large)', notes: '' },
  { member_type: 'adult', category: 'Tools', label: 'Rope (5m)', notes: '' },

  // CHILD
  { member_type: 'child', category: 'Water & Food', label: 'Water (1.5L)', notes: '' },
  { member_type: 'child', category: 'Water & Food', label: 'Food / snacks (3-day)', notes: 'Crackers, granola bars, dried fruit' },
  { member_type: 'child', category: 'First Aid', label: 'Child medications', notes: 'Paracetamol syrup, antihistamine' },
  { member_type: 'child', category: 'Documents', label: 'Birth certificate (photocopy)', notes: '' },
  { member_type: 'child', category: 'Documents', label: 'School ID / immunization record', notes: '' },
  { member_type: 'child', category: 'Comfort', label: 'Small comfort toy', notes: 'Helps reduce trauma' },
  { member_type: 'child', category: 'Comfort', label: 'Activity book / cards', notes: '' },
  { member_type: 'child', category: 'Clothing', label: 'Extra set of clothes', notes: '' },
  { member_type: 'child', category: 'Communication', label: 'Flashlight (child-sized)', notes: '' },
  { member_type: 'child', category: 'Communication', label: 'Written family reunion info', notes: 'Child should memorize meeting point' },

  // BABY
  { member_type: 'baby', category: 'Feeding', label: 'Formula (3-day supply)', notes: 'Or note if breastfeeding' },
  { member_type: 'baby', category: 'Feeding', label: 'Baby bottles + nipples', notes: '' },
  { member_type: 'baby', category: 'Feeding', label: 'Baby food / purée pouches', notes: '' },
  { member_type: 'baby', category: 'Feeding', label: 'Breast pump (manual)', notes: '' },
  { member_type: 'baby', category: 'Hygiene', label: 'Diapers (2-day supply)', notes: 'At least 12 pieces' },
  { member_type: 'baby', category: 'Hygiene', label: 'Baby wipes (large pack)', notes: '' },
  { member_type: 'baby', category: 'Hygiene', label: 'Rash cream', notes: '' },
  { member_type: 'baby', category: 'Hygiene', label: 'Hand sanitizer', notes: '' },
  { member_type: 'baby', category: 'First Aid', label: 'Baby paracetamol drops', notes: '' },
  { member_type: 'baby', category: 'First Aid', label: 'Oral rehydration salts (ORS)', notes: 'For diarrhea / dehydration' },
  { member_type: 'baby', category: 'Clothing', label: 'Onesies / change of clothes (×3)', notes: '' },
  { member_type: 'baby', category: 'Clothing', label: 'Baby hat / mittens', notes: '' },
  { member_type: 'baby', category: 'Gear', label: 'Baby carrier / wrap', notes: 'Keeps hands free for evacuation' },
  { member_type: 'baby', category: 'Documents', label: 'Birth certificate (photocopy)', notes: '' },

  // PET
  { member_type: 'pet', category: 'Food & Water', label: 'Pet food (3-day supply)', notes: '' },
  { member_type: 'pet', category: 'Food & Water', label: 'Collapsible water bowl', notes: '' },
  { member_type: 'pet', category: 'Health', label: 'Pet medications', notes: '' },
  { member_type: 'pet', category: 'Health', label: 'Vaccination records', notes: 'Required at some evacuation centers' },
  { member_type: 'pet', category: 'Gear', label: 'Leash or harness', notes: '' },
  { member_type: 'pet', category: 'Gear', label: 'Pet carrier / crate', notes: '' },
  { member_type: 'pet', category: 'Gear', label: 'Poop bags', notes: '' },
  { member_type: 'pet', category: 'Documents', label: 'Pet ID tag (name + contact)', notes: '' },
  { member_type: 'pet', category: 'Documents', label: 'Recent photo of pet', notes: 'For identification if lost' },
  { member_type: 'pet', category: 'Comfort', label: 'Familiar toy / blanket', notes: 'Reduces stress' },
];
