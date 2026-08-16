# Handoff: Chaska — 16-bit travel llama mascot

## Overview

Chaska is a pixel-art llama mascot for a Peru travel app. She overlays the app UI as a
transparent sprite — no background, no container, no card. She has **17 animations**:
eleven that unlock one per day across an 11-day trip, and six anytime states the app can
trigger from context.

The name is a placeholder (Quechua for "star") — rename freely.

## About the design files

The files in this bundle are **design references**. `chaska-sprites.js` is procedural
drawing code used to generate the shipped PNGs, and `chaska-player.js` is a reference
player showing intended timing and interaction. Neither is production code to drop in.

**The task is to implement the sprite mascot in the target codebase's existing
environment** — React, SwiftUI, Jetpack Compose, whatever the app already uses — driving
the shipped PNGs. If no environment exists yet, choose the appropriate one for the
platform.

**The PNGs in `sprites/` are final production assets.** Ship them as-is.

## Fidelity

**High fidelity.** The pixel art is final. Every frame is authored at exactly 40×40
logical pixels and exported at 4× (160 px cells). Do not resample, recolor, smooth, or
re-cut them.

---

## Assets

```
sprites/
  chaska-<id>-4x.png     17 horizontal strips, one per animation
  chaska-master-4x.png   all 17 animations in one grid (1280 × 2720)
  chaska-master-1x.png   the same grid at 1× (320 × 680), for reference
chaska-manifest.json     frame counts, fps, row offsets, triggers
src/chaska-sprites.js    procedural source the PNGs were generated from
src/chaska-player.js     reference player (web component)
Chaska — 16-bit Llama.dc.html   the original interactive design doc
```

### Sprite specification

| Property | Value |
|---|---|
| Logical frame | 40 × 40 px, fully transparent background |
| Export scale | 4× → 160 px cells |
| Strip layout | horizontal, frame 0 leftmost, left → right |
| Master layout | one row per animation, row order = manifest order |
| Master cell | 160 px; row `n` starts at `y = n * 160` |
| Scaling | **nearest-neighbour only** (`image-rendering: pixelated`) |
| Display size | 80 css px (2×) recommended; 64 px minimum, 40 px absolute floor |
| Looping | every cycle is seamless — no ping-pong, no hold frames |

The master sheet is padded to the widest animation (8 frames). Rows with 6 frames have two
empty cells on the right — read `frames` from the manifest, never from the sheet width.

---

## Animations

Frame timing is `1000 / fps` ms per frame, constant within an animation.

### Trip-day unlocks

| Day | id | Name | Frames | fps | Trigger | What happens |
|---|---|---|---|---|---|---|
| 01 | `ladybee` | Lady Bee | 8 | 8 | evening, arrival night | Shakes a cocktail shaker overhead for four frames, then holds a coupe and sips while a bee orbits the glass. |
| 02 | `maido` | Maido | 8 | 7 | dinner reservation | Head dips to a plate of nigiri, takes the piece on frame 4, comes back up chewing with an approving bob. |
| 03 | `dress` | Chullo & poncho | 8 | 7 | city arrival | A chullo drops in from above frames 1–3, poncho appears frame 5, then a small pleased shuffle. |
| 04 | `eat` | Ceviche & pisco | 8 | 6 | food booking | Head-down feast at a ceviche bowl, then lifts a pisco sour and sips. |
| 05 | `flag` | Bandera | 6 | 8 | trip midpoint | Waves the Peru flag. The banner ripples on a six-frame sine offset. |
| 06 | `ruins` | Machu Picchu | 6 | 5 | site check-in | Stands on the stone terraces with the Huayna Picchu peak behind, mist drifting across. |
| 07 | `nazca` | Nazca lines | 8 | 8 | flight day | Traces a glowing spiral geoglyph into the desert floor, one segment per frame, pulsing gold. |
| 08 | `rainbow` | Vinicunca | 8 | 6 | summit | Climbs a seven-banded rainbow ridge, rising and falling with the terrain. |
| 09 | `boat` | Titicaca de noche | 6 | 5 | lake night | Night on the lake in a totora reed boat: chullo and poncho on, 1px shiver, breath fogging off the muzzle, stars twinkling. |
| 10 | `amazon` | Amazonía | 8 | 7 | jungle leg | A parrot flies in and lands on her head. Mild alarm, then acceptance. |
| 11 | `inti` | Inti Raymi | 8 | 8 | trip complete | Full regalia flag dance inside a turning sun disc. The finale. |

### Anytime states

| Badge | id | Name | Frames | fps | Trigger | What happens |
|---|---|---|---|---|---|---|
| HELLO | `wave` | Buenos días | 6 | 8 | app open | Raises a foreleg and waves. The core greeting. |
| DANCE | `dance` | Huayno with a cuy | 8 | 10 | booking confirmed | Andean two-step, weight shifting between legs, a guinea pig hopping alongside. |
| IDLE | `idle` | Descanso | 8 | 4 | default resting state | Breathing bob, a blink, head turns left to look around, back, glances right, settles. |
| MOVE | `run` | Trote | 6 | 12 | transit / loading | Gallop cycle, runs **in place**. See "Running along the bottom" below. |
| OOPS | `trip` | Tropezón | 8 | 10 | error / empty state | Running, catches a hoof, pitches forward, face-plants with dust, pushes back up. |
| TAP | `tap` | ¡Oye! | 6 | 10 | on tap | Cheeky spit arcing off-frame to the right. Plays **over** whatever is running. |

---

## Interactions & behavior

### State machine

