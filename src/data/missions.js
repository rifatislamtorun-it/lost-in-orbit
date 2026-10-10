// Step types: visit | quiz | repair | decision.  Steps with the same "g" (group) can be done in any order.
export const MISSIONS = [
  { id: 1, title: 'ARRIVAL', reward: { points: 100, credits: 60 },
    brief: 'Welcome to Mars, Commander! Before anything goes wrong, learn where the colony\'s key systems are.',
    objective: 'Find the Habitat, Oxygen Generator, Solar Array and Water System.',
    steps: [
      { g: 0, type: 'visit', target: 'Habitat', label: 'Find the Habitat' },
      { g: 0, type: 'visit', target: 'OxygenGenerator', label: 'Find the Oxygen Generator' },
      { g: 0, type: 'visit', target: 'SolarArray', label: 'Find the Solar Array' },
      { g: 0, type: 'visit', target: 'WaterExtractor', label: 'Find the Water System' },
      { g: 1, type: 'quiz', target: 'Habitat', label: 'Answer Mission Control\'s question', quiz: ['q_sol'] },
    ] },
  { id: 2, title: 'POWER PROBLEM', reward: { points: 120, credits: 60 },
    brief: 'Mission Control sees the solar array\'s output dropping. Go investigate and choose a fix.',
    objective: 'Inspect the Solar Array and decide how to fix the power problem.',
    onStart: { fx: { sys: { solar: -0.4 } }, note: 'Solar output dropped to 60%!', alert: ['SolarArray'] },
    steps: [
      { g: 0, type: 'visit', target: 'SolarArray', label: 'Inspect Solar Array', title: 'Dusty panels!', text: 'The panels are covered in fine Martian dust. Less sunlight reaches the cells, so the array makes only about 60% of its normal power.', src: 'mars_facts' },
      { g: 1, type: 'decision', target: 'SolarArray', label: 'Decide how to fix the Solar Array', decision: 'solar_fix' },
      { g: 2, type: 'quiz', target: 'ResearchLab', label: 'Ask the Research Lab', quiz: ['q_solar_dust'] },
    ] },
  { id: 3, title: 'WATER SHORTAGE', reward: { points: 140, credits: 60 },
    brief: 'Water production is falling. Send the rover to scan for ice, then fix the extractor.',
    objective: 'Scan for ice with the Rover, then repair the Water Extractor.',
    onStart: { fx: { water: -8, sys: { waterProd: -0.45 } }, note: 'Water production dropped!', alert: ['WaterExtractor'] },
    steps: [
      { g: 0, type: 'visit', target: 'Rover', label: 'Scan for ice with the Rover', anim: 'Scan', rover: true, title: 'Rover ice scan', text: 'The rover scans the ground and finds hydrogen-rich soil — a sign of buried water ice. Good news: there is plenty to mine!', src: 'odyssey' },
      { g: 1, type: 'quiz', target: 'WaterExtractor', label: 'Check the Water System', quiz: ['q_ice', 'q_tf_lakes'] },
      { g: 2, type: 'repair', target: 'WaterExtractor', label: 'Repair the Water Extractor', title: 'Water Extractor', fx: { sys: { waterProd: 0.2 } } },
      { g: 3, type: 'decision', target: 'Habitat', label: 'Plan the water supply in the Habitat', decision: 'water_plan' },
    ] },
  { id: 4, title: 'OXYGEN EMERGENCY', reward: { points: 160, credits: 60 },
    brief: 'The Oxygen Generator is unstable! Restore it before the air runs low.',
    objective: 'Repair the Oxygen Generator and decide how to keep oxygen flowing.',
    onStart: { fx: { oxygen: -10, sys: { o2Prod: -0.5 } }, note: 'Oxygen generator warning!', alert: ['OxygenGenerator'] },
    steps: [
      { g: 0, type: 'repair', target: 'OxygenGenerator', label: 'Repair the Oxygen Generator', title: 'Oxygen Generator', fx: { sys: { o2Prod: 0.25 } } },
      { g: 1, type: 'quiz', target: 'OxygenGenerator', label: 'Test your oxygen knowledge', quiz: ['q_oxy', 'q_moxie'] },
      { g: 2, type: 'decision', target: 'OxygenGenerator', label: 'Choose how to keep oxygen steady', decision: 'o2_plan' },
    ] },
  { id: 5, title: 'DUST STORM', reward: { points: 180, credits: 60 }, storm: 1,
    brief: 'Mission Control has detected rising dust activity near the colony. A big storm is on its way!',
    objective: 'Prepare the colony before the storm arrives.',
    onStart: { fx: { sys: { solar: -0.35 } }, note: 'Dust storm approaching — solar power will drop!', alert: ['DustStormZone'] },
    onComplete: { fx: { sys: { solar: 0.35 } }, note: 'The storm passed and the sky is clearing.' },
    steps: [
      { g: 0, type: 'quiz', target: 'Antenna', label: 'Read the storm warning at the Antenna', quiz: ['q_storm', 'q_best_storm'] },
      { g: 1, type: 'decision', target: 'Habitat', label: 'Prepare the colony in the Habitat', decision: 'storm_prep' },
      { g: 2, type: 'visit', target: 'SolarArray', label: 'Secure the Solar Array', anim: 'UseTool', title: 'Panels secured', text: 'You tilt and protect the panels so the storm can\'t damage them. Solar panels still make less power in dusty skies, so batteries and saving power matter!', src: 'mars_facts' },
    ] },
  { id: 6, title: 'RADIATION ALERT', reward: { points: 200, credits: 60 },
    brief: 'Radiation sensors are warning of higher exposure. How will you protect the crew?',
    objective: 'Scan the radiation level and choose how to protect the crew.',
    onStart: { fx: { radiation: -10, sys: { radLoad: 8 } }, note: 'Radiation risk is rising!', alert: ['RadiationShelter'] },
    steps: [
      { g: 0, type: 'visit', target: 'ResearchLab', label: 'Scan radiation in the Research Lab', anim: 'Scan', title: 'Radiation scan', text: 'The lab\'s instruments show that more radiation than usual is reaching the colony. Mars has little natural protection, so the crew needs shielding.', src: 'goals' },
      { g: 1, type: 'quiz', target: 'ResearchLab', label: 'Answer the radiation questions', quiz: ['q_magnet', 'q_tf_shield'] },
      { g: 2, type: 'decision', target: 'RadiationShelter', label: 'Protect the crew at the Radiation Shelter', decision: 'rad_plan' },
    ] },
  { id: 7, title: 'FOOD CRISIS', reward: { points: 220, credits: 60 },
    brief: 'The greenhouse is producing less food. Power and food are tied together — balance them!',
    objective: 'Visit the Greenhouse and balance food and power.',
    onStart: { fx: { food: -10, sys: { foodProd: -0.4 } }, note: 'Greenhouse production is low!', alert: ['Greenhouse'] },
    steps: [
      { g: 0, type: 'visit', target: 'Greenhouse', label: 'Inspect the Greenhouse', title: 'Hungry plants', text: 'The grow lights are too dim and the plants are growing slowly. Sunlight on Mars is weaker than on Earth, so greenhouses need power for lights.', src: 'mars_facts' },
      { g: 1, type: 'quiz', target: 'Greenhouse', label: 'Answer the plant question', quiz: ['q_sun'] },
      { g: 2, type: 'decision', target: 'Greenhouse', label: 'Fix food production', decision: 'food_plan' },
    ] },
  { id: 8, title: 'FINAL OUTPOST CHALLENGE', reward: { points: 300, credits: 0 }, final: true,
    brief: 'Everything is under stress at once! Fix each system, then survive a 3-sol test run.',
    objective: 'Stabilise Power, Oxygen, Water, Food and Radiation, then start the survival test in the Habitat.',
    onStart: { fx: { power: -8, water: -8, oxygen: -6, food: -8, radiation: -8, sys: { solar: -0.3, waterProd: -0.3, o2Prod: -0.25, foodProd: -0.3, radLoad: 6 } }, note: 'Multiple systems are stressed!', alert: ['SolarArray', 'WaterExtractor', 'OxygenGenerator', 'Greenhouse', 'RadiationShelter'] },
    steps: [
      { g: 0, type: 'decision', target: 'SolarArray', label: 'Stabilise Power at the Solar Array', decision: 'f_power' },
      { g: 0, type: 'decision', target: 'WaterExtractor', label: 'Stabilise Water at the Water Extractor', decision: 'f_water' },
      { g: 0, type: 'decision', target: 'OxygenGenerator', label: 'Stabilise Oxygen at the Generator', decision: 'f_o2' },
      { g: 0, type: 'decision', target: 'Greenhouse', label: 'Stabilise Food at the Greenhouse', decision: 'f_food' },
      { g: 0, type: 'decision', target: 'RadiationShelter', label: 'Stabilise Radiation Safety at the Shelter', decision: 'f_rad' },
      { g: 1, type: 'visit', target: 'Habitat', label: 'Start the 3-sol survival test in the Habitat', anim: 'Interact', title: 'Survival test', text: 'Commander, all systems are set. Mission Control will now simulate three sols (Martian days) to see whether the outpost can survive. Good luck!', src: null },
    ] },
];

