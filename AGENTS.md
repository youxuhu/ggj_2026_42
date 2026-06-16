# AGENTS.md — ggj_2026_42

A Vue 3 + TypeScript + Vite web game (GGJ 2026) about serving burgers with intentionally misspelled menus.

## Quick start

```bash
pnpm dev         # Vite dev server
pnpm build       # type-check + build (parallel via npm-run-all2)
pnpm type-check  # vue-tsc --build
pnpm preview     # vite preview
```

- Package manager: `pnpm` (see `engines` in package.json: node >=20.19 or >=22.12).
- Build runs `type-check` before/with `build-only` — don't skip it.
- No test, lint, or formatter tooling configured.

## Project structure

```
src/
  main.ts              — entrypoint: mounts Vue app w/ Pinia, Router, ElementPlus (zh-CN), PixelUI
  App.vue              — root: <RouterView> with fade transition
  router/index.ts      — routes: / (welcome), /game/night/:nightIndex, /game/day/:dayIndex,
                         /game/transition/:transitionIndex, /gameover, /end
  stores/
    gameStore.ts       — core gameplay state (menu items, customers, orders, pressure) + logic
    talks.ts           — night-phase chat dialogue (group chat style)
    counter.ts         — unused boilerplate, can be deleted
  views/
    Game.vue           — scene orchestrator: N1→T1→D1→N2→T2→D2→N3→T3→D3→N4→End
    GameNight.vue      — text-adventure phone chat, click to advance dialogue bubbles
    GameTransition.vue — brief splash ("Day X coming up"), click to proceed
    GameDay.vue        — core gameplay: serve customers (menu selection + mood matching)
    WelCome.vue        — loading bar → title screen → /game
    GameOver.vue       — redirects home on click
    End.vue            — credits screen, redirects home on click
  components/
    DialogueBox.vue    — typewriter-style dialogue w/ speaker name; click to advance
    MenuChecker.vue    — tabbed menu categories, item selection checkboxes, submit button
    GameStatus.vue     — pressure meter (circular px-progress) + staff mood face image
    StaffStatus.vue    — 5 mood toggles (smile/slacking/parenting/patient/invisible)
    CustomerPanel.vue  — shows current customer info (mostly unused by views)
Assets/               — Unity C# project (separate, not part of the web build)
public/
  pic/characters/      — customer & character images
  music/               — bgm_normal.wav, click_104.wav (see index.html for audio init)
```

## Game flow

1. `WelCome.vue` loads with a fake progress bar, then shows the title "何意味" → click to go `/game`.
2. `/game` redirects to `/game/night/1` (first night chat).
3. Scene sequence: **N1 → T1 → D1 → N2 → T2 → D2 → N3 → T3 → D3 → N4 → End**.
4. Each day phase (`GameDay.vue`): dialogue → ordering (select menu items + staff mood) → rest → next customer.
5. Wrong order/mood mismatch → +20 pressure. Correct → -15 pressure. Pressure ≥ 100 → `/gameover`.
6. Successfully complete all 3 days → scene continues to N4 → `/end`.

## Gameplay quirks

- Customers have an `expectedStatus` — player must match their mood to it (or pressure rises faster).
- The "slacking" mood reduces pressure during rest/break phases.
- Menu items have deliberately misspelled display names (e.g. 巨无爸 → 巨无霸). The game checks *internal IDs*.
- `DialogueBox.vue` uses a 30ms interval typewriter effect; clicking during dialogue advances text, not the order.
- `StaffStatus.vue` directly mutates `store.staffMood` via `@click`, not an action.
- Break customers (like the tutorial boss) auto-advance after 20s if not submitted.

## Noteworthy config

- `tsconfig.app.json` excludes `src/**/__tests__/*` and `src/views/Gametest.vue` from type-checking.
- `@` path alias → `./src/*`.
- `index.html` registers a global click listener that plays click SFX and starts BGM on first interaction (no user-gesture bypass needed).
- `pnpm-workspace.yaml` only sets `ignoredBuiltDependencies`/`onlyBuiltDependencies` — not an actual workspace.
