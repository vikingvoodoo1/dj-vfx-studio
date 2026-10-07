# DJ VFX Studio — Comprehensive Lighting Architecture & Engineering Guide

> **Document Version:** 1.0.0  
> **Last Updated:** October 2026  
> **Maintainer Directive:** This document serves as the single source of truth for all lighting systems (both real-time WebGL virtual fixtures and physical hardware smart lighting) in DJ VFX Studio. **Any future modifications, additions, or re-tunings to lights, fixtures, shaders, or lighting controllers MUST be documented and kept up-to-date in this guide.**

---

## Table of Contents
1. [Architectural Overview](#1-architectural-overview)
2. [Coordinate Space & Fixture Articulation](#2-coordinate-space--fixture-articulation)
3. [Virtual Moving-Head Fixture Engineering](#3-virtual-moving-head-fixture-engineering)
4. [Volumetric God-Ray & Laser Beam Simulation](#4-volumetric-god-ray--laser-beam-simulation)
5. [The 5-Fixture Bottom Concert Rig (Pumpkin Disco Ball)](#5-the-5-fixture-bottom-concert-rig-pumpkin-disco-ball)
   - [Physical Rig Layout](#physical-rig-layout)
   - [Dual-Group Choreography & Envelope Comparison](#dual-group-choreography--envelope-comparison)
   - [Group A: Punchy Xenon Staccato Strobe](#group-a-punchy-xenon-staccato-strobe)
   - [Group B: Wide Atmospheric Soft-Fog Bloom](#group-b-wide-atmospheric-soft-fog-bloom)
6. [Specialized Volumetric Ray Shader Pipeline](#6-specialized-volumetric-ray-shader-pipeline)
   - [`PumpkinVolumetricRaysShader`](#pumpkinvolumetricraysshader)
   - [`PumpkinWhiteVuRaysShader`](#pumpkinwhitevuraysshader)
   - [`PumpkinWhiteFoggyRaysShader`](#pumpkinwhitefoggyraysshader)
   - [`PumpkinReflectionRaysShader`](#pumpkinreflectionraysshader)
7. [Mirror Disco Ball Refraction & Caustic Lighting](#7-mirror-disco-ball-refraction--caustic-lighting)
8. [Audio-Reactive Control & Timing Engine](#8-audio-reactive-control--timing-engine)
   - [Beat Phase & Quantization](#beat-phase--quantization)
   - [Frequency Band Splitting & Transient Impulses](#frequency-band-splitting--transient-impulses)
   - [Offbeat Counter-Strobe Guard Logic](#offbeat-counter-strobe-guard-logic)
9. [Physical Hardware Lighting: Philips Hue Integration](#9-physical-hardware-lighting-philips-hue-integration)
10. [Rules & Conventions for Future Lighting Updates](#10-rules--conventions-for-future-lighting-updates)

---

## 1. Architectural Overview

DJ VFX Studio utilizes a dual-tier lighting architecture designed to provide synchronized concert illumination:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DJ VFX STUDIO LIGHTING                          │
├───────────────────────────────────┬────────────────────────────────────┤
│   TIER 1: REAL-TIME 3D STAGE      │    TIER 2: PHYSICAL HARDWARE       │
│   (Three.js WebGL / GLSL Shaders) │    (Philips Hue Entertainment API) │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Procedural moving-head rigs     │ • UDP / REST Hue Bridge sync       │
│ • Directional key & ambient fills │ • CIE 1931 Gamut C color mapping   │
│ • Real SpotLight cones with falloff│ • Hardware deck sync (Pioneer Link,│
│ • Volumetric god-ray sheet meshes │   Denon StageLinQ, Traktor Pro)    │
│ • Custom GLSL smoke/fog shaders   │ • Real-world room kick strobe      │
│ • Specular hit flares & caustics  │ • Coordinated color theme pulses   │
└───────────────────────────────────┴────────────────────────────────────┘
```

The 3D stage avoids brute-force ray-marching volume rendering (which would drop frames on 60fps/120fps live DJ streams) by combining:
1. **Physical Light Emitters**: Three.js `SpotLight`, `PointLight`, and `DirectionalLight` objects projecting real surface illumination onto 3D meshes.
2. **Volumetric Geometry Envelopes**: Multi-plane overlapping translucent sheet geometries (`createMultiPlaneRayGeometry`) oriented along the beam vector.
3. **GLSL Fragment Shaders**: Procedural Gaussian radial falloffs, rolling 3D stage haze turbulence, Mie aerosol scattering, stepped VU ladders, and audio-reactive extinction curves.
4. **Surface Hit Sprites**: Additive starburst and anamorphic lens flares anchored to the exact hit coordinates where beams intercept stage objects.

---

## 2. Coordinate Space & Fixture Articulation

All stage lighting coordinates follow the Three.js right-handed Cartesian coordinate system:
* **$+X$**: Stage Right (Viewer's right)
* **$-X$**: Stage Left (Viewer's left)
* **$+Y$**: Up (Ceiling, hanging truss, chain anchors)
* **$-Y$**: Down (Stage floor, bottom fixture bases)
* **$+Z$**: Downstage / Front (Towards camera / dance floor)
* **$-Z$**: Upstage / Back (Behind performers, backdrop wall)

### Two-Axis Fixture Articulation
Moving-head fixtures are constructed with hierarchical pan/tilt groups matching real DMX motorized yokes:
* **Base Plate / Mount**: Stationary parent anchor in world space.
* **Yoke Group (Pan)**: Rotates about the local $Y$-axis:
  $$\theta_{\text{pan}} = \text{atan2}(d_x, d_z)$$
* **Head Group (Tilt)**: Child of the yoke group, rotated using `lookAt(targetPos)` to point optics toward the designated coordinate.

### Beam Quaternion Alignment
Because volumetric beam meshes originate from a conical vertical geometry model (`(0, -1, 0)`), their orientation in world space is computed using unit vector transformation:
```javascript
const dirNorm = targetPos.clone().sub(headPos).normalize();
const upVec = new THREE.Vector3(0, -1, 0);
beamMesh.quaternion.setFromUnitVectors(upVec, dirNorm);
coreBeamMesh.quaternion.setFromUnitVectors(upVec, dirNorm);
```
Beam lengths are dynamically scaled so they terminate precisely at the contact surface with zero leakage through stage objects:
```javascript
const dist = targetPos.distanceTo(headPos);
beamMesh.scale.set(beamWidthScale, dist / nominalLength, beamWidthScale);
```

---

## 3. Virtual Moving-Head Fixture Engineering

Virtual moving-head luminaires are built using [`createMovingHeadFixture(basePos, scale)`](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/effects.js#L7933).

### Component Breakdown
1. **Base Chassis**: Cylindrical stage-floor mount with dark matte industrial finish (`MeshStandardMaterial({ roughness: 0.85, metalness: 0.4 })`).
2. **Yoke Arm**: Dual-prong cast aluminum bracket that rotates 360° on pan.
3. **Optics Head Housing**: Rounded cylindrical pod housing the emitter, reflector, and internal cooling fins.
4. **Fresnel / Convex Lens Glass**: Specular emissive glass element (`lensMat`) that brightens in sync with beam power.
5. **Lens Corona & Core Disk**: High-intensity inner incandescent center (`lensCoreMat` and `lensCoronaMat`).
6. **LED Accent Rings**: Bezel ring (`bezelLedMat`) and outer halo ring (`ledRingMat`) providing realistic stage gear aesthetic.

---

## 4. Volumetric God-Ray & Laser Beam Simulation

### Multi-Plane Overlapping Sheets (`createMultiPlaneRayGeometry`)
Instead of heavy volumetric voxel buffers, beams use an overlapping sheet geometry constructed from $N$ rotational planes intersecting at the central axis:

```
Top View of Beam Geometry Planes (e.g., 12 Planes @ 15° increments):
                   |
             \     |     /
               \   |   /
                 \ | /
           ------- + -------
                 / | \
               /   |   \
             /     |     \
                   |
```

* **Geometry Function Signature**:
  ```javascript
  createMultiPlaneRayGeometry(numSheets = 6, baseWidth = 0.60, tipWidth = 4.4, length = 22.0)
  ```
* **Dual-Layer Nested Beams**:
  * **Outer Atmosphere Plume**: Wide base and tip width with soft alpha, representing atmospheric Rayleigh/Mie scattering in humid room haze.
  * **Inner Laser/Arc Core**: Narrow, concentrated high-brightness core nested inside the outer beam to create photographic optical density.
* **Render Order & Blending**:
  * `transparent: true`
  * `blending: THREE.AdditiveBlending`
  * `depthWrite: false` (prevents sorting artifacts with other transparent stage elements)
  * `side: THREE.DoubleSide`
  * `renderOrder: 20` (outer shell) and `21` (inner core)

---

## 5. The 5-Fixture Bottom Concert Rig (Pumpkin Disco Ball)

### Physical Rig Layout
The stage floor beneath the centerpiece disco pumpkin features a 5-moving-head array positioned symmetrically at $y = -6.8, z = 5.8$ across a $9.6$-unit stereo spread:

```
Stage Floor Plan (Facing Downstage):

     [Far-Left]       [Mid-Left]        [Center]        [Mid-Right]       [Far-Right]
      x = -4.8         x = -2.4         x = 0.0          x = +2.4          x = +4.8
       Group B          Group A         Group B           Group A           Group B
   (Wide Fog Bloom) (Punchy Strobe) (Wide Fog Bloom) (Punchy Strobe)  (Wide Fog Bloom)
```

Each fixture is instantiated using [`createMiniWhiteSpotSetup()`](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/effects.js#L8293).

---

### Dual-Group Choreography & Envelope Comparison

The 5-light rig is split into two distinct visual groups that alternate on musical beats:

| Attribute | Group A (Mid-Left & Mid-Right) | Group B (Far-Left, Center, Far-Right) |
| :--- | :--- | :--- |
| **Fixtures** | 2 lights ($x = \pm 2.4$) | 3 lights ($x = -4.8, 0.0, +4.8$) |
| **Beat Trigger** | Even beats (Beats 1 & 3: `curBeatIdx % 2 === 0`) | Odd beats (Beats 2 & 4: `curBeatIdx % 2 === 1`) |
| **Visual Character**| Punchy, crisp, mechanical Xenon strobe | Expansive, soft, rolling atmospheric fog bloom |
| **Beam Geometry** | 8 planes, Base: `0.40`, Tip: `2.6` | 12 planes, Base: `0.85`, Tip: `6.2` |
| **Spotlight Cone**| $30^\circ$ (`Math.PI / 6.0`), Penumbra `0.75` | $53^\circ$ (`Math.PI / 3.4`), Penumbra `0.90` |
| **Shader Used** | [`PumpkinWhiteVuRaysShader`](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/effects.js#L406) | [`PumpkinWhiteFoggyRaysShader`](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/effects.js#L513) |
| **Peak Beam Power**| `0.90` | `0.75` (softened for atmospheric balance) |
| **Peak Spot Power**| `1.40` | `1.10` |
| **Cycle Envelope** | Instant snap ON $\rightarrow$ 130ms hold $\rightarrow$ 35ms snap to 0.0 | ~160ms S-curve in $\rightarrow$ 110ms hold $\rightarrow$ 280ms cosine out |
| **Cycle Duration** | $\approx 165\,\text{ms}$ | $\approx 550\,\text{ms}$ |
| **Motion Pattern** | Counter-crossing "X" sweep | 3-beam converging crown / upward fan |

---

### Group A: Punchy Xenon Staccato Strobe

#### Envelope Mechanics
Group A fires with a rapid mechanical shutter curve:
1. **Attack ($0\,\text{ms}$)**: Instantly snaps to $100\%$ intensity upon beat onset ($t=0$).
2. **Hold ($\approx 130\,\text{ms}$)**: Sustains flat $1.0$ intensity (`onDurationA = Math.min(0.16, Math.max(0.11, beatDuration * 0.30))`).
3. **Decay ($35\,\text{ms}$)**: Ultra-fast linear shutter snap directly to complete $0.0$ pitch darkness.
4. **Rest**: Remains at absolute zero until the next even beat, ensuring zero lingering glow between pulses.

#### Motion Sweep
Sweeps laterally across the underneath front surface in counter-directions, forming a crisp crossing "X" beam interaction.

---

### Group B: Wide Atmospheric Soft-Fog Bloom

#### Envelope Mechanics
Group B swells and breathes across musical bars using smooth cosine curves:
$$\text{Fade In } (0 \le t < t_{\text{in}}): \quad I(t) = \frac{1 - \cos\left(\pi \frac{t}{t_{\text{in}}}\right)}{2}$$
$$\text{Hold } (t_{\text{in}} \le t < t_{\text{in}} + t_{\text{hold}}): \quad I(t) = 1.0$$
$$\text{Fade Out } (t_{\text{hold}} \le t < t_{\text{total}}): \quad I(t) = \frac{1 + \cos\left(\pi \frac{t - (t_{\text{in}} + t_{\text{hold}})}{t_{\text{out}}}\right)}{2}$$

* $t_{\text{in}} \approx 160\,\text{ms}$
* $t_{\text{hold}} \approx 110\,\text{ms}$
* $t_{\text{out}} \approx 280\,\text{ms}$
* Total Cycle: $\approx 550\,\text{ms}$

#### Motion Sweep
* **Far-Left ($x = -4.8$)**: Sweeps inward from outer stage left toward center.
* **Center ($x = 0.0$)**: Sweeps vertically upward through the center meridian of the centerpiece.
* **Far-Right ($x = +4.8$)**: Sweeps symmetrically inward from outer stage right toward center.
* Together, they form an expansive 3-beam converging crown / fan.

---

## 6. Specialized Volumetric Ray Shader Pipeline

### `PumpkinVolumetricRaysShader`
* **File Location**: [`src/effects.js:287`](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/effects.js#L287)
* **Role**: Powers the primary left and right bottom moving heads bathing the pumpkin in rich Halloween dual-color tones (Purple/Orange/Lime/Crimson/Cyan).
* **Key Features**:
  * Dynamic UV-based longitudinal attenuation.
  * Multi-harmonic noise simulating convective stage air currents.
  * Real-time audio surge expansion during bass drops and transients.

### `PumpkinWhiteVuRaysShader`
* **File Location**: [`src/effects.js:406`](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/effects.js#L406)
* **Role**: Volumetric beam shader for **Group A** white strobe fixtures.
* **Key Features**:
  * **Stepped VU Meter Ladder**: 16 horizontal segments modulated by `uVuLevel` to produce an illuminated ladder aesthetic.
  * **Tight Gaussian Core**: Narrow lateral falloff ($uDist \times 4.2$) for punchy laser-like sharpness.
  * **Xenon White Tint**: High-purity white balance with delicate blue edge dispersion (`vec3(0.92, 0.95, 1.0)`).

### `PumpkinWhiteFoggyRaysShader`
* **File Location**: [`src/effects.js:513`](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/effects.js#L513)
* **Role**: Volumetric beam shader for **Group B** wide fog fixtures.
* **Key Features**:
  * **3D World-Space Smoke Turbulence**: Dual sine/cosine field (`fogLayer1` and `fogLayer2`) calculating rolling stage fog density in real time.
  * **Mie Scattering Model**: Grazing-angle Fresnel scattering simulating authentic light transport through illuminated aerosol particles.
  * **Expansive Gaussian Aperture**: Broad lateral halo ($uDist \times 1.15$) creating a thick, voluminous stadium plume.
  * **Softened Intensity Capping**: Clamped at `0.36` alpha for rich atmospheric depth without over-saturating the stage.

### `PumpkinReflectionRaysShader`
* **File Location**: [`src/effects.js:602`](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/effects.js#L602)
* **Role**: Simulates secondary light rays bouncing *off* the mirror facets on the front of the disco ball outward toward the audience/camera.
* **Key Features**:
  * Modulated by face surface angles and spotlight sweep proximity.
  * Ignites into high-brightness glints when incoming beams pass directly over specular facets.

---

## 7. Mirror Disco Ball Refraction & Caustic Lighting

Both the traditional **Mirror Disco Ball** (FX 4) and the **Pumpkin Mirror Ball** (FX 20) utilize dynamic multi-light specular models:

### Hanging Hardware & Suspension Architecture
* **Top Mounting Cap & Swivel Eyelet**: Directly attached to the top pole of the mirror ball sphere ($y = 5.16 - 5.48$), consisting of a polished silver chrome collar disk (`discoCapGeo`, $r = 0.72 - 0.98$) and heavy-duty eyelet loop (`TorusGeometry(0.32, 0.08)`).
* **Interlocking Silver Suspension Chain (`discoChainGroup`)**: 17 individually articulated torus chain links (`TorusGeometry(0.28, 0.075)`) forged from polished chrome (`0xdce8fa`, metalness `0.98`, roughness `0.10`).
* **Catenary Suspension Dynamics**: Each link interpolates dynamically between the ball's top eyelet world coordinate and the ceiling flange at $y = 13.5$, maintaining alternating $90^\circ$ link orientations and natural catenary sag (`sagFactor = sin(t0 * PI) * 0.12`).

### Optical Silver / Glass Mirror Model (`MeshPhysicalMaterial`)
* **Refractive Glass Surface**: Optical crown glass clearcoat ($IOR = 1.52$, `clearcoat = 1.0`, `clearcoatRoughness = 0.01`) over silver mirror backing (`color = 0xf0f6ff`, metalness `0.98`, roughness `0.02`).
* **Prismatic Glint & Edge Sheen**: Iridescence coat (`iridescence = 0.22`, $IOR = 1.33$) for subtle rainbow chromatic glints at glancing angles, combined with silver velvet rim sheen (`sheen = 0.30`, `sheenColor = 0xe6f2ff`).
* **Brilliant Stage Pinspots**:
  * Dual focused cool-white / diamond-white pinspots (`dBallKeyLight` at intensity $2.4$, `dBallPinLeft` at intensity $2.2$) striking the facet normals directly.
  * Specular core point emitter (`dBallPointSilver`, intensity $3.2 - 8.7$ on bass drops), creating crisp mirror facet reflections without color bleed.
  * Side neon washes (`dBallCyanLight`, `dBallMagentaLight`) balanced down to subtle ambient fills so the ball maintains its brilliant silver glass identity.

### Rotating Floor Fire Pit Hearth Embers (`BonfireFloorEmbersShader`)
Replacing disco floor stars with an authentic glowing fire pit bed that rotates gracefully across the stage floor:
* **Fire Pit Geometry & Clustering**:
  * 500 ember coals distributed across a radial power curve ($r = 1.4 + \text{rand}^{1.35} \times 24.0$), concentrating a dense glowing hearth directly beneath the pumpkin while scattering glowing coals across the stage.
  * Driven by [`BonfireFloorEmbersShader`](src/effects.js): uses the shared procedural `bonfireEmberTex` rather than harsh starburst sprites.
* **Palette & Dynamic Heat Shimmer**:
  * Curated fire pit palette: molten gold-amber (`#ffbb33`), vivid flame orange (`#ff8500`), burning ember orange (`#ff5500`), deep fiery orange-red (`#ff3d00`), and smoldering red-amber coals (`#ee2800`).
  * Individual subtle breathing flicker (`aFlickerSpeed`, `aFlickerPhase`) simulating coals glowing gently with natural oxygen flow.
* **Varying Particle Sizes**:
  * Distributed across three natural tiers matching real embers: small glowing sparks (`0.36 - 0.52`), medium fire pit embers (`0.54 - 0.76`), and larger glowing coals (`0.78 - 1.00`).
* **Motion & Beat Reactivity**:
  * Revolves smoothly on the $Y$-axis (`pumpkinFloorSpots.rotation.y = pumpkinPivot.rotation.y * 1.25`), creating a mesmerizing swirling fire pit hearth effect.
  * Uniforms `uBass` and `uKick` gently expand ember size and luminance on bass drops (`sizePulse = 1.0 + uBass * 0.18 + uKick * 0.22`).

### Bonfire Night Floating Fire Embers (`BonfireNightEmbersShader`)
Designed for Halloween and November 5th (Bonfire Night / Guy Fawkes) stage atmospheres, replacing generic stars/dots with an authentic, physical bonfire ember simulation:
* **Procedural Incandescent Ember Texture (`bonfireEmberTex`)**:
  * Generated on a procedural 2D canvas with multi-stop radial thermal gradient.
  * White-hot molten core (`rgba(255, 255, 245, 1.0)`) $\rightarrow$ bright yellow-amber (`rgba(255, 215, 75, 0.95)`) $\rightarrow$ vivid flame orange (`rgba(255, 115, 20, 0.75)`) $\rightarrow$ deep smoldering crimson (`rgba(215, 35, 5, 0.35)`) $\rightarrow$ thermal smoke falloff.
* **Thermal Altitude Cooling Pipeline**:
  * As embers drift upward from the firebed ($y = -9$) into the night sky ($y = +14$), they dynamically cool down in real time:
    * **Low Altitude ($-9$ to $-2$)**: Incandescent white-gold sparks.
    * **Mid Altitude ($-2$ to $+5$)**: Radiant flame orange cinders.
    * **High Altitude ($+5$ to $+14$)**: Smoldering deep ruby embers cooling into dark charcoal ash before gently fading out.
* **Thermal Convection & Draft Physics**:
  * **Gentle Loft Speed**: Tuned to subtle buoyancy ($1.35\times$ convection rate instead of rapid bullet particles).
  * **Meandering Draft Swirl**: Each ember possesses unique drift frequency and phase offsets, undulating horizontally along smooth sine/cosine warm air drafts.
  * **Thermal Bass Updraft**: Deep kick transients deliver a subtle convective lift surge (`smoothedBass * 0.25 + pumpkinKickThump * 0.35`), simulating hot air expanding above the firebed.
* **Enlarged Particle Sizes & Independent Shimmer**:
  * Scaled-up particle size tiers for prominent visual presence: fine flying sparks (`0.46 - 0.70`), medium burning cinders (`0.78 - 1.13`), and large glowing flakes of burning wood (`1.18 - 1.66`).
  * Perspective depth attenuation (`clamp(170.0 / distToCam, 0.45, 5.0)`) ensuring substantial 3D volume.
  * Independent oxygen-draft flicker rates (`aFlickerSpeed`, `aFlickerPhase`) simulating air turbulence stoking individual coals.

---

## 8. Audio-Reactive Control & Timing Engine

All stage lights are driven in real time by the centralized audio engine in [`src/audio.js`](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/audio.js) and the VFX loop:

### Beat Phase & Quantization
```javascript
const beatFrac = audio.beatFrac || 0.0;     // 0.0 at beat strike, 1.0 at next beat
const curBeatIdx = audio.beatIndex || 0;    // Monotonically increasing beat integer
const beatDuration = 60.0 / currentBPM;     // Beat period in seconds
```

### Frequency Band Splitting & Transient Impulses
1. **Sub-Bass & Bass ($20 - 250\,\text{Hz}$)**:
   * Drives mechanical fixture kick-thump (`pumpkinKickThump`).
   * Governs floor caustic spread and internal flame surge.
2. **Midrange & Snares ($250\,\text{Hz} - 4\,\text{kHz}$)**:
   * Analyzed via $\Delta_{\text{mid}}$ spectral flux to detect crisp snare cracks, claps, and rimshots.
3. **Treble ($4\,\text{kHz} - 20\,\text{kHz}$)**:
   * Drives surface sparkle glint flares (`treblePop`).

### Offbeat Counter-Strobe Guard Logic
To allow drum fills and syncopated snare claps to flash the lights without causing spastic fluttering or overlapping envelopes:
```javascript
// Offbeat drum trigger requires previous strobe/fade to have progressed:
const isOffbeatDrum = timeSinceLastStrobeA > 0.20 && 
                      timeSinceLastStrobeB > 0.45 && 
                      (isDeepKick || isSnareCrack || audio.isOnset);

if (isNewBeat) {
    if (curBeatIdx % 2 === 0) {
        pumpkinWhiteLightOnTimeA = elapsedTime; // Group A on even beats
        pumpkinWhiteLightLastGroup = 'A';
    } else {
        pumpkinWhiteLightOnTimeB = elapsedTime; // Group B on odd beats
        pumpkinWhiteLightLastGroup = 'B';
    }
} else if (isOffbeatDrum) {
    // Ping-pong to alternate group on offbeat drums
    if (pumpkinWhiteLightLastGroup === 'A') {
        pumpkinWhiteLightOnTimeB = elapsedTime;
        pumpkinWhiteLightLastGroup = 'B';
    } else {
        pumpkinWhiteLightOnTimeA = elapsedTime;
        pumpkinWhiteLightLastGroup = 'A';
    }
}
```

---

## 9. Physical Hardware Lighting: Philips Hue Integration

In addition to 3D WebGL fixtures, DJ VFX Studio controls physical room lighting through the backend service [`server/hue-service.js`](file:///Users/jarikuhanen/agy/dj-vfx-studio/server/hue-service.js):

### Hardware Bridge Operation
* **Auto-Discovery**: Locates Philips Hue Bridges on local Wi-Fi/Ethernet via SSDP and mDNS (`_hue._tcp.local`).
* **CIE 1931 Gamut C Color Translation**:
  Hex RGB colors from the active visualizer theme are mathematically converted into CIE $x,y$ chromaticity coordinates:
  $$\begin{bmatrix} X \\ Y \\ Z \end{bmatrix} = \mathbf{M}_{\text{sRGB}\to\text{XYZ}} \begin{bmatrix} R \\ G \\ B \end{bmatrix}$$
  $$x = \frac{X}{X + Y + Z}, \quad y = \frac{Y}{X + Y + Z}$$
* **Low-Latency Strobe Batches**:
  * Beat pulses from hardware CDJs (Pioneer Pro DJ Link UDP port 50002) send immediate REST flash packets.
  * Transitions use custom transition times (`transitiontime: 1` = 100ms) to ensure responsive physical lighting.

---

## 10. Rules & Conventions for Future Lighting Updates

When adding new lighting fixtures, modifying shaders, or tweaking timing envelopes, developers and AI agents **MUST** follow these engineering standards:

1. **Maintain This Guide**:
   * Any change in fixture count, positions, angles, shaders, or envelope equations must be updated in `LIGHTING_GUIDE.md` in the same commit.
2. **Never Use Uncapped Linear Blending**:
   * All volumetric ray shaders must clamp their output alpha (typically $\le 0.40$ for soft haze, $\le 0.60$ for thick fog) to avoid blowing out the screen into white noise when multiple beams cross.
3. **Always Separate Outer Shell and Inner Core**:
   * Realistic stage volumetrics require at least two geometry layers: a wide, soft outer atmosphere mesh and a concentrated inner core beam.
4. **Enforce Complete 0.0 Darkness in Strobe Off-States**:
   * When designing strobe envelopes, ensure the off-state returns to complete `0.0` darkness. Avoid leaving baseline intensities on strobes, or the light will look continuously active rather than rhythmic.
5. **Respect Additive Blending Render Orders**:
   * Volumetric beams and flares must have `depthWrite: false` and explicit `renderOrder` (e.g., beams at `20-21`, hit flares at `23`, convergence flares at `25`) to prevent transparency occlusion bugs.
6. **Audio Reactivity Must Be Filtered**:
   * Always smooth raw audio signals using delta decay rates or raised-cosine windows. Never plug raw audio amplitude directly into light orientation or angles, which produces harsh camera/beam jitter.