const credit = (n) => `Cost: ${n} credits`;
export const DECISIONS = {
  solar_fix: { title: 'Solar array damaged', situation: 'The array makes only 60% of its usual power. What do you do?', pick: 1, options: [
    { label: 'A. Repair now', cost: `${credit(100)} · Time: 1 mission cycle`, fx: { credits: -100, sys: { solar: 0.4 } }, eng: 100, feedback: 'Great engineering! Cleaning and fixing the panels brings power back to full — but it used up credits. Real missions always have a budget.' },
    { label: 'B. Reduce colony power use', cost: 'Power demand −20% · Habitat comfort −5%', fx: { health: -5, sys: { demand: -0.2 } }, eng: 70, feedback: 'A smart short-term fix: use less than you make. The crew is a little less comfortable, and the array is still weak.' },
    { label: 'C. Ignore it', cost: 'Free now · Risk of power failure goes up', fx: { sys: { risk: 0.35 } }, eng: 30, feedback: 'Nothing was spent — but the colony now makes less power each cycle and a power failure could happen. Ignoring problems often costs more later!' },
  ] },
  water_plan: { title: 'Water supply plan', situation: 'The extractor is running again, but still below normal. How will the colony cope?', pick: 1, options: [
    { label: 'A. Run the extractor harder', cost: 'Water production +45% · Power use +10%', fx: { sys: { waterProd: 0.45, demand: 0.1 } }, eng: 85, feedback: 'More water, but the extractor draws more power. Every system shares the same electricity!' },
    { label: 'B. Recycle water in the Habitat', cost: `${credit(120)} · Water use −25%`, fx: { credits: -120, sys: { waterUse: -0.25 } }, eng: 100, feedback: 'Recycling is how real space stations save water. It costs credits up front but saves water every cycle.' },
    { label: 'C. Ration water', cost: 'Free · Crew health −6%', fx: { health: -6, sys: { waterUse: -0.15 } }, eng: 50, feedback: 'Rationing saves water, but a thirsty crew feels worse. It\'s a short-term answer, not a solution.' },
  ] },
  o2_plan: { title: 'Keep the oxygen flowing', situation: 'The generator is working again but not at full strength.', pick: 1, options: [
    { label: 'A. Run the generator at full power', cost: 'Oxygen +25% · Power use +35%', fx: { sys: { o2Prod: 0.25, demand: 0.35 } }, eng: 80, feedback: 'Oxygen is back to normal, but the generator now uses much more power. Watch your power meter!' },
    { label: 'B. Replace worn parts', cost: `${credit(150)} · Oxygen back to normal`, fx: { credits: -150, sys: { o2Prod: 0.25 } }, eng: 100, feedback: 'Fixing the cause, not just the symptom. Spare parts cost credits but keep power use low.' },
    { label: 'C. Limit crew activity', cost: 'Free · Oxygen +8 now · Crew health −5%', fx: { oxygen: 8, health: -5 }, eng: 45, feedback: 'Resting uses less oxygen, but it only buys time — the generator is still weak.' },
  ] },
  storm_prep: { title: 'Dust storm preparations', situation: 'You have time for TWO preparations. Choose the two you think matter most.', pick: 2, options: [
    { label: 'Protect the solar arrays', cost: `${credit(40)} · Storm power loss reduced`, fx: { credits: -40, sys: { solar: 0.2 } }, eng: 90, feedback: 'Covered, tilted panels keep working better.' },
    { label: 'Reduce power consumption', cost: 'Power demand −25% · Comfort −3%', fx: { health: -3, sys: { demand: -0.25 } }, eng: 85, feedback: 'Using less power stretches your supply through the storm.' },
    { label: 'Move the crew into the Habitat', cost: 'Crew health +5 · Radiation safety +5', fx: { health: 5, radiation: 5 }, eng: 80, feedback: 'Safe indoors: the crew is protected and comfortable.' },
    { label: 'Activate backup batteries', cost: `${credit(60)} · Power +20 now`, fx: { credits: -60, power: 20 }, eng: 75, feedback: 'Batteries give a quick boost, but they only store energy — they don\'t make more.' },
  ] },
  rad_plan: { title: 'Radiation protection', situation: 'How will you protect the crew?', pick: 1, options: [
    { label: 'A. Add soil walls around the Habitat', cost: `${credit(150)} · Shielding +40%`, fx: { credits: -150, sys: { shield: 0.4, radLoad: -8 } }, eng: 100, feedback: 'Thick material between the crew and space blocks radiation. Great long-term protection!' },
    { label: 'B. Shelter during radiation peaks', cost: 'Free · Less outdoor work · Comfort −5%', fx: { health: -5, sys: { radLoad: -6 } }, eng: 75, feedback: 'A good schedule helps a lot and costs nothing, but work slows down.' },
    { label: 'C. Keep working as normal', cost: 'Free · Radiation stays high', fx: {}, eng: 25, feedback: 'The crew stays exposed. Radiation safety will keep dropping each cycle.' },
  ] },
  food_plan: { title: 'Food production is low', situation: 'Food is the crew\'s fuel. How do you fix it?', pick: 1, options: [
    { label: 'A. Increase greenhouse power', cost: 'Food +40% · Power use +15%', fx: { sys: { foodProd: 0.4, demand: 0.15 } }, eng: 85, feedback: 'Brighter lights grow more food, but the greenhouse uses more electricity.' },
    { label: 'B. Reduce crew food use', cost: 'Free · Crew health slowly drops', fx: { sys: { cons: -0.2 } }, eng: 50, feedback: 'Smaller meals save food but weaken the crew over time.' },
    { label: 'C. Build an extra greenhouse', cost: `${credit(200)} · Food production +60%`, fx: { credits: -200, sys: { foodProd: 0.6 } }, eng: 95, feedback: 'More growing space is a big long-term win — if you can afford it!' },
  ] },
  f_power: { title: 'Final: Power', situation: 'Solar output is low.', pick: 1, options: [
    { label: 'Clean all the panels', cost: credit(50), fx: { credits: -50, sys: { solar: 0.35 } }, eng: 100, feedback: 'Clean panels, strong power.' },
    { label: 'Cut non-essential power', cost: 'Power demand −20% · Comfort −3%', fx: { health: -3, sys: { demand: -0.2 } }, eng: 70, feedback: 'Using less works, at a small comfort cost.' },
    { label: 'Hope for sunshine', cost: 'Free · Risk of power failure', fx: { sys: { risk: 0.25 } }, eng: 30, feedback: 'Hope is not an engineering plan!' },
  ] },
  f_water: { title: 'Final: Water', situation: 'Water production is down.', pick: 1, options: [
    { label: 'Boost the extractor', cost: 'Water +35% · Power use +10%', fx: { sys: { waterProd: 0.35, demand: 0.1 } }, eng: 85, feedback: 'More water, more power use.' },
    { label: 'Upgrade water recycling', cost: credit(80), fx: { credits: -80, sys: { waterUse: -0.25 } }, eng: 100, feedback: 'Recycling saves water every cycle.' },
    { label: 'Ration water', cost: 'Free · Crew health −5%', fx: { health: -5, sys: { waterUse: -0.15 } }, eng: 50, feedback: 'Rationing helps, but the crew suffers.' },
  ] },
  f_o2: { title: 'Final: Oxygen', situation: 'Oxygen output is weak.', pick: 1, options: [
    { label: 'Service the generator', cost: credit(60), fx: { credits: -60, sys: { o2Prod: 0.3 } }, eng: 100, feedback: 'Maintenance keeps life support healthy.' },
    { label: 'Run it at full power', cost: 'Oxygen +20% · Power use +15%', fx: { sys: { o2Prod: 0.2, demand: 0.15 } }, eng: 75, feedback: 'It works, but costs electricity.' },
    { label: 'Wait and see', cost: 'Free · Oxygen stays low', fx: {}, eng: 25, feedback: 'Never wait on oxygen!' },
  ] },
  f_food: { title: 'Final: Food', situation: 'The greenhouse is struggling.', pick: 1, options: [
    { label: 'Boost the grow lights', cost: 'Food +35% · Power use +10%', fx: { sys: { foodProd: 0.35, demand: 0.1 } }, eng: 85, feedback: 'More light, more food, more power.' },
    { label: 'Add a grow tray', cost: credit(70), fx: { credits: -70, sys: { foodProd: 0.35 } }, eng: 100, feedback: 'More growing space with no extra power use.' },
    { label: 'Smaller meals', cost: 'Free · Crew health drops slowly', fx: { sys: { cons: -0.2 } }, eng: 50, feedback: 'Saves food, but weakens the crew.' },
  ] },
  f_rad: { title: 'Final: Radiation', situation: 'Radiation exposure is high.', pick: 1, options: [
    { label: 'Build a shielded sleeping area', cost: credit(80), fx: { credits: -80, sys: { shield: 0.35, radLoad: -4 } }, eng: 100, feedback: 'Sleeping behind thick shielding gives hours of protection every day.' },
    { label: 'Use a shelter schedule', cost: 'Free · Comfort −3%', fx: { health: -3, sys: { radLoad: -4 } }, eng: 70, feedback: 'Good habits help a lot.' },
    { label: 'Skip it', cost: 'Free · Radiation stays high', fx: {}, eng: 25, feedback: 'The crew stays exposed.' },
  ] },
};

