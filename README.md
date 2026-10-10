# LOST IN ORBIT — StellarSpark (NASA Space Apps Challenge 2026)
Educational 3D Mars-outpost game for ages 10–13. Independent student project, not an official NASA product.

    npm install
    npm run dev       # play at the printed URL
    npm run build     # production build in dist/

## v2 — built-in astronaut + realistic graphics
The Commander astronaut and the whole colony are generated in code (no GLB needed). Controls: WASD move, Shift sprint, Space jump, E interact, H helmet on/off, Esc menu.
Graphics quality (Auto/High/Medium/Low) is in the pause menu. Character: `src/game/Character.js`; animation: `AnimationController.js`; map objects: `Decor.js`; textures/materials: `Textures.js`.
Reference images of the character are in `public/assets/player/reference/`.

## Using your own 3D assets (optional)
Set `ASSETS.USE_GLB = { player: true, colony: true }` in `src/config/game.config.js`, then:
Drop your files in, keep the names (or edit paths in `src/config/game.config.js`):
- `public/assets/player/PLAYER_CHARACTER.glb`  (auto-scaled to 1.8 m, should face +Z)
- `public/assets/colony/MARS_COLONY.glb`       (auto-scaled to 260 m wide)

Colony objects are found by node name (case-insensitive, ignores `_ - space`) or by a custom property `tag`:
Habitat, SolarArray, WaterExtractor, OxygenGenerator, Greenhouse, ResearchLab, RepairStation, Antenna, LandingZone,
DustStormZone, RadiationShelter, Rover, Crater, Volcano, Mountain. Add aliases in `OBJECT_MAP`, or exact names in `EXPLICIT_NAMES`.
Missing objects never crash the game: their mission steps fall back to the Habitat (a console warning lists them).
Player animations are matched by clip name (Idle, Walk, Run, Jump, Fall, Interact, Wave, Celebrate, Sad, Repair, UseTool, Point, Scan, Damage) with fallbacks; with no clips a procedural animation is used.
Without GLBs, a demo colony + astronaut are generated. Colliders use three-mesh-bvh for fast raycasts; name nodes with `nocollide`/`trigger`/`zone` to skip collision.

## Editing content
`src/data/missions.js` (missions, decisions, random events), `quizzes.js`, `nasaSources.js` (facts + NASA links), `resources.js`.
