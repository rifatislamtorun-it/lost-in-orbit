export const RESOURCES = {
  power:     { label: 'Power',            icon: '⚡', max: 100, start: 80,  tip: 'Electricity from the solar arrays. Water, oxygen and food machines all need it — below 30% they slow down!' },
  water:     { label: 'Water',            icon: '💧', max: 100, start: 70,  tip: 'For drinking, plants and making oxygen. On Mars, water is mostly ice that must be mined and melted.' },
  oxygen:    { label: 'Oxygen',           icon: 'O₂', max: 100, start: 85,  tip: 'Mars air is mostly CO₂, so astronauts need oxygen made by machines. If it hits 0, the crew is in trouble.' },
  food:      { label: 'Food',             icon: '🌱', max: 100, start: 75,  tip: 'Greenhouse crops and stored meals. Hungry crew means lower Crew Health.' },
  radiation: { label: 'Radiation Safety', icon: '☢',  max: 100, start: 90,  tip: 'How well the crew is protected from space radiation. Shields and shelters keep this high.' },
  health:    { label: 'Crew Health',      icon: '❤',  max: 100, start: 100, tip: 'How the crew feels. Drops when air, water, food or radiation safety get low.' },
  credits:   { label: 'Mission Credits',  icon: '🪙', max: 1000, start: 400, tip: 'Budget for repairs and upgrades. You cannot buy everything — choose wisely!' },
};
export const DEFAULT_SYS = { solar: 1, demand: 1, waterProd: 1, waterUse: 1, o2Prod: 1, foodProd: 1, cons: 1, shield: 1, risk: 0, radLoad: 0 };
export const SYS_LABELS = {
  solar: 'Solar output', demand: 'Power demand', waterProd: 'Water production', waterUse: 'Water use', o2Prod: 'Oxygen production',
  foodProd: 'Food production', cons: 'Food use', shield: 'Radiation shielding', risk: 'Power-failure risk', radLoad: 'Radiation threat',
};
export const DOWN_IS_GOOD = ['demand', 'waterUse', 'cons', 'risk', 'radLoad'];