export const EVENTS = [
  { id: 'solar_drop', icon: '☀️', title: 'Solar array efficiency drop', where: 'SolarArray', text: 'A layer of dust is dimming the panels a little.', options: [
    { label: 'Send the cleaning bot', cost: 'Cost: 30 credits', fx: { credits: -30, power: 8 }, result: 'Panels cleaned — power is up!' },
    { label: 'Ignore it', cost: 'Free', fx: { power: -6 }, result: 'Power dipped a bit. Small problems add up.' } ] },
  { id: 'leak', icon: '💧', title: 'Water system leak', where: 'WaterExtractor', text: 'A small leak was found in a water pipe.', options: [
    { label: 'Seal the pipe', cost: 'Cost: 20 credits', fx: { credits: -20 }, result: 'Sealed! No water was lost.' },
    { label: 'Leave it for now', cost: 'Free', fx: { water: -8 }, result: 'You lost some water. Quick fixes save resources.' } ] },
  { id: 'o2_warn', icon: '🫁', title: 'Oxygen generator warning', where: 'OxygenGenerator', text: 'A yellow light is blinking on the oxygen generator.', options: [
    { label: 'Run a diagnostic', cost: 'Power −4', fx: { power: -4, oxygen: 4 }, result: 'Diagnostic done — a clogged filter was cleaned.' },
    { label: 'Wait and watch', cost: 'Free', fx: { oxygen: -6 }, result: 'Oxygen dipped. Warnings are there to help you!' } ] },
  { id: 'rover', icon: '🤖', title: 'Rover malfunction', where: 'Rover', text: 'The rover has a stuck wheel in the soft sand.', options: [
    { label: 'Re-route the rover carefully', cost: 'Cost: 15 credits', fx: { credits: -15 }, result: 'The rover is free again.' },
    { label: 'Leave it stuck', cost: 'Free', fx: { credits: -25 }, result: 'Mission Control loses some science time (−25 credits).' } ] },
  { id: 'comm', icon: '📡', title: 'Communication delay', where: 'Antenna', text: 'Messages between Earth and Mars take time to travel. Mission Control cannot reply right away.', options: [
    { label: 'Follow the emergency checklist', cost: 'Free', fx: { health: 4 }, result: 'The crew stays calm and follows the plan. +4 health.' },
    { label: 'Wait for Earth to answer', cost: 'Free', fx: { health: -3 }, result: 'Waiting made the crew nervous. −3 health.' } ] },
  { id: 'greenhouse', icon: '🌱', title: 'Greenhouse temperature problem', where: 'Greenhouse', text: 'Nights on Mars are very cold. The greenhouse is chilly.', options: [
    { label: 'Turn the heaters up', cost: 'Power −6', fx: { power: -6, food: 5 }, result: 'Warm plants grow well. +5 food.' },
    { label: 'Leave it', cost: 'Free', fx: { food: -8 }, result: 'Some plants wilted. −8 food.' } ] },
  { id: 'discovery', icon: '🪨', title: 'Unexpected geological discovery!', where: 'Rover', text: 'The rover spotted layered rocks that might tell the story of ancient Mars.', options: [
    { label: 'Study them', cost: 'Cost: 10 credits', fx: { credits: -10 }, science: 15, result: 'Great science! +15 Science Points.' },
    { label: 'Keep exploring', cost: 'Free', fx: {}, result: 'You move on. Maybe next time!' } ] },
  { id: 'haze', icon: '🌫️', title: 'Dust haze rolling in', where: 'DustStormZone', text: 'A thin haze of dust is blowing across the colony.', options: [
    { label: 'Fold the panels in', cost: 'Power −5', fx: { power: -5 }, result: 'Panels stay clean and safe.' },
    { label: 'Keep panels open', cost: 'Free', fx: { power: -10 }, result: 'The haze dimmed the Sun. −10 power.' } ] },
];
