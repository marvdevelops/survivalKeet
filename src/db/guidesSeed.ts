export interface GuideSeedItem {
  category: string;
  title: string;
  body: string;
  keywords?: string;
}

export const GUIDES_SEED: GuideSeedItem[] = [
  // ─── EARTHQUAKE ────────────────────────────────────────────────────────────
  {
    category: 'Earthquake',
    title: 'What to Do During an Earthquake',
    keywords: 'earthquake lindol shaking drop cover hold tremor',
    body: `DROP, COVER, and HOLD ON

1. DROP to your hands and knees immediately.
2. COVER your head and neck with your arms. Get under a sturdy desk or table if nearby.
3. HOLD ON until shaking stops. If under a table, hold the table leg.

If indoors:
- Stay away from windows, outside walls, and heavy furniture.
- Do NOT run outside while shaking — falling debris is dangerous.
- If in bed, stay there and protect your head with a pillow.

If outdoors:
- Move away from buildings, trees, streetlights, and utility wires.
- Crouch low and protect your head.

After shaking stops:
- Expect aftershocks.
- Check for injuries before moving.
- Check for gas leaks — if you smell gas, open windows and leave immediately.
- Do NOT use elevators.
- Listen to battery-powered radio for updates.`,
  },
  {
    category: 'Earthquake',
    title: 'Earthquake Preparedness at Home',
    keywords: 'earthquake prepare brace secure furniture kit',
    body: `Before an Earthquake Strikes

Secure your home:
- Brace heavy furniture (bookshelves, cabinets) to walls.
- Store heavy items on lower shelves.
- Know where gas, water, and electricity shutoffs are.
- Keep a fire extinguisher accessible.

Family plan:
- Choose a safe meeting place outside your home.
- All family members should memorize emergency contact numbers.
- Practice Drop, Cover, Hold On at least twice a year.

After a major earthquake in the Philippines:
- PHIVOLCS will issue a bulletin within 10 minutes.
- Coastal areas: immediately move to higher ground (tsunami risk).
- Do not re-enter damaged buildings until declared safe.`,
  },

  // ─── TYPHOON ────────────────────────────────────────────────────────────────
  {
    category: 'Typhoon',
    title: 'Typhoon Signal Levels (PSWS)',
    keywords: 'typhoon bagyo signal PSWS warning wind bagyong',
    body: `Philippine Public Storm Warning Signals (PSWS)

Signal No. 1:
- Winds 30–60 km/h expected within 36 hours.
- Minimal threat. Monitor updates. Prepare go-bag.

Signal No. 2:
- Winds 61–120 km/h expected within 24 hours.
- Moderate threat. Secure loose objects. Be ready to evacuate.

Signal No. 3:
- Winds 121–170 km/h expected within 18 hours.
- High threat. Evacuate immediately if in danger zones.

Signal No. 4:
- Winds 171–220 km/h expected within 12 hours.
- Very high threat. Complete evacuation of high-risk areas.

Signal No. 5:
- Winds >220 km/h expected.
- Catastrophic. Evacuation must have been completed already.

Source: PAGASA (pagasa.dost.gov.ph)`,
  },
  {
    category: 'Typhoon',
    title: 'What to Do During a Typhoon',
    keywords: 'typhoon bagyo during shelter flood storm surge wind',
    body: `During a Typhoon

Before it arrives:
- Fill containers with clean water — supply may be cut off.
- Charge all devices and power banks.
- Stock up on medicines and food.
- Secure or bring in all outdoor objects.

During the typhoon:
- Stay indoors, away from windows.
- Do NOT go outside during the eye of the typhoon — it will resume.
- Avoid flooded areas — even shallow water can be dangerous.
- Do NOT cross rivers or flooded roads.

Storm surge warning:
- Storm surge can be more deadly than wind.
- If you are in a coastal area under Signal 3+, EVACUATE EARLY.

After the typhoon:
- Wait for official all-clear before going outside.
- Avoid downed power lines.
- Do NOT drink flood water.`,
  },

  // ─── FLOOD ──────────────────────────────────────────────────────────────────
  {
    category: 'Flood',
    title: 'What to Do During a Flood',
    keywords: 'flood baha evacuate water rising river overflow',
    body: `During a Flood

Immediate actions:
- Move to higher ground IMMEDIATELY if water is rising fast.
- Do NOT wait for the flood to enter your home before evacuating.
- Turn off electricity at the main breaker before water enters.

Never do this:
- Do NOT drive or walk through floodwater. 15cm of fast-moving water can knock you down.
- Do NOT touch electrical outlets or wires if wet.
- Do NOT eat food that has been in contact with floodwater.

After the flood:
- Do NOT return home until authorities say it is safe.
- Wear rubber boots and gloves when cleaning.
- Disinfect all surfaces touched by floodwater.
- Watch out for leptospirosis — avoid wading in floodwater.`,
  },
  {
    category: 'Flood',
    title: 'Leptospirosis Prevention After Flooding',
    keywords: 'leptospirosis flood water rat urine bacteria prevention',
    body: `Leptospirosis After a Flood

Leptospirosis is a bacterial infection spread through water contaminated by animal urine. It is common after floods in the Philippines.

Symptoms (2–30 days after exposure):
- High fever
- Headache
- Muscle pain (especially calves)
- Red eyes
- Chills

Prevention:
- Avoid wading in floodwater, especially if you have cuts.
- Wear rubber boots and gloves when cleaning.
- Wash hands thoroughly with soap and water.
- Disinfect footwear with bleach solution.

If you were exposed:
- Doxycycline prophylaxis may be prescribed by a doctor.
- Seek medical attention if symptoms appear.

Severe leptospirosis can cause kidney failure — seek emergency care immediately.`,
  },

  // ─── FIRE SAFETY ────────────────────────────────────────────────────────────
  {
    category: 'Fire Safety',
    title: 'What to Do During a Fire',
    keywords: 'fire sunog escape alarm smoke exit building',
    body: `During a Fire

GET OUT — STAY OUT — CALL FOR HELP

If you discover a fire:
1. Alert everyone in the building.
2. Activate the nearest fire alarm.
3. Call 911 or the Bureau of Fire: 8426-0246.
4. Evacuate using stairs — NEVER use the elevator.

During evacuation:
- Feel doors before opening — if hot, don't open. Use another exit.
- Stay low if there is smoke — clean air is near the floor.
- Cover mouth and nose with a wet cloth if possible.
- Close doors behind you to slow fire spread.

If trapped:
- Seal door gaps with clothing or towels.
- Signal from a window — wave bright clothing, shout.

Stop, Drop and Roll:
- If clothes catch fire: STOP. DROP. ROLL over and over to smother flames.

After evacuating:
- Do NOT go back inside.
- Account for all family members at the meeting point.`,
  },

  // ─── FIRST AID ──────────────────────────────────────────────────────────────
  {
    category: 'First Aid',
    title: 'Basic First Aid: Bleeding and Wounds',
    keywords: 'first aid bleeding wound cut bandage pressure',
    body: `Controlling Bleeding

For minor cuts:
1. Rinse wound with clean water.
2. Apply gentle pressure with clean cloth.
3. Apply antibiotic cream and bandage.

For severe bleeding:
1. Apply firm, direct pressure with a clean cloth.
2. Do NOT remove cloth — add more on top if soaked.
3. Keep pressure for 10–15 minutes.
4. Elevate the wounded area above heart level if possible.
5. Call for emergency help.

Signs of shock (seek emergency help):
- Pale, cold, clammy skin
- Rapid, weak pulse
- Rapid breathing
- Confusion or unconsciousness

Tourniquet (life-threatening limb bleeding only):
- Apply 5–7cm above the wound.
- Tighten until bleeding stops.
- Note the time applied.
- Do NOT remove — leave for medical professionals.`,
  },
  {
    category: 'First Aid',
    title: 'CPR (Cardiopulmonary Resuscitation)',
    keywords: 'CPR cardiac arrest heart breathing unconscious rescue',
    body: `Hands-Only CPR (for adults)

When to perform:
- Person is unresponsive and not breathing normally.

Steps:
1. Call 911 (or ask someone else to call while you start CPR).
2. Position person on their back on a firm surface.
3. Place heel of one hand on center of chest.
4. Place other hand on top, interlace fingers.
5. Push down HARD and FAST — at least 5cm deep.
6. Rate: 100–120 compressions per minute ("Stayin' Alive" beat).
7. Allow chest to fully rise between compressions.
8. Continue until help arrives or person recovers.

If trained — 30 compressions : 2 rescue breaths.

For children (1–8 years): Use one hand. Compress 1/3 chest depth.
For infants: Use 2 fingers. Compress 1/3 chest depth.`,
  },
  {
    category: 'First Aid',
    title: 'Snake Bite Treatment',
    keywords: 'snake bite serpent halas venom poison first aid',
    body: `Snake Bite First Aid (Philippines)

The Philippines has venomous snakes including the Philippine cobra, sea snakes, and pit vipers.

Immediate steps:
1. Move away from the snake — do NOT try to catch or kill it.
2. Keep the bitten limb STILL and BELOW heart level.
3. Remove rings, watches, tight clothing near the bite.
4. Call for emergency help immediately.
5. Note the time of the bite.

Do NOT:
- Do NOT suck out the venom.
- Do NOT cut the wound.
- Do NOT apply a tourniquet.
- Do NOT apply ice.
- Do NOT give alcohol or pain medication.

Symptoms of envenomation:
- Swelling and pain at bite site
- Nausea and vomiting
- Drooping eyelids (cobra)
- Difficulty breathing
- Numbness or paralysis

Antivenom is the ONLY treatment — get to a hospital immediately.`,
  },
  {
    category: 'First Aid',
    title: 'Treating Burns',
    keywords: 'burn sunog skin heat first aid cool water',
    body: `First Aid for Burns

Minor burns (1st degree — redness only):
1. Cool with cool (not cold) running water for 10–20 minutes.
2. Do NOT use ice, butter, or toothpaste.
3. Cover with a clean, non-stick bandage.

Moderate burns (2nd degree — blisters):
1. Cool with running water for 20 minutes.
2. Do NOT pop blisters.
3. Cover loosely with sterile gauze.
4. Seek medical attention.

Severe burns (3rd degree):
1. Call emergency services immediately.
2. Do NOT remove burned clothing.
3. Cover with a clean dry cloth.
4. Do NOT apply creams or ointments.

Chemical burns:
- Brush off dry chemicals first.
- Rinse with large amounts of water for 20+ minutes.`,
  },

  // ─── EVACUATION ─────────────────────────────────────────────────────────────
  {
    category: 'Evacuation',
    title: 'How to Evacuate Safely',
    keywords: 'evacuate evacuation center barangay leave home plan route',
    body: `Evacuation Guide

Before you leave:
- Bring your go-bag (see Checklist tab).
- Turn off gas, electricity, and water if time allows.
- Lock your home.
- Tell a family member or neighbor where you are going.
- Take important documents (IDs, land titles, insurance).

Route planning:
- Know at least 2 evacuation routes from your home.
- Have a pre-agreed family meeting point.
- Avoid flood-prone roads.

At the evacuation center:
- Register with barangay officials.
- Keep your go-bag with you at all times.

If you have a vehicle:
- Fill gas tank as soon as a warning is issued.
- Do NOT drive through floodwater.

After the emergency:
- Return home only when authorities declare it safe.
- Inspect your home for structural damage before entering.`,
  },
  {
    category: 'Evacuation',
    title: 'Family Emergency Communication Plan',
    keywords: 'family plan communication contact meeting point separation',
    body: `Family Emergency Communication Plan

Steps to create your plan:

1. Choose an out-of-area contact:
   - Pick a relative or friend outside your city.
   - All family members check in with this person.
   - Long-distance calls are often easier than local ones during a disaster.

2. Choose two meeting places:
   - Near your home (corner store, front gate): for sudden emergencies.
   - Outside your neighborhood (barangay hall, relative's house): for evacuation.

3. Each family member should know:
   - The out-of-area contact's number (memorized or written).
   - Both meeting points.
   - The nearest evacuation center.

4. Plan for school emergencies:
   - Know your child's school evacuation policy.
   - Keep your contact number updated with the school.

5. Practice the plan:
   - Run a family drill at least once a year.`,
  },

  // ─── SURVIVAL ───────────────────────────────────────────────────────────────
  {
    category: 'Survival',
    title: 'How to Start a Fire',
    keywords: 'fire starting friction flint spark tinder survival camping',
    body: `Starting a Fire Without Matches

Always have at least 3 ignition sources in your go-bag (lighter, waterproof matches, firestarter).

Method 1: Lighter or Matches (always preferred)
- Keep lighters in a waterproof bag.
- Windproof lighters work best outdoors.

Method 2: Fire Bow Drill (friction)
Materials: dry softwood spindle, flat fireboard, bow, tinder bundle.
1. Cut a notch in the fireboard next to a small depression.
2. Place tinder (dry grass, leaves) under the notch.
3. Loop the bow string around the spindle.
4. Press spindle into the fireboard depression with a socket.
5. Saw the bow back and forth rapidly while pressing down.
6. A coal will form in the notch — tap it into the tinder bundle.
7. Gently blow the tinder until it flames.

Building the fire:
1. Start with tinder: dry grass, paper, bark shavings.
2. Add kindling: small dry sticks, pencil-sized.
3. Add fuel: larger sticks and logs once fire is established.
4. Build in a teepee or log-cabin structure for airflow.

Safety:
- Clear a 1m ring around your fire.
- Never leave fire unattended.
- Keep water nearby to extinguish.
- Fully extinguish before sleeping — stir ashes and pour water.`,
  },
  {
    category: 'Survival',
    title: 'How to Pitch an Emergency Tent / Shelter',
    keywords: 'tent shelter pitch camp tarp emergency sleep overnight',
    body: `Setting Up Emergency Shelter

Choosing a site:
- Flat, dry ground.
- Away from dead trees and branches that could fall.
- Avoid low areas that collect water.
- Natural windbreak (rocks, dense bushes) on the windward side.
- Near a water source but not in the flood zone.

Tarp shelter (fastest):
1. Tie a rope between two trees at shoulder height — this is your ridgeline.
2. Drape tarp over the ridgeline.
3. Pull one side to the ground and stake it down.
4. Pull the other side out at an angle and stake it — this is your entrance.
5. The sloped side faces the wind.

Tent setup (general):
1. Lay out footprint/groundsheet first.
2. Assemble poles — usually color-coded.
3. Attach tent body to poles.
4. Stake corners first, then sides — pull taut to avoid sagging.
5. Attach rainfly and stake/guy-line it out.
6. Check that all zippers close fully.

In heavy rain:
- Dig a small trench around the tent to divert runoff.
- Ensure no part of the sleeping bag touches the tent wall.
- Ventilate slightly to reduce condensation.`,
  },
  {
    category: 'Survival',
    title: 'Water Purification Methods',
    keywords: 'water purify drink clean safe boil filter iodine survival',
    body: `Making Water Safe to Drink

Priority: hydration is critical — dehydration kills faster than most hazards.

Method 1: Boiling (most reliable)
1. Bring water to a rolling boil.
2. Boil for at least 1 minute (3 minutes at high altitude).
3. Let cool before drinking.
4. Store in a clean covered container.

Method 2: Chemical treatment
- Iodine tablets or chlorine tablets: follow package instructions.
- Wait 30 minutes after adding tablets before drinking.
- Not effective against Cryptosporidium — combine with filtration.

Method 3: Water filter / purifier
- Pump or squeeze filters (e.g. LifeStraw, Sawyer): highly effective.
- Follow the manufacturer's instructions.

Method 4: Solar disinfection (SODIS) — emergency only
- Fill a clear PET plastic bottle with water.
- Lay in direct sunlight for 6 hours (or 2 days if cloudy).
- Works best with clear, shallow water.

Signs of unsafe water:
- Murky, discolored, or bad-smelling water needs extra treatment.
- Floodwater is always contaminated — boil AND filter if possible.

What to avoid:
- Do NOT drink seawater.
- Do NOT drink urine.
- Do NOT drink alcohol for hydration.`,
  },
  {
    category: 'Survival',
    title: 'Emergency Signaling for Rescue',
    keywords: 'signal rescue help SOS mirror whistle smoke fire ground',
    body: `Signaling for Rescue

Rule of Three:
Three of anything = distress signal. Three whistle blasts, three gunshots, three fires in a triangle.

Whistle (most energy-efficient):
- Blow 3 short blasts. Pause. Repeat.
- A whistle carries farther and uses less energy than shouting.
- Keep a whistle in your go-bag and around your neck.

Ground-to-air signals (for aircraft):
- Use rocks, logs, or trampled grass on open ground.
- HELP = H (or SOS) in large letters, 10m+ if possible.
- X = need medical assistance.
- Arrow = indicate direction of travel.

Signal mirror:
1. Hold mirror near your eye.
2. Aim reflected sunlight at the target (aircraft, distant person).
3. Flash 3 times, pause, repeat.
4. Even a phone screen or CD can work.

Fire and smoke:
- Build fire in an open area visible from above.
- Add green leaves/wet wood for white smoke (visible against dark forest).
- Add rubber/plastic for black smoke (visible against snow or light sky).

Flashlight / phone:
- Flash SOS in Morse: 3 short, 3 long, 3 short flashes.
- Short = 1 second. Long = 3 seconds.

Stay put if possible:
- Rescuers search your last known location first.
- Move only if staying is more dangerous.`,
  },
  {
    category: 'Survival',
    title: 'Basic Navigation Without GPS',
    keywords: 'navigation compass map stars sun direction lost survival',
    body: `Finding Your Way Without GPS

Using the Sun:
- In the Philippines (Northern Hemisphere), the sun rises roughly in the east and sets in the west.
- At noon, the sun is roughly in the south.
- Shadow stick method:
  1. Place a stick vertically in the ground.
  2. Mark the tip of the shadow.
  3. Wait 15–20 minutes and mark again.
  4. The first mark is west, second is east.
  5. Draw a line between them: you now have an east-west line.

Using Stars at Night:
- Southern Cross (Crux): visible year-round in the Philippines.
  - Extend the long axis of the cross 4.5 times to find the South Celestial Pole.
  - Drop straight down to the horizon — that's south.
- Polaris (North Star): faint in the Philippines but visible — look north of the constellation Orion.

Using a Watch:
- Point the 12 o'clock position at the sun.
- The halfway point between 12 and the hour hand points roughly south.
(Works best in tropical/equatorial zones like the Philippines.)

Landmarks and terrain:
- Rivers generally flow downhill toward the coast or lowland areas.
- Following a stream downstream usually leads to civilization.
- Ridge lines and peaks help you get your bearings from high ground.
- Power lines and roads are signs of human habitation — follow them.`,
  },
  {
    category: 'Survival',
    title: 'Food Safety After a Disaster',
    keywords: 'food safety spoiled contaminated disaster flood power outage',
    body: `Food Safety After a Disaster

Power outage — refrigerator:
- Food stays safe for 4 hours if the refrigerator stays closed.
- A full freezer stays safe for 48 hours (half-full: 24 hours).
- Add ice blocks to extend cooling time.

When in doubt, throw it out:
- Do NOT taste food to check if it is safe.
- Discard any food with unusual color, texture, or smell.
- Discard anything that has been at room temperature for more than 2 hours.

Flood-contaminated food:
- Discard ALL food not in sealed, watertight containers that touched floodwater.
- Canned goods: discard if the can is bulging, has a bad smell, or is rusted.
- Discard all wooden cutting boards, baby bottle nipples, and pacifiers.

Safe foods after a disaster:
- Sealed commercially canned foods (wash the outside with disinfectant).
- Commercially bottled water.
- Undamaged hard cheeses sealed in wax.
- Baked goods that were NOT exposed to floodwater.

Preparing food safely:
- Wash hands with safe water and soap before handling food.
- Boil water used for cooking, drinking, and washing dishes.
- Use separate cutting boards for raw meat and produce.`,
  },
  {
    category: 'Survival',
    title: 'Dengue Fever Prevention',
    keywords: 'dengue mosquito fever prevention Philippines aedes symptoms',
    body: `Dengue Fever Prevention (Philippines)

Dengue is a major health risk in the Philippines, especially after flooding or during rainy season.

How it spreads:
- Transmitted by the Aedes mosquito, which bites during the day.
- Mosquitoes breed in standing water (containers, clogged drains, old tires).

Prevention:
- Remove standing water around your home after rain or flooding.
- Empty, cover, or turn over containers that collect water.
- Wear long sleeves and pants, especially at dawn and dusk.
- Use DEET-based mosquito repellent.
- Use mosquito nets while sleeping.
- Install window and door screens.

Symptoms (appear 4–7 days after bite):
- Sudden high fever (38–40°C)
- Severe headache
- Pain behind the eyes
- Muscle and joint pain
- Nausea, vomiting
- Skin rash (appears 2–5 days after fever)

Warning signs — seek emergency care immediately:
- Severe abdominal pain
- Persistent vomiting
- Bleeding gums or nose
- Blood in urine, stool, or vomit
- Rapid breathing
- Fatigue and restlessness

Treatment:
- Rest and drink plenty of fluids.
- Paracetamol for fever — do NOT take aspirin or ibuprofen.
- Seek medical care — dengue can be fatal without treatment.`,
  },
];
