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

After a major earthquake:
- Local emergency services will issue safety bulletins.
- Coastal areas: immediately move to higher ground (tsunami risk).
- Do not re-enter damaged buildings until declared safe by authorities.`,
  },

  // ─── TROPICAL CYCLONE ───────────────────────────────────────────────────────
  {
    category: 'Typhoon',
    title: 'Tropical Cyclone / Hurricane Categories',
    keywords: 'typhoon hurricane cyclone category wind speed warning saffir simpson',
    body: `Tropical Cyclone Categories (Saffir-Simpson Scale)

Tropical Depression:
- Winds < 63 km/h. Monitor weather updates. Prepare go-bag.

Tropical Storm:
- Winds 63–118 km/h. Secure loose objects. Be ready to evacuate.

Category 1 Hurricane / Typhoon:
- Winds 119–153 km/h. Minimal structural damage expected. Evacuate mobile homes.

Category 2:
- Winds 154–177 km/h. Moderate damage. Evacuate high-risk areas.

Category 3 (Major):
- Winds 178–208 km/h. Significant damage. Evacuate low-lying and coastal areas.

Category 4 (Major):
- Winds 209–251 km/h. Severe damage. Complete evacuation of danger zones.

Category 5 (Major):
- Winds > 252 km/h. Catastrophic damage. Evacuation must be completed before landfall.

Note: Cyclones are called "Typhoons" in Asia, "Hurricanes" in the Atlantic/Eastern Pacific, and "Cyclones" in the Indian Ocean and South Pacific.`,
  },
  {
    category: 'Typhoon',
    title: 'What to Do During a Tropical Cyclone',
    keywords: 'typhoon hurricane cyclone during shelter flood storm surge wind',
    body: `During a Tropical Cyclone

Before it arrives:
- Fill containers with clean water — supply may be cut off.
- Charge all devices and power banks.
- Stock up on medicines and food.
- Secure or bring in all outdoor objects.

During the cyclone:
- Stay indoors, away from windows.
- Do NOT go outside during the eye of the storm — dangerous winds will resume.
- Avoid flooded areas — even shallow water can be dangerous.
- Do NOT cross rivers or flooded roads.

Storm surge warning:
- Storm surge can be more deadly than wind.
- If in a coastal area during a major cyclone, EVACUATE EARLY — inland or to high ground.

After the cyclone:
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