```
        ┌──────────────── idle (default) ────────────────┐
        │                                                 │
   app open → wave ─┐                         day unlock → dayAnim
                    ├→ (animation completes) →┤
   transit → run ───┤                          error → trip
                    └────────── back to idle ─┘
```

- **`idle` is the resting state.** Everything returns to it when a one-shot completes.
- **Day animations** are one-shots in principle but loop cleanly — play 2–3 cycles then
  return to `idle`, or hold the loop while the relevant screen is open. The app decides.
- **`run` and `idle` loop indefinitely** until the app changes state.
- **`tap` is an interrupt.** It plays over the current animation for ~600 ms, then hands
  control back to whatever was running. Do not queue taps; a second tap restarts it.

### Running along the bottom

`run` is an in-place gallop. The app translates the sprite:

- Move at roughly **48 logical px/second** (~1.2 px per frame at 12 fps) so the stride
  reads as ground contact, not skating.
- On reaching the edge, **mirror the sprite on X** (`transform: scaleX(-1)`) and run back.
  One strip covers both directions — do not export a mirrored set.
- Every frame plants its hooves on **y = 38** of the 40 px cell, so the baseline is stable
  across the cycle and consistent with all other animations. Anchor the sprite so y38 sits
  on your intended floor line.

### Trip and fall

Frames 1–3 tilt the body via canvas rotation, frames 4–6 are the flat sprawl with dust,
frames 7–8 recover. It reads as a one-shot — play it once, don't loop it.

### Llama on / off

The design doc has a `LLAMA ON` / `LLAMA OFF` switch. In the app this is a **user
preference that disables the mascot**:

- **Off** — stop the animation loop and remove the sprite from the view. Do not just pause
  it in place; a frozen llama reads as a bug.
- **On** — mount and resume from `idle`.
- Persist the preference. Respect `prefers-reduced-motion`: when set, default to off, or
  show a single static frame (frame 0 of `idle`) with no loop.

### Tap target

The sprite is small. Give it a **minimum 44 × 44 px hit area** regardless of display size,
centered on the sprite.

### Layering

`position: fixed` or equivalent, above app content, **below** modals, toasts and any
blocking overlay. The sprite must never intercept taps meant for UI behind it outside its
own hit area.

---

## State management

```
llamaEnabled : boolean   // user preference, persisted
currentState : string    // animation id, default "idle"
frame        : number    // 0 .. frames-1
override     : string?   // "tap", cleared after ~600ms
position     : {x, y}    // only meaningful during "run"
facing       : 1 | -1    // X mirror during "run"
unlockedDays : number[]  // which day animations are available
```

Frame advance is time-based, not tick-based — accumulate elapsed ms and step frames by
`1000/fps` so the animation runs correctly on any refresh rate.

---

## Design tokens

The full 19-colour palette. Every sprite is drawn from these — no anti-aliasing, no
gradients, no intermediate values. The only exceptions are three semi-transparent whites
used for mist, dust and breath fog.

| Key | Hex | Use |
|---|---|---|
| `o` | `#241C2B` | Outline, eye — every sprite edge |
| `L` | `#F7E9D2` | Fleece, light |
| `M` | `#E0C8A6` | Fleece, mid |
| `S` | `#BFA27E` | Fleece, shadow |
| `n` | `#A3866A` | Muzzle |
| `h` | `#6B533E` | Hoof |
| `r` | `#D9282F` | Peru flag red |
| `w` | `#FFFFFF` | White |
| `g` | `#F2C14E` | Inti gold |
| `y` | `#F0D68A` | Pale gold |
| `t` | `#3FA9A0` | Teal |
| `p` | `#D8456B` | Pink |
| `G` | `#4A9E5C` | Green |
| `u` | `#6B4F9E` | Purple |
| `b` | `#8A5A3B` | Wood |
| `B` | `#2F7FD1` | Water blue |
| `k` | `#EF8B3C` | Orange |
| `s` | `#9A958C` | Stone, light |
| `d` | `#6E6A64` | Stone, dark |

Fleece, hoof and outline carry every frame. Flag red and Inti gold are the only saturated
accents outside a themed prop.

### Layout anchors (inside the 40 × 40 cell)

| Anchor | Value | Meaning |
|---|---|---|
| Ground line | y = 38 | Hooves plant here in every standing animation |
| Body | x 12, y 22 | Top-left of the 20 × 10 barrel |
| Head | x 23, y 4 | Top-left of the 11 × 10 head |
| Tail | x 8, y 23 | Top-left of the tail |
| Safe area | 1 px inset | Nothing touches x0 or x39 except by design |

Two animations deliberately break the frame: `dress` (the chullo drops in from above
y = 0) and `tap` (the spit arcs out past x = 39). Both are intentional — don't clip them.

---

## Re-exporting

`src/chaska-sprites.js` is the source the PNGs came from. To re-export at a different
scale, in a browser or headless Chrome:

```js
// plain script, attaches globalThis.CHASKA
const canvas = CHASKA.renderSheet('idle', 4);   // one animation, horizontal strip
const master = CHASKA.renderMaster(4);          // everything, one grid
const frame  = CHASKA.renderFrame('wave', 3, 8); // a single frame at 8×
```

Only integer scales. `CHASKA.ANIMATIONS` is the same table as the manifest.

## Open questions for the designer

- "Chaska" is a placeholder name.
- Day 2 (Maido) and day 4 (Ceviche & pisco) share the head-dip-to-food mechanic and differ
  only in the prop. If they'll be seen close together, one should be re-choreographed.
- Potato harvest, Cusco textiles as their own day, and the Amazon beyond the parrot were
  scoped out. Textiles appear in the poncho, Nazca in day 7.
