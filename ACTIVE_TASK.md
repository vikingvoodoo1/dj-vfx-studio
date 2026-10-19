# Active Task State (Anchor File)

## 1. Current Active Goal
- **User Prompt**: "why is there a console button in the left panel at the bottom that has a pumpkin inside it? if I press it nothing happens. If we dont need it remove it. Also for the pumpkin disco scene - I have decided my pumpkin looks too squashed - can you make it less squashed and more the size and shape of a real pumpkin in profile"
- **Tasks**:
  1. Remove unused `#btn-theme-halloween` button from bottom of left activity bar in `index.html` and clean up handlers in `src/main.js`. (DONE)
  2. Redesign `createPumpkinDiscoGeometry` and stem/chain anchoring in `src/effects.js` to eliminate the squashed aspect ratio and achieve a natural, authentic round pumpkin profile. (DONE)
- **Status**: **COMPLETED & VERIFIED**

## 2. Root Causes Identified & Resolved
1. **`nightclubPass` Vignette Multiplier (`smoothstep(1.35, 0.42, dist)`)**:
   - Every single frame was being multiplied by a fixed radial vignette centered at (0.5, 0.5), darkening the edges and crushing dark gradients into stepped, concentric quantized rings.
   - **Fix**: Added uniform `uVignette: { value: 1.0 }`. Set `uVignette = 0.0` for Scene 22 (`direct` and `ultra` modes), eliminating the vignette distortion entirely.
2. **`bloomPass` UnrealBloom Mip Blur Composite**:
   - Bloom downsampled the 1080p frame into low-resolution mip buffers and blurred them back across the screen, softening crisp neon lines and injecting 8-bit mip dithering artifacts.
   - **Fix**: Disabled `bloomPass` during Scene 22 in `ultra` and `direct` modes (`targetBloom = 0.0`).
3. **Double Gamma / sRGB Transfer & ACES Filmic Distortion**:
   - Marking `videoTexA.colorSpace = THREE.SRGBColorSpace` while rendering through `EffectComposer` with ACES filmic tone mapping caused dark gradients to be severely clipped and band.
   - **Fix**: Video textures set to `THREE.NoColorSpace`. Added `uLinearOutput: { value: 0.0 }` to `cinemaScreenShaderMat`. Direct WebGL rendering (`renderer.render(scene, camera)`) bypasses composer passes and tone mapping entirely.
4. **Direct Hardware Surface Mode (`direct`)**:
   - Added native `<video id="vfx-direct-video-overlay">` inside `#canvas-container` running directly on macOS VideoToolbox/Metal hardware decoding (`z-index: 0`, `object-fit: contain`).
   - WebGL canvas rendered with clear color alpha 0.0 (`z-index: 1; pointer-events: none;`), enabling floating 3D DJ branding over a native hardware video layer matching VLC bit-for-bit.
5. **Clarity Engines Functional Separation**:
   - `⚡ Direct Hardware Overlay`: 100% native video playback via HTML5/VideoToolbox/Metal; 0 post-processing.
   - `💎 Ultra-HD (VLC Match)`: Direct WebGL pipeline (0 bloom, 0 vignette, direct native DPR, raw sRGB pass-through) supporting 3D transitions.
   - `🔮 Nightclub FX`: Creative nightclub post-fx with bloom, vignette, and filmic tonemapping.
6. **Startup Scene URL Bug Fixed**:
   - Fixed missing `const urlParams = new URLSearchParams(window.location.search);` in `src/main.js` so `?fx=22` or `?scene=23` correctly loads Scene 23 on startup.

## 3. Verification
- Side-by-side comparison verified against VLC playback (`scratch/before_after_quality_comparison.png`).
- Live Chrome tab verified running `?fx=22` with smooth gradients and razor-sharp lines.
- Headless Electron verification script (`scratch/verify_quality_modes.cjs`) verified switching between all 3 clarity engines without errors.