Leptospirosis is a bacterial infection spread through water contaminated by animal urine. It is common after floods worldwide, especially in tropical and subtropical regions.

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
3. Call your local emergency number (112 / 911 / 999 / 000).
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
    keywords: 'evacuate evacuation center leave home plan route emergency shelter',
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
- Register with local emergency officials or staff.
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
   - Outside your neighborhood (community center, relative's house): for evacuation.

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
- The sun rises roughly in the east and sets in the west everywhere on Earth.
- Northern Hemisphere: at noon, the sun is roughly in the south.
- Southern Hemisphere: at noon, the sun is roughly in the north.
- Shadow stick method:
  1. Place a stick vertically in the ground.
  2. Mark the tip of the shadow.
  3. Wait 15–20 minutes and mark again.
  4. The first mark is west, second is east.
  5. Draw a line between them: you now have an east-west line.

Using Stars at Night:
- Northern Hemisphere — Polaris (North Star):
  - Find the Big Dipper; follow the two outer stars of the "cup" 5× their distance — that's Polaris.
  - Polaris sits almost directly above the North Pole. Stand facing it to face north.
- Southern Hemisphere — Southern Cross (Crux):
  - Extend the long axis of the cross 4.5 times to find the South Celestial Pole.
  - Drop straight down to the horizon — that's south.

Using a Watch (Northern Hemisphere):
- Point the hour hand at the sun.
- The halfway point between the hour hand and 12 o'clock points roughly south.
(In Southern Hemisphere, point the 12 o'clock at the sun; halfway between 12 and hour hand = north.)

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
    keywords: 'dengue mosquito fever prevention tropical aedes symptoms',
    body: `Dengue Fever Prevention

Dengue is common in tropical and subtropical regions worldwide, especially after flooding or during rainy season.

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

  // ─── FIRST AID (additional) ────────────────────────────────────────────────
  {
    category: 'First Aid',
    title: 'Treating Burns',
    keywords: 'burns sunog first aid blister scald fire heat wound',
    body: `BURN SEVERITY

Minor (1st degree): Red skin, no blisters — like sunburn.
Moderate (2nd degree): Blisters, deep red, wet-looking skin.
Severe (3rd degree): White/charred skin, no pain (nerves damaged) — EMERGENCY.

FIRST AID FOR MINOR BURNS
1. Cool the burn immediately — hold under cool (not ice cold) running water for 10–20 minutes.
2. Do NOT use ice, butter, toothpaste, or oil — these worsen the injury.
3. Remove jewelry/clothing near the burn before swelling starts.
4. Cover loosely with a clean non-fluffy cloth or cling wrap.
5. Take paracetamol for pain relief.
6. Do NOT pop blisters — they protect against infection.

SEEK MEDICAL HELP IF:
- Burn is larger than the palm of your hand.
- Burn is on face, hands, feet, genitals, or over a joint.
- Burn appears deep or white/charred.
- Victim is a child or elderly person.
- Caused by electricity or chemicals.

CHEMICAL BURNS
- Brush off dry chemicals first, then flush with large amounts of water for 20+ minutes.
- Remove contaminated clothing while flushing.
- Do NOT neutralize (e.g., acid with base) — this causes heat.`,
  },
  {
    category: 'First Aid',
    title: 'Tourniquet Application',
    keywords: 'tourniquet bleeding severe hemorrhage limb wound blood loss',
    body: `A tourniquet stops life-threatening bleeding from an arm or leg when direct pressure fails.

WHEN TO USE
- Severe, uncontrolled bleeding from a limb.
- Bleeding that soaks through bandages in under 5 minutes.
- Traumatic amputation.

IMPROVISED TOURNIQUET (if no commercial one)
You need: a strip of cloth 2–4 inches wide (belt, shirt strip, necktie) and a stick/pen.

STEPS
1. Place the tourniquet 2–3 inches ABOVE the wound (closer to the heart). Never on a joint.
2. Wrap twice around the limb.
3. Tie a half-knot, place the stick on top, tie another knot over the stick.
4. Twist the stick until bleeding stops (this will be painful — this is necessary).
5. Secure the stick so it cannot unwind (tie it down).
6. Write the time applied on the victim's skin with a marker or blood: "TK 14:35".
7. Do NOT remove once applied — only medical personnel should remove it.
8. Keep the limb visible and the tourniquet accessible.

IMPORTANT
- Do NOT use wire, rope, or cord — these cut into skin.
- Tourniquet pain is expected — do not loosen to relieve it.
- Seek emergency medical care immediately.
- A properly applied tourniquet can be left on for up to 2 hours.`,
  },
  {
    category: 'First Aid',
    title: 'Insect Bites & Bee Stings',
    keywords: 'insect bite bee sting anaphylaxis allergy wasp hornet ant karayom pukyutan',
    body: `BEE / WASP STINGS

1. Move away from the area — more bees may attack.
2. Remove the stinger quickly by scraping sideways with a credit card or fingernail. Do NOT squeeze or use tweezers (releases more venom).
3. Wash the area with soap and water.
4. Apply a cold pack for 10 minutes to reduce swelling.
5. Take antihistamine (e.g., cetirizine) for itching and mild swelling.
6. Hydrocortisone cream can reduce local reaction.

SIGNS OF SEVERE ALLERGIC REACTION (Anaphylaxis) — EMERGENCY
- Throat tightening, difficulty breathing or swallowing.
- Swelling of face, lips, or tongue.
- Dizziness, rapid weak pulse, pale/clammy skin.
- Nausea, vomiting, sudden drop in consciousness.

IF ANAPHYLAXIS: Use epinephrine auto-injector (EpiPen) if available, call 911, lay victim flat with legs raised unless breathing is difficult.

FIRE ANT BITES
- Wash immediately with soap and water.
- Apply cool compress. Do NOT scratch — pustules will form in 24 hours.
- Antihistamine for itching. Watch for allergic reaction.

MOSQUITO / GENERAL INSECT BITES
- Wash with soap and water.
- Cold compress for swelling.
- Hydrocortisone cream for itch.
- Avoid scratching to prevent infection.
- Watch for signs of dengue (see Dengue guide) 5–7 days after.

CENTIPEDE BITES
- Painful but rarely dangerous. Wash with soap and water.
- Apply cold compress. Elevate the limb.
- Ibuprofen or paracetamol for pain.
- Seek help if severe swelling, numbness, or systemic symptoms develop.`,
  },
  {
    category: 'First Aid',
    title: 'Snake Bite Protocol',
    keywords: 'snake bite ahas venom cobra python king cobra sea snake antivenom',
    body: `TREAT EVERY SNAKE BITE AS POTENTIALLY VENOMOUS.
Venomous species exist on every continent except Antarctica — cobras, vipers, mambas, rattlesnakes, and sea snakes are found worldwide.

IMMEDIATE STEPS
1. Move the victim away from the snake. Do NOT attempt to catch or kill it.
2. Keep the victim calm and still — movement speeds venom spread.
3. Remove rings, watches, and tight clothing near the bite before swelling starts.
4. Immobilize the bitten limb at or below heart level using a splint/sling.
5. Clean the wound gently with soap and water. Cover with a clean dressing.
6. GET TO A HOSPITAL IMMEDIATELY — antivenom is the only effective treatment.
7. Note the time of the bite and take a photo of the snake if safely possible.

DO NOT:
- Cut the wound or try to suck out venom.
- Apply a tourniquet or tight bandage (unless instructed by poison control).
- Apply ice, electricity, or chemical treatments.
- Give alcohol or stimulants.
- Leave the victim alone.

PRESSURE IMMOBILIZATION (for neurotoxic snakes like cobras and mambas)
- Wrap the entire limb with an elastic bandage, starting at the fingers/toes.
- Wrap firmly (like a sprained ankle) — NOT as tight as a tourniquet.
- Apply a splint to prevent movement.
- Immobilize the victim completely.
- This slows spread of neurotoxic (not cytotoxic) venom.

WARNING SIGNS — RUSH TO HOSPITAL
- Drooping eyelids, blurred vision, difficulty swallowing/breathing.
- Severe swelling spreading up the limb.
- Vomiting, collapse, or loss of consciousness.
- Numbness or paralysis.

IMPORTANT: Save your local Poison Control number as an emergency contact in the SOS tab.`,
  },
  {
    category: 'First Aid',
    title: 'Recognizing & Treating Shock',
    keywords: 'shock blood loss trauma pale sweating weak pulse collapse emergency',
    body: `SHOCK is a life-threatening condition where the body's organs are not getting enough blood.

CAUSES
- Severe bleeding (most common in disaster settings).
- Severe burns, dehydration, spinal injury, allergic reaction (anaphylaxis), heart attack.

SIGNS OF SHOCK
- Pale, cold, clammy, or gray skin.
- Rapid, weak, or irregular pulse.
- Fast, shallow breathing.
- Confusion, anxiety, or loss of consciousness.
- Nausea or vomiting.
- Thirst, weakness, dizziness.

FIRST AID
1. Call 911 or get the victim to hospital IMMEDIATELY.
2. Lay the victim flat on their back.
3. Raise the legs 30 cm (12 inches) unless head/neck/spine/chest injury is suspected.
4. Keep the victim warm — cover with a blanket. Do NOT overheat.
5. Do NOT give food or water by mouth.
6. Control any visible bleeding with direct pressure.
7. Loosen tight clothing (collar, belt).
8. Talk to the victim calmly. Reassurance helps.
9. Monitor breathing continuously. Be ready to perform CPR.

IF UNCONSCIOUS AND BREATHING: Place in recovery position (on side).
IF NOT BREATHING: Begin CPR.

WHAT NOT TO DO
- Do NOT leave the victim alone.
- Do NOT give anything to eat or drink.
- Do NOT apply a heat source directly to skin.`,
  },
  {
    category: 'First Aid',
    title: 'Heat Stroke & Heat Exhaustion',
    keywords: 'heat stroke exhaustion hyperthermia summer hot weather init cooling',
    body: `HEAT EXHAUSTION (Warning Stage)
Symptoms: Heavy sweating, cold/pale/clammy skin, fast weak pulse, nausea, muscle cramps, tiredness, dizziness, headache, fainting.

TREATMENT
1. Move to cool shade or air-conditioned area immediately.
2. Loosen or remove extra clothing.
3. Apply cool wet cloths to skin; fan the person.
4. Have them sip cool water slowly if conscious (not ice cold).
5. Lay flat with legs elevated.
6. If vomiting starts or symptoms worsen after 1 hour → HEAT STROKE EMERGENCY.

─────────────────────────────
HEAT STROKE (Life-Threatening)
Symptoms: High body temperature (over 39.4°C/103°F), hot/red/dry OR moist skin, rapid strong pulse, confusion, slurred speech, unconsciousness.

TREATMENT — COOL IMMEDIATELY, CALL 911
1. Move to coolest available location.
2. Cool the person RAPIDLY:
   - Immerse in cool (not ice) water if possible.
   - Place ice packs on neck, armpits, and groin.
   - Spray with cool water and fan aggressively.
3. Do NOT give fluids by mouth if confused or unconscious.
4. Continue cooling until temperature drops below 38.3°C (101°F) or emergency services arrive.

HIGH-RISK GROUPS: elderly, children, outdoor workers, those with chronic illness.
PREVENTION: Hydrate every 15–20 min during outdoor activity, wear light clothing, avoid sun between 10am–4pm.`,
  },
  {
    category: 'First Aid',
    title: 'Wound Cleaning & Infection Prevention',
    keywords: 'wound cut laceration infection cleaning bandage suture antiseptic sugat',
    body: `STEP-BY-STEP WOUND CARE

1. CONTROL BLEEDING
   - Apply firm, direct pressure with a clean cloth for 10–15 minutes.
   - Do NOT lift the cloth to check — maintain pressure.
   - If blood soaks through, add more cloth on top.
   - Elevate the injured part above the heart if possible.

2. CLEAN THE WOUND (once bleeding is controlled)
   - Wash your hands or use gloves if available.
   - Rinse wound under clean running water for 5–10 minutes.
   - Gently clean around the wound with soap — keep soap OUT of the wound.
   - Remove visible debris (gravel, dirt) with clean tweezers.
   - Do NOT use alcohol, hydrogen peroxide, or iodine directly in the wound — they damage tissue.

3. APPLY ANTISEPTIC
   - Apply a thin layer of antibiotic ointment (e.g., bacitracin/mupirocin) if available.
   - This reduces infection risk, not completely required if wound is clean.

4. COVER
   - Cover with a sterile bandage or clean cloth.
   - Change dressing daily or when wet/dirty.

SIGNS OF INFECTION (watch for 24–72 hrs)
- Increasing redness, warmth, or swelling around the wound.
- Pus or cloudy discharge.
- Red streaks spreading from the wound.
- Fever.
- Wound smells bad.

If infection signs appear: seek medical care, do NOT try to drain deep infections at home.

WOUNDS REQUIRING MEDICAL CARE
- Deep wounds (can see fat or muscle).
- Gaping wounds that won't stay closed (may need stitches within 6–8 hours).
- Animal or human bites.
- Puncture wounds (nail, thorn) — high tetanus/infection risk.
- Any wound if the victim hasn't had a tetanus shot in 5 years.`,
  },

  // ─── SURVIVAL (additional) ─────────────────────────────────────────────────
  {
    category: 'Survival',
    title: 'Managing Insect-Borne Diseases',
    keywords: 'malaria leptospirosis dengue mosquito flood water disease prevention lamok',
    body: `After a disaster, standing water and disrupted sanitation greatly increase disease risk.

DENGUE (Mosquito-borne)
Prevention:
- Eliminate standing water in containers, tires, pots.
- Use mosquito nets and repellent (DEET-based).
- Wear long sleeves and pants, especially at dawn and dusk.
- "4 o'clock habit": inspect surroundings for water containers at 4pm daily.
Symptoms: Sudden high fever (39–40°C), severe headache, eye pain, joint/muscle pain, rash.
Action: Rest, hydrate, paracetamol ONLY (no aspirin/ibuprofen). Seek medical care.

LEPTOSPIROSIS (Flood water exposure)
HIGH RISK: Wading through flood water, especially near rat habitats.
Prevention:
- Wear rubber boots and gloves when in flood water.
- Cover cuts and wounds before exposure.
- Do not swallow flood water.
- Take doxycycline prophylaxis if prescribed by a doctor.
Symptoms (appear 2–30 days after exposure): Fever, headache, chills, muscle pain (especially calf), red eyes, jaundice (yellow skin).
Action: Seek medical care immediately — leptospirosis can be fatal but is curable with antibiotics.

CHOLERA / DIARRHEAL DISEASE (Contaminated water)
Prevention:
- Only drink boiled or bottled water.
- Cook food thoroughly.
- Wash hands with soap before eating and after using toilet.
Symptoms: Sudden profuse watery diarrhea, vomiting, rapid dehydration.
Action: Oral Rehydration Solution (ORS). Seek medical care for severe cases.

GENERAL DISEASE PREVENTION IN DISASTERS
- Boil all water for at least 1 minute (3 minutes at altitude).
- Use mosquito nets when sleeping.
- Do not share personal items (cups, utensils).
- Wash hands frequently even with limited water.`,
  },
];
