import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Custom Nightclub FX Shader (Dynamic Chromatic Aberration, Strobe Flash & Bass Drop Glitch)
const NightclubPostFX = {
    uniforms: {
        tDiffuse: { value: null },
        uAberration: { value: 0.0 },
        uGlitch: { value: 0.0 },
        uFlash: { value: 0.0 },
        uTime: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uAberration;
        uniform float uGlitch;
        uniform float uFlash;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
            vec2 center = vec2(0.5, 0.5);
            vec2 uv = vUv;

            if (uGlitch > 0.02) {
                float slice = floor(uv.y * 32.0);
                float sliceNoise = fract(sin(slice * 183.35 + floor(uTime * 45.0)) * 43758.5453);
                if (sliceNoise > 0.72) {
                    uv.x += (sliceNoise - 0.5) * uGlitch * 0.06;
                }
            }

            vec2 offset = (uv - center) * (uAberration * 0.025);

            float r = texture2D(tDiffuse, uv + offset).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - offset).b;
            vec3 color = vec3(r, g, b);

            float dist = distance(vUv, center);
            float vignette = smoothstep(1.35, 0.42, dist);
            color *= vignette;

            // Smooth additive full-screen flash on light hit (preserves 3D depth and prevents blank washouts)
            color += vec3(clamp(uFlash, 0.0, 1.0) * 0.75);

            gl_FragColor = vec4(color, 1.0);
        }
    `
};

// High-Contrast Luma-Keyed Logo Shader for Razor-Sharp Visibility
const HighClarityLogoShader = {
    uniforms: {
        map: { value: null },
        uOpacity: { value: 1.0 },
        uContrast: { value: 1.35 },
        uBrightness: { value: 1.05 },
        uLumaCutoff: { value: 0.08 },
        uLumaSmooth: { value: 0.06 },
        uBlendMode: { value: 0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D map;
        uniform float uOpacity;
        uniform float uContrast;
        uniform float uBrightness;
        uniform float uLumaCutoff;
        uniform float uLumaSmooth;
        uniform int uBlendMode;
        varying vec2 vUv;

        void main() {
            vec4 texColor = texture2D(map, vUv);

            vec3 col = texColor.rgb;
            col = (col - 0.5) * uContrast + 0.5 + (uBrightness - 1.0);
            col = clamp(col, 0.0, 1.3);

            float luma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
            float alpha = texColor.a;

            if (uBlendMode == 0) {
                float key = smoothstep(uLumaCutoff, uLumaCutoff + uLumaSmooth, luma);
                alpha = alpha * key * uOpacity;
            } else if (uBlendMode == 1) {
                alpha = alpha * uOpacity;
            } else {
                alpha = alpha * uOpacity;
            }

            if (alpha < 0.005) discard;

            gl_FragColor = vec4(col, alpha);
        }
    `
};

// Volumetric Laser Beam Shader (Ultra-Vivid Saturated Color)
const VolumetricLaserShader = {
    uniforms: {
        uColor: { value: new THREE.Color(0x00ffff) },
        uCoreIntensity: { value: 2.5 },
        uGlowIntensity: { value: 1.2 },
        uPulse: { value: 0.0 },
        uTime: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uCoreIntensity;
        uniform float uGlowIntensity;
        uniform float uPulse;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
            float dist = abs(vUv.x - 0.5) * 2.0;
            float core = pow(clamp(1.0 - dist, 0.0, 1.0), 16.0) * (1.0 + uPulse * 2.8);
            float glow = pow(clamp(1.0 - dist, 0.0, 1.0), 2.2);
            float lengthFade = smoothstep(0.0, 0.035, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
            float wave = sin(vUv.y * 36.0 - uTime * 24.0) * 0.12 + 0.88;
            
            vec3 finalCol = uColor * (1.3 + uPulse * 1.8);
            if (core > 0.88) {
                finalCol = mix(finalCol, vec3(1.0, 1.0, 1.0), 0.28);
            }

            float alpha = (core * uCoreIntensity + glow * uGlowIntensity) * lengthFade * wave;
            if (alpha < 0.005) discard;
            gl_FragColor = vec4(finalCol * alpha, alpha);
        }
    `
};

// Saber DJ Multi-Beam Collimated Blade Shader (Ultra-Vivid Neon)
const SaberBeamBladeShader = {
    uniforms: {
        uColor: { value: new THREE.Color(0x00ffff) },
        uIntensity: { value: 1.0 },
        uCoreBoost: { value: 2.8 },
        uTime: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uCoreBoost;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
            float dist = abs(vUv.x - 0.5) * 2.0;
            float blade = pow(clamp(1.0 - dist, 0.0, 1.0), 5.5);
            float core = pow(clamp(1.0 - dist, 0.0, 1.0), 24.0) * uCoreBoost;
            float lengthFade = smoothstep(0.0, 0.025, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
            float shimmer = sin(vUv.y * 40.0 - uTime * 30.0) * 0.1 + 0.9;
            
            vec3 col = uColor * (1.2 + uIntensity * 1.5);
            if (core > 0.90) {
                col = mix(col, vec3(1.0, 1.0, 1.0), 0.25);
            }

            float alpha = (blade * 1.2 + core * 1.6) * lengthFade * shimmer * uIntensity;
            if (alpha < 0.005) discard;
            gl_FragColor = vec4(col * alpha, alpha);
        }
    `
};

// Volumetric Pinspot Beam Shader (Physical Light Ray with Atmospheric Fog, Sharp Core & Impact Bloom)
const VolumetricPinspotShader = {
    uniforms: {
        uColor: { value: new THREE.Color(0x00ffff) },
        uCoreColor: { value: new THREE.Color(0xffffff) },
        uIntensity: { value: 1.0 },
        uShine: { value: 0.0 },
        uTime: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vViewDir;

        void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vNormal = normalize(normalMatrix * normal);
            vViewDir = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uCoreColor;
        uniform float uIntensity;
        uniform float uShine;
        uniform float uTime;

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vViewDir;

        void main() {
            // Transverse / Volumetric rim-to-core falloff (Fresnel / limb integration)
            float limb = 1.0 - abs(dot(vViewDir, vNormal));
            float softHaze = pow(limb, 1.6);
            float hotCore = pow(limb, 7.5);

            // Longitudinal position along the beam: 0.0 (fixture lens) to 1.0 (disco ball surface)
            float y = vUv.y;

            // 1. Exponential source emission near fixture lens
            float sourceFlare = exp(-y * 5.2) * 3.4;

            // 2. Atmospheric column haze decay through air
            float columnHaze = pow(1.0 - y * 0.32, 1.4);

            // 3. Impact hit bloom where beam strikes the mirror ball (y -> 1.0)
            float hitZone = smoothstep(0.68, 0.98, y);
            float hitBloom = pow(hitZone, 2.8) * (2.6 + uShine * 4.5);

            // 4. Procedural Atmospheric Smoke / Fog turbulence drifting through beam
            float fog1 = sin(vWorldPos.x * 0.85 + vWorldPos.y * 1.1 + uTime * 2.4) * cos(vWorldPos.z * 0.85 - uTime * 1.8);
            float fog2 = sin(vWorldPos.y * 2.2 - uTime * 3.5) * cos(vWorldPos.x * 1.5 + vWorldPos.z * 1.5);
            float fogDrift = 0.80 + 0.20 * (fog1 * 0.6 + fog2 * 0.4);

            // 5. Sparkling micro-dust particles catching the high-intensity light
            float dustSeed = dot(floor(vWorldPos * 6.5), vec3(12.9898, 78.233, 45.5432));
            float dust = pow(fract(sin(dustSeed) * 43758.5453), 32.0);
            float dustGlow = dust * (0.9 + uShine * 2.4) * (1.0 - y * 0.4);

            // Total alpha composition
            float longProfile = sourceFlare + columnHaze + hitBloom;
            float alpha = (softHaze * 0.65 + hotCore * 0.75) * longProfile * fogDrift * (0.38 + uShine * 0.62);
            alpha += dustGlow * 0.35;
            alpha *= uIntensity;

            if (alpha < 0.003) discard;

            // Color blending: saturated neon at edges, brilliant white-hot at core and impact
            float coreBlend = clamp(hotCore * 0.85 + hitBloom * 0.45 + sourceFlare * 0.5 + uShine * 0.4, 0.0, 1.0);
            vec3 finalColor = mix(uColor, uCoreColor, coreBlend) * (1.0 + uShine * 2.2);

            gl_FragColor = vec4(finalColor * alpha, clamp(alpha, 0.0, 1.0));
        }
    `
};

// -------------------------------------------------------------------------
// Volumetric Shaded God Rays Shader (FX 22: Incoming Beams to Front Face)
// Wide, Graceful Profile that Dynamically Thins Out with Intensity
// -------------------------------------------------------------------------
const PumpkinVolumetricRaysShader = {
    uniforms: {
        uColor: { value: new THREE.Color(0xff66cc) },
        uCoreColor: { value: new THREE.Color(0xffffff) },
        uIntensity: { value: 1.0 },
        uTime: { value: 0.0 },
        uTimeSpeed: { value: 0.08 },
        uNoiseScale: { value: 2.8 },
        uPulse: { value: 0.0 },
        uShimmer: { value: 0.4 },
        uTreble: { value: 0.0 },
        uHit: { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalLocal;
        varying vec3 vPositionWorld;
        varying vec3 vViewDir;

        void main() {
            vUv = uv;
            vNormalLocal = normal;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vPositionWorld = worldPos.xyz;
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uCoreColor;
        uniform float uIntensity;
        uniform float uTime;
        uniform float uTimeSpeed;
        uniform float uNoiseScale;
        uniform float uPulse;
        uniform float uShimmer;
        uniform float uTreble;
        uniform float uHit;

        varying vec2 vUv;
        varying vec3 vNormalLocal;
        varying vec3 vPositionWorld;
        varying vec3 vViewDir;

        void main() {
            // 1. Organic Beam Core & Lateral Gaussian Profile
            float normIntensity = clamp(uIntensity / 2.5, 0.25, 2.0);
            float widthFactor = 0.90 + normIntensity * 0.35;
            float uDist = abs(vUv.x - 0.5) * 2.0; // 0.0 at spine, 1.0 at outer edge
            float uDistThinned = uDist * widthFactor;
            float y = vUv.y; // 0.0 at fixture lens, 1.0 at target tip

            // Core concentration and outer atmospheric haze
            float coreTightness = mix(5.2, 2.6, y);
            float hotCore = exp(-pow(uDistThinned * coreTightness, 2.0));
            float haloTightness = mix(2.4, 1.4, y);
            float lateralGaussian = exp(-pow(uDistThinned * haloTightness, 2.0));

            // 2. Smooth Dome / Parabolic Tip Dissipation:
            // Ensures the beam tip dissolves into a soft, round mist envelope with ZERO triangular or straight-edge cutoffs
            float tipProgress = max(0.0, (y - 0.30) / 0.70); // 0 at y=0.30, 1 at y=1.0
            float tipDomeDist = length(vec2(uDist * 1.5, tipProgress));
            float domeSoftFade = smoothstep(1.0, 0.15, tipDomeDist);

            // Longitudinal shaft dissipation along length:
            float originGlow = exp(-y * 5.0) * 2.5;

            // When beam drifts off pumpkin (uHit -> 0), shaft dissolves completely into thin air
            // When beam lands on pumpkin (uHit -> 1), it maintains shaft continuity up to the landing spot
            float shaftDissipation = (1.0 - smoothstep(0.25, 0.95, y)) * domeSoftFade;
            float shaftBody = smoothstep(0.015, 0.10, y) * shaftDissipation;

            // Localized impact landing hotspot on pumpkin mirror facets (0 when off pumpkin)
            float hitFactor = clamp(uHit, 0.0, 1.0);
            float impactHotspot = exp(-pow((1.0 - y) * 5.5, 2.0)) * exp(-pow(uDist * 3.8, 2.0)) * 1.5 * hitFactor;

            // God-Ray Shaft Striations across the blade width
            float shaft1 = sin(vUv.x * 24.0 + uTime * 0.95 + y * 6.0) * 0.5 + 0.5;
            float shaft2 = cos(vUv.x * 40.0 - uTime * 1.35 - y * 8.0) * 0.5 + 0.5;
            float godRayShafts = 0.75 + 0.25 * (shaft1 * 0.6 + shaft2 * 0.4);

            float beamCross = (lateralGaussian * 0.60 + hotCore * 1.40) * godRayShafts;

            // 3. Volumetric Depth & View-Facing Grazing Glow
            float viewFacing = abs(dot(vViewDir, normalize(vNormalLocal)));
            float viewGlow = 0.78 + 0.22 * (1.0 - viewFacing);

            // 4. Drifting atmospheric haze and subtle wispy smoke along beam path
            float smokeWisp1 = sin(vPositionWorld.x * 0.25 + vPositionWorld.y * 0.35 + uTime * 0.45) * 0.12;
            float smokeWisp2 = cos(vPositionWorld.z * 0.30 - uTime * 0.40 + y * 4.0) * 0.12;
            float fogAtmosphere = 0.88 + smokeWisp1 + smokeWisp2;

            float longProfile = (originGlow + shaftBody * 1.15 + impactHotspot) * fogAtmosphere;

            // 5. Mie Forward Scattering & Atmospheric Dust Shading
            float dustMotes1 = sin(vPositionWorld.x * 0.35 + vPositionWorld.y * 0.45 + uTime * 0.60) * 
                               cos(vPositionWorld.z * 0.35 - uTime * 0.50);
            float dustHaze = 0.90 + 0.10 * dustMotes1;

            // 6. Total Alpha Composition
            float baseAlpha = beamCross * viewGlow * longProfile * dustHaze;
            float alpha = baseAlpha * (0.85 + uPulse * 0.35 + uTreble * 0.25) * uIntensity;
            if (alpha < 0.001) discard;

            // 7. Color Composition with Rich True Color Saturation & Luminous Core
            float coreBlend = clamp(hotCore * 0.85 + originGlow * 0.25 + impactHotspot * 0.30 + uPulse * 0.15, 0.0, 1.0);
            vec3 saturatedColor = uColor * 1.25;
            vec3 saturatedCore = mix(uCoreColor, uColor, 0.25) * 1.20;
            vec3 finalColor = mix(saturatedColor, saturatedCore, coreBlend * 0.45) * (1.0 + uPulse * 0.25 + uTreble * 0.15);

            gl_FragColor = vec4(finalColor * alpha, clamp(alpha, 0.0, 1.0));
        }
    `
};

// -------------------------------------------------------------------------
// Volumetric White Godrays with VU Meter Segmented Stepping & Ballistics (FX 22)
// -------------------------------------------------------------------------
const PumpkinWhiteVuRaysShader = {
    uniforms: {
        uColor: { value: new THREE.Color(0xffffff) },
        uCoreColor: { value: new THREE.Color(0xffffff) },
        uIntensity: { value: 1.0 },
        uTime: { value: 0.0 },
        uVuLevel: { value: 0.0 },
        uPulse: { value: 0.0 },
        uTreble: { value: 0.0 },
        uHit: { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalLocal;
        varying vec3 vPositionWorld;
        varying vec3 vViewDir;

        void main() {
            vUv = uv;
            vNormalLocal = normal;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vPositionWorld = worldPos.xyz;
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uCoreColor;
        uniform float uIntensity;
        uniform float uTime;
        uniform float uVuLevel;
        uniform float uPulse;
        uniform float uTreble;
        uniform float uHit;

        varying vec2 vUv;
        varying vec3 vNormalLocal;
        varying vec3 vPositionWorld;
        varying vec3 vViewDir;

        void main() {
            // Longitudinal coordinate: y=0 at fixture lens at bottom, y=1.0 at pumpkin underneath front
            float y = vUv.y;
            float uDist = abs(vUv.x - 0.5) * 2.0; // 0.0 at beam centerline, 1.0 at lateral edge

            // 1. Softer VU Meter Stepped Ladder Segments
            // Subtle, silky division lines with no harsh stark stripes
            float rungFrequency = 16.0;
            float rungFrac = fract(y * rungFrequency);
            float rungMask = smoothstep(0.12, 0.22, rungFrac) * (1.0 - smoothstep(0.78, 0.88, rungFrac));
            // Gentle contrast: 0.75 in gaps, 1.15 in bars (smooth & refined)
            float ladderSegment = mix(0.75, 1.15, rungMask);

            // 2. VU Meter Dynamic Height / Reach:
            float activeVuHeight = clamp(0.35 + uVuLevel * 0.65, 0.35, 1.0);
            float vuReach = smoothstep(activeVuHeight + 0.16, activeVuHeight - 0.05, y);

            // Subtle, delicate peak sheen (no harsh incandescence)
            float peakSpike = exp(-pow(abs(y - activeVuHeight) * 6.5, 2.0)) * uVuLevel * 0.35;

            // 3. Wide, Soft Atmospheric Profile (Graceful, silky gaussian envelope)
            float coreTightness = mix(4.2, 2.2, y);
            float hotCore = exp(-pow(uDist * coreTightness, 2.0)) * 0.55;
            float lateralHalo = exp(-pow(uDist * 1.8, 2.0)) * 0.45;

            // Origin lens glow (gentle, soft)
            float originGlow = exp(-y * 5.0) * 0.75;

            // Soft contact sheen on underneath pumpkin facets
            float hitFactor = clamp(uHit, 0.0, 1.0);
            float impactHotspot = exp(-pow((1.0 - y) * 4.0, 2.0)) * exp(-pow(uDist * 2.5, 2.0)) * 0.75 * hitFactor;

            // Delicate atmospheric striations
            float rayNoise = sin(vUv.x * 24.0 + uTime * 1.5 + y * 6.0) * 0.5 + 0.5;
            float striations = 0.88 + 0.12 * rayNoise;

            float beamCross = (lateralHalo + hotCore) * striations * ladderSegment;

            // View-facing grazing glow
            float viewFacing = abs(dot(vViewDir, normalize(vNormalLocal)));
            float viewGlow = 0.85 + 0.15 * (1.0 - viewFacing);

            // Atmospheric smoke motes
            float motes = 0.95 + 0.05 * sin(vPositionWorld.y * 1.2 + uTime * 0.6);

            // Soft shaft body
            float shaftBody = smoothstep(0.02, 0.10, y) * vuReach * 0.60;
            float longProfile = (originGlow * 0.75 + shaftBody + impactHotspot * 0.70 + peakSpike * 0.45) * motes;

            // Controlled, soft atmospheric alpha (capped at 0.32 for pure silky haze)
            float rawAlpha = beamCross * viewGlow * longProfile * uIntensity * 0.36;
            float alpha = clamp(rawAlpha, 0.0, 0.32);
            if (alpha < 0.001) discard;

            // Warm, soft Xenon white with gentle luminance (never harsh or blown out)
            vec3 softWhite = vec3(0.92, 0.95, 1.0);
            vec3 finalColor = softWhite * 0.85;

            gl_FragColor = vec4(finalColor * alpha, alpha);
        }
    `
};

// -------------------------------------------------------------------------
// Wide Shaded Bright-Foggy White Rays Shader (Group B Bottom Spotlights)
// -------------------------------------------------------------------------
const PumpkinWhiteFoggyRaysShader = {
    uniforms: {
        uColor: { value: new THREE.Color(0xffffff) },
        uCoreColor: { value: new THREE.Color(0xffffff) },
        uIntensity: { value: 1.0 },
        uTime: { value: 0.0 },
        uVuLevel: { value: 0.0 },
        uPulse: { value: 0.0 },
        uTreble: { value: 0.0 },
        uHit: { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalLocal;
        varying vec3 vPositionWorld;
        varying vec3 vViewDir;

        void main() {
            vUv = uv;
            vNormalLocal = normal;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vPositionWorld = worldPos.xyz;
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uCoreColor;
        uniform float uIntensity;
        uniform float uTime;
        uniform float uVuLevel;
        uniform float uPulse;
        uniform float uTreble;
        uniform float uHit;

        varying vec2 vUv;
        varying vec3 vNormalLocal;
        varying vec3 vPositionWorld;
        varying vec3 vViewDir;

        void main() {
            float y = vUv.y;
            float uDist = abs(vUv.x - 0.5) * 2.0; // 0.0 at beam centerline, 1.0 at outer edge

            // 1. Shaded Volumetric Fog Density & Turbulence (Rolling atmospheric stage fog)
            float fogLayer1 = sin(vPositionWorld.y * 1.5 + uTime * 1.2 + vUv.x * 6.0);
            float fogLayer2 = cos(vPositionWorld.x * 1.2 - uTime * 0.8 + y * 8.0);
            float fogNoise = 0.80 + 0.20 * (fogLayer1 * 0.5 + fogLayer2 * 0.5);

            // Subtle vertical striations inside the fog plume
            float fineRays = sin(vUv.x * 32.0 + uTime * 0.9 + y * 4.0) * 0.5 + 0.5;
            float striations = 0.86 + 0.14 * fineRays;

            // 2. Wide Gaussian Fog Aperture Envelope (Broad, volumetric plume)
            float fogHalo = exp(-pow(uDist * 1.15, 2.0)) * 0.70;
            float fogCore = exp(-pow(uDist * 2.4, 2.0)) * 0.60;
            float beamCross = (fogHalo + fogCore) * fogNoise * striations;

            // 3. Volumetric Mie Forward/Backward Light Scattering (Rich volumetric shading)
            float viewFacing = abs(dot(vViewDir, normalize(vNormalLocal)));
            float mieScattering = 0.75 + 0.25 * pow(1.0 - viewFacing, 1.4);

            // 4. Longitudinal Shaft Profile (Smooth origin, dense bright foggy body, soft contact)
            float originGlow = exp(-y * 3.8) * 0.85;
            float shaftBody = smoothstep(0.01, 0.12, y) * (1.0 - smoothstep(0.85, 1.02, y)) * 0.80;
            float hitFactor = clamp(uHit, 0.0, 1.0);
            float impactGlow = exp(-pow((1.0 - y) * 3.2, 2.0)) * exp(-pow(uDist * 1.8, 2.0)) * 0.90 * hitFactor;
            
            float longProfile = (originGlow * 0.85 + shaftBody + impactGlow * 0.75);

            // 5. Soft Shaded Foggy Opacity
            float rawAlpha = beamCross * mieScattering * longProfile * uIntensity * 0.40;
            float alpha = clamp(rawAlpha, 0.0, 0.36);
            if (alpha < 0.001) discard;

            // Luminous, pristine bright Xenon white fog color
            vec3 brightFogWhite = vec3(0.96, 0.98, 1.0);
            vec3 coreWhite = vec3(1.0, 1.0, 1.0);
            vec3 finalColor = mix(brightFogWhite, coreWhite, fogCore * 0.40);

            gl_FragColor = vec4(finalColor * alpha, alpha);
        }
    `
};

// -------------------------------------------------------------------------
// Specular Reflected Rays Shader (FX 22: Light Bouncing OFF Front Glass Mirror Facets)
// -------------------------------------------------------------------------
const PumpkinReflectionRaysShader = {
    uniforms: {
        uColor: { value: new THREE.Color(0xff66cc) },
        uCoreColor: { value: new THREE.Color(0xffffff) },
        uIntensity: { value: 1.0 },
        uTime: { value: 0.0 },
        uPulse: { value: 0.0 },
        uTreble: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalLocal;
        varying vec3 vPositionWorld;
        varying vec3 vViewDir;

        void main() {
            vUv = uv;
            vNormalLocal = normal;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vPositionWorld = worldPos.xyz;
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uCoreColor;
        uniform float uIntensity;
        uniform float uTime;
        uniform float uPulse;
        uniform float uTreble;

        varying vec2 vUv;
        varying vec3 vNormalLocal;
        varying vec3 vPositionWorld;
        varying vec3 vViewDir;

        void main() {
            // Lateral profile: wide shimmering reflected god-ray fan that thins with intensity
            float normIntensity = clamp(uIntensity / 3.0, 0.25, 2.5);
            float widthFactor = 0.78 + normIntensity * 0.65;
            float uDist = abs(vUv.x - 0.5) * 2.0;
            float uDistThinned = uDist * widthFactor;

            float lateralGaussian = exp(-pow(uDistThinned * 1.35, 2.0));
            float lateralFeather = smoothstep(1.0, 0.45, uDist);
            float hotCore = exp(-pow(uDistThinned * 3.0, 2.0));

            // Reflected mirror facet shimmer lines
            float shimmer1 = sin(vUv.x * 28.0 - uTime * 1.8 + vUv.y * 8.0) * 0.5 + 0.5;
            float shimmer2 = cos(vUv.x * 48.0 + uTime * 2.2 - vUv.y * 12.0) * 0.5 + 0.5;
            float facetShimmer = 0.60 + 0.40 * (shimmer1 * 0.6 + shimmer2 * 0.4);

            float beamCross = (lateralGaussian * lateralFeather * 0.60 + hotCore * 1.40) * facetShimmer;

            // View grazing boost
            float viewFacing = abs(dot(vViewDir, normalize(vNormalLocal)));
            float viewGlow = 0.70 + 0.30 * (1.0 - viewFacing);

            // Longitudinal: High mirror reflection at pumpkin surface (y=0) -> Dissolves into room fog at tip (y=1)
            float y = vUv.y;
            float bounceOrigin = exp(-y * 3.2) * 2.6;
            float fogTipDissolve = pow(1.0 - smoothstep(0.20, 0.95, y), 1.5);

            float dust = 0.90 + 0.10 * sin(vPositionWorld.x * 0.4 + vPositionWorld.z * 0.4 + uTime * 0.8);
            float longProfile = (bounceOrigin + fogTipDissolve * 1.35) * dust * smoothstep(0.0, 0.02, y);

            float baseAlpha = beamCross * viewGlow * longProfile;
            float alpha = baseAlpha * (0.80 + uPulse * 0.35 + uTreble * 0.25) * uIntensity;
            if (alpha < 0.001) discard;

            float coreBlend = clamp(hotCore * 0.85 + bounceOrigin * 0.35 + uPulse * 0.20, 0.0, 1.0);
            vec3 saturatedColor = uColor * 1.30;
            vec3 saturatedCore = mix(uCoreColor, uColor, 0.30) * 1.25;
            vec3 finalColor = mix(saturatedColor, saturatedCore, coreBlend * 0.40) * (1.0 + uPulse * 0.25 + uTreble * 0.15);

            gl_FragColor = vec4(finalColor * alpha, clamp(alpha, 0.0, 1.0));
        }
    `
};

// -------------------------------------------------------------------------
// Authentic Bonfire Night Glowing Embers Shader (Halloween / Guy Fawkes Nov 5th)
// -------------------------------------------------------------------------
const BonfireNightEmbersShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uTexture: { value: null }
    },
    vertexShader: `
        attribute float aSize;
        attribute float aFlickerSpeed;
        attribute float aFlickerPhase;
        attribute float aHeat;

        uniform float uTime;
        uniform float uBass;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vFlicker;

        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            // Perspective distance attenuation: closer embers look substantial, distant ones look subtle
            float distToCam = max(-mvPosition.z, 0.1);
            float depthScale = clamp(170.0 / distToCam, 0.45, 5.0);

            // Subtle organic thermal flicker (oxygen pocket flare)
            float flicker = 0.80 + 0.20 * sin(uTime * aFlickerSpeed + aFlickerPhase);
            vFlicker = flicker;

            // Bass breath thermal updraft pulse
            float bassSize = 1.0 + uBass * 0.25;
            gl_PointSize = aSize * depthScale * flicker * bassSize;

            // Thermal cool-down color gradient as embers rise from bonfire bed to night sky:
            // Low altitude (-9 to -2): White-gold incandescent spark
            // Mid altitude (-2 to +5): Radiant flame orange
            // High altitude (+5 to +14): Deep smoldering ruby cinder fading out
            float altFrac = clamp((position.y + 9.0) / 22.0, 0.0, 1.0);

            vec3 colWhiteGold = vec3(1.0, 0.96, 0.82); // Molten core
            vec3 colHotGold   = vec3(1.0, 0.80, 0.25); // Intense gold
            vec3 colFlameOrg  = vec3(1.0, 0.42, 0.05); // Classic bonfire flame
            vec3 colDeepRuby  = vec3(0.85, 0.14, 0.02); // Smoldering ember
            vec3 colCharcoal  = vec3(0.40, 0.05, 0.01); // Dying coal

            vec3 emberColor;
            if (altFrac < 0.20) {
                emberColor = mix(colWhiteGold, colHotGold, altFrac / 0.20);
            } else if (altFrac < 0.55) {
                emberColor = mix(colHotGold, colFlameOrg, (altFrac - 0.20) / 0.35);
            } else if (altFrac < 0.85) {
                emberColor = mix(colFlameOrg, colDeepRuby, (altFrac - 0.55) / 0.30);
            } else {
                emberColor = mix(colDeepRuby, colCharcoal, (altFrac - 0.85) / 0.15);
            }

            // Per-particle initial temperature variation
            vColor = mix(emberColor, colHotGold, aHeat * 0.25);

            // Gentle lifecycle fade: smooth birth at bottom, smooth fade-out as it cools into the sky
            float fadeIn = smoothstep(-9.0, -6.0, position.y);
            float fadeOut = 1.0 - smoothstep(8.5, 13.5, position.y);
            vAlpha = fadeIn * fadeOut * 0.90;
        }
    `,
    fragmentShader: `
        uniform sampler2D uTexture;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vFlicker;

        void main() {
            vec4 texCol = texture2D(uTexture, gl_PointCoord);
            if (texCol.a < 0.01) discard;

            // Modulate with ember temperature color and thermal flicker
            vec3 finalRgb = vColor * texCol.rgb * vFlicker * 1.35;
            float finalAlpha = texCol.a * vAlpha;

            gl_FragColor = vec4(finalRgb, finalAlpha);
        }
    `
};

// -------------------------------------------------------------------------
// Bonfire Floor Hearth Embers Shader (Subtle Glowing Coals in a Fire Pit Bed)
// -------------------------------------------------------------------------
const BonfireFloorEmbersShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uKick: { value: 0.0 },
        uTexture: { value: null }
    },
    vertexShader: `
        attribute float aSize;
        attribute float aFlickerSpeed;
        attribute float aFlickerPhase;
        attribute vec3 aColor;

        uniform float uTime;
        uniform float uBass;
        uniform float uKick;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vFlicker;

        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            // Perspective distance attenuation
            float distToCam = max(-mvPosition.z, 0.1);
            float depthScale = clamp(150.0 / distToCam, 0.35, 4.0);

            // Subtle gentle ember heat shimmer in fire pit bed
            float flicker = 0.82 + 0.18 * sin(uTime * aFlickerSpeed + aFlickerPhase);
            vFlicker = flicker;

            // Gentle responsive swell with bass / kick
            float sizePulse = 1.0 + (uBass * 0.18 + uKick * 0.22);
            gl_PointSize = aSize * depthScale * flicker * sizePulse;

            vColor = aColor;

            // Subtle, elegant glowing opacity (subtly breathing)
            vAlpha = 0.65 + 0.25 * sin(uTime * (aFlickerSpeed * 0.6) + aFlickerPhase * 1.5);
        }
    `,
    fragmentShader: `
        uniform sampler2D uTexture;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vFlicker;

        void main() {
            vec4 texCol = texture2D(uTexture, gl_PointCoord);
            if (texCol.a < 0.01) discard;

            // Subtle glowing fire pit ember
            vec3 finalRgb = vColor * texCol.rgb * vFlicker * 1.30;
            float finalAlpha = texCol.a * vAlpha * 0.85;

            gl_FragColor = vec4(finalRgb, finalAlpha);
        }
    `
};

// -------------------------------------------------------------------------
// Wawa Sensei Godray Volumetric Shader (Silky Smooth Striations, Mie Forward Scattering & Hyper-Vibrant Neon)
// -------------------------------------------------------------------------
const WawaSenseiGodrayShader = {
    uniforms: {
        uColor: { value: new THREE.Color(0x00ffff) },
        uCoreColor: { value: new THREE.Color(0xffffff) },
        uIntensity: { value: 0.85 },
        uTime: { value: 0.0 },
        uTimeSpeed: { value: 0.15 },
        uNoiseScale: { value: 2.5 },
        uSmoothTop: { value: 0.16 },
        uSmoothBottom: { value: 0.98 },
        uFresnelPower: { value: 2.2 },
        uPulse: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalLocal;
        varying vec3 vNormalWorld;
        varying vec3 vPositionWorld;
        varying vec3 vViewDir;

        void main() {
            vUv = uv;
            vNormalLocal = normal;
            vNormalWorld = normalize(mat3(modelMatrix) * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vPositionWorld = worldPos.xyz;
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uCoreColor;
        uniform float uIntensity;
        uniform float uTime;
        uniform float uTimeSpeed;
        uniform float uNoiseScale;
        uniform float uSmoothTop;
        uniform float uSmoothBottom;
        uniform float uFresnelPower;
        uniform float uPulse;

        varying vec2 vUv;
        varying vec3 vNormalLocal;
        varying vec3 vNormalWorld;
        varying vec3 vPositionWorld;
        varying vec3 vViewDir;

        void main() {
            // 1. Smooth, hypnotic volumetric light ray striations (zero high-frequency twitching noise)
            float angle = atan(vNormalLocal.z, vNormalLocal.x);
            float rayShafts1 = sin(angle * 6.0 + uTime * 0.12) * 0.5 + 0.5;
            float rayShafts2 = cos(angle * 10.0 - uTime * 0.08 + vUv.y * 2.5) * 0.5 + 0.5;
            float rayShafts = 0.75 + rayShafts1 * 0.15 + rayShafts2 * 0.10;

            // 2. Longitudinal coordinate along cone: 0.0 (top aperture) to 1.0 (stage floor)
            float y = vUv.y;

            // 3. Smooth continuous fog interaction along beam path (gentle drifting smoke)
            float smoke1 = sin(vPositionWorld.x * 0.08 + vPositionWorld.y * 0.12 + uTime * 0.15) * cos(vPositionWorld.z * 0.08 - uTime * 0.10);
            float smoke2 = cos(vPositionWorld.x * 0.14 - vPositionWorld.y * 0.09 + uTime * 0.20 + vPositionWorld.z * 0.10);
            float localFogDensity = clamp(0.70 + 0.30 * smoke1 + 0.15 * smoke2, 0.30, 1.30);
            
            // Beer-Lambert physical extinction damping along beam depth
            float fogDamping = exp(-y * 0.75 * localFogDensity);

            // Dynamic fog illumination (clouds light up brilliantly when beam cuts through)
            float fogIllumination = 0.65 + 0.45 * localFogDensity;

            // 4. Smooth longitudinal edge falloffs
            float smoothFade = smoothstep(0.0, uSmoothTop, y) * (1.0 - smoothstep(uSmoothBottom, 1.0, y));

            // 5. Mie / Henyey-Greenstein Forward Scattering
            // Light beam axis vector in world space (pointing down from top to floor)
            vec3 beamAxis = normalize(vec3(0.0, -1.0, 0.0));
            float cosTheta = dot(vViewDir, -beamAxis);
            float g = 0.38; // forward scattering anisotropy factor
            float hgPhase = (1.0 - g * g) / (4.0 * 3.14159 * pow(1.0 + g * g - 2.0 * g * cosTheta, 1.5));
            float forwardScattering = clamp(hgPhase * 3.0, 0.70, 2.4);

            // 6. Inverted Fresnel & Conical Volumetric Thickness Shading
            float limb = abs(dot(vNormalWorld, vViewDir));
            float fresnel = pow(limb, uFresnelPower);

            // 7. Total Alpha calculation with rich multi-octave shading
            float alpha = clamp(rayShafts * fresnel * smoothFade * fogDamping * fogIllumination * forwardScattering * uIntensity, 0.0, 1.0);

            // 8. Hyper-Vibrant Neon Color Grading (Intensely saturated, electric tones, never pale)
            vec3 vibrantColor = pow(uColor, vec3(0.85)) * 1.35;
            
            // Forward scattering ambient glow in the fog
            vec3 scatterGlow = vibrantColor * (1.0 - fogDamping) * (0.35 + max(0.0, uIntensity - 0.6) * 0.50) * localFogDensity;

            // Searing luminous core highlight
            float coreBlend = pow(fresnel, 1.8) * clamp(0.30 + (uIntensity - 0.4) * 0.50, 0.15, 0.95);
            vec3 saturatedCore = mix(vibrantColor, vec3(1.0, 1.0, 1.0), 0.75);
            float peakRadiance = 1.0 + max(0.0, uIntensity - 0.75) * 0.95;

            vec3 finalColor = (mix(vibrantColor, saturatedCore, clamp(coreBlend, 0.0, 0.95)) + scatterGlow) * peakRadiance;

            gl_FragColor = vec4(finalColor * alpha, clamp(alpha, 0.0, 1.0));
        }
    `
};

// -------------------------------------------------------------------------
// Dynamic Spotlight Floor Reflection Pool Shader (Exact Color Match, Luminous Hot Core, Soft Gaussian Falloff)
// -------------------------------------------------------------------------
const FloorSpotShader = {
    uniforms: {
        uColor: { value: new THREE.Color(0x00ffff) },
        uCoreColor: { value: new THREE.Color(0xffffff) },
        uIntensity: { value: 0.85 },
        uSurge: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uCoreColor;
        uniform float uIntensity;
        uniform float uSurge;
        varying vec2 vUv;

        void main() {
            vec2 p = vUv * 2.0 - 1.0;
            float rSq = dot(p, p);

            // Ultra-smooth radial falloff (soft Gaussian glow edge, zero square/hard edges)
            float spot = (rSq > 1.0) ? 0.0 : (exp(-rSq * 3.4) * (1.0 - smoothstep(0.70, 1.0, sqrt(rSq))));
            
            // Searing white-hot core at center of spotlight impact
            float core = exp(-rSq * 14.0);

            // Saturated color matching the beam, with luminous white-hot core
            vec3 vibrantColor = pow(uColor, vec3(0.85)) * 1.35;
            vec3 col = mix(vibrantColor, uCoreColor, clamp(core * 0.85 + uSurge * 0.35, 0.0, 1.0));
            
            // Dynamic brightness scaling with beam intensity and bass surge
            float brightness = (0.28 + uIntensity * 0.45 + uSurge * 1.40);
            float alpha = spot * clamp(brightness, 0.0, 1.0) * 0.85;

            gl_FragColor = vec4(col * alpha, clamp(alpha, 0.0, 1.0));
        }
    `
};

// -------------------------------------------------------------------------
// Subtle Sparkling White & Silver Disco Starfield Shader
// -------------------------------------------------------------------------
const DiscoSilverStarsShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uTexture: { value: null }
    },
    vertexShader: `
        uniform float uTime;
        attribute float aPhase;
        attribute float aSpeed;
        attribute float aBaseSize;
        varying vec3 vColor;
        varying float vSparkle;

        void main() {
            vColor = color;
            
            // Gentle organic sinusoidal twinkle per star
            float twinkle = sin(uTime * aSpeed + aPhase);
            // Delicate glint shimmer pulse
            float glint = pow(max(0.0, sin(uTime * (aSpeed * 0.75) + aPhase * 1.3)), 6.0) * 0.40;
            vSparkle = 0.65 + 0.35 * twinkle + glint;

            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (aBaseSize * vSparkle) * (260.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform sampler2D uTexture;
        varying vec3 vColor;
        varying float vSparkle;

        void main() {
            vec4 tex = texture2D(uTexture, gl_PointCoord);
            if (tex.a < 0.02) discard;

            // Pure luminous white/silver sparkle without oversaturation
            vec3 finalCol = vColor * vSparkle;
            gl_FragColor = vec4(finalCol * tex.a, tex.a * min(1.0, vSparkle * 0.90));
        }
    `
};

// Floating Nightclub Fog & Atmospheric Participating Media (Smooth Volumetric Smoke Dynamically Illuminated by 8 Spotlights)
const FloatingAtmosphericFogShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uIntensity: { value: 0.45 },
        uSpotPos: { value: new Array(8).fill(0).map(() => new THREE.Vector3()) },
        uSpotDir: { value: new Array(8).fill(0).map(() => new THREE.Vector3(0, -1, 0)) },
        uSpotColor: { value: new Array(8).fill(0).map(() => new THREE.Color()) },
        uSpotIntensity: { value: new Array(8).fill(0.0) },
        uBass: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uSpotPos[8];
        uniform vec3 uSpotDir[8];
        uniform vec3 uSpotColor[8];
        uniform float uSpotIntensity[8];
        uniform float uBass;

        varying vec2 vUv;
        varying vec3 vWorldPos;

        // Silky smooth, ultra-fast 3D wave turbulence for floating nightclub fog
        float fogTurbulence(vec3 p) {
            float w1 = sin(p.x * 1.15 + p.y * 0.85 + sin(p.z * 1.05 + p.x * 0.55)) * 0.5 + 0.5;
            float w2 = sin(p.y * 1.95 - p.z * 1.45 + sin(p.x * 1.65 + p.y * 0.35)) * 0.5 + 0.5;
            float w3 = cos(p.z * 2.85 + p.x * 2.15 - p.y * 1.25) * 0.5 + 0.5;
            return w1 * 0.56 + w2 * 0.30 + w3 * 0.14;
        }

        void main() {
            vec3 p = vWorldPos * 0.065;
            p.x += uTime * 0.025;
            p.y -= uTime * 0.012;
            p.z += sin(uTime * 0.02 + vWorldPos.x * 0.04) * 0.20;

            float turb = fogTurbulence(p);
            float turb2 = fogTurbulence(p * 2.2 + vec3(uTime * 0.02, -uTime * 0.03, 0.0));
            float combined = turb * 0.70 + turb2 * 0.30;
            float rawDensity = smoothstep(0.10, 0.76, combined) * (0.45 + uBass * 0.35);

            float uvEdgeFade = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x) * smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
            float distXZ = length(vWorldPos.xz) / 36.0;
            float edgeFade = (1.0 - smoothstep(0.35, 0.95, distXZ)) * uvEdgeFade;
            float heightFade = smoothstep(-8.0, -3.5, vWorldPos.y) * (1.0 - smoothstep(3.0, 8.5, vWorldPos.y));

            float fogDensity = rawDensity * edgeFade * heightFade;

            vec3 dynamicLightColor = vec3(0.006, 0.012, 0.024);
            float totalLightIntensity = 0.0;

            for (int i = 0; i < 8; i++) {
                vec3 toFog = vWorldPos - uSpotPos[i];
                float distAlong = dot(toFog, uSpotDir[i]);
                if (distAlong > 0.0 && distAlong < 28.0) {
                    vec3 axialPoint = uSpotPos[i] + uSpotDir[i] * distAlong;
                    float radDist = length(vWorldPos - axialPoint);
                    float coneRadius = 0.22 + 2.85 * (distAlong / 28.0);
                    float beamMask = smoothstep(coneRadius * 1.35, 0.0, radDist);
                    float depthFade = smoothstep(0.0, 2.0, distAlong) * (1.0 - smoothstep(20.0, 28.0, distAlong));
                    float beamIllum = beamMask * depthFade * uSpotIntensity[i];

                    vec3 vibrantSpotCol = pow(uSpotColor[i], vec3(0.85)) * 1.5;
                    dynamicLightColor += vibrantSpotCol * beamIllum * 1.8;
                    totalLightIntensity += beamIllum;
                }
            }

            float finalAlpha = clamp(fogDensity * (0.28 + totalLightIntensity * 0.85) * uIntensity, 0.0, 1.0);
            gl_FragColor = vec4(dynamicLightColor * finalAlpha, finalAlpha);
        }
    `
};
// -------------------------------------------------------------------------
// VHS Glitch White Typography Shader (High-Contrast, Scanlines, Tracking Noise, RGB Split & Tape Glitch)
// -------------------------------------------------------------------------
const VHSGlitchTextShader = {
    uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uGlitch: { value: 0.0 },
        uTextColor: { value: new THREE.Color(0xffffff) },
        uSpotPos: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
        uSpotDir: { value: Array.from({ length: 8 }, () => new THREE.Vector3(0, -1, 0)) },
        uSpotColor: { value: Array.from({ length: 8 }, () => new THREE.Color(0xffffff)) },
        uSpotIntensity: { value: new Float32Array(8) }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vViewDir;

        void main() {
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            vNormal = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - wp.xyz);
            gl_Position = projectionMatrix * viewMatrix * wp;
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uBass;
        uniform float uGlitch;
        uniform vec3 uTextColor;
        uniform vec3 uSpotPos[8];
        uniform vec3 uSpotDir[8];
        uniform vec3 uSpotColor[8];
        uniform float uSpotIntensity[8];

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vViewDir;

        void main() {
            vec2 uv = vUv;
            float glitchFactor = clamp(uGlitch + uBass * 0.35, 0.0, 1.8);

            // 1. CRT Cathode Ray Tube Glass Curvature (Convex Barrel Distortion / CC Lens)
            vec2 uvCent = uv - 0.5;
            vec2 uvDistort = uvCent;
            uvDistort.x *= 2.0; // 2:1 aspect ratio compensation
            float r2 = dot(uvDistort, uvDistort);
            float barrelStrength = 0.10 + glitchFactor * 0.035;
            vec2 uvCrt = uv + uvCent * (r2 * barrelStrength + r2 * r2 * 0.03);

            // CRT Tube Border Clipping
            if (uvCrt.x < 0.010 || uvCrt.x > 0.990 || uvCrt.y < 0.014 || uvCrt.y > 0.986) {
                discard;
            }

            // 2. Analog Tape Sync Jitter & Interlace Tear on Beat
            float syncJitter = sin(uTime * 48.0 + uvCrt.y * 160.0) * 0.0018 * glitchFactor;
            float tearLine = step(0.965 - glitchFactor * 0.03, sin(uvCrt.y * 36.0 + uTime * 11.0));
            float tearShift = tearLine * (sin(uTime * 60.0) * 0.014) * glitchFactor;
            vec2 uvSample = uvCrt + vec2(syncJitter + tearShift, 0.0);

            // 3. RGB Chromatic Channel Shift & Electron Gun Convergence Misalignment
            float caSpread = (0.0028 + r2 * 0.0035) * (1.0 + glitchFactor * 0.65);
            vec3 rawR = texture2D(tDiffuse, uvSample + vec2(caSpread, 0.0)).rgb;
            vec3 rawG = texture2D(tDiffuse, uvSample).rgb;
            vec3 rawB = texture2D(tDiffuse, uvSample - vec2(caSpread, 0.0)).rgb;

            float rAlpha = texture2D(tDiffuse, uvSample + vec2(caSpread, 0.0)).a;
            float gAlpha = texture2D(tDiffuse, uvSample).a;
            float bAlpha = texture2D(tDiffuse, uvSample - vec2(caSpread, 0.0)).a;
            float maxAlpha = max(max(rAlpha, gAlpha), bAlpha);

            // Discard fully transparent background pixels
            if (maxAlpha < 0.02) {
                discard;
            }

            // Synthesize RGB signal from shifted channels for rich chromatic split
            vec3 rawSignal = vec3(rawR.r, rawG.g, rawB.b);

            // 4. Boost Color Saturation / Vibrance (After Effects Color Processing)
            float luma = dot(rawSignal, vec3(0.299, 0.587, 0.114));
            vec3 vividSignal = mix(vec3(luma), rawSignal, 1.65); // 65% Saturation boost

            // 5. RGB Phosphor Triad Dot Matrix (Sony Trinitron Aperture Grille Grid)
            float triadCoord = uvCrt.x * 740.0;
            float triadFrac = fract(triadCoord);

            vec3 triadMask;
            triadMask.r = smoothstep(0.42, 0.06, abs(triadFrac - 0.166)) * 2.8;
            triadMask.g = smoothstep(0.42, 0.06, abs(triadFrac - 0.500)) * 2.8;
            triadMask.b = smoothstep(0.42, 0.06, abs(triadFrac - 0.833)) * 2.8;

            // Vertical phosphor slot divisions (shadow mask black gaps)
            float triadSlotY = fract(uvCrt.y * 360.0);
            float slotMask = smoothstep(0.08, 0.18, triadSlotY) * (1.0 - smoothstep(0.82, 0.92, triadSlotY));
            vec3 phosphorGrid = triadMask * (slotMask * 0.85 + 0.15) + vec3(0.03);

            // 6. Venetian Scanlines & 60Hz Cathode Refresh Bar
            float scanline = sin(uvCrt.y * 620.0 * 3.14159265);
            float scanlineMask = smoothstep(-0.45, 0.65, scanline);
            float scanMod = mix(0.25, 1.18, scanlineMask); // High contrast dark scanline gaps

            // 60Hz rolling scan bar & hum
            float rollBar = sin(uvCrt.y * 2.6 - uTime * 4.5) * 0.05 + 0.95;
            float crtHum = 0.98 + 0.02 * sin(uTime * 110.0);

            // 7. Direct Phosphor Emission
            vec3 phosphorLit = vividSignal * phosphorGrid * scanMod * rollBar * crtHum;

            // 8. Controlled Outer Halation Aura (Clean white phosphor edge glow without washing out core)
            float glowR = 0.005;
            vec3 glowSamp = (
                texture2D(tDiffuse, uvSample + vec2(glowR, 0.0)).rgb +
                texture2D(tDiffuse, uvSample - vec2(glowR, 0.0)).rgb +
                texture2D(tDiffuse, uvSample + vec2(0.0, glowR * 1.5)).rgb +
                texture2D(tDiffuse, uvSample - vec2(0.0, glowR * 1.5)).rgb
            ) * 0.25;

            vec3 haloAura = glowSamp * vec3(0.92, 0.96, 1.0) * (1.0 - gAlpha * 0.75) * 0.40;

            // Combine phosphor core and edge halation
            vec3 crtColor = phosphorLit * 1.30 + haloAura;

            // 9. S-Curve Contrast Enhancement (After Effects Curves Step)
            // Deepens darks, boosts midtone saturation, and keeps highlights crisp
            crtColor = clamp(crtColor, 0.0, 1.0);
            crtColor = crtColor * crtColor * (3.0 - 2.0 * crtColor); // S-curve contrast
            crtColor = pow(crtColor, vec3(0.92)); // Slight gamma tweak for rich punch

            // Audio reactive kick surge
            crtColor *= (1.0 + uBass * 0.22 + glitchFactor * 0.18);

            // 10. Overhead Godray Spotlight Glass Sheen (Subtle Fresnel reflection)
            vec3 tubeN = normalize(vec3(uvDistort.x * 0.6, uvDistort.y * 0.8, 1.0));
            vec3 V = vViewDir;
            vec3 godrayGlassReflection = vec3(0.0);

            for (int i = 0; i < 8; i++) {
                vec3 spotPos = uSpotPos[i];
                vec3 spotDir = uSpotDir[i];
                vec3 spotCol = uSpotColor[i];
                float spotInt = uSpotIntensity[i];

                vec3 toWord = vWorldPos - spotPos;
                float distAlong = dot(toWord, spotDir);

                if (distAlong > 0.0 && distAlong < 34.0) {
                    vec3 axialPoint = spotPos + spotDir * distAlong;
                    float radDist = length(vWorldPos - axialPoint);
                    float coneRadius = 0.20 + 3.4 * (distAlong / 34.0);

                    float beamMask = smoothstep(coneRadius * 1.20, coneRadius * 0.15, radDist);
                    float depthFade = smoothstep(0.0, 2.5, distAlong) * (1.0 - smoothstep(22.0, 34.0, distAlong));
                    float beamFactor = beamMask * depthFade * spotInt;

                    if (beamFactor > 0.001) {
                        vec3 L = normalize(spotPos - vWorldPos);
                        vec3 H = normalize(L + V);
                        float glassSpec = pow(max(0.0, dot(tubeN, H)), 48.0) * 0.28;
                        godrayGlassReflection += spotCol * glassSpec * beamFactor;
                    }
                }
            }

            crtColor += godrayGlassReflection * (gAlpha * 0.35 + 0.04);

            // 11. CRT Glass Tube Border Vignette
            vec2 vigUV = uvCrt * (1.0 - uvCrt.yx);
            float tubeVig = clamp(pow(vigUV.x * vigUV.y * 32.0, 0.28), 0.0, 1.0);
            crtColor *= tubeVig;

            float totalAlpha = clamp(maxAlpha * 1.20, 0.0, 1.0);
            gl_FragColor = vec4(crtColor, totalAlpha);
        }
    `
};

// -------------------------------------------------------------------------
// Dual Inward-Billowing Atmospheric Smoke Shader (Rolling in from Left & Right)
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// Dual Inward-Billowing Atmospheric Smoke Shader (Rolling in from Left & Right)
// -------------------------------------------------------------------------
const DualInwardAtmosphericSmokeShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uIntensity: { value: 0.35 },
        uSpotPos: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
        uSpotDir: { value: Array.from({ length: 8 }, () => new THREE.Vector3(0, -1, 0)) },
        uSpotColor: { value: Array.from({ length: 8 }, () => new THREE.Color(0xffffff)) },
        uSpotIntensity: { value: new Float32Array(8) },
        uBass: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uSpotPos[8];
        uniform vec3 uSpotDir[8];
        uniform vec3 uSpotColor[8];
        uniform float uSpotIntensity[8];
        uniform float uBass;

        varying vec2 vUv;
        varying vec3 vWorldPos;

        // Ultra-fast, silky continuous procedural wave turbulence (zero permutations, zero tile pipeline stalls)
        float smokeTurbulence(vec3 p) {
            float w1 = sin(p.x * 1.35 + p.y * 0.95 + sin(p.z * 1.15 + p.x * 0.65)) * 0.5 + 0.5;
            float w2 = sin(p.y * 2.10 - p.z * 1.65 + sin(p.x * 1.85 + p.y * 0.45)) * 0.5 + 0.5;
            float w3 = cos(p.z * 3.10 + p.x * 2.45 - p.y * 1.40) * 0.5 + 0.5;
            return w1 * 0.55 + w2 * 0.32 + w3 * 0.18;
        }

        void main() {
            // Directional Smoke Flow: Left stream advances right (+X), Right stream advances left (-X)
            float speed = 0.085 + uBass * 0.06;
            
            // Left smoke stream (originating X < 0, flowing toward center +X)
            vec3 pLeft = vWorldPos * 0.08;
            pLeft.x -= uTime * speed;
            pLeft.y -= uTime * 0.02;
            pLeft.z += sin(uTime * 0.05 + vWorldPos.x * 0.06) * 0.30;
            float leftWeight = smoothstep(5.0, -16.0, vWorldPos.x);

            // Right smoke stream (originating X > 0, flowing toward center -X)
            vec3 pRight = vWorldPos * 0.08;
            pRight.x += uTime * speed;
            pRight.y -= uTime * 0.02;
            pRight.z += cos(uTime * 0.05 - vWorldPos.x * 0.06) * 0.30;
            float rightWeight = smoothstep(-5.0, 16.0, vWorldPos.x);

            // Center turbulent eddy
            vec3 pCenter = vWorldPos * 0.095;
            float swirlAngle = uTime * 0.22 + length(vWorldPos.xz) * 0.08;
            pCenter.x += cos(swirlAngle) * 0.40;
            pCenter.z += sin(swirlAngle) * 0.40;
            pCenter.y -= uTime * 0.025;
            float centerWeight = (1.0 - smoothstep(0.0, 12.0, abs(vWorldPos.x))) * 0.75;

            float nL = smokeTurbulence(pLeft);
            float leftDensity = nL * leftWeight;

            float nR = smokeTurbulence(pRight);
            float rightDensity = nR * rightWeight;

            float nC = smokeTurbulence(pCenter);
            float centerDensity = nC * centerWeight;

            float combinedNoise = (leftDensity + rightDensity + centerDensity) * 0.95;
            float rawDensity = smoothstep(0.12, 0.78, combinedNoise) * (0.50 + uBass * 0.35);

            // Smooth boundary edge falloffs
            float uvEdgeFade = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x) * smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
            float distXZ = length(vWorldPos.xz) / 38.0;
            float edgeFade = (1.0 - smoothstep(0.38, 0.96, distXZ)) * uvEdgeFade;
            float heightFade = smoothstep(-9.0, -4.0, vWorldPos.y) * (1.0 - smoothstep(4.0, 9.5, vWorldPos.y));

            float smokeDensity = rawDensity * edgeFade * heightFade;

            // Ambient dark atmospheric fog base
            vec3 dynamicLightColor = vec3(0.015, 0.020, 0.030);
            float totalLightIntensity = 0.0;

            // Overhead god lights cutting through the rolling smoke billows
            for (int i = 0; i < 8; i++) {
                vec3 toSmoke = vWorldPos - uSpotPos[i];
                float distAlong = dot(toSmoke, uSpotDir[i]);
                
                if (distAlong > 0.0 && distAlong < 32.0) {
                    vec3 axialPoint = uSpotPos[i] + uSpotDir[i] * distAlong;
                    float radDist = length(vWorldPos - axialPoint);
                    float coneRadius = 0.22 + 3.0 * (distAlong / 32.0);
                    
                    float beamMask = smoothstep(coneRadius * 1.30, 0.0, radDist);
                    float depthFade = smoothstep(0.0, 2.0, distAlong) * (1.0 - smoothstep(22.0, 32.0, distAlong));
                    float beamIllum = beamMask * depthFade * uSpotIntensity[i];

                    vec3 spotCol = pow(uSpotColor[i], vec3(0.9)) * 1.6;
                    dynamicLightColor += spotCol * beamIllum * 2.2;
                    totalLightIntensity += beamIllum;
                }
            }

            float finalAlpha = clamp(smokeDensity * (0.32 + totalLightIntensity * 0.95) * uIntensity, 0.0, 1.0);
            gl_FragColor = vec4(dynamicLightColor * finalAlpha, finalAlpha);
        }
    `
};

// -------------------------------------------------------------------------
// Protean Clouds Volumetric Raymarching Shader (High-Performance Optimized)
// Pure Ethereal Platinum Diamond White Monochrome Volumetric Cloudscape
// -------------------------------------------------------------------------
const ProteanCloudsShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uBass: { value: 0.0 },
        uMid: { value: 0.0 },
        uTreble: { value: 0.0 },
        uIntensity: { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform float uBass;
        uniform float uMid;
        uniform float uTreble;
        uniform float uIntensity;
        varying vec2 vUv;

        mat2 rot(in float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
        const mat3 m3 = mat3(0.33338, 0.56034, -0.71817, -0.87887, 0.32651, -0.15323, 0.15162, 0.69596, 0.61339) * 1.93;
        float mag2(vec2 p){ return dot(p, p); }
        float linstep(in float mn, in float mx, in float x){ return clamp((x - mn)/(mx - mn), 0.0, 1.0); }

        vec2 disp(float t){ return vec2(sin(t * 0.22), cos(t * 0.175)) * 2.0; }

        vec2 map(vec3 p, float time, float prm1, float bassMod) {
            vec3 p2 = p;
            p2.xy -= disp(p.z).xy;
            p.xy *= rot(sin(p.z + time) * (0.10 + prm1 * 0.05) + time * 0.08);
            float cl = mag2(p2.xy);
            float d = 0.0;
            p *= 0.61;
            float z = 1.0;
            float trk = 1.0;
            float dspAmp = 0.10 + prm1 * 0.20 + bassMod * 0.12;
            for(int i = 0; i < 3; i++) {
                p += sin(p.zxy * 0.75 * trk + time * trk * 0.8) * dspAmp;
                d -= abs(dot(cos(p), sin(p.yzx)) * z);
                z *= 0.57;
                trk *= 1.4;
                p = p * m3;
            }
            d = abs(d + prm1 * 3.0) + prm1 * 0.3 - 2.5;
            return vec2(d + cl * 0.20 + 0.25, cl);
        }

        float getsat(vec3 c) {
            float mi = min(min(c.x, c.y), c.z);
            float ma = max(max(c.x, c.y), c.z);
            return (ma - mi)/(ma + 1e-7);
        }

        vec3 iLerp(in vec3 a, in vec3 b, in float x) {
            vec3 ic = mix(a, b, x) + vec3(1e-6, 0.0, 0.0);
            float sd = abs(getsat(ic) - mix(getsat(a), getsat(b), x));
            vec3 dir = normalize(vec3(2.0 * ic.x - ic.y - ic.z, 2.0 * ic.y - ic.x - ic.z, 2.0 * ic.z - ic.y - ic.x));
            float lgt = dot(vec3(1.0), ic);
            float ff = dot(dir, normalize(ic));
            ic += 1.5 * dir * sd * ff * lgt;
            return clamp(ic, 0.0, 1.0);
        }

        void main() {
            vec2 q = vUv;
            float aspect = uResolution.x / max(1.0, uResolution.y);
            vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);

            float time = uTime * 1.5;
            vec3 ro = vec3(0.0, 0.0, time);
            ro += vec3(sin(uTime * 0.35) * 0.35, 0.0, 0.0);

            float dspAmp = 0.85;
            ro.xy += disp(ro.z) * dspAmp;
            float tgtDst = 3.5;

            vec3 target = normalize(ro - vec3(disp(time + tgtDst) * dspAmp, time + tgtDst));
            vec3 rightdir = normalize(cross(target, vec3(0.0, 1.0, 0.0)));
            vec3 updir = normalize(cross(rightdir, target));
            rightdir = normalize(cross(updir, target));
            vec3 rd = normalize((p.x * rightdir + p.y * updir) * 1.0 - target);
            rd.xy *= rot(-disp(time + 3.5).x * 0.18);

            float prm1 = smoothstep(-0.4, 0.4, sin(uTime * 0.22));
            float bassMod = uBass * 0.35;

            // Fast adaptive raymarching volumetric clouds
            vec4 rez = vec4(0.0);
            float t = 1.5;
            float fogT = 0.0;

            for(int i = 0; i < 28; i++) {
                if(rez.a > 0.95) break;

                vec3 pos = ro + t * rd;
                vec2 mpv = map(pos, time, prm1, bassMod);
                float den = clamp(mpv.x - 0.3, 0.0, 1.0) * 1.12;
                float dn = clamp((mpv.x + 2.0), 0.0, 3.0);

                vec4 col = vec4(0.0);
                if (mpv.x > 0.6) {
                    col = vec4(sin(vec3(4.8, 5.0, 5.2) + mpv.y * 0.08 + sin(pos.z * 0.35) * 0.35 + 1.6) * 0.25 + 0.75, 0.08);
                    col *= den * den * den;
                    col.rgb *= linstep(4.0, -2.5, mpv.x) * 1.8;
                    float dif = clamp((den - map(pos + 0.45, time, prm1, bassMod).x) / 3.0, 0.001, 1.0);

                    // Ethereal subtle platinum ambient and diffuse illumination
                    vec3 ambLight = vec3(0.010, 0.012, 0.016) + vec3(uBass * 0.015);
                    vec3 difLight = vec3(0.055, 0.062, 0.075) * dif * (1.0 + uBass * 0.25);
                    col.xyz *= den * (ambLight + 1.6 * difLight);
                }

                float fogC = exp(t * 0.2 - 2.2);
                col.rgba += vec4(0.008, 0.010, 0.014, 0.03) * clamp(fogC - fogT, 0.0, 1.0) * (1.0 + uBass * 0.15);
                fogT = fogC;
                rez = rez + col * (1.0 - rez.a);
                t += clamp(0.60 - dn * dn * 0.05, 0.16, 0.48);
            }

            vec3 col = clamp(rez.rgb, 0.0, 1.0);
            col = iLerp(col.bgr, col.rgb, clamp(1.0 - prm1, 0.05, 1.0));

            // Deep Moody Contrast Grading
            col = pow(col, vec3(0.95, 0.96, 0.98)) * vec3(1.0, 1.02, 1.05) * uIntensity;
            col += vec3(uBass * 0.025);
            col *= pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.18) * 0.85 + 0.15;

            gl_FragColor = vec4(col, 1.0);
        }
    `
};

// Concert Stage Moving-Head Beam Shader (Striated Ray Shafts, Atmospheric Fog & Aperture Flare)
const ConcertStageBeamShader = {
    uniforms: {
        uColor: { value: new THREE.Color(0x00ff33) },
        uCoreColor: { value: new THREE.Color(0xffffff) },
        uIntensity: { value: 1.0 },
        uPulse: { value: 0.0 },
        uTime: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vLocalPos;

        void main() {
            vUv = uv;
            vLocalPos = position;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vNormal = normalize(normalMatrix * normal);
            vViewDir = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uCoreColor;
        uniform float uIntensity;
        uniform float uPulse;
        uniform float uTime;

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vLocalPos;

        void main() {
            // Transverse limb/Fresnel integration (volumetric cylinder/cone view angle)
            float limb = 1.0 - abs(dot(vViewDir, vNormal));
            float softHaze = pow(limb, 1.35);
            float hotCore = pow(limb, 4.8);

            // Longitudinal position along the beam: 0.0 (fixture lens) to 1.0 (far end)
            float y = vUv.y;

            // 1. Sharp Aperture Lens Emission Flare
            float sourceFlare = exp(-y * 8.0) * 4.5;

            // 2. Collimated Stage Striations (Internal Ray Filaments matching concert moving-heads)
            float angle = atan(vLocalPos.x, vLocalPos.z);
            float rayPattern1 = abs(sin(angle * 8.0 + y * 2.0));
            float rayPattern2 = abs(sin(angle * 14.0 - y * 4.0 + uTime * 0.4));
            float striations = pow(rayPattern1 * 0.65 + rayPattern2 * 0.35, 2.2);
            float rayStructure = 0.50 + 0.50 * striations;

            // 3. Atmospheric Column Haze Decay
            float columnHaze = pow(clamp(1.0 - y * 0.70, 0.0, 1.0), 1.3);

            // 4. Smooth tip fade at distance
            float endFade = smoothstep(1.0, 0.82, y);

            // 5. Procedural Smoke / Fog turbulence drifting through light beam
            float fog = sin(vWorldPos.x * 0.6 + vWorldPos.y * 0.8 + uTime * 1.8) *
                        cos(vWorldPos.z * 0.7 - uTime * 1.4);
            float fogDrift = 0.82 + 0.18 * fog;

            // Composite alpha
            float longProfile = (sourceFlare + columnHaze) * endFade;
            float alpha = (softHaze * 0.6 + hotCore * 0.8) * rayStructure * longProfile * fogDrift * (0.55 + uPulse * 0.45);
            alpha *= uIntensity;

            if (alpha < 0.003) discard;

            // Color blending: vivid saturated neon on edges/rays, brilliant white-hot core
            float coreBlend = clamp(hotCore * 0.75 + sourceFlare * 0.6 + uPulse * 0.35, 0.0, 1.0);
            vec3 finalColor = mix(uColor, uCoreColor, coreBlend) * (1.1 + uPulse * 1.5);

            gl_FragColor = vec4(finalColor * alpha, clamp(alpha, 0.0, 1.0));
        }
    `
};

// Fluid Glowing Spectrum Wave Ribbon Shader
const FluidWaveRibbonShader = {
    uniforms: {
        uColorA: { value: new THREE.Color(0x00ffff) },
        uColorB: { value: new THREE.Color(0xff007f) },
        uColorC: { value: new THREE.Color(0xffaa00) },
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uMid: { value: 0.0 },
        uTreble: { value: 0.0 },
        uRibbonIdx: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vWave;
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform float uTreble;
        uniform float uRibbonIdx;

        void main() {
            vUv = uv;
            vec3 pos = position;

            float bassSwell = sin(pos.x * 0.09 + uTime * 1.5) * (1.6 + uBass * 2.8);
            float midRipple = cos(pos.x * 0.45 - uTime * 3.6 + uRibbonIdx * 0.6) * (0.45 + uMid * 1.6);
            float trebleJitter = sin(pos.x * 1.1 + uTime * 7.0 + uRibbonIdx) * (0.15 + uTreble * 0.9);

            float totalElevation = (bassSwell + midRipple + trebleJitter);
            float edgeDamp = smoothstep(-24.0, -16.0, pos.x) * smoothstep(24.0, 16.0, pos.x);
            pos.y += totalElevation * edgeDamp;
            vWave = totalElevation;

            vec4 worldPos = modelMatrix * vec4(pos, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vWave;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        uniform float uTime;
        uniform float uBass;
        uniform float uRibbonIdx;

        void main() {
            float edgeDist = abs(vUv.y - 0.5) * 2.0;
            float crestGlow = pow(clamp(1.0 - edgeDist, 0.0, 1.0), 3.2) * 1.7;
            float borderHighlight = smoothstep(0.68, 0.98, edgeDist) * 1.5;

            float colorT = sin(vUv.x * 3.1415 + uTime * 0.8 + uRibbonIdx * 0.28) * 0.5 + 0.5;
            vec3 col = colorT < 0.5 ? mix(uColorA, uColorB, colorT * 2.0) : mix(uColorB, uColorC, (colorT - 0.5) * 2.0);
            col += vec3(0.2, 0.2, 0.3) * clamp(vWave * 0.35, 0.0, 1.0);

            float alpha = (crestGlow + borderHighlight) * (0.8 + uBass * 0.45);
            float lenFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
            alpha *= lenFade;

            if (alpha < 0.005) discard;
            gl_FragColor = vec4(col * alpha * (1.3 + uBass * 0.7), alpha);
        }
    `
};

// Smooth Flowing Synthwave Highway Shader with Multi-Palette Cycling
const SmoothSynthwaveShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uMid: { value: 0.0 },
        uSpeed: { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vElevation;
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;

        void main() {
            vUv = uv;
            vec3 pos = position;

            float worldY = pos.y + uTime * 22.0;
            float worldX = pos.x;

            float mainHills = sin(worldX * 0.11) * cos(worldY * 0.07) * (2.8 + uBass * 1.5);
            float ridgeHills = sin(worldX * 0.25 + worldY * 0.16) * (0.8 + uMid * 0.6);
            float valleyDip = smoothstep(0.0, 15.0, abs(worldX)) * 2.2;

            pos.z += (mainHills + ridgeHills) * (valleyDip + 0.35);
            vElevation = pos.z;

            vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
            vWorldPos = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vElevation;
        uniform float uTime;
        uniform float uBass;

        void main() {
            vec2 gridScale = vec2(32.0, 48.0);
            vec2 gridUv = vUv * gridScale;
            gridUv.y -= uTime * 0.6;

            vec2 gridFract = abs(fract(gridUv - 0.5) - 0.5);
            vec2 gridDeriv = fwidth(gridUv);
            vec2 gridLines = 1.0 - smoothstep(vec2(0.0), gridDeriv * 1.8, gridFract - 0.038);
            float lineIntensity = max(gridLines.x, gridLines.y);

            float centerDist = abs(vUv.x - 0.5) * 2.0;
            float centerLane = 1.0 - smoothstep(0.0, 0.035, centerDist);
            float centerDash = step(0.4, fract(gridUv.y * 0.5));
            lineIntensity += centerLane * centerDash * 1.6;

            float cycleTime = uTime * 0.08;
            int paletteIndex = int(floor(mod(cycleTime * 4.0, 4.0)));

            vec3 p1_base = vec3(0.03, 0.015, 0.14);
            vec3 p1_crest = vec3(1.0, 0.0, 0.55);
            vec3 p1_line = vec3(0.0, 1.0, 0.95);
            vec3 p1_strip = vec3(1.0, 0.85, 0.28);

            vec3 p2_base = vec3(0.01, 0.04, 0.12);
            vec3 p2_crest = vec3(0.0, 0.95, 0.7);
            vec3 p2_line = vec3(0.2, 1.0, 0.45);
            vec3 p2_strip = vec3(0.9, 1.0, 0.3);

            vec3 p3_base = vec3(0.12, 0.02, 0.05);
            vec3 p3_crest = vec3(1.0, 0.25, 0.1);
            vec3 p3_line = vec3(1.0, 0.75, 0.15);
            vec3 p3_strip = vec3(1.0, 0.95, 0.4);

            vec3 p4_base = vec3(0.05, 0.01, 0.15);
            vec3 p4_crest = vec3(0.7, 0.1, 1.0);
            vec3 p4_line = vec3(1.0, 0.2, 0.85);
            vec3 p4_strip = vec3(0.4, 0.9, 1.0);

            vec3 cur_base, cur_crest, cur_line, cur_strip;
            float blendT = fract(cycleTime * 4.0);
            blendT = blendT * blendT * (3.0 - 2.0 * blendT);

            if (paletteIndex == 0) {
                cur_base = mix(p1_base, p2_base, blendT);
                cur_crest = mix(p1_crest, p2_crest, blendT);
                cur_line = mix(p1_line, p2_line, blendT);
                cur_strip = mix(p1_strip, p2_strip, blendT);
            } else if (paletteIndex == 1) {
                cur_base = mix(p2_base, p3_base, blendT);
                cur_crest = mix(p2_crest, p3_crest, blendT);
                cur_line = mix(p2_line, p3_line, blendT);
                cur_strip = mix(p3_strip, p4_strip, blendT);
            } else if (paletteIndex == 2) {
                cur_base = mix(p3_base, p4_base, blendT);
                cur_crest = mix(p3_crest, p4_crest, blendT);
                cur_line = mix(p3_line, p4_line, blendT);
                cur_strip = mix(p3_strip, p4_strip, blendT);
            } else {
                cur_base = mix(p4_base, p1_base, blendT);
                cur_crest = mix(p4_crest, p1_crest, blendT);
                cur_line = mix(p4_line, p1_line, blendT);
                cur_strip = mix(p4_strip, p1_strip, blendT);
            }

            float elevNorm = clamp((vElevation + 2.5) / 6.0, 0.0, 1.0);
            vec3 surfaceCol = mix(cur_base, cur_crest * 0.45, elevNorm);
            vec3 activeLineCol = mix(cur_line, cur_strip, clamp(elevNorm * 1.2 + uBass * 0.3, 0.0, 1.0));
            vec3 finalCol = surfaceCol + activeLineCol * lineIntensity * (1.35 + uBass * 0.75);

            float horizonFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
            float sideFade = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
            float alpha = clamp(0.25 + lineIntensity * 0.88, 0.0, 1.0) * horizonFade * sideFade;

            if (alpha < 0.005) discard;
            gl_FragColor = vec4(finalCol * alpha, alpha);
        }
    `
};

// =============================================================================
// Synthwave Glowing River Mountains Shader (FX 11)
// 3D Canyon Terrain with River Valley & Wireframe Mountain Peaks
// =============================================================================
const SynthwaveRiverMountainShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uMid: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vElevation;
        varying float vDistToRiver;
        varying float vIsRiver;
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;

        void main() {
            vUv = uv;
            vec3 pos = position;

            // Continuous forward motion along Y axis
            float worldY = pos.y + uTime * 18.0;
            float worldX = pos.x;

            // Curving S-bend river canyon path
            float riverCenter = sin(worldY * 0.042) * 5.5 + cos(worldY * 0.085) * 2.5;
            float distRiver = abs(worldX - riverCenter);
            vDistToRiver = distRiver;

            // River bank threshold
            float riverWidth = 3.6;
            float mountainMask = smoothstep(riverWidth, riverWidth + 8.5, distRiver);
            vIsRiver = 1.0 - smoothstep(riverWidth - 0.5, riverWidth + 0.5, distRiver);

            // Mountain peak elevations
            float m1 = sin(worldX * 0.17 + 0.6) * cos(worldY * 0.11) * 7.5;
            float m2 = sin(worldX * 0.33 + worldY * 0.21) * 3.5;
            float m3 = cos(worldX * 0.68) * 1.5;
            float mountainZ = mountainMask * max(0.0, m1 + m2 + m3 + 2.2) * (1.0 + uBass * 0.45);

            // River surface wave ripples
            float riverRipple = sin(worldY * 0.45 - uTime * 6.0) * 0.22 * (1.0 + uMid * 1.4);
            float riverZ = -0.35 + riverRipple;

            pos.z += mix(riverZ, mountainZ, mountainMask);
            vElevation = pos.z;

            vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
            vWorldPos = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vElevation;
        varying float vDistToRiver;
        varying float vIsRiver;
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;

        void main() {
            // Mountain canyon wireframe grid
            vec2 gridScale = vec2(44.0, 68.0);
            vec2 gridUv = vUv * gridScale;
            gridUv.y -= uTime * 0.45;

            vec2 gridFract = abs(fract(gridUv - 0.5) - 0.5);
            vec2 gridDeriv = fwidth(gridUv);
            vec2 gridLines = 1.0 - smoothstep(vec2(0.0), gridDeriv * 1.8, gridFract - 0.04);
            float lineIntensity = max(gridLines.x, gridLines.y);

            // Mountain elevation normalization
            float elevNorm = clamp((vElevation + 0.5) / 8.5, 0.0, 1.0);

            // Mountain colors
            vec3 cMountainBase = vec3(0.03, 0.01, 0.12);     // Deep midnight twilight
            vec3 cMountainSlope = vec3(0.35, 0.02, 0.45);    // Twilight purple
            vec3 cMountainWire = vec3(1.0, 0.05, 0.65);      // Hot Neon Magenta
            vec3 cMountainCrest = vec3(0.0, 0.95, 1.0);      // Electric Cyan peaks

            vec3 mountainSurface = mix(cMountainBase, cMountainSlope, elevNorm * 0.7);
            vec3 mountainWireCol = mix(cMountainWire, cMountainCrest, smoothstep(0.4, 1.0, elevNorm));
            vec3 finalMountain = mountainSurface + mountainWireCol * lineIntensity * (1.3 + uBass * 0.7);

            // -----------------------------------------------------------------
            // Glowing Neon River Rendering
            // -----------------------------------------------------------------
            float riverNorm = clamp(1.0 - (vDistToRiver / 3.6), 0.0, 1.0);

            // Animated river rapids / current flow streaks
            float currentWave = sin(vWorldPos.y * 0.75 - uTime * 14.0 + sin(vWorldPos.x * 2.0) * 1.4);
            float currentStreak = smoothstep(0.2, 0.9, currentWave);

            // River Color Palette
            vec3 cRiverDeep = vec3(0.0, 0.75, 1.0);       // Electric Cyan
            vec3 cRiverMid = vec3(0.0, 1.0, 0.85);        // Turquoise
            vec3 cRiverSunReflect = vec3(1.0, 0.05, 0.7); // Sun reflection magenta
            vec3 cRiverCore = vec3(1.0, 0.92, 0.35);      // Golden solar crest
            vec3 cRiverWhite = vec3(1.0, 1.0, 1.0);       // White rapids

            vec3 riverBase = mix(cRiverDeep, cRiverSunReflect, smoothstep(0.0, 0.8, riverNorm));
            vec3 riverGlint = mix(cRiverMid, cRiverCore, currentStreak);
            vec3 finalRiver = mix(riverBase, riverGlint, currentStreak * 0.65);

            // Center golden sun glint channel
            float sunChannel = pow(riverNorm, 3.5);
            finalRiver = mix(finalRiver, cRiverCore, sunChannel * 0.85);
            if (uBass > 0.4) {
                finalRiver = mix(finalRiver, cRiverWhite, (uBass - 0.4) * 0.8);
            }

            // Glowing foam border where water touches canyon banks
            float foamEdge = smoothstep(0.0, 0.18, riverNorm) * smoothstep(0.45, 0.12, riverNorm);
            finalRiver += vec3(0.0, 1.0, 0.9) * foamEdge * 2.2;

            // Combine River and Mountains
            float riverAlpha = smoothstep(0.0, 0.25, riverNorm);
            vec3 terrainCol = mix(finalMountain, finalRiver * (1.4 + uBass * 0.6), riverAlpha);

            // Horizon atmospheric twilight fog
            float horizonFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
            float sideFade = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
            float alpha = clamp(0.35 + lineIntensity * 0.75 + riverAlpha * 0.8, 0.0, 1.0) * horizonFade * sideFade;

            if (alpha < 0.005) discard;
            gl_FragColor = vec4(terrainCol * alpha, alpha);
        }
    `
};

// =============================================================================
// Retro 80s Outrun Sun Shader (FX 11)
// Iconic Segmented Sun with Horizontal Blinds, Fiery Gradient & Corona Halo
// =============================================================================
const RetroSunShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uBass: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uBass;

        void main() {
            vec2 centeredUv = (vUv - vec2(0.5)) * 2.0;
            float dist = length(centeredUv);

            // Sun disk base
            float sunMask = smoothstep(1.0, 0.97, dist);

            // Horizontal Blinds Cutouts in lower half of sun
            float sunY = centeredUv.y;
            if (sunY < 0.25) {
                float blindFreq = 16.0;
                float blindPhase = fract((sunY + uTime * 0.03) * blindFreq);
                // Blinds get progressively thicker towards the bottom
                float blindThickness = smoothstep(0.25, -0.95, sunY);
                float blindCut = step(blindThickness * 0.52, blindPhase);
                sunMask *= blindCut;
            }

            // Fiery 80s Outrun Sun Vertical Gradient
            // Top: Brilliant Solar Yellow -> Middle: Neon Orange -> Bottom: Hot Fluorescent Magenta
            float gradY = clamp((sunY + 1.0) * 0.5, 0.0, 1.0);
            vec3 cSunTop = vec3(1.0, 0.95, 0.20);      // Solar Gold
            vec3 cSunMid = vec3(1.0, 0.45, 0.02);      // Neon Orange
            vec3 cSunBottom = vec3(1.0, 0.02, 0.55);   // Hot Magenta

            vec3 sunColor;
            if (gradY > 0.5) {
                sunColor = mix(cSunMid, cSunTop, (gradY - 0.5) * 2.0);
            } else {
                sunColor = mix(cSunBottom, cSunMid, gradY * 2.0);
            }

            // Corona Glow & Radial Sun Rays
            float corona = pow(clamp(1.0 - dist * 0.45, 0.0, 1.0), 3.0) * (0.65 + uBass * 0.55);
            float sunRay = pow(max(0.0, cos(atan(centeredUv.y, centeredUv.x) * 12.0 + uTime * 0.15)), 6.0) * (1.0 - smoothstep(0.0, 1.3, dist)) * 0.25;

            vec3 finalSun = sunColor * (sunMask * 1.5 + corona + sunRay);
            float alpha = clamp(sunMask + corona * 0.75 + sunRay * 0.5, 0.0, 1.0);

            if (alpha < 0.005) discard;
            gl_FragColor = vec4(finalSun * alpha, alpha);
        }
    `
};

// =============================================================================
// Synthwave Twilight Sky & Vector Stars Shader (FX 11)
// =============================================================================
const SynthwaveSkyShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uBass: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uBass;

        void main() {
            // Twilight Sky Gradient (Deep Cosmic Violet -> Sunset Magenta Horizon)
            vec3 cSkyTop = vec3(0.02, 0.00, 0.08);
            vec3 cSkyMid = vec3(0.14, 0.01, 0.25);
            vec3 cSkyHorizon = vec3(0.65, 0.02, 0.45);

            vec3 skyCol = mix(cSkyHorizon, cSkyMid, smoothstep(0.0, 0.45, vUv.y));
            skyCol = mix(skyCol, cSkyTop, smoothstep(0.45, 1.0, vUv.y));

            // Distant twinkling 80s vector stars
            vec2 starGrid = fract(vUv * vec2(60.0, 30.0)) - 0.5;
            float starHash = fract(sin(dot(floor(vUv * vec2(60.0, 30.0)), vec2(12.9898, 78.233))) * 43758.5453);
            float isStar = step(0.92, starHash);
            float starTwinkle = sin(uTime * 4.0 + starHash * 30.0) * 0.5 + 0.5;
            float starDist = length(starGrid);
            float star = smoothstep(0.12, 0.02, starDist) * isStar * starTwinkle * step(0.3, vUv.y);

            skyCol += vec3(0.9, 0.95, 1.0) * star * 1.5;

            // Horizon neon laser band
            float horizonBand = smoothstep(0.06, 0.0, abs(vUv.y - 0.02)) * (0.8 + uBass * 0.5);
            skyCol += vec3(1.0, 0.1, 0.6) * horizonBand;

            gl_FragColor = vec4(skyCol, 0.95);
        }
    `
};

// Full-Screen Spiral Galaxy Cosmic Vortex Shader
const PlasmaNebulaShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uMid: { value: 0.0 },
        uPulse: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform float uPulse;
        varying vec2 vUv;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy));
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
            vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
            m = m * m; m = m * m;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.48;
            vec2 shift = vec2(100.0);
            mat2 rot = mat2(cos(0.55), sin(0.55), -sin(0.55), cos(0.55));
            for (int i = 0; i < 4; ++i) {
                v += a * (snoise(p) * 0.5 + 0.5);
                p = rot * p * 2.1 + shift;
                a *= 0.45;
            }
            return v;
        }

        void main() {
            vec2 uv = (vUv - 0.5) * vec2(2.6, 1.6);
            float t = uTime * 0.16;

            float r = length(uv);
            float theta = atan(uv.y, uv.x);

            float vortexPull = theta - 3.8 * log(max(0.04, r)) - t * 0.7;
            float armProfile1 = pow(clamp(cos(vortexPull) * 0.5 + 0.5, 0.0, 1.0), 4.2);
            float armProfile2 = pow(clamp(cos(vortexPull + 3.14159) * 0.5 + 0.5, 0.0, 1.0), 4.2);
            float spiralArms = (armProfile1 + armProfile2) * smoothstep(1.8, 0.12, r);

            vec2 swirl = vec2(cos(theta + t * 0.25), sin(theta + t * 0.25)) * r;
            float dustNoise = fbm(swirl * 1.8 + vec2(t * 0.3, t * 0.2));
            float dustFilament = pow(clamp(dustNoise - 0.22, 0.0, 1.0) / 0.78, 2.0) * 0.6;

            float colorPhase = sin(uTime * 0.07) * 0.5 + 0.5;

            vec3 p1_arm  = vec3(0.0, 0.95, 0.98);
            vec3 p1_glow = vec3(0.95, 0.1, 0.65);
            vec3 p1_core = vec3(1.0, 0.96, 0.75);

            vec3 p2_arm  = vec3(0.0, 0.98, 0.65);
            vec3 p2_glow = vec3(0.7, 0.15, 0.98);
            vec3 p2_core = vec3(0.9, 0.96, 1.0);

            vec3 p3_arm  = vec3(1.0, 0.68, 0.12);
            vec3 p3_glow = vec3(1.0, 0.18, 0.45);
            vec3 p3_core = vec3(1.0, 0.98, 0.7);

            vec3 c_arm, c_glow, c_core;
            if (colorPhase < 0.5) {
                float w = colorPhase * 2.0;
                c_arm  = mix(p1_arm, p2_arm, w);
                c_glow = mix(p1_glow, p2_glow, w);
                c_core = mix(p1_core, p2_core, w);
            } else {
                float w = (colorPhase - 0.5) * 2.0;
                c_arm  = mix(p2_arm, p3_arm, w);
                c_glow = mix(p2_glow, p3_glow, w);
                c_core = mix(p2_core, p3_core, w);
            }

            vec3 col = c_glow * dustFilament * 0.85;
            col += c_arm * spiralArms * (1.6 + uBass * 0.5);

            float nucleus = pow(smoothstep(0.42, 0.0, r), 2.8) * (2.6 + uBass * 1.0 + uPulse * 0.6);
            col += c_core * nucleus;

            float alpha = smoothstep(1.9, 0.1, r) * clamp(length(col) * 1.35, 0.0, 0.98);
            if (alpha < 0.005) discard;
            gl_FragColor = vec4(col * alpha, alpha);
        }
    `
};

// =============================================================================
// Authentic High-Resolution Matrix Digital Code Rain Shader
// Features: Procedural Katakana/Cypher Glyph Atlas Sampling, Multi-Layer 3D Depth,
// Dynamic Real-Time Glyph Mutation, Blazing Hot-White Stream Heads, and Audio Overdrive
// =============================================================================
const MatrixCodeRainShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uMid: { value: 0.0 },
        uGlitch: { value: 0.0 },
        uGlyphMap: { value: null }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform float uGlitch;
        uniform sampler2D uGlyphMap;

        // High-precision pseudo-random hash
        float hash12(vec2 p) {
            vec3 p3  = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
        }

        // Sample a single digital rain layer
        // numCols: number of columns, speedMult: speed scale, layerAlpha: opacity, depthTier: layer index
        vec4 renderRainLayer(vec2 uv, float numCols, float speedMult, float depthTier, float time, float bass, float glitch) {
            float numRows = numCols * (9.0 / 16.0) * 1.35;

            // Column index & fractional UV across column
            float colIdx = floor(uv.x * numCols);
            float colUvX = fract(uv.x * numCols);

            // Per-column speed and start-time staggered offset
            float colSeed = hash12(vec2(colIdx, depthTier * 17.13));
            float speed = (0.35 + colSeed * 0.65) * speedMult;
            float colDelay = hash12(vec2(colIdx * 3.17, depthTier * 9.41)) * 10.0;

            // Stream length and drop frequency
            float streamCycle = fract((1.0 - uv.y) * 0.45 + (time + colDelay) * speed * 0.25);
            
            // Row index along the column
            float rowIdx = floor(uv.y * numRows);
            float rowUvY = fract(uv.y * numRows);

            // Authentic Katakana / Cypher Glyph Selection in 8x8 Texture Atlas (64 glyphs)
            float baseGlyph = floor(hash12(vec2(colIdx, rowIdx + depthTier * 31.0)) * 64.0);
            // Dynamic real-time character mutation (glyphs change in place as the code falls)
            float mutateRate = 8.0 + glitch * 30.0 + bass * 12.0;
            float mutateSeed = floor(time * mutateRate + hash12(vec2(colIdx, rowIdx)) * 20.0);
            float isMutating = step(0.72 - bass * 0.25, hash12(vec2(colIdx, rowIdx + mutateSeed * 0.1)));
            float activeGlyph = mod(baseGlyph + isMutating * floor(hash12(vec2(colIdx, mutateSeed)) * 64.0), 64.0);

            // Compute UV inside the 8x8 glyph texture atlas
            float atlasCol = mod(activeGlyph, 8.0);
            float atlasRow = floor(activeGlyph / 8.0);

            // Add margin padding so glyphs don't touch cell edges
            vec2 glyphCellUv = vec2(
                clamp((colUvX - 0.08) / 0.84, 0.0, 1.0),
                clamp((rowUvY - 0.08) / 0.84, 0.0, 1.0)
            );

            vec2 atlasUv = (vec2(atlasCol, atlasRow) + glyphCellUv) / 8.0;
            float glyphLum = texture2D(uGlyphMap, atlasUv).r;

            // Character margin mask
            float cellMask = smoothstep(0.0, 0.08, colUvX) * smoothstep(1.0, 0.92, colUvX) *
                             smoothstep(0.0, 0.08, rowUvY) * smoothstep(1.0, 0.92, rowUvY);

            // Stream intensity: Leading White-Hot Head + Exponential Phosphor Trail
            float head = smoothstep(0.92, 0.99, streamCycle);
            float trail = pow(streamCycle, 2.8) * smoothstep(0.0, 0.12, streamCycle);

            // Colors
            vec3 cHeadWhite = vec3(0.92, 1.0, 0.96);     // Blazing white-hot core
            vec3 cHeadLime  = vec3(0.40, 1.0, 0.65);     // Electric lime corona
            vec3 cVibrantGrn = vec3(0.05, 1.0, 0.35);    // High-energy Matrix green
            vec3 cClassicGrn = vec3(0.00, 0.72, 0.20);   // Classic terminal green
            vec3 cDarkPhosph = vec3(0.00, 0.22, 0.06);   // Decaying background phosphor

            vec3 trailColor = mix(cDarkPhosph, cClassicGrn, smoothstep(0.0, 0.6, trail));
            trailColor = mix(trailColor, cVibrantGrn, smoothstep(0.6, 0.95, trail));

            vec3 headColor = mix(cHeadLime, cHeadWhite, head);
            vec3 finalColor = mix(trailColor, headColor, head * 1.5);

            // Audio boost on bass impacts
            finalColor += cVibrantGrn * (bass * 0.45);

            float totalIntensity = (trail * 0.9 + head * 2.2) * glyphLum * cellMask;
            return vec4(finalColor, totalIntensity);
        }

        void main() {
            vec2 uv = vUv;

            // 1. Digital Kick Glitch & Horizontal Slice Jitter
            if (uBass > 0.55 || uGlitch > 0.4) {
                float sliceY = floor(uv.y * 32.0);
                float sliceHash = hash12(vec2(sliceY, floor(uTime * 24.0)));
                if (sliceHash > 0.78) {
                    uv.x += sin(uTime * 60.0 + sliceY) * 0.025 * (uBass + uGlitch);
                }
            }

            // 2. Render 3 Authentic Parallax Rain Layers (Deep Background, Midground, Foreground)
            // Layer 0: Fine dense background rain (120 columns)
            vec4 layerBg = renderRainLayer(uv, 120.0, 0.55, 0.0, uTime, uBass, uGlitch);
            
            // Layer 1: Midground classic Matrix stream (85 columns)
            vec4 layerMid = renderRainLayer(uv + vec2(0.005, 0.0), 85.0, 0.85, 1.0, uTime, uBass, uGlitch);

            // Layer 2: Foreground crisp radiant stream (55 columns)
            vec4 layerFg = renderRainLayer(uv + vec2(0.012, 0.0), 55.0, 1.25, 2.0, uTime, uBass, uGlitch);

            // Composite layers with additive phosphor blending
            vec3 finalCol = layerBg.rgb * layerBg.a * 0.35 +
                            layerMid.rgb * layerMid.a * 0.85 +
                            layerFg.rgb * layerFg.a * 1.25;

            float finalAlpha = clamp(layerBg.a * 0.4 + layerMid.a * 0.85 + layerFg.a * 1.2, 0.0, 1.0);

            // 3. CRT Scanlines & Screen Edge Vignette
            float scanline = sin(uv.y * 420.0) * 0.12 + 0.88;
            float vignette = smoothstep(0.75, 0.20, length(uv - 0.5) * 0.85);

            finalCol *= scanline * vignette;
            finalAlpha *= vignette;

            if (finalAlpha < 0.004) discard;
            gl_FragColor = vec4(finalCol * (1.0 + uBass * 0.3), finalAlpha);
        }
    `
};

// DJ Deck Scrolling Waveforms Shader (3-Band Multi-Frequency Spectral History & Dual Deck Phase Alignment)
const DJDeckWaveformShader = {
    uniforms: {
        uAudioHistory: { value: null },
        uHeadPos: { value: 0.0 },
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uMid: { value: 0.0 },
        uTreble: { value: 0.0 },
        uTransient: { value: 0.0 },
        uBPM: { value: 126.0 },
        uDeck2BPM: { value: 126.0 },
        uBeatPhase: { value: 0.0 },
        uTrackProgress: { value: 0.35 },
        uDeck2Progress: { value: 0.18 },
        uPlayState: { value: 1.0 },
        uZoom: { value: 0.32 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D uAudioHistory;
        uniform float uHeadPos;
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform float uTreble;
        uniform float uTransient;
        uniform float uBPM;
        uniform float uDeck2BPM;
        uniform float uBeatPhase;
        uniform float uTrackProgress;
        uniform float uDeck2Progress;
        uniform float uPlayState;
        uniform float uZoom;

        void main() {
            vec2 uv = vUv;
            vec3 col = vec3(0.015, 0.02, 0.035);
            float alpha = 0.0;
            float playheadDist = abs(uv.x - 0.5);

            // -----------------------------------------------------------------
            // 1. REGION SPLIT: Deck 1 (Top), Center Phase Bar, Deck 2 (Bottom)
            // -----------------------------------------------------------------
            bool isDeck1 = uv.y > 0.515;
            bool isDeck2 = uv.y < 0.485;
            bool isCenterPhase = !isDeck1 && !isDeck2;

            // -----------------------------------------------------------------
            // 2. CENTER BEAT-MATCHING PHASE METER (uv.y in [0.485, 0.515])
            // -----------------------------------------------------------------
            if (isCenterPhase) {
                col = vec3(0.04, 0.06, 0.09);
                alpha = 0.95;

                // 4-Beat Bar Indicator Blocks (Engine DJ / Prime 4 Beat Keeper)
                float phaseBoxW = 0.08;
                float phaseSpacing = 0.10;
                for (int b = 0; b < 4; b++) {
                    float boxCenter = 0.5 + float(b - 2) * phaseSpacing + (phaseSpacing * 0.5);
                    float distFromBlock = abs(uv.x - boxCenter);
                    if (distFromBlock < (phaseBoxW * 0.45) && abs(uv.y - 0.5) < 0.010) {
                        float beatIdx = float(b);
                        float currentBeat = mod(uBeatPhase * 4.0, 4.0);
                        bool isActive = abs(currentBeat - beatIdx) < 0.8 || (b == 0 && uTransient > 0.5);
                        if (isActive) {
                            col += vec3(0.0, 0.95, 0.85) * (1.2 + uTransient * 0.8);
                        } else {
                            col += vec3(0.12, 0.18, 0.25);
                        }
                    }
                }

                // Center zero alignment needle
                float pNeedle = 1.0 - smoothstep(0.0, 0.003, playheadDist);
                col += vec3(1.0, 0.2, 0.3) * pNeedle * 2.0;

                gl_FragColor = vec4(col, alpha);
                return;
            }

            // -----------------------------------------------------------------
            // 3. MAIN DECK RENDERING (Deck 1 or Deck 2)
            // -----------------------------------------------------------------
            float waveCenterY = isDeck1 ? 0.770 : 0.280;
            float waveHalfH   = 0.185;

            float miniCenterY = isDeck1 ? 0.548 : 0.058;
            float miniHalfH   = 0.018;

            // Full Track Mini-Overview Stripe
            if (abs(uv.y - miniCenterY) < miniHalfH) {
                float normMiniY = (uv.y - miniCenterY) / miniHalfH;
                float trackProg = isDeck1 ? uTrackProgress : uDeck2Progress;

                // Structural energy profile contour
                float posFactor = uv.x * 3.14159 * 6.0;
                float songEnergy = 0.35 + sin(posFactor) * 0.25 + cos(posFactor * 2.3) * 0.15 + sin(posFactor * 5.1) * 0.1;
                songEnergy = clamp(songEnergy, 0.1, 0.9);

                float miniDistY = abs(normMiniY);
                float inMiniWave = 1.0 - smoothstep(songEnergy - 0.1, songEnergy, miniDistY);

                vec3 miniWaveColor = isDeck1 
                    ? mix(vec3(0.0, 0.4, 0.9), vec3(0.0, 0.9, 0.8), miniDistY)
                    : mix(vec3(0.9, 0.2, 0.1), vec3(1.0, 0.7, 0.1), miniDistY);

                if (uv.x < trackProg) {
                    col = miniWaveColor * inMiniWave * 0.45 + vec3(0.02, 0.04, 0.06);
                } else {
                    col = miniWaveColor * inMiniWave * 0.95 + vec3(0.03, 0.06, 0.08);
                }

                // Mini Playhead position marker
                float miniPlayheadDist = abs(uv.x - trackProg);
                float miniPlayhead = 1.0 - smoothstep(0.0, 0.003, miniPlayheadDist);
                col += vec3(1.0, 1.0, 1.0) * miniPlayhead * 2.5;

                // Hot Cue dots on overview strip
                if (abs(uv.x - 0.10) < 0.004) col += vec3(0.0, 1.0, 0.4) * 1.8;
                if (abs(uv.x - 0.32) < 0.004) col += vec3(1.0, 0.0, 0.8) * 1.8;
                if (abs(uv.x - 0.58) < 0.004) col += vec3(0.0, 0.8, 1.0) * 1.8;
                if (abs(uv.x - 0.78) < 0.004) col += vec3(1.0, 0.8, 0.0) * 1.8;

                // Border
                float miniBorder = 1.0 - smoothstep(0.0, 0.003, abs(abs(uv.y - miniCenterY) - miniHalfH));
                col += (isDeck1 ? vec3(0.0, 0.6, 0.9) : vec3(0.9, 0.4, 0.1)) * miniBorder * 0.5;

                alpha = 0.95;
                gl_FragColor = vec4(col, alpha);
                return;
            }

            // Main Waveform Window
            if (abs(uv.y - waveCenterY) <= waveHalfH) {
                float normDeckY = (uv.y - waveCenterY) / waveHalfH;
                float absDeckY = abs(normDeckY);

                // Sample Live Rolling Audio History Buffer
                float bpmVal = isDeck1 ? uBPM : uDeck2BPM;
                float zoomFactor = uZoom;

                float texU = fract(uHeadPos + (uv.x - 0.5) * zoomFactor);
                float texV = isDeck1 ? 0.25 : 0.75;

                vec4 audioSlice = texture2D(uAudioHistory, vec2(texU, texV));
                float rawBass = audioSlice.r;
                float rawMid  = audioSlice.g;
                float rawHigh = audioSlice.b;
                float rawHit  = audioSlice.a;

                // Center playhead immediate reactivity boost
                float playheadProximity = exp(-playheadDist * 25.0);
                if (isDeck1) {
                    rawBass = mix(rawBass, max(rawBass, uBass), playheadProximity * 0.8);
                    rawMid  = mix(rawMid,  max(rawMid,  uMid),  playheadProximity * 0.8);
                    rawHigh = mix(rawHigh, max(rawHigh, uTreble), playheadProximity * 0.8);
                    rawHit  = mix(rawHit,  max(rawHit,  uTransient), playheadProximity * 0.9);
                }

                // Micro audio sample comb texture (44.1kHz audio tooth styling)
                float microSample = fract(sin(texU * 1024.0 + floor(uv.x * 320.0) * 2.1) * 43758.5453);
                float fineComb = 0.88 + microSample * 0.24;

                // 3-Band Height Envelopes:
                // 1. Sub-Bass (Low Core)
                float bassHeight = (rawBass * 0.52 + rawHit * 0.35 + 0.05) * (1.0 + (isDeck1 ? uBass : 0.0) * 0.2);
                bassHeight = clamp(bassHeight, 0.04, 0.95);
                float bassLayer = 1.0 - smoothstep(bassHeight - 0.03, bassHeight + 0.01, absDeckY);

                // 2. Mid-Range (Vocals / Synths)
                float midHeight = (rawMid * 0.72 + rawBass * 0.25 + 0.08) * fineComb * (1.0 + (isDeck1 ? uMid : 0.0) * 0.15);
                midHeight = clamp(midHeight, 0.06, 0.98);
                float midLayer = 1.0 - smoothstep(midHeight - 0.03, midHeight + 0.01, absDeckY);

                // 3. Highs & Transients (Hi-hats, claps, transients)
                float highHeight = (rawHigh * 0.92 + rawHit * 0.55 + rawMid * 0.20 + 0.05) * fineComb * (1.0 + (isDeck1 ? uTreble : 0.0) * 0.2);
                highHeight = clamp(highHeight, 0.05, 1.0);
                float highLayer = 1.0 - smoothstep(highHeight - 0.02, highHeight + 0.01, absDeckY);

                // Authentic 3-Band Color Palettes
                // Deck 1: Electric Blue / Neon Cyan / Ice White
                vec3 d1_bass = vec3(0.04, 0.25, 0.98);
                vec3 d1_mid  = vec3(0.0, 0.92, 0.72);
                vec3 d1_high = vec3(0.92, 0.98, 1.0);

                // Deck 2: Crimson Red / Amber Orange / Champagne Gold
                vec3 d2_bass = vec3(0.98, 0.12, 0.20);
                vec3 d2_mid  = vec3(1.0, 0.58, 0.05);
                vec3 d2_high = vec3(1.0, 0.95, 0.65);

                vec3 colBass = isDeck1 ? d1_bass : d2_bass;
                vec3 colMid  = isDeck1 ? d1_mid  : d2_mid;
                vec3 colHigh = isDeck1 ? d1_high : d2_high;

                vec3 waveCol = colBass * bassLayer * 1.15 + colMid * midLayer * 1.35 + colHigh * highLayer * 1.85;

                // Filament zero-line
                float zeroLine = 1.0 - smoothstep(0.0, 0.03, absDeckY);
                waveCol += (isDeck1 ? vec3(0.1, 0.7, 1.0) : vec3(1.0, 0.5, 0.1)) * zeroLine * 0.35;

                // Beat Grid & Bar Markers
                float bps = bpmVal / 60.0;
                float beatsVisible = (1.0 / zoomFactor) * 8.0;
                float beatPos = (uv.x - 0.5) * beatsVisible + (uTime * bps * (isDeck1 ? 1.0 : 0.98)) + (isDeck1 ? 0.0 : 0.5);

                float beatFrac = abs(fract(beatPos) - 0.5);
                float barFrac  = abs(fract(beatPos / 4.0) - 0.5);

                float beatLine = 1.0 - smoothstep(0.0, 0.014, beatFrac);
                float barLine  = 1.0 - smoothstep(0.0, 0.010, barFrac);

                waveCol += vec3(0.15, 0.30, 0.45) * beatLine * 0.4;
                waveCol += (isDeck1 ? vec3(0.95, 0.15, 0.35) : vec3(1.0, 0.85, 0.25)) * barLine * 0.9;

                // Center Laser Playhead Needle (x = 0.5)
                float playheadCore = 1.0 - smoothstep(0.0, 0.0022, playheadDist);
                float playheadHalo = exp(-playheadDist * 160.0) * (0.8 + uTransient * 1.2);
                vec3 playheadLaserCol = vec3(1.0, 0.15, 0.30);
                waveCol += vec3(1.0, 1.0, 1.0) * playheadCore * 3.0 + playheadLaserCol * playheadHalo * 1.5;

                // Playhead top & bottom arrow pointers
                if (normDeckY > 0.88 && abs(uv.x - 0.5) < 0.015) {
                    waveCol += vec3(1.0, 0.2, 0.4) * 2.2;
                }
                if (normDeckY < -0.88 && abs(uv.x - 0.5) < 0.015) {
                    waveCol += vec3(1.0, 0.2, 0.4) * 2.2;
                }

                // Window border
                float windowBorder = 1.0 - smoothstep(0.0, 0.02, abs(absDeckY - 1.0));
                waveCol += (isDeck1 ? vec3(0.0, 0.4, 0.8) : vec3(0.8, 0.3, 0.1)) * windowBorder * 0.45;

                // Smooth horizontal edge fade
                float edgeFade = smoothstep(0.0, 0.035, uv.x) * smoothstep(1.0, 0.965, uv.x);
                float finalAlpha = clamp(bassLayer + midLayer + highLayer + barLine * 0.5 + playheadCore + playheadHalo * 0.5 + windowBorder * 0.3, 0.0, 1.0);
                finalAlpha *= edgeFade;

                col = waveCol * edgeFade;
                alpha = finalAlpha;

                gl_FragColor = vec4(col, alpha);
                return;
            }

            float deckEdgeFade = smoothstep(0.0, 0.035, uv.x) * smoothstep(1.0, 0.965, uv.x);
            col = vec3(0.01, 0.015, 0.025) * deckEdgeFade;
            alpha = 0.6 * deckEdgeFade;

            gl_FragColor = vec4(col, alpha);
        }
    `
};

// 70s Disco Dancefloor Shader (Saturday Night Fever Illuminated Tile Grid)
const DiscoFloorShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uBPM: { value: 126.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uBass;
        uniform float uBPM;

        float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

        void main() {
            vec2 uv = vUv;
            vec2 grid = vec2(10.0, 10.0);
            vec2 cell = floor(uv * grid);
            vec2 f = fract(uv * grid);

            // Grout divider lines between illuminated tiles
            float grout = smoothstep(0.0, 0.06, f.x) * smoothstep(1.0, 0.94, f.x) *
                          smoothstep(0.0, 0.06, f.y) * smoothstep(1.0, 0.94, f.y);

            // Saturday Night Fever Color Palette
            float beat = floor(uTime * (uBPM / 60.0) * 2.0);
            float cellSeed = hash2(cell + beat * 0.1);

            vec3 colRed    = vec3(1.0, 0.05, 0.15);
            vec3 colGold   = vec3(1.0, 0.85, 0.1);
            vec3 colOrange = vec3(1.0, 0.45, 0.0);
            vec3 colCyan   = vec3(0.0, 0.95, 1.0);
            vec3 colPink   = vec3(1.0, 0.1, 0.7);
            vec3 colLime   = vec3(0.3, 1.0, 0.2);

            vec3 tileCol;
            if (cellSeed < 0.17) tileCol = colRed;
            else if (cellSeed < 0.34) tileCol = colGold;
            else if (cellSeed < 0.50) tileCol = colOrange;
            else if (cellSeed < 0.67) tileCol = colCyan;
            else if (cellSeed < 0.84) tileCol = colPink;
            else tileCol = colLime;

            // Pulse on kick drop
            tileCol *= (1.0 + uBass * 0.75);

            vec3 col = tileCol * grout;
            float alpha = grout * 0.95;

            if (alpha < 0.005) discard;
            gl_FragColor = vec4(col * alpha, alpha);
        }
    `
};

// =============================================================================
const RetroArcadeShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uMid: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;

        const float PI = 3.14159265359;

        // Pac-Man SDF Renderer with Direction Rotation and Chomp Animation
        float drawPacman(vec2 uv, vec2 center, float radius, float angle, float chomp) {
            vec2 p = uv - center;
            float d = length(p);
            if (d > radius + 0.1) return 0.0;
            
            float cosA = cos(-angle);
            float sinA = sin(-angle);
            vec2 rp = vec2(p.x * cosA - p.y * sinA, p.x * sinA + p.y * cosA);
            
            float mouthAngle = abs(atan(rp.y, rp.x));
            float mouth = smoothstep(chomp * 0.9, chomp * 1.1, mouthAngle);
            float circle = smoothstep(radius, radius - 0.06, d);
            return circle * mouth;
        }

        // Arcade Ghost (Blinky, Inky, Pinky, or Vulnerable Scared Blue)
        vec4 drawGhost(vec2 uv, vec2 center, float radius, vec2 lookDir, bool isScared, float flash, vec3 ghostColor) {
            vec2 p = (uv - center) / radius;
            if (abs(p.x) > 1.2 || abs(p.y) > 1.3) return vec4(0.0);
            
            // Dome head & body
            float dome = step(length(vec2(p.x, max(0.0, p.y - 0.15))), 0.85);
            float skirtWave = -0.65 + 0.14 * cos(p.x * 9.42 + uTime * 12.0);
            float bodyRect = step(abs(p.x), 0.85) * step(skirtWave, p.y) * step(p.y, 0.15);
            float bodyMask = max(dome, bodyRect);
            
            if (bodyMask < 0.5) return vec4(0.0);
            
            vec3 baseCol = isScared ? mix(vec3(0.08, 0.22, 0.95), vec3(0.9, 0.9, 0.95), flash) : ghostColor;
            
            if (!isScared) {
                // Sclera
                vec2 eyeL = p - vec2(-0.30, 0.18);
                vec2 eyeR = p - vec2(0.30, 0.18);
                float sclera = step(length(eyeL), 0.26) + step(length(eyeR), 0.26);
                
                // Pupils looking in movement direction
                vec2 pupilL = eyeL - lookDir * 0.10;
                vec2 pupilR = eyeR - lookDir * 0.10;
                float pupil = step(length(pupilL), 0.13) + step(length(pupilR), 0.13);
                
                if (pupil > 0.5) return vec4(vec3(0.05, 0.1, 0.6), 1.0);
                if (sclera > 0.5) return vec4(vec3(1.0), 1.0);
            } else {
                // Scared yellow eyes & wavy mouth
                vec2 eyeL = p - vec2(-0.28, 0.18);
                vec2 eyeR = p - vec2(0.28, 0.18);
                float sEye = step(length(eyeL), 0.10) + step(length(eyeR), 0.10);
                if (sEye > 0.5) return vec4(vec3(1.0, 0.85, 0.2), 1.0);
                
                float mouthWave = -0.28 + 0.07 * sin(p.x * 12.56);
                if (abs(p.y - mouthWave) < 0.05 && abs(p.x) < 0.5) return vec4(vec3(1.0, 0.85, 0.2), 1.0);
            }
            
            return vec4(baseCol, 1.0);
        }

        // Space Invader Cannon Tank (Player Base)
        float drawCannon(vec2 uv, vec2 center) {
            vec2 p = uv - center;
            if (abs(p.x) > 1.6 || abs(p.y) > 1.2) return 0.0;
            
            float base = step(abs(p.x), 1.3) * step(abs(p.y - (-0.35)), 0.25);
            float mid = step(abs(p.x), 0.8) * step(abs(p.y - 0.05), 0.20);
            float turret = step(abs(p.x), 0.22) * step(abs(p.y - 0.45), 0.30);
            return max(base, max(mid, turret));
        }

        // Animated Space Invader Alien
        float drawAlien(vec2 uv, vec2 center, float frame) {
            vec2 p = (uv - center) * 1.8;
            if (abs(p.x) > 1.4 || abs(p.y) > 1.1) return 0.0;
            
            float body = step(abs(p.x), 0.9) * step(abs(p.y), 0.55);
            float ant = step(abs(abs(p.x) - 0.65), 0.14) * step(abs(p.y - 0.8), 0.22);
            float legX = frame < 0.5 ? 1.05 : 0.75;
            float legY = frame < 0.5 ? -0.8 : -0.65;
            float legs = step(abs(abs(p.x) - legX), 0.16) * step(abs(p.y - legY), 0.25);
            float eyes = step(abs(p.x - 0.4), 0.18) * step(abs(p.y - 0.12), 0.16) +
                         step(abs(p.x + 0.4), 0.18) * step(abs(p.y - 0.12), 0.16);
                         
            return clamp(max(body + ant + legs, 0.0) - eyes, 0.0, 1.0);
        }

        // Laser Beam
        float drawLaser(vec2 uv, vec2 laserPos, float lengthH) {
            if (abs(uv.x - laserPos.x) > 0.22) return 0.0;
            if (uv.y < laserPos.y - lengthH || uv.y > laserPos.y) return 0.0;
            float beamCore = smoothstep(0.14, 0.02, abs(uv.x - laserPos.x));
            float trail = smoothstep(laserPos.y - lengthH, laserPos.y, uv.y);
            return beamCore * trail;
        }

        // Explosion particle burst
        float drawExplosion(vec2 uv, vec2 center, float age) {
            if (age < 0.0 || age > 1.0) return 0.0;
            vec2 p = uv - center;
            float r = length(p);
            float ring = smoothstep(0.18, 0.0, abs(r - age * 2.2)) * (1.0 - age);
            float rays = step(0.65, sin(atan(p.y, p.x) * 8.0)) * smoothstep(age * 2.5, 0.0, r) * (1.0 - age);
            return max(ring, rays);
        }

        // Electric Alien Zap, Lightning Arcs & Blast Effect
        float drawAlienZap(vec2 uv, vec2 center, float age, float uTime) {
            if (age < 0.0 || age > 1.0) return 0.0;
            vec2 p = uv - center;
            float r = length(p);
            
            // Expanding electric shockwave ring with lightning jitter
            float jag = sin(atan(p.y, p.x) * 12.0 + uTime * 35.0) * 0.14;
            float ring = smoothstep(0.20, 0.0, abs(r - (age * 2.6 + jag))) * (1.0 - age);
            
            // 8-Way radial electric lightning burst rays
            float angle = atan(p.y, p.x);
            float rays = step(0.62, sin(angle * 8.0 + uTime * 28.0)) * smoothstep(age * 3.0, 0.0, r) * (1.0 - age);
            
            // High-voltage electric crackles / sparks
            float sparkHash = fract(sin(dot(floor(p * 9.0), vec2(17.3, 53.9)) + uTime * 45.0) * 43758.5453);
            float sparks = step(0.84, sparkHash) * smoothstep(1.8, 0.2, r) * (1.0 - age);
            
            return max(ring, max(rays, sparks));
        }

        // Alien Hit Timing in Mode 3 (0.0s to 10.0s)
        float getAlienHitTime(int row, int colIdx) {
            // Row 0 (Bottom row aliens - hit first as cannon sweeps)
            if (row == 0) {
                if (colIdx == 1) return 1.0;
                if (colIdx == 2) return 2.0;
                if (colIdx == 0) return 3.1;
                if (colIdx == -1) return 4.2;
                if (colIdx == -2) return 5.3;
                if (colIdx == 3) return 6.6;
                if (colIdx == -3) return 7.8;
            }
            // Row 1 (Middle row aliens - hit once bottom row opens up)
            else if (row == 1) {
                if (colIdx == -1) return 6.0;
                if (colIdx == 0) return 7.4;
                if (colIdx == 1) return 8.5;
                if (colIdx == 2) return 9.1;
            }
            // Row 2 (Top row boss alien)
            else if (row == 2) {
                if (colIdx == 0) return 9.4;
            }
            return 999.0;
        }

        // Parametric perimeter position calculator (Bottom -> Right -> Top -> Left)
        void getPerimeterTransform(float s, out vec2 pos, out float angle, out vec2 lookDir) {
            float norm = fract(s);
            if (norm < 0.342) {
                // Bottom lane moving right
                float t = norm / 0.342;
                pos = vec2(-13.0 + t * 26.0, -6.2);
                angle = 0.0;
                lookDir = vec2(1.0, 0.0);
            } else if (norm < 0.500) {
                // Right lane moving up
                float t = (norm - 0.342) / 0.158;
                pos = vec2(13.0, -6.2 + t * 12.4);
                angle = PI * 0.5;
                lookDir = vec2(0.0, 1.0);
            } else if (norm < 0.842) {
                // Top lane moving left
                float t = (norm - 0.500) / 0.342;
                pos = vec2(13.0 - t * 26.0, 6.2);
                angle = PI;
                lookDir = vec2(-1.0, 0.0);
            } else {
                // Left lane moving down
                float t = (norm - 0.842) / 0.158;
                pos = vec2(-13.0, 6.2 - t * 12.4);
                angle = -PI * 0.5;
                lookDir = vec2(0.0, -1.0);
            }
        }

        void main() {
            vec2 uv = (vUv - 0.5) * vec2(32.0, 18.0);
            
            // Scanlines & CRT curvature phosphor vignette
            float scanline = sin(vUv.y * 360.0) * 0.15 + 0.85;
            float vignette = smoothstep(0.72, 0.25, length(vUv - 0.5) * 0.85);

            vec3 col = vec3(0.0);
            float totalAlpha = 0.0;

            // 30-Second Dynamic Narrative Cycle:
            // 0.0s - 10.0s: Mode 1 (Classic Pac-Man run -> Eats Power Pellet -> Pac-Man chases frightened Ghost!)
            // 10.0s - 20.0s: Mode 2 (Pac-Man and Ghost run around the entire screen perimeter)
            // 20.0s - 30.0s: Mode 3 (Space Invader Cannon at the bottom shooting upwards at the invaders & fray)
            float cycle = mod(uTime, 30.0);
            float chomp = abs(sin(uTime * 14.0)) * 0.78;

            // -----------------------------------------------------------------
            // MODE 1: PAC-MAN CHASE & REVERSAL (0s to 10s)
            // -----------------------------------------------------------------
            if (cycle < 10.0) {
                // Background Invaders marching at the top
                float marchX = sin(uTime * 1.5) * 3.5;
                vec2 invUv = uv - vec2(marchX, 5.0);
                vec2 alienGrid = fract(invUv * 0.28) - 0.5;
                float invader = smoothstep(0.24, 0.05, length(alienGrid)) * step(abs(invUv.x), 8.5) * step(abs(invUv.y), 2.2);
                col += vec3(0.0, 1.0, 0.85) * invader * (1.1 + uBass * 0.6);
                totalAlpha = max(totalAlpha, invader);

                vec2 pacPos;
                float pacAngle;
                vec2 ghostPos;
                vec2 ghostLook;
                bool ghostScared = false;
                float ghostFlash = 0.0;

                // Power pellet location
                vec2 pelletPos = vec2(6.5, -4.5);
                bool pelletActive = (cycle < 4.5);

                if (cycle < 4.5) {
                    // Stage 1a: Ghost chases Pac-Man to the right
                    float t = cycle / 4.5;
                    pacPos = vec2(-15.0 + t * 21.5, -4.5);
                    pacAngle = 0.0;
                    ghostPos = vec2(pacPos.x - 3.4, -4.5);
                    ghostLook = vec2(1.0, 0.0);
                    ghostScared = false;
                } else {
                    // Stage 1b: Power Pellet eaten! Ghost runs away to the left; Pac-Man turns & chases!
                    float t = (cycle - 4.5) / 5.5;
                    ghostPos = vec2(6.5 - t * 24.0, -4.5);
                    ghostLook = vec2(-1.0, 0.0);
                    pacPos = vec2(6.5 - t * 27.0, -4.5); // Pac-Man moves faster and catches ghost
                    pacAngle = PI;
                    ghostScared = true;
                    ghostFlash = step(0.65, fract(uTime * 4.0)) * step(3.5, cycle - 4.5);
                }

                // Pac-Man
                float pac = drawPacman(uv, pacPos, 1.25, pacAngle, chomp);
                col += vec3(1.0, 0.92, 0.05) * pac * 1.5;
                totalAlpha = max(totalAlpha, pac);

                // Ghost (Blinky Red or Scared Blue)
                vec4 ghost = drawGhost(uv, ghostPos, 1.25, ghostLook, ghostScared, ghostFlash, vec3(1.0, 0.15, 0.25));
                col = mix(col, ghost.rgb * 1.3, ghost.a);
                totalAlpha = max(totalAlpha, ghost.a);

                // Energizer dots along the lane
                if (abs(uv.y - (-4.5)) < 0.18 && abs(uv.x) < 14.5) {
                    float dotCell = fract(uv.x * 0.6);
                    float dotMask = step(0.72, dotCell);
                    // Dots eaten as Pac-Man moves
                    if (cycle < 4.5) {
                        dotMask *= step(pacPos.x, uv.x);
                    } else {
                        dotMask *= step(uv.x, pacPos.x);
                    }
                    col += vec3(1.0, 0.85, 0.6) * dotMask * 1.2;
                    totalAlpha = max(totalAlpha, dotMask);
                }

                // Flashing Energizer Power Pellet
                if (pelletActive) {
                    float pDist = length(uv - pelletPos);
                    float pellet = smoothstep(0.45, 0.25, pDist) * (sin(uTime * 10.0) * 0.35 + 0.65);
                    col += vec3(1.0, 0.85, 0.4) * pellet * 1.8;
                    totalAlpha = max(totalAlpha, pellet);
                }
            }

            // -----------------------------------------------------------------
            // MODE 2: SCREEN PERIMETER CIRCUIT (10s to 20s)
            // -----------------------------------------------------------------
            else if (cycle < 20.0) {
                float modeTime = cycle - 10.0;
                float progressPac = modeTime * 0.105; // ~1 full perimeter lap
                float progressGhost = progressPac - 0.048; // Ghost following right behind!

                vec2 pacPos;
                float pacAngle;
                vec2 pacLook;
                getPerimeterTransform(progressPac, pacPos, pacAngle, pacLook);

                vec2 ghostPos;
                float ghostAngle;
                vec2 ghostLook;
                getPerimeterTransform(progressGhost, ghostPos, ghostAngle, ghostLook);

                // Pac-Man
                float pac = drawPacman(uv, pacPos, 1.2, pacAngle, chomp);
                col += vec3(1.0, 0.92, 0.05) * pac * 1.5;
                totalAlpha = max(totalAlpha, pac);

                // Pinky / Inky Ghost chasing Pac-Man along the perimeter
                vec3 pinkyCol = vec3(1.0, 0.5, 0.8);
                vec4 ghost = drawGhost(uv, ghostPos, 1.2, ghostLook, false, 0.0, pinkyCol);
                col = mix(col, ghost.rgb * 1.3, ghost.a);
                totalAlpha = max(totalAlpha, ghost.a);

                // Corner Power Pellets at 4 screen corners
                vec2 c1 = vec2(-13.0, -6.2);
                vec2 c2 = vec2(13.0, -6.2);
                vec2 c3 = vec2(13.0, 6.2);
                vec2 c4 = vec2(-13.0, 6.2);
                float pPulse = sin(uTime * 8.0) * 0.4 + 0.6;
                float pellets = (smoothstep(0.42, 0.20, length(uv - c1)) +
                                smoothstep(0.42, 0.20, length(uv - c2)) +
                                smoothstep(0.42, 0.20, length(uv - c3)) +
                                smoothstep(0.42, 0.20, length(uv - c4))) * pPulse;
                col += vec3(1.0, 0.85, 0.3) * pellets * 1.6;
                totalAlpha = max(totalAlpha, pellets);

                // Border Guide Rails & Track Dots
                float isBottom = step(abs(uv.y - (-6.2)), 0.12) * step(abs(uv.x), 13.0);
                float isTop = step(abs(uv.y - 6.2), 0.12) * step(abs(uv.x), 13.0);
                float isRight = step(abs(uv.x - 13.0), 0.12) * step(abs(uv.y), 6.2);
                float isLeft = step(abs(uv.x - (-13.0)), 0.12) * step(abs(uv.y), 6.2);
                float borderTrack = isBottom + isTop + isRight + isLeft;
                float dotStripe = step(0.65, fract((uv.x + uv.y) * 0.5)) * borderTrack;
                col += vec3(0.15, 0.35, 1.0) * dotStripe * 0.8;
                totalAlpha = max(totalAlpha, dotStripe * 0.8);

                // Center Arcade Watermark / Ready Banner
                float centerAlien = drawAlien(uv, vec2(0.0, 0.0), step(0.5, fract(uTime * 1.5)));
                col += vec3(0.0, 1.0, 0.8) * centerAlien * (0.8 + uBass * 0.6);
                totalAlpha = max(totalAlpha, centerAlien);
            }

            // -----------------------------------------------------------------
            // MODE 3: SPACE INVADER CANNON SHOOTOUT (20s to 30s)
            // -----------------------------------------------------------------
            else {
                float modeTime = cycle - 20.0;

                // 1. Space Invader Cannon at the bottom
                float cannonX = sin(uTime * 2.8) * 8.5;
                vec2 cannonPos = vec2(cannonX, -7.0);
                float cannon = drawCannon(uv, cannonPos);
                col += vec3(0.1, 1.0, 0.3) * cannon * (1.3 + uBass * 0.5);
                totalAlpha = max(totalAlpha, cannon);

                // 2. Invader Armada (3 rows of aliens with authentic Zap & Disappear on laser hits)
                float marchOffset = sin(uTime * 2.0) * 4.0;
                float alienFrame = step(0.5, fract(uTime * 2.0));
                for (int row = 0; row < 3; row++) {
                    float rowY = 3.5 + float(row) * 1.5;
                    for (int colIdx = -3; colIdx <= 3; colIdx++) {
                        float colX = float(colIdx) * 3.4 + marchOffset;
                        vec2 aPos = vec2(colX, rowY);
                        float hitT = getAlienHitTime(row, colIdx);

                        // State 1: ALIVE & MARCHING
                        if (modeTime < hitT) {
                            float alien = drawAlien(uv, aPos, alienFrame);
                            vec3 aCol = row == 0 ? vec3(0.0, 1.0, 0.9) : (row == 1 ? vec3(1.0, 0.2, 0.8) : vec3(1.0, 0.9, 0.1));
                            col += aCol * alien * (1.1 + uBass * 0.6);
                            totalAlpha = max(totalAlpha, alien);
                        }
                        // State 2: ZAP & DISINTEGRATE (Laser Impact!)
                        else if (modeTime < hitT + 0.45) {
                            float zapAge = (modeTime - hitT) / 0.45;
                            
                            // High-voltage position jitter
                            vec2 zapJitter = vec2(sin(uTime * 120.0 + float(colIdx) * 7.0), cos(uTime * 105.0 + float(row) * 11.0)) * (0.35 * (1.0 - zapAge));
                            
                            // Strobe chromatic flash
                            float zapStrobe = step(0.5, fract(uTime * 36.0));
                            vec3 zapFlashCol = mix(vec3(1.0, 1.0, 1.0), vec3(0.0, 1.0, 1.0), zapStrobe);
                            zapFlashCol = mix(zapFlashCol, vec3(1.0, 0.9, 0.2), fract(uTime * 18.0));
                            
                            // Disintegrating pixel dissolve
                            float pixelDissolve = fract(sin(dot(floor((uv - aPos) * 12.0), vec2(12.9898, 78.233))) * 43758.5453);
                            float zapAlien = drawAlien(uv + zapJitter, aPos, alienFrame) * step(zapAge * 1.15, pixelDissolve);
                            
                            // Electric lightning arcs & blast shockwave
                            float zapShock = drawAlienZap(uv, aPos, zapAge, uTime);
                            
                            col += zapFlashCol * zapAlien * 2.8;
                            col += vec3(0.2, 1.0, 0.9) * zapShock * 3.0;
                            totalAlpha = max(totalAlpha, clamp(zapAlien + zapShock, 0.0, 1.0));
                        }
                        // State 3: DESTROYED & DISAPPEARED (Completely Gone!)
                        // (Alien is not drawn, leaving empty space)
                    }
                }

                // 3. Laser Beams shot from Cannon upwards
                for (int i = 0; i < 4; i++) {
                    float laserProgress = fract(uTime * 2.5 + float(i) * 0.25);
                    float laserY = -6.2 + laserProgress * 14.5;
                    float laserX = sin((uTime - laserProgress * 0.4) * 2.8) * 8.5;
                    float laser = drawLaser(uv, vec2(laserX, laserY), 2.2);
                    col += vec3(0.2, 1.0, 0.4) * laser * 2.0;
                    totalAlpha = max(totalAlpha, laser);

                    // Explosion impact at the top
                    if (laserProgress > 0.88) {
                        float expAge = (laserProgress - 0.88) / 0.12;
                        float explosion = drawExplosion(uv, vec2(laserX, 7.5), expAge);
                        col += vec3(1.0, 0.85, 0.2) * explosion * 2.2;
                        totalAlpha = max(totalAlpha, explosion);
                    }
                }

                // 4. Pac-Man and Ghost dashing horizontally through the middle lane
                float midRunX = mod(modeTime * 8.0, 36.0) - 18.0;
                vec2 pacPos = vec2(midRunX, -1.2);
                vec2 ghostPos = vec2(midRunX - 3.2, -1.2);

                float pac = drawPacman(uv, pacPos, 1.25, 0.0, chomp);
                col += vec3(1.0, 0.92, 0.05) * pac * 1.5;
                totalAlpha = max(totalAlpha, pac);

                vec4 ghost = drawGhost(uv, ghostPos, 1.25, vec2(1.0, 0.0), false, 0.0, vec3(0.0, 0.95, 1.0)); // Inky Cyan
                col = mix(col, ghost.rgb * 1.3, ghost.a);
                totalAlpha = max(totalAlpha, ghost.a);

                // Middle lane dot trail
                if (abs(uv.y - (-1.2)) < 0.15 && abs(uv.x) < 15.0) {
                    float dotMask = step(0.7, fract(uv.x * 0.55)) * step(pacPos.x, uv.x);
                    col += vec3(1.0, 0.8, 0.4) * dotMask * 1.2;
                    totalAlpha = max(totalAlpha, dotMask);
                }
            }

            // CRT Scanlines & Screen Edge Soft Clip
            col *= scanline;
            float alpha = clamp(totalAlpha, 0.0, 1.0) * vignette;

            if (alpha < 0.005) discard;
            gl_FragColor = vec4(col * (1.0 + uBass * 0.45), alpha);
        }
    `
};

// =============================================================================
// Particle Stream GLSL Shader (Inspired by Szenia Zadvornykh @zadvorsky)
// Features 3D Multi-Strand Spline Flow, Simplex 3D Curl Noise & Smooth Soft Audio Reactivity
// =============================================================================
const ParticleStreamShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uFlowProgress: { value: 0.0 },
        uCurveTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uMid: { value: 0.0 },
        uTreble: { value: 0.0 },
        uColorCycle: { value: 0.0 }
    },
    vertexShader: `
        uniform float uTime;
        uniform float uFlowProgress;
        uniform float uCurveTime;
        uniform float uBass;
        uniform float uMid;
        uniform float uTreble;
        uniform float uColorCycle;

        attribute vec3 aOffset;
        attribute float aProgress;
        attribute float aSpeed;
        attribute float aStrand;
        attribute float aSize;
        attribute vec3 aColor;
        attribute vec2 aSeed;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vSparkle;
        varying float vCoreGlow;

        // Simplex Noise 3D helper functions
        vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
            const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

            vec3 i  = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);

            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);

            vec3 x1 = x0 - i1 + 1.0 * C.xxx;
            vec3 x2 = x0 - i2 + 2.0 * C.xxx;
            vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

            i = mod(i, 289.0);
            vec4 p = permute(permute(permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

            float n_ = 1.0 / 7.0;
            vec3  ns = n_ * D.wyz - D.xzx;

            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);

            vec4 x = x_ * ns.x + ns.yyyy;
            vec4 y = y_ * ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);

            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);

            vec4 s0 = floor(b0) * 2.0 + 1.0;
            vec4 s1 = floor(b1) * 2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));

            vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);

            vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;

            vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
        }

        vec3 snoise3(vec3 p) {
            return vec3(
                snoise(p),
                snoise(p + vec3(43.12, 17.54, 91.32)),
                snoise(p + vec3(119.87, 63.21, 33.45))
            );
        }

        // Analytical 3D Curl Noise for fluid micro-vortices
        vec3 curlNoise(vec3 p) {
            const float e = 0.1;
            vec3 dx = vec3(e, 0.0, 0.0);
            vec3 dy = vec3(0.0, e, 0.0);
            vec3 dz = vec3(0.0, 0.0, e);

            vec3 p_x0 = snoise3(p - dx);
            vec3 p_x1 = snoise3(p + dx);
            vec3 p_y0 = snoise3(p - dy);
            vec3 p_y1 = snoise3(p + dy);
            vec3 p_z0 = snoise3(p - dz);
            vec3 p_z1 = snoise3(p + dz);

            float x = (p_y1.z - p_y0.z) - (p_z1.y - p_z0.y);
            float y = (p_z1.x - p_z0.x) - (p_x1.z - p_x0.z);
            float z = (p_x1.y - p_x0.y) - (p_y1.x - p_y0.x);

            return vec3(x, y, z) / (2.0 * e);
        }

        // 3D Space Curve Generator for Stream Strands (Graceful & Majestic Flow)
        vec3 getCurvePoint(float t, float strand, float curveTime) {
            const float PI = 3.14159265359;
            vec3 p = vec3(0.0);

            // Longitudinal translation along Z axis: deep background (-55.0) to foreground (+12.0)
            float z = -55.0 + t * 68.0;

            if (strand < 0.5) {
                // Strand 0: Central serpentine wave
                float wave1 = sin(t * PI * 2.0 + curveTime * 0.15);
                float wave2 = cos(t * PI * 4.0 - curveTime * 0.10);
                p.x = wave1 * 8.5 + sin(t * PI * 5.0) * 2.0;
                p.y = wave2 * 5.0 + cos(t * PI * 2.5) * 1.5;
                p.z = z;
            } else if (strand < 1.5) {
                // Strand 1: Clockwise corkscrew helix braiding around central stream
                float theta = t * PI * 10.0 + curveTime * 0.25;
                float r = 4.5 + sin(t * PI * 3.0 + curveTime * 0.12) * 1.5;
                float cx = sin(t * PI * 2.0 + curveTime * 0.15) * 8.5;
                float cy = cos(t * PI * 4.0 - curveTime * 0.10) * 5.0;
                p.x = cx + cos(theta) * r;
                p.y = cy + sin(theta) * r;
                p.z = z;
            } else if (strand < 2.5) {
                // Strand 2: Counter-clockwise interwoven ribbon
                float theta = -t * PI * 10.0 - curveTime * 0.25 + PI;
                float r = 4.5 + cos(t * PI * 3.0 + curveTime * 0.12) * 1.5;
                float cx = sin(t * PI * 2.0 + curveTime * 0.15) * 8.5;
                float cy = cos(t * PI * 4.0 - curveTime * 0.10) * 5.0;
                p.x = cx + cos(theta) * r;
                p.y = cy + sin(theta) * r;
                p.z = z;
            } else if (strand < 3.5) {
                // Strand 3: Sweeping Infinity figure-8 orbital wing
                float angle = t * PI * 2.0;
                p.x = sin(angle + curveTime * 0.08) * 15.0;
                p.y = sin(angle * 2.0 + curveTime * 0.06) * 7.0;
                p.z = -50.0 + pow(sin(t * PI), 0.75) * 62.0;
            } else {
                // Strand 4: Core particle beam with soft gentle spiral
                float slowTheta = t * PI * 14.0 + curveTime * 0.4;
                float tightR = 1.6 + sin(t * PI * 4.0) * 0.6;
                p.x = sin(t * PI * 2.0 + curveTime * 0.15) * 4.5 + cos(slowTheta) * tightR;
                p.y = cos(t * PI * 2.0 + curveTime * 0.15) * 3.0 + sin(slowTheta) * tightR;
                p.z = z;
            }

            return p;
        }

        void main() {
            const float PI = 3.14159265359;

            // Smooth monotonic progressive flow (ZERO phase snapping / silky smooth flow)
            float t = fract(aProgress + uFlowProgress * aSpeed);

            // Compute smooth curve point
            vec3 curvePos = getCurvePoint(t, aStrand, uCurveTime);

            // Soft, gentle radial dispersion modulated softly by bass
            float spreadMultiplier = 1.0 + uBass * 0.35;
            vec3 offsetVec = aOffset * spreadMultiplier;

            // Slow, fluid curl noise turbulence
            vec3 noiseLookup = (curvePos * 0.06) + vec3(uTime * 0.04, uTime * 0.03, uTime * 0.02);
            vec3 curl = curlNoise(noiseLookup);
            float turbAmp = 0.5 + uBass * 0.75;
            vec3 turbulentDisplacement = curl * turbAmp;

            // Gentle harmonic micro wave ripple
            float ripple = sin(t * PI * 8.0 + uTime * 1.5 + aSeed.x * 6.28) * (uMid * 0.25 + uTreble * 0.15);
            vec3 rippleVec = vec3(sin(aSeed.y * PI * 2.0), cos(aSeed.y * PI * 2.0), 0.0) * ripple;

            // Final 3D particle world position
            vec3 finalPos = curvePos + offsetVec + turbulentDisplacement + rippleVec;

            vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            // Smooth, gentle lifecycle fade-in and fade-out along stream path
            float lifecycle = smoothstep(0.0, 0.15, t) * smoothstep(1.0, 0.85, t);

            // Distance attenuation
            float distToCam = -mvPosition.z;
            float depthScale = clamp(170.0 / max(distToCam, 0.1), 0.2, 7.0);

            // Soft size pulse
            float sizePulse = 1.0 + uBass * 0.30;
            gl_PointSize = aSize * sizePulse * lifecycle * (depthScale / 14.0);

            // Curated dynamic color palettes
            vec3 colA = vec3(0.0, 0.95, 1.0);    // Neon Cyan
            vec3 colB = vec3(0.55, 0.05, 1.0);   // Electric Purple
            vec3 colC = vec3(1.0, 0.08, 0.65);   // Hot Magenta
            vec3 colD = vec3(1.0, 0.75, 0.15);   // Solar Gold
            vec3 colWhite = vec3(1.0, 1.0, 1.0); // Hot Core

            float colorPhase = fract(t * 1.5 + aStrand * 0.20 + uColorCycle);
            vec3 dynamicColor;
            if (colorPhase < 0.33) {
                dynamicColor = mix(colA, colB, colorPhase * 3.0);
            } else if (colorPhase < 0.66) {
                dynamicColor = mix(colB, colC, (colorPhase - 0.33) * 3.0);
            } else {
                dynamicColor = mix(colC, colD, (colorPhase - 0.66) * 3.0);
            }

            // Smoothly blend base color with dynamic palette
            vec3 blendedColor = mix(aColor, dynamicColor, 0.70);

            // Soft core whitening on higher bass energy
            if (uBass > 0.4) {
                blendedColor = mix(blendedColor, colWhite, (uBass - 0.4) * 0.6);
            }

            vColor = blendedColor;
            vAlpha = lifecycle * clamp(0.4 + uBass * 0.35, 0.25, 0.95);
            vSparkle = sin(uTime * 2.5 + aSeed.x * 12.56) * 0.5 + 0.5;
            vCoreGlow = clamp(uBass * 0.6, 0.0, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform float uBass;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vSparkle;
        varying float vCoreGlow;

        void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;

            // Soft, silky radial glow with smooth core
            float halo = pow(1.0 - dist * 2.0, 2.0);
            float core = smoothstep(0.16, 0.0, dist);

            // Gentle sparkle glimmer
            float sparkleFactor = 0.90 + vSparkle * 0.25;

            vec3 finalRgb = mix(vColor * sparkleFactor, vec3(1.0), core * (0.6 + vCoreGlow * 0.4));
            float intensity = (halo * 1.3 + core * 2.0) * (1.0 + uBass * 0.35);

            gl_FragColor = vec4(finalRgb * intensity * vAlpha, vAlpha * halo);
        }
    `
};

// Offscreen Round Star Texture Generator
function createRoundStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const cx = 32, cy = 32;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.35)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Offscreen Starburst Lens Flare Generator
function createStarburstTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const cx = 64;
    const cy = 64;

    const radGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 60);
    radGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    radGrad.addColorStop(0.15, 'rgba(200, 255, 255, 0.8)');
    radGrad.addColorStop(0.4, 'rgba(0, 255, 255, 0.3)');
    radGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.5;
    for (let angle = 0; angle < Math.PI; angle += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(angle) * 60, cy - Math.sin(angle) * 60);
        ctx.lineTo(cx + Math.cos(angle) * 60, cy + Math.sin(angle) * 60);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Offscreen Anamorphic Lens Flare & Diffraction Starburst Generator
function createAnamorphicFlareTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const cx = 128;
    const cy = 128;

    // Center circular glow
    const radGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 120);
    radGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    radGrad.addColorStop(0.12, 'rgba(230, 255, 255, 0.9)');
    radGrad.addColorStop(0.35, 'rgba(0, 220, 255, 0.45)');
    radGrad.addColorStop(0.7, 'rgba(0, 150, 255, 0.12)');
    radGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 256, 256);

    // Horizontal Anamorphic Streak
    const streakGrad = ctx.createLinearGradient(0, cy, 256, cy);
    streakGrad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
    streakGrad.addColorStop(0.3, 'rgba(180, 240, 255, 0.3)');
    streakGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
    streakGrad.addColorStop(0.7, 'rgba(180, 240, 255, 0.3)');
    streakGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = streakGrad;
    ctx.fillRect(0, cy - 3, 256, 6);

    // Cross Diffraction Spikes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.8;
    [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4].forEach(angle => {
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(angle) * 110, cy - Math.sin(angle) * 110);
        ctx.lineTo(cx + Math.cos(angle) * 110, cy + Math.sin(angle) * 110);
        ctx.stroke();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Offscreen Procedural Disco Ball Glass Facet Tangent Normal Map
function createDiscoNormalMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const numCols = 80; // 80 facet columns
    const numRows = 40; // 40 facet rings
    const tileW = 1024 / numCols;
    const tileH = 512 / numRows;

    // Neutral normal background (128, 128, 255)
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 1024, 512);

    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            const x = c * tileW;
            const y = r * tileH;

            // Deterministic micro-tilt angle per mirror facet
            const seedX = Math.sin(r * 157.3 + c * 271.9) * 43758.5453;
            const seedY = Math.cos(r * 193.7 + c * 313.1) * 28941.6127;
            const tiltX = (seedX - Math.floor(seedX) - 0.5) * 0.40; // -0.20 .. +0.20
            const tiltY = (seedY - Math.floor(seedY) - 0.5) * 0.40; // -0.20 .. +0.20
            const tiltZ = Math.sqrt(Math.max(0.05, 1.0 - tiltX * tiltX - tiltY * tiltY));

            const rCol = Math.floor((tiltX * 0.5 + 0.5) * 255);
            const gCol = Math.floor((tiltY * 0.5 + 0.5) * 255);
            const bCol = Math.floor((tiltZ * 0.5 + 0.5) * 255);

            // Fill individual flat mirror tile
            ctx.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;
            ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2);

            // Grout border (neutral normal)
            ctx.fillStyle = 'rgb(128, 128, 255)';
            ctx.fillRect(x, y, tileW, 1);
            ctx.fillRect(x, y, 1, tileH);
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Offscreen Procedural Disco Ball Roughness Map (Glass Tiles = Ultra-Smooth, Grout = Matte)
function createDiscoRoughnessMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const numCols = 80;
    const numRows = 40;
    const tileW = 1024 / numCols;
    const tileH = 512 / numRows;

    // Grout lines: high roughness (matte)
    ctx.fillStyle = '#dddddd';
    ctx.fillRect(0, 0, 1024, 512);

    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            const x = c * tileW;
            const y = r * tileH;

            // Mirror tile interior: ultra-smooth (roughness ~0.04)
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2);
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Offscreen Procedural Disco Ball Metalness Map (Glass Mirror = Pure Metalness, Grout = Non-Metal)
function createDiscoMetalnessMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const numCols = 80;
    const numRows = 40;
    const tileW = 1024 / numCols;
    const tileH = 512 / numRows;

    // Grout lines: low metalness
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, 1024, 512);

    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            const x = c * tileW;
            const y = r * tileH;

            // Mirror tile interior: pure 1.0 metalness for high-contrast reflections
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2);
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Offscreen Procedural Disco Ball Mirror Tile Normal/Bump Texture (Silver / Glass Facets)
function createDiscoTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Clean dark silver-charcoal grout seam
    ctx.fillStyle = '#161922';
    ctx.fillRect(0, 0, 1024, 512);

    const numRows = 40; // 40 vertical rings
    const numCols = 80; // 80 horizontal facet columns
    const tileW = 1024 / numCols;
    const tileH = 512 / numRows;

    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            const x = c * tileW;
            const y = r * tileH;

            // Deterministic micro-tilt brightness variation per mirror tile
            const seed = Math.sin(r * 127.1 + c * 311.7) * 43758.5453123;
            const rand = seed - Math.floor(seed);
            const baseLum = Math.floor(212 + (rand - 0.5) * 58); // 183..241 (bright silver)

            // Distinct cool silver-glass tint (crisp mirror reflection)
            const rCol = Math.min(255, baseLum);
            const gCol = Math.min(255, Math.floor(baseLum * 1.02));
            const bCol = Math.min(255, Math.floor(baseLum * 1.06));

            // Tile body
            ctx.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;
            ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2);

            // Crisp silver-white specular bevel highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.fillRect(x + 1, y + 1, tileW - 2, 1);
            ctx.fillRect(x + 1, y + 1, 1, tileH - 2);

            // Glass depth edge shadow
            ctx.fillStyle = 'rgba(12, 18, 30, 0.40)';
            ctx.fillRect(x + 1, y + tileH - 2, tileW - 2, 1);
            ctx.fillRect(x + tileW - 2, y + 1, 1, tileH - 2);
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Offscreen Jack-o'-Lantern Carved Pumpkin Face Texture for Disco Ball
function createPumpkinJackFaceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.clearRect(0, 0, 1024, 512);

    // Front center of equirectangular projection is at (512, 256)
    const cx = 512;
    const cy = 256;

    // Outer flame glow filter for intense luminous pumpkin fire
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 24;

    // Glowing flame gradient fill (White/Yellow core -> Vibrant Orange -> Crimson Red edge)
    const createFlameGrad = (x, y, r) => {
        const g = ctx.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.22, '#ffee55');
        g.addColorStop(0.58, '#ff7700');
        g.addColorStop(0.86, '#ff3300');
        g.addColorStop(1.0, '#cc1100');
        return g;
    };

    // 1. Left Eye (Angled triangular carving with steep outer tilt)
    ctx.fillStyle = createFlameGrad(cx - 75, cy - 65, 70);
    ctx.beginPath();
    ctx.moveTo(cx - 145, cy - 90); // outer top corner
    ctx.lineTo(cx - 20, cy - 55);  // inner corner
    ctx.lineTo(cx - 100, cy - 20); // bottom point
    ctx.closePath();
    ctx.fill();

    // 2. Right Eye (Matching angled triangle mirrored on the right)
    ctx.fillStyle = createFlameGrad(cx + 75, cy - 65, 70);
    ctx.beginPath();
    ctx.moveTo(cx + 145, cy - 90); // outer top corner
    ctx.lineTo(cx + 20, cy - 55);  // inner corner
    ctx.lineTo(cx + 100, cy - 20); // bottom point
    ctx.closePath();
    ctx.fill();

    // 3. Nose (Central sharp triangle pointing upwards)
    ctx.fillStyle = createFlameGrad(cx, cy - 12, 40);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 48);       // top apex
    ctx.lineTo(cx + 32, cy + 8);   // bottom right
    ctx.lineTo(cx - 32, cy + 8);   // bottom left
    ctx.closePath();
    ctx.fill();

    // 4. Jagged Pumpkin Smile (Wide menacing toothy grin matching reference)
    ctx.fillStyle = createFlameGrad(cx, cy + 75, 175);
    ctx.beginPath();
    // Top lip curve with tooth notches
    ctx.moveTo(cx - 175, cy + 30);  // left mouth corner
    ctx.quadraticCurveTo(cx - 110, cy + 65, cx - 65, cy + 65); // left curve
    ctx.lineTo(cx - 65, cy + 42);   // left upper tooth top
    ctx.lineTo(cx - 35, cy + 42);   // left upper tooth flat
    ctx.lineTo(cx - 35, cy + 68);   // left upper tooth down
    ctx.quadraticCurveTo(cx, cy + 74, cx + 35, cy + 68); // center dip
    ctx.lineTo(cx + 35, cy + 42);   // right upper tooth top
    ctx.lineTo(cx + 65, cy + 42);   // right upper tooth flat
    ctx.lineTo(cx + 65, cy + 65);   // right upper tooth down
    ctx.quadraticCurveTo(cx + 110, cy + 65, cx + 175, cy + 30); // right mouth corner

    // Bottom lip curve with lower tooth notches
    ctx.quadraticCurveTo(cx + 130, cy + 110, cx + 85, cy + 120);
    ctx.lineTo(cx + 85, cy + 94);   // right bottom tooth up
    ctx.lineTo(cx + 55, cy + 94);   // right bottom tooth flat
    ctx.lineTo(cx + 55, cy + 126);  // right bottom tooth down
    ctx.quadraticCurveTo(cx, cy + 135, cx - 15, cy + 128); // center bottom
    ctx.lineTo(cx - 15, cy + 100);  // center bottom tooth up
    ctx.lineTo(cx - 42, cy + 100);  // center bottom tooth flat
    ctx.lineTo(cx - 42, cy + 124);  // center bottom tooth down
    ctx.quadraticCurveTo(cx - 115, cy + 115, cx - 175, cy + 30); // back to left corner
    ctx.closePath();
    ctx.fill();

    // High-heat white core highlights in centers of eyes & mouth
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 14;

    // Left eye core
    ctx.beginPath();
    ctx.moveTo(cx - 118, cy - 72);
    ctx.lineTo(cx - 45, cy - 54);
    ctx.lineTo(cx - 90, cy - 32);
    ctx.closePath();
    ctx.fill();

    // Right eye core
    ctx.beginPath();
    ctx.moveTo(cx + 118, cy - 72);
    ctx.lineTo(cx + 45, cy - 54);
    ctx.lineTo(cx + 90, cy - 32);
    ctx.closePath();
    ctx.fill();

    // Nose core
    ctx.beginPath();
    ctx.moveTo(cx, cy - 36);
    ctx.lineTo(cx + 18, cy);
    ctx.lineTo(cx - 18, cy);
    ctx.closePath();
    ctx.fill();

    // Mouth center glow streak
    ctx.beginPath();
    ctx.ellipse(cx, cy + 86, 95, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Offscreen Nightclub Equirectangular Environment Map for PMREM Reflections
function createClubEnvironmentMap(renderer) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep nightclub ambient backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
    bgGrad.addColorStop(0, '#020206');
    bgGrad.addColorStop(0.25, '#060a18');
    bgGrad.addColorStop(0.75, '#120318');
    bgGrad.addColorStop(1, '#010104');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // High-contrast neon spotlights, lasers, stage washes
    const neonSources = [
        { x: 180, y: 130, r: 90, col: '#00ffff' },
        { x: 820, y: 130, r: 90, col: '#ff007f' },
        { x: 512, y: 80, r: 110, col: '#0066ff' },
        { x: 340, y: 220, r: 75, col: '#ff0055' },
        { x: 680, y: 220, r: 75, col: '#00ffcc' },
        { x: 100, y: 280, r: 60, col: '#ffea00' },
        { x: 920, y: 280, r: 60, col: '#aa00ff' },
        { x: 512, y: 290, r: 130, col: '#ffffff' },
        { x: 260, y: 380, r: 50, col: '#00ffff' },
        { x: 760, y: 380, r: 50, col: '#ff00aa' }
    ];

    neonSources.forEach(s => {
        const grad = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.18, s.col);
        grad.addColorStop(0.6, s.col + '55');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
    });

    // Overhead truss neon light strip bars
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 50); ctx.lineTo(1024, 50);
    ctx.stroke();

    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 110); ctx.lineTo(1024, 110);
    ctx.stroke();

    ctx.strokeStyle = '#0044ff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 170); ctx.lineTo(1024, 170);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.needsUpdate = true;

    const pmremGen = new THREE.PMREMGenerator(renderer);
    const rt = pmremGen.fromEquirectangular(tex);
    tex.dispose();
    pmremGen.dispose();
    return rt.texture;
}

// Offscreen Volumetric Laser/Spotlight Gradient Beam Texture (Smooth longitudinal & lateral falloff)
function createVolumetricBeamTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Longitudinal gradient: Brightest at source (Y=0), smoothly fading out into the haze (Y=512)
    const vGrad = ctx.createLinearGradient(0, 0, 0, 512);
    vGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    vGrad.addColorStop(0.06, 'rgba(255, 255, 255, 0.9)');
    vGrad.addColorStop(0.20, 'rgba(255, 255, 255, 0.6)');
    vGrad.addColorStop(0.50, 'rgba(255, 255, 255, 0.22)');
    vGrad.addColorStop(0.80, 'rgba(255, 255, 255, 0.05)');
    vGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, 128, 512);

    // Lateral cosine feathering: Soft edge falloff to eliminate polygonal edges
    const hGrad = ctx.createLinearGradient(0, 0, 128, 0);
    hGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    hGrad.addColorStop(0.22, 'rgba(255, 255, 255, 0.65)');
    hGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
    hGrad.addColorStop(0.78, 'rgba(255, 255, 255, 0.65)');
    hGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, 128, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Offscreen Floor Tile Grid Texture for Dark Reflective Nightclub Dancefloor
function createFloorTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#06060c';
    ctx.fillRect(0, 0, 512, 512);

    const gridSize = 64;
    ctx.strokeStyle = '#12121e';
    ctx.lineWidth = 2;

    for (let i = 0; i <= 512; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i, 512);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i); ctx.lineTo(512, i);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
}

// Offscreen High-Resolution Matrix Katakana & Cypher Glyph Atlas Generator (1024x1024)
function createMatrixGlyphTexture() {
    const canvas = document.createElement('canvas');
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    const cols = 8;
    const rows = 8;
    const cellW = size / cols; // 128px per glyph!
    const cellH = size / rows;

    const glyphs = [
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        ':', '.', '"', '=', '*', '+', '-', '<', '>', '¦',
        '|', '_', 'Z', 'X', 'Y', 'A', 'B', 'C', 'D', 'E',
        '日', 'ﾊ', 'ﾐ', 'ﾋ', 'ｰ', 'ｳ', 'ｼ', 'ﾅ', 'ﾓ', 'ｸ',
        'ﾘ', 'ｱ', 'ﾎ', 'ﾃ', 'ﾏ', 'ｹ', 'ﾒ', 'ｴ', 'ｶ', 'ｷ',
        'ﾑ', 'ﾕ', 'ﾗ', 'ｾ', 'ﾈ', 'ｽ', 'ﾀ', 'ﾇ', 'ﾍ', 'ｦ',
        'ﾂ', 'ﾆ', 'ﾝ', 'ｻ'
    ];

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 88px "MS Gothic", "Noto Sans JP", "Courier New", monospace';
    ctx.fillStyle = '#ffffff';

    for (let i = 0; i < 64; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;

        const char = glyphs[i % glyphs.length];

        ctx.save();
        ctx.translate(cx, cy);
        // Mirror-flip select characters horizontally for the authentic Matrix film cypher aesthetic
        if ((i % 3 === 0 || i % 7 === 0) && i > 9) {
            ctx.scale(-1, 1);
        }

        // Soft white glow core
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 8;
        ctx.fillText(char, 0, 0);

        // Solid crisp white character
        ctx.shadowBlur = 0;
        ctx.fillText(char, 0, 0);
        ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    return tex;
}

// DJ Deck Time Formatter (MM:SS.ms)
function formatDeckTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const ms = Math.floor((totalSeconds - s) * 10);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`;
}

// 2D High-Resolution DJ Deck HUD Overlay Renderer (Deck 1 / Master, Deck 2 / Sync & Center Phase Meter)
function renderDJDeckHUD(ctx, width, height, d1, d2, bpm, beatPhase, transient, prog1, prog2) {
    ctx.clearRect(0, 0, width, height);

    const padX = 70;
    const rightX = width - padX;

    function drawGlassPanel(x, y, w, h, radius, bgCol, borderCol) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.fillStyle = bgCol;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = borderCol;
        ctx.stroke();
    }

    // =========================================================================
    // 1. DECK 1 HEADER (TOP: Neon Cyan / Electric Cobalt)
    // =========================================================================
    const d1Bpm = (d1 && d1.bpm) ? Number(d1.bpm).toFixed(2) : Number(bpm).toFixed(2);
    const d1Title = (d1 && d1.title) ? d1.title.toUpperCase() : 'OPUS (LIVE MIX)';
    const d1Artist = (d1 && d1.artist) ? d1.artist.toUpperCase() : 'ERIC PRYDZ';
    const d1Key = (d1 && d1.key) ? d1.key : '8A';

    // Top Left: Deck 1 Metadata Card
    drawGlassPanel(padX, 36, 560, 84, 10, 'rgba(3, 14, 26, 0.85)', 'rgba(0, 240, 255, 0.45)');

    // Deck Badge Pill
    ctx.beginPath();
    ctx.roundRect(padX + 16, 48, 140, 26, 6);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶ DECK 1  MASTER', padX + 86, 61);

    // Track Title & Artist
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(d1Title.slice(0, 26), padX + 170, 62);

    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#77eeff';
    ctx.fillText(d1Artist.slice(0, 28), padX + 170, 84);

    // Badges line
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText(`${d1Bpm} BPM`, padX + 18, 104);
    ctx.fillStyle = '#99eeff';
    ctx.fillText(`KEY ${d1Key}`, padX + 115, 104);
    ctx.fillStyle = '#ffaa00';
    ctx.fillText('LOOP 4', padX + 185, 104);
    ctx.fillStyle = '#00ff88';
    ctx.fillText('SYNC LOCK', padX + 250, 104);

    // Top Right: Deck 1 Digital Time & Hot Cues
    drawGlassPanel(rightX - 520, 36, 520, 84, 10, 'rgba(3, 14, 26, 0.85)', 'rgba(0, 240, 255, 0.45)');
    const totalSec1 = 360;
    const el1 = prog1 * totalSec1;
    const rem1 = totalSec1 - el1;

    ctx.textAlign = 'right';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#a0d8ef';
    ctx.fillText('ELAPSED', rightX - 280, 60);
    ctx.font = 'bold 20px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(formatDeckTime(el1), rightX - 160, 60);

    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('REMAIN', rightX - 280, 85);
    ctx.font = 'bold 20px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`-${formatDeckTime(rem1)}`, rightX - 160, 85);

    // Deck 1 Hot Cue Tabs
    const d1Cues = ['1:INTRO', '2:DROP 1', '3:BREAK', '4:DROP 2'];
    const d1CueCols = ['#00ff66', '#ff00aa', '#00f0ff', '#ffcc00'];
    d1Cues.forEach((cue, i) => {
        const cx = rightX - 140 + (i % 2) * 65;
        const cy = 48 + Math.floor(i / 2) * 30;
        ctx.beginPath();
        ctx.roundRect(cx, cy, 60, 24, 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.strokeStyle = d1CueCols[i];
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = d1CueCols[i];
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cue, cx + 30, cy + 12);
    });

    // =========================================================================
    // 2. CENTER PHASE METER HUD (MIDDLE: y = 492 to 532)
    // =========================================================================
    const centerPanelW = 640;
    const centerPanelX = (width - centerPanelW) / 2;
    drawGlassPanel(centerPanelX, 492, centerPanelW, 40, 6, 'rgba(8, 16, 26, 0.92)', 'rgba(0, 240, 255, 0.35)');

    ctx.textAlign = 'left';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText('◀ BEAT SYNC', centerPanelX + 24, 513);

    // 4 Beat Bars
    const beatW = 46;
    const beatGap = 12;
    const beatsStartX = width / 2 - (4 * beatW + 3 * beatGap) / 2;
    const curBeat = Math.floor(beatPhase * 4);

    for (let b = 0; b < 4; b++) {
        const bx = beatsStartX + b * (beatW + beatGap);
        const isHit = b === curBeat || (b === 0 && transient > 0.6);
        ctx.beginPath();
        ctx.roundRect(bx, 500, beatW, 24, 4);
        ctx.fillStyle = isHit ? 'rgba(0, 255, 204, 0.85)' : 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.strokeStyle = isHit ? '#ffffff' : 'rgba(0, 255, 204, 0.3)';
        ctx.stroke();

        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = isHit ? '#001a14' : '#77bbcc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${b + 1}`, bx + beatW / 2, 512);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffaa00';
    ctx.fillText('PHASE LOCK ▶', centerPanelX + centerPanelW - 24, 513);

    // =========================================================================
    // 3. DECK 2 HEADER (BOTTOM: Warm Amber / Gold / Crimson)
    // =========================================================================
    const d2Bpm = (d2 && d2.bpm) ? Number(d2.bpm).toFixed(2) : Number(bpm).toFixed(2);
    const d2Title = (d2 && d2.title) ? d2.title.toUpperCase() : 'GLUE (CLUB EDIT)';
    const d2Artist = (d2 && d2.artist) ? d2.artist.toUpperCase() : 'BICEP';
    const d2Key = (d2 && d2.key) ? d2.key : '8A';

    // Bottom Left: Deck 2 Metadata Card
    drawGlassPanel(padX, 542, 560, 84, 10, 'rgba(26, 14, 4, 0.85)', 'rgba(255, 170, 0, 0.45)');

    // Deck 2 Badge Pill
    ctx.beginPath();
    ctx.roundRect(padX + 16, 554, 140, 26, 6);
    ctx.fillStyle = 'rgba(255, 170, 0, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffaa00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶ DECK 2  SYNC', padX + 86, 567);

    // Track Title & Artist
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(d2Title.slice(0, 26), padX + 170, 568);

    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffcc77';
    ctx.fillText(d2Artist.slice(0, 28), padX + 170, 590);

    // Badges line
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffbb00';
    ctx.fillText(`${d2Bpm} BPM`, padX + 18, 610);
    ctx.fillStyle = '#ffe099';
    ctx.fillText(`KEY ${d2Key}`, padX + 115, 610);
    ctx.fillStyle = '#ff8800';
    ctx.fillText('PITCH +0.0%', padX + 185, 610);
    ctx.fillStyle = '#00ff88';
    ctx.fillText('SYNC ACTIVE', padX + 275, 610);

    // Bottom Right: Deck 2 Digital Time & Hot Cues
    drawGlassPanel(rightX - 520, 542, 520, 84, 10, 'rgba(26, 14, 4, 0.85)', 'rgba(255, 170, 0, 0.45)');
    const totalSec2 = 320;
    const el2 = prog2 * totalSec2;
    const rem2 = totalSec2 - el2;

    ctx.textAlign = 'right';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffddaa';
    ctx.fillText('ELAPSED', rightX - 280, 566);
    ctx.font = 'bold 20px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(formatDeckTime(el2), rightX - 160, 566);

    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffaa00';
    ctx.fillText('REMAIN', rightX - 280, 591);
    ctx.font = 'bold 20px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillStyle = '#ffaa00';
    ctx.fillText(`-${formatDeckTime(rem2)}`, rightX - 160, 591);

    // Deck 2 Hot Cue Tabs
    const d2Cues = ['1:VOCAL', '2:BUILD', '3:DROP', '4:OUTRO'];
    const d2CueCols = ['#ff6600', '#ffd700', '#ff0055', '#00f0ff'];
    d2Cues.forEach((cue, i) => {
        const cx = rightX - 140 + (i % 2) * 65;
        const cy = 554 + Math.floor(i / 2) * 30;
        ctx.beginPath();
        ctx.roundRect(cx, cy, 60, 24, 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.strokeStyle = d2CueCols[i];
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = d2CueCols[i];
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cue, cx + 30, cy + 12);
    });
}

export function createVFXScene(container) {
    const roundStarTex = createRoundStarTexture();
    const starburstTex = createStarburstTexture();
    const anamorphicFlareTex = createAnamorphicFlareTexture();
    const matrixGlyphTex = createMatrixGlyphTexture();
    let pinspotShineEnvelope = 0.0;

    // 1. Scene, Camera, WebGL Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020208, 0.02);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 16);

    function getOptimalPixelRatio() {
        const dpr = window.devicePixelRatio || 1;
        const maxDim = Math.max(window.innerWidth, window.innerHeight);
        // On large external monitors (4K / 1440p / Retina displays), cap DPR to prevent 8K framebuffer fill-rate stalls
        if (maxDim >= 2560) return Math.min(dpr, 1.0);
        if (maxDim >= 1920) return Math.min(dpr, 1.25);
        return Math.min(dpr, 1.5);
    }

    const renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'high-performance',
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(getOptimalPixelRatio());
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // 2. Post-Processing Chain (Crisp Dark Nightclub Contrast)
    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.32, // Controlled bloom strength (no whiteout)
        0.65, // Bloom radius
        0.65  // High threshold so only specular glints and beam cores bloom
    );

    const nightclubPass = new ShaderPass(NightclubPostFX);
    const outputPass = new OutputPass();

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.addPass(nightclubPass);
    composer.addPass(outputPass);

    // 3. Shared Global Lights (Moody Dark Atmosphere)
    const ambientLight = new THREE.AmbientLight(0x06060c, 0.35);
    scene.add(ambientLight);

    const dirKeyLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirKeyLight.position.set(0, 15, 12);
    scene.add(dirKeyLight);

    const lightCyan = new THREE.PointLight(0x00ffff, 0.8, 45);
    lightCyan.position.set(6, 6, 6);
    scene.add(lightCyan);

    const lightMagenta = new THREE.PointLight(0xff007f, 0.8, 45);
    lightMagenta.position.set(-6, -6, 6);
    scene.add(lightMagenta);

    // ==========================================
    // HIGH-CLARITY LOGO & VIDEO LAYER (6-WAY POSITIONING)
    // ==========================================
    const logoGroup = new THREE.Group();
    logoGroup.renderOrder = 999;
    scene.add(logoGroup);

    let logoVideoElement = null;
    let logoTexture = null;
    let logoMesh = null;
    let logoShieldMesh = null;
    let logoVisible = true;
    let logoMode = 'hologram';
    let logoPosition = 'center'; // 'center', 'top-left', 'top-right', 'top-quarter', 'bottom-left', 'bottom-right'
    let logoBaseOpacity = 1.0;
    let logoBaseScale = 1.0;
    let logoBassPulseAmount = 0.35;
    let logoAspectRatio = 16 / 9;
    let logoContrast = 1.35;
    let logoBrightness = 1.05;
    let isShieldActive = true;
    let logoSpinMode = 'off'; // 'off', 'center', 'orbit'
    let logoSpinSpeed = 1.0;
    let logoSpinAngle = 0.0;
    let currentLogoPosX = 0;
    let currentLogoPosY = 0;
    let currentLogoBaseZ = 6.8;
    let currentLogoScaleFactor = 1.0;

    // Dark Contrast Shield behind logo text
    const shieldCanvas = document.createElement('canvas');
    shieldCanvas.width = 256;
    shieldCanvas.height = 256;
    const sCtx = shieldCanvas.getContext('2d');
    const sGrad = sCtx.createRadialGradient(128, 128, 20, 128, 128, 128);
    sGrad.addColorStop(0, 'rgba(2, 2, 8, 0.88)');
    sGrad.addColorStop(0.65, 'rgba(2, 2, 8, 0.55)');
    sGrad.addColorStop(1, 'rgba(2, 2, 8, 0.0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 256, 256);

    const shieldTexture = new THREE.CanvasTexture(shieldCanvas);
    const logoShieldMat = new THREE.MeshBasicMaterial({
        map: shieldTexture,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
        depthWrite: false,
        fog: false
    });
    const shieldMat = logoShieldMat;
    logoShieldMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), logoShieldMat);
    logoShieldMesh.renderOrder = 9998;

    // Logo Mesh with High-Clarity Shader (Renders in front of all 3D scene objects)
    const logoGeo = new THREE.PlaneGeometry(16, 16);
    const logoShaderMat = new THREE.ShaderMaterial({
        uniforms: {
            map: { value: null },
            uOpacity: { value: logoBaseOpacity },
            uContrast: { value: logoContrast },
            uBrightness: { value: logoBrightness },
            uLumaCutoff: { value: 0.08 },
            uLumaSmooth: { value: 0.06 },
            uBlendMode: { value: 0 }
        },
        vertexShader: HighClarityLogoShader.vertexShader,
        fragmentShader: HighClarityLogoShader.fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide
    });

    logoMesh = new THREE.Mesh(logoGeo, logoShaderMat);
    logoMesh.renderOrder = 9999;

    const logoPivot = new THREE.Group();
    logoGroup.add(logoPivot);
    logoPivot.add(logoShieldMesh);
    logoPivot.add(logoMesh);

    let logoOffsetY = 0.0; // Normalized -1.0 to +1.0 relative to viewport half-height
    let logoOffsetX = 0.0; // Normalized -1.0 to +1.0 relative to viewport half-width
    let logoEdgeMargin = 0.04; // Default 4% edge/corner margin

    applyLogoPlacement();

    function applyLogoPlacement() {
        if (!logoMesh) return;

        let baseZ = 12.0;
        let baseW = 4.8 * logoBaseScale;

        if (logoMode === 'backdrop') {
            baseZ = -20;
            baseW = 45 * logoBaseScale;
            logoShaderMat.blending = THREE.AdditiveBlending;
            if (logoShieldMesh) logoShieldMesh.visible = false;
        } else if (logoMode === 'hologram') {
            baseZ = 6.9;
            baseW = (logoPosition === 'center' ? 7.5 : 4.8) * logoBaseScale;
            logoShaderMat.blending = THREE.NormalBlending;
            if (logoShieldMesh) logoShieldMesh.visible = isShieldActive;
        } else {
            // Default: Overlay / Watermark
            baseZ = 12.0;
            baseW = 4.8 * logoBaseScale;
            logoShaderMat.blending = THREE.NormalBlending;
            if (logoShieldMesh) logoShieldMesh.visible = isShieldActive;
        }

        // Base dimensions factoring in user-selected scale
        const w = baseW;
        const h = baseW / (logoAspectRatio || 1.0);

        // Dynamic Camera Frustum Boundary Math (at nominal camera z=16.0)
        const camZ = 16.0;
        const dist = Math.max(0.1, camZ - baseZ);
        const visibleHalfH = dist * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
        const visibleHalfW = visibleHalfH * camera.aspect;

        const halfLogoW = w * 0.5;
        const halfLogoH = h * 0.5;

        const marginX = visibleHalfW * logoEdgeMargin;
        const marginY = visibleHalfH * logoEdgeMargin;

        let posX = 0, posY = 0;

        switch (logoPosition) {
            case 'top-left':
                posX = -visibleHalfW + halfLogoW + marginX;
                posY = visibleHalfH - halfLogoH - marginY;
                break;
            case 'top-right':
                posX = visibleHalfW - halfLogoW - marginX;
                posY = visibleHalfH - halfLogoH - marginY;
                break;
            case 'bottom-left':
                posX = -visibleHalfW + halfLogoW + marginX;
                posY = -visibleHalfH + halfLogoH + marginY;
                break;
            case 'bottom-right':
                posX = visibleHalfW - halfLogoW - marginX;
                posY = -visibleHalfH + halfLogoH + marginY;
                break;
            case 'top':
            case 'center-top':
            case 'top-center':
                posX = 0;
                posY = visibleHalfH - halfLogoH - marginY;
                break;
            case 'bottom':
            case 'center-bottom':
            case 'bottom-center':
                posX = 0;
                posY = -visibleHalfH + halfLogoH + marginY;
                break;
            case 'left':
            case 'center-left':
                posX = -visibleHalfW + halfLogoW + marginX;
                posY = 0;
                break;
            case 'right':
            case 'center-right':
                posX = visibleHalfW - halfLogoW - marginX;
                posY = 0;
                break;
            case 'top-quarter':
            case 'center-top-quarter':
                posX = 0;
                posY = visibleHalfH * 0.45;
                break;
            case 'bottom-quarter':
            case 'center-bottom-quarter':
                posX = 0;
                posY = -visibleHalfH * 0.45;
                break;
            case 'center':
            default:
                posX = 0;
                posY = 0;
                break;
        }

        // Apply fine-tune user offsets (relative to screen bounds)
        posX += logoOffsetX * visibleHalfW * 0.5;
        posY += logoOffsetY * visibleHalfH * 0.5;

        currentLogoPosX = posX;
        currentLogoPosY = posY;
        currentLogoBaseZ = baseZ;
        currentLogoScaleFactor = 1.0;

        logoPivot.position.set(posX, posY, baseZ);
        logoPivot.quaternion.copy(camera.quaternion);

        logoMesh.position.set(0, 0, 0);
        logoMesh.scale.set(w / 16, h / 16, 1);
        logoMesh.rotation.order = 'YXZ';
        logoMesh.rotation.set(0, 0, 0);

        if (logoShieldMesh && logoMode !== 'backdrop') {
            logoShieldMesh.position.set(0, 0, -0.2);
            logoShieldMesh.rotation.set(0, 0, 0);
            logoShieldMesh.scale.set((w * 1.35) / 16, (h * 1.4) / 16, 1);
        }
    }

    function setLogoPosition(pos) {
        logoPosition = pos;
        applyLogoPlacement();
    }

    function loadLogoMedia(sourceUrl, isVideo = true) {
        try {
            if (logoVideoElement) {
                logoVideoElement.pause();
                logoVideoElement.removeAttribute('src');
                logoVideoElement.load();
                logoVideoElement = null;
            }

            if (isVideo) {
                const video = document.createElement('video');
                video.src = encodeURI(sourceUrl);
                video.crossOrigin = 'anonymous';
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                video.autoplay = true;

                const updateAspect = () => {
                    logoAspectRatio = (video.videoWidth && video.videoHeight) ? video.videoWidth / video.videoHeight : (16 / 9);
                    applyLogoPlacement();
                };
                video.addEventListener('loadedmetadata', updateAspect);
                if (video.readyState >= 1) updateAspect();

                logoVideoElement = video;
                video.play().catch(() => {});

                logoTexture = new THREE.VideoTexture(video);
                logoTexture.minFilter = THREE.LinearFilter;
                logoTexture.magFilter = THREE.LinearFilter;
                logoTexture.colorSpace = THREE.SRGBColorSpace;

                logoShaderMat.uniforms.map.value = logoTexture;
                logoShaderMat.needsUpdate = true;
                applyLogoPlacement();
            } else {
                const loader = new THREE.TextureLoader();
                loader.load(encodeURI(sourceUrl), (tex) => {
                    logoTexture = tex;
                    logoTexture.minFilter = THREE.LinearFilter;
                    logoTexture.magFilter = THREE.LinearFilter;
                    logoTexture.colorSpace = THREE.SRGBColorSpace;

                    if (tex.image && tex.image.width && tex.image.height) {
                        logoAspectRatio = tex.image.width / tex.image.height;
                    } else {
                        logoAspectRatio = 1.0;
                    }

                    logoShaderMat.uniforms.map.value = logoTexture;
                    logoShaderMat.needsUpdate = true;
                    applyLogoPlacement();
                }, undefined, (err) => {
                    console.error("[Logo] Texture load error:", err);
                });
            }
        } catch (err) {
            console.error("[Logo] Error loading media:", err);
        }
    }

    function playLogoVideo() {
        if (logoVideoElement && logoVideoElement.paused) {
            logoVideoElement.play().catch(() => {});
        }
    }

    // =========================================================================
    // BROADCAST & RADIO STATION LOGO LAYER
    // =========================================================================
    const stationLogoGroup = new THREE.Group();
    stationLogoGroup.renderOrder = 10000;
    stationLogoGroup.visible = false;
    scene.add(stationLogoGroup);

    let stationLogoVideoElement = null;
    let stationLogoTexture = null;
    let stationLogoMesh = null;
    let stationLogoShieldMesh = null;
    let stationLogoVisible = false;
    let stationLogoMode = 'overlay'; // 'overlay', 'hologram', 'backdrop'
    let stationLogoPosition = 'top-right'; // 'top-right', 'top-left', 'bottom-right', 'bottom-left', 'center', 'top-center'
    let stationLogoBaseOpacity = 1.0;
    let stationLogoBaseScale = 0.85;
    let stationLogoBassPulseAmount = 0.25;
    let stationLogoAspectRatio = 1.0;
    let stationLogoContrast = 1.25;
    let stationLogoBrightness = 1.05;
    let isStationShieldActive = true;
    let stationLogoSpinMode = 'off'; // 'off', 'center', 'orbit', 'freeroam'
    let stationLogoSpinSpeed = 1.0;
    let stationLogoSpinAngle = 0.0;
    let currentStationLogoPosX = 2.4;
    let currentStationLogoPosY = 1.35;
    let currentStationLogoBaseZ = 12.0;
    let currentStationLogoScaleFactor = 0.65;

    // Dark Contrast Shield for Station Logo
    const stationShieldCanvas = document.createElement('canvas');
    stationShieldCanvas.width = 256;
    stationShieldCanvas.height = 256;
    const stSCtx = stationShieldCanvas.getContext('2d');
    const stSGrad = stSCtx.createRadialGradient(128, 128, 20, 128, 128, 128);
    stSGrad.addColorStop(0, 'rgba(2, 2, 8, 0.85)');
    stSGrad.addColorStop(0.65, 'rgba(2, 2, 8, 0.5)');
    stSGrad.addColorStop(1, 'rgba(2, 2, 8, 0.0)');
    stSCtx.fillStyle = stSGrad;
    stSCtx.fillRect(0, 0, 256, 256);

    const stationShieldTexture = new THREE.CanvasTexture(stationShieldCanvas);
    const stationShieldMat = new THREE.MeshBasicMaterial({
        map: stationShieldTexture,
        transparent: true,
        opacity: 0.8,
        depthTest: false,
        depthWrite: false,
        fog: false
    });
    stationLogoShieldMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), stationShieldMat);
    stationLogoShieldMesh.renderOrder = 9998;

    const stationLogoGeo = new THREE.PlaneGeometry(16, 16);
    const stationLogoShaderMat = new THREE.ShaderMaterial({
        uniforms: {
            map: { value: null },
            uOpacity: { value: stationLogoBaseOpacity },
            uContrast: { value: stationLogoContrast },
            uBrightness: { value: stationLogoBrightness },
            uLumaCutoff: { value: 0.05 },
            uLumaSmooth: { value: 0.05 },
            uBlendMode: { value: 2 } // Default to Direct (2) for PNG logos to keep full color & opacity
        },
        vertexShader: HighClarityLogoShader.vertexShader,
        fragmentShader: HighClarityLogoShader.fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide
    });

    stationLogoMesh = new THREE.Mesh(stationLogoGeo, stationLogoShaderMat);
    stationLogoMesh.renderOrder = 10001;

    const stationLogoPivot = new THREE.Group();
    stationLogoGroup.add(stationLogoPivot);
    stationLogoPivot.add(stationLogoShieldMesh);
    stationLogoPivot.add(stationLogoMesh);

    let stationLogoOffsetY = 0.0; // Normalized -1.0 to +1.0 relative to viewport half-height
    let stationLogoOffsetX = 0.0; // Normalized -1.0 to +1.0 relative to viewport half-width
    let stationLogoEdgeMargin = 0.04; // Default 4% edge/corner margin

    function applyStationLogoPlacement() {
        if (!stationLogoMesh) return;

        let baseZ = 12.0;
        let baseW = 4.8 * stationLogoBaseScale;

        if (stationLogoMode === 'backdrop') {
            baseZ = -20;
            baseW = 45 * stationLogoBaseScale;
            stationLogoShaderMat.blending = THREE.AdditiveBlending;
            if (stationLogoShieldMesh) stationLogoShieldMesh.visible = false;
        } else if (stationLogoMode === 'hologram') {
            baseZ = 6.9;
            baseW = (stationLogoPosition === 'center' ? 7.5 : 4.8) * stationLogoBaseScale;
            stationLogoShaderMat.blending = THREE.NormalBlending;
            if (stationLogoShieldMesh) stationLogoShieldMesh.visible = isStationShieldActive;
        } else {
            // Default: Overlay / Broadcast watermark
            baseZ = 12.0;
            baseW = 4.8 * stationLogoBaseScale;
            stationLogoShaderMat.blending = THREE.NormalBlending;
            if (stationLogoShieldMesh) stationLogoShieldMesh.visible = isStationShieldActive;
        }

        // Base dimensions factoring in user-selected scale
        const w = baseW;
        const h = baseW / (stationLogoAspectRatio || 1.0);

        // Dynamic Camera Frustum Boundary Math (at nominal camera z=16.0)
        const camZ = 16.0;
        const dist = Math.max(0.1, camZ - baseZ);
        const visibleHalfH = dist * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
        const visibleHalfW = visibleHalfH * camera.aspect;

        const halfLogoW = w * 0.5;
        const halfLogoH = h * 0.5;

        const marginX = visibleHalfW * stationLogoEdgeMargin;
        const marginY = visibleHalfH * stationLogoEdgeMargin;

        let posX = 0, posY = 0;

        switch (stationLogoPosition) {
            case 'top-left':
                posX = -visibleHalfW + halfLogoW + marginX;
                posY = visibleHalfH - halfLogoH - marginY;
                break;
            case 'top-right':
                posX = visibleHalfW - halfLogoW - marginX;
                posY = visibleHalfH - halfLogoH - marginY;
                break;
            case 'bottom-left':
                posX = -visibleHalfW + halfLogoW + marginX;
                posY = -visibleHalfH + halfLogoH + marginY;
                break;
            case 'bottom-right':
                posX = visibleHalfW - halfLogoW - marginX;
                posY = -visibleHalfH + halfLogoH + marginY;
                break;
            case 'top':
            case 'top-center':
            case 'center-top':
                posX = 0;
                posY = visibleHalfH - halfLogoH - marginY;
                break;
            case 'bottom':
            case 'bottom-center':
            case 'center-bottom':
                posX = 0;
                posY = -visibleHalfH + halfLogoH + marginY;
                break;
            case 'left':
            case 'center-left':
                posX = -visibleHalfW + halfLogoW + marginX;
                posY = 0;
                break;
            case 'right':
            case 'center-right':
                posX = visibleHalfW - halfLogoW - marginX;
                posY = 0;
                break;
            case 'center':
            default:
                posX = 0;
                posY = 0;
                break;
        }

        // Apply fine-tune user offsets (relative to screen bounds)
        posX += stationLogoOffsetX * visibleHalfW * 0.5;
        posY += stationLogoOffsetY * visibleHalfH * 0.5;

        currentStationLogoPosX = posX;
        currentStationLogoPosY = posY;
        currentStationLogoBaseZ = baseZ;
        currentStationLogoScaleFactor = 1.0;

        stationLogoPivot.position.set(posX, posY, baseZ);
        stationLogoPivot.quaternion.copy(camera.quaternion);

        stationLogoMesh.position.set(0, 0, 0);
        stationLogoMesh.scale.set(w / 16, h / 16, 1);
        stationLogoMesh.rotation.order = 'YXZ';
        stationLogoMesh.rotation.set(0, 0, 0);

        if (stationLogoShieldMesh && stationLogoMode !== 'backdrop') {
            stationLogoShieldMesh.position.set(0, 0, -0.2);
            stationLogoShieldMesh.rotation.set(0, 0, 0);
            stationLogoShieldMesh.scale.set((w * 1.35) / 16, (h * 1.4) / 16, 1);
        }
    }

    applyStationLogoPlacement();

    function loadStationLogoMedia(sourceUrl, isVideo = false) {
        try {
            if (stationLogoVideoElement) {
                stationLogoVideoElement.pause();
                stationLogoVideoElement.removeAttribute('src');
                stationLogoVideoElement.load();
                stationLogoVideoElement = null;
            }

            if (isVideo) {
                const video = document.createElement('video');
                video.src = encodeURI(sourceUrl);
                video.crossOrigin = 'anonymous';
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                video.autoplay = true;

                video.addEventListener('loadedmetadata', () => {
                    stationLogoAspectRatio = (video.videoWidth && video.videoHeight) ? video.videoWidth / video.videoHeight : 1.0;
                    applyStationLogoPlacement();
                });

                stationLogoVideoElement = video;
                video.play().catch(() => {});

                stationLogoTexture = new THREE.VideoTexture(video);
                stationLogoTexture.minFilter = THREE.LinearFilter;
                stationLogoTexture.magFilter = THREE.LinearFilter;
                stationLogoTexture.colorSpace = THREE.SRGBColorSpace;
                stationLogoShaderMat.uniforms.map.value = stationLogoTexture;
                stationLogoShaderMat.needsUpdate = true;
            } else {
                const loader = new THREE.TextureLoader();
                loader.load(encodeURI(sourceUrl), (tex) => {
                    stationLogoTexture = tex;
                    stationLogoTexture.minFilter = THREE.LinearFilter;
                    stationLogoTexture.magFilter = THREE.LinearFilter;
                    stationLogoTexture.colorSpace = THREE.SRGBColorSpace;

                    if (tex.image && tex.image.width && tex.image.height) {
                        stationLogoAspectRatio = tex.image.width / tex.image.height;
                    } else {
                        stationLogoAspectRatio = 1.0;
                    }

                    stationLogoShaderMat.uniforms.map.value = stationLogoTexture;
                    stationLogoShaderMat.needsUpdate = true;
                    applyStationLogoPlacement();
                }, undefined, (err) => {
                    console.error('[StationLogo] Texture load error:', err);
                });
            }
        } catch (err) {
            console.error('[StationLogo] Error loading media:', err);
        }
    }

    function playStationLogoVideo() {
        if (stationLogoVideoElement && stationLogoVideoElement.paused) {
            stationLogoVideoElement.play().catch(() => {});
        }
    }

    function setStationLogoPosition(pos) {
        stationLogoPosition = pos;
        applyStationLogoPlacement();
    }

    function setStationLogoVisible(visible, immediate = false) {
        stationLogoVisible = !!visible;
        if (immediate) {
            stationLogoTransition.state = visible ? 'visible' : 'hidden';
            stationLogoTransition.progress = visible ? 1.0 : 0.0;
            stationLogoGroup.visible = stationLogoVisible;
        } else {
            triggerLayerVisibility(stationLogoTransition, stationLogoVisible, stationLogoGroup);
        }
    }

    function setStationLogoScale(val) {
        stationLogoBaseScale = Math.max(0.1, Math.min(5.0, Number(val) || 1.0));
        applyStationLogoPlacement();
    }

    function setStationLogoMode(mode) {
        stationLogoMode = mode;
        applyStationLogoPlacement();
    }

    function setStationLogoBassPulse(val) {
        stationLogoBassPulseAmount = Math.max(0, Math.min(1.0, Number(val) || 0));
    }

    function setStationLogoContrast(val) {
        stationLogoContrast = Math.max(0.5, Math.min(3.0, Number(val) || 1.0));
        stationLogoShaderMat.uniforms.uContrast.value = stationLogoContrast;
    }

    function setStationLogoBrightness(val) {
        stationLogoBrightness = Math.max(0.5, Math.min(3.0, Number(val) || 1.0));
        stationLogoShaderMat.uniforms.uBrightness.value = stationLogoBrightness;
    }

    function setStationLogoBlendMode(modeIdx) {
        stationLogoShaderMat.uniforms.uBlendMode.value = parseInt(modeIdx, 10) || 0;
    }

    function setStationLogoShieldVisible(visible) {
        isStationShieldActive = !!visible;
        if (stationLogoShieldMesh && stationLogoMode !== 'backdrop') {
            stationLogoShieldMesh.visible = isStationShieldActive;
        }
    }

    function setStationLogoSpinMode(mode) {
        if (mode === 'center' || mode === 'orbit' || mode === 'freeroam' || mode === 'free_roam') {
            stationLogoSpinMode = (mode === 'free_roam') ? 'freeroam' : mode;
        } else if (mode === 'on' || mode === true) {
            stationLogoSpinMode = 'center';
        } else {
            stationLogoSpinMode = 'off';
        }
    }

    function setStationLogoSpinSpeed(speed) {
        stationLogoSpinSpeed = typeof speed === 'number' ? speed : 1.0;
    }

    function setStationLogoOffsetY(val) {
        stationLogoOffsetY = Number(val) || 0.0;
        applyStationLogoPlacement();
    }

    function setStationLogoOffsetX(val) {
        stationLogoOffsetX = Number(val) || 0.0;
        applyStationLogoPlacement();
    }

    function setStationLogoEdgeMargin(val) {
        stationLogoEdgeMargin = Math.max(0.0, Math.min(0.4, Number(val) || 0.04));
        applyStationLogoPlacement();
    }

    // =========================================================================
    // EVENT FLYER & PROMO GRAPHIC OVERLAY LAYER
    // =========================================================================
    const flyerGroup = new THREE.Group();
    flyerGroup.renderOrder = 10002;
    flyerGroup.visible = false;
    scene.add(flyerGroup);

    let flyerVideoElement = null;
    let flyerTexture = null;
    let flyerMesh = null;
    let flyerShieldMesh = null;
    let flyerVisible = false;
    let flyerMode = 'overlay'; // 'overlay', 'hologram', 'backdrop'
    let flyerPosition = 'bottom-right'; // 9-grid position
    let flyerBaseOpacity = 1.0;
    let flyerBaseScale = 1.0;
    let flyerBassPulseAmount = 0.2;
    let flyerAspectRatio = 0.75; // 3:4 default flyer aspect ratio
    let flyerContrast = 1.2;
    let flyerBrightness = 1.05;
    let isFlyerShieldActive = true;
    let flyerSpinMode = 'off'; // 'off', 'center', 'orbit', 'freeroam'
    let flyerSpinSpeed = 1.0;
    let flyerSpinAngle = 0.0;
    let currentFlyerPosX = 2.2;
    let currentFlyerPosY = -1.2;
    let currentFlyerBaseZ = 12.0;
    let currentFlyerScaleFactor = 0.75;

    // Dark Contrast Shield for Flyer
    const flyerShieldCanvas = document.createElement('canvas');
    flyerShieldCanvas.width = 256;
    flyerShieldCanvas.height = 256;
    const flSCtx = flyerShieldCanvas.getContext('2d');
    const flSGrad = flSCtx.createRadialGradient(128, 128, 20, 128, 128, 128);
    flSGrad.addColorStop(0, 'rgba(2, 2, 8, 0.88)');
    flSGrad.addColorStop(0.65, 'rgba(2, 2, 8, 0.55)');
    flSGrad.addColorStop(1, 'rgba(2, 2, 8, 0.0)');
    flSCtx.fillStyle = flSGrad;
    flSCtx.fillRect(0, 0, 256, 256);

    const flyerShieldTexture = new THREE.CanvasTexture(flyerShieldCanvas);
    const flyerShieldMat = new THREE.MeshBasicMaterial({
        map: flyerShieldTexture,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
        depthWrite: false,
        fog: false
    });
    flyerShieldMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), flyerShieldMat);
    flyerShieldMesh.renderOrder = 9999;

    const flyerGeo = new THREE.PlaneGeometry(16, 16);
    const flyerShaderMat = new THREE.ShaderMaterial({
        uniforms: {
            map: { value: null },
            uOpacity: { value: flyerBaseOpacity },
            uContrast: { value: flyerContrast },
            uBrightness: { value: flyerBrightness },
            uLumaCutoff: { value: 0.05 },
            uLumaSmooth: { value: 0.05 },
            uBlendMode: { value: 2 } // Direct (2) default
        },
        vertexShader: HighClarityLogoShader.vertexShader,
        fragmentShader: HighClarityLogoShader.fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide
    });

    flyerMesh = new THREE.Mesh(flyerGeo, flyerShaderMat);
    flyerMesh.renderOrder = 10003;

    const flyerPivot = new THREE.Group();
    flyerGroup.add(flyerPivot);
    flyerPivot.add(flyerShieldMesh);
    flyerPivot.add(flyerMesh);

    let flyerOffsetY = 0.0;
    let flyerOffsetX = 0.0;
    let flyerEdgeMargin = 0.04;

    function applyFlyerPlacement() {
        if (!flyerMesh) return;

        let baseZ = 12.0;
        let baseW = 4.8 * flyerBaseScale;

        if (flyerMode === 'backdrop') {
            baseZ = -20;
            baseW = 45 * flyerBaseScale;
            flyerShaderMat.blending = THREE.AdditiveBlending;
            if (flyerShieldMesh) flyerShieldMesh.visible = false;
        } else if (flyerMode === 'hologram') {
            baseZ = 6.9;
            baseW = (flyerPosition === 'center' ? 7.5 : 4.8) * flyerBaseScale;
            flyerShaderMat.blending = THREE.NormalBlending;
            if (flyerShieldMesh) flyerShieldMesh.visible = isFlyerShieldActive;
        } else {
            baseZ = 12.0;
            baseW = 4.8 * flyerBaseScale;
            flyerShaderMat.blending = THREE.NormalBlending;
            if (flyerShieldMesh) flyerShieldMesh.visible = isFlyerShieldActive;
        }

        const w = baseW;
        const h = baseW / (flyerAspectRatio || 0.75);

        const vFovRad = (camera.fov * Math.PI) / 180;
        const dist = Math.abs(camera.position.z - baseZ);
        const visibleHalfHeight = Math.tan(vFovRad / 2) * dist;
        const visibleHalfWidth = visibleHalfHeight * camera.aspect;

        const maxAllowedHalfW = visibleHalfWidth * 0.94;
        const maxAllowedHalfH = visibleHalfHeight * 0.94;
        const halfW = w / 2;
        const halfH = h / 2;

        let scaleFactor = 1.0;
        if (halfW > maxAllowedHalfW || halfH > maxAllowedHalfH) {
            scaleFactor = Math.min(maxAllowedHalfW / halfW, maxAllowedHalfH / halfH);
        }

        const effectiveHalfW = halfW * scaleFactor;
        const effectiveHalfH = halfH * scaleFactor;

        const marginX = visibleHalfWidth * flyerEdgeMargin;
        const marginY = visibleHalfHeight * flyerEdgeMargin;

        const targetRight = visibleHalfWidth - marginX - effectiveHalfW;
        const targetLeft = -visibleHalfWidth + marginX + effectiveHalfW;
        const targetTop = visibleHalfHeight - marginY - effectiveHalfH;
        const targetBottom = -visibleHalfHeight + marginY + effectiveHalfH;

        let posX = 0.0;
        let posY = 0.0;

        switch (flyerPosition) {
            case 'top-left': posX = targetLeft; posY = targetTop; break;
            case 'top': case 'top-center': posX = 0.0; posY = targetTop; break;
            case 'top-right': posX = targetRight; posY = targetTop; break;
            case 'left': case 'center-left': posX = targetLeft; posY = 0.0; break;
            case 'center': posX = 0.0; posY = 0.0; break;
            case 'right': case 'center-right': posX = targetRight; posY = 0.0; break;
            case 'bottom-left': posX = targetLeft; posY = targetBottom; break;
            case 'bottom': case 'bottom-center': posX = 0.0; posY = targetBottom; break;
            case 'bottom-right': default: posX = targetRight; posY = targetBottom; break;
        }

        posX += flyerOffsetX * (visibleHalfWidth * 0.5);
        posY += flyerOffsetY * (visibleHalfHeight * 0.5);

        flyerPivot.position.set(posX, posY, baseZ);
        flyerPivot.quaternion.copy(camera.quaternion);

        currentFlyerPosX = posX;
        currentFlyerPosY = posY;
        currentFlyerBaseZ = baseZ;
        currentFlyerScaleFactor = scaleFactor;

        flyerMesh.position.set(0, 0, 0);
        flyerMesh.scale.set((w * scaleFactor) / 16, (h * scaleFactor) / 16, 1);
        flyerMesh.rotation.order = 'YXZ';
        flyerMesh.rotation.set(0, 0, 0);

        if (flyerShieldMesh && flyerMode !== 'backdrop') {
            flyerShieldMesh.position.set(0, 0, -0.2);
            flyerShieldMesh.rotation.set(0, 0, 0);
            flyerShieldMesh.scale.set(((w * scaleFactor) * 1.35) / 16, ((h * scaleFactor) * 1.4) / 16, 1);
        }
    }

    applyFlyerPlacement();

    function loadFlyerMedia(sourceUrl, isVideo = false) {
        try {
            if (flyerVideoElement) {
                flyerVideoElement.pause();
                flyerVideoElement.removeAttribute('src');
                flyerVideoElement.load();
                flyerVideoElement = null;
            }

            if (isVideo) {
                const video = document.createElement('video');
                video.src = encodeURI(sourceUrl);
                video.crossOrigin = 'anonymous';
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                video.autoplay = true;

                const updateAspect = () => {
                    flyerAspectRatio = (video.videoWidth && video.videoHeight) ? video.videoWidth / video.videoHeight : (3 / 4);
                    applyFlyerPlacement();
                };
                video.addEventListener('loadedmetadata', updateAspect);
                if (video.readyState >= 1) updateAspect();

                flyerVideoElement = video;
                video.play().catch(() => {});

                flyerTexture = new THREE.VideoTexture(video);
                flyerTexture.minFilter = THREE.LinearFilter;
                flyerTexture.magFilter = THREE.LinearFilter;
                flyerTexture.colorSpace = THREE.SRGBColorSpace;

                flyerShaderMat.uniforms.map.value = flyerTexture;
                flyerShaderMat.needsUpdate = true;
                applyFlyerPlacement();
            } else {
                const loader = new THREE.TextureLoader();
                loader.load(encodeURI(sourceUrl), (tex) => {
                    flyerTexture = tex;
                    flyerTexture.minFilter = THREE.LinearFilter;
                    flyerTexture.magFilter = THREE.LinearFilter;
                    flyerTexture.colorSpace = THREE.SRGBColorSpace;

                    if (tex.image && tex.image.width && tex.image.height) {
                        flyerAspectRatio = tex.image.width / tex.image.height;
                    } else {
                        flyerAspectRatio = 0.75;
                    }

                    flyerShaderMat.uniforms.map.value = flyerTexture;
                    flyerShaderMat.needsUpdate = true;
                    applyFlyerPlacement();
                }, undefined, (err) => {
                    console.error('[Flyer] Texture load error:', err);
                });
            }
        } catch (err) {
            console.error('[Flyer] Error loading media:', err);
        }
    }

    function playFlyerVideo() {
        if (flyerVideoElement && flyerVideoElement.paused) {
            flyerVideoElement.play().catch(() => {});
        }
    }

    // =========================================================================
    // UNIFIED TRANSITION & SCHEDULER CONTROLLER (DJ LOGO, STATION, FLYER)
    // =========================================================================
    const logoTransition = { state: 'visible', progress: 1.0, effect: 'smooth_fade', duration: 0.7 };
    const stationLogoTransition = { state: 'hidden', progress: 0.0, effect: 'smooth_fade', duration: 0.7 };
    const flyerTransition = { state: 'hidden', progress: 0.0, effect: 'smooth_fade', duration: 0.7 };

    let logoPopTimer = null;
    let stationLogoPopTimer = null;
    let flyerPopTimer = null;

    function triggerLayerVisibility(trans, targetVisible, groupObj) {
        if (targetVisible) {
            if (trans.effect === 'instant' || trans.duration <= 0) {
                trans.state = 'visible';
                trans.progress = 1.0;
                groupObj.visible = true;
            } else {
                trans.state = 'entering';
                groupObj.visible = true;
            }
        } else {
            if (trans.effect === 'instant' || trans.duration <= 0) {
                trans.state = 'hidden';
                trans.progress = 0.0;
                groupObj.visible = false;
            } else {
                trans.state = 'exiting';
            }
        }
    }

    function updateTransitionState(trans, groupObj, delta) {
        if (trans.state === 'entering') {
            const dur = trans.duration || 0.7;
            trans.progress = Math.min(1.0, trans.progress + delta / dur);
            if (trans.progress >= 1.0) {
                trans.state = 'visible';
                trans.progress = 1.0;
            }
        } else if (trans.state === 'exiting') {
            const dur = trans.duration || 0.7;
            trans.progress = Math.max(0.0, trans.progress - delta / dur);
            if (trans.progress <= 0.0) {
                trans.state = 'hidden';
                trans.progress = 0.0;
                groupObj.visible = false;
            }
        }
    }

    function computeTransitionTransforms(trans) {
        const p = Math.max(0, Math.min(1, trans.progress));
        if (trans.state === 'visible') {
            return { opacity: 1.0, scale: 1.0, offX: 0, offY: 0, rotX: 0, rotY: 0, rotZ: 0 };
        }
        if (trans.state === 'hidden') {
            return { opacity: 0.0, scale: 0.0, offX: 0, offY: 0, rotX: 0, rotY: 0, rotZ: 0 };
        }

        const effect = trans.effect || 'smooth_fade';
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
        const easedP = easeOutCubic(p);

        let opacity = easedP;
        let scale = 1.0;
        let offX = 0;
        let offY = 0;
        let rotX = 0;
        let rotY = 0;
        let rotZ = 0;

        switch (effect) {
            case 'zoom_pop':
                scale = p < 0.75 ? (p / 0.75) * 1.15 : 1.15 - ((p - 0.75) / 0.25) * 0.15;
                opacity = Math.min(1.0, p * 2.5);
                break;
            case 'slide_top':
                offY = (1.0 - easedP) * 10.0;
                opacity = Math.min(1.0, p * 2.0);
                break;
            case 'slide_bottom':
                offY = -(1.0 - easedP) * 10.0;
                opacity = Math.min(1.0, p * 2.0);
                break;
            case 'slide_left':
                offX = -(1.0 - easedP) * 14.0;
                opacity = Math.min(1.0, p * 2.0);
                break;
            case 'slide_right':
                offX = (1.0 - easedP) * 14.0;
                opacity = Math.min(1.0, p * 2.0);
                break;
            case 'neon_strobe':
                const str = (Math.sin(p * Math.PI * 8.0) > 0.1) ? 1.0 : 0.08;
                opacity = p > 0.85 ? 1.0 : str * (0.3 + p * 0.7);
                scale = 0.95 + p * 0.05;
                break;
            case 'cyber_glitch':
                offX = (Math.random() - 0.5) * (1.0 - p) * 3.0;
                offY = (Math.random() - 0.5) * (1.0 - p) * 1.5;
                opacity = p > 0.3 ? (Math.random() > 0.15 ? p : 0.2) : p;
                break;
            case 'spin_vortex':
                rotZ = (1.0 - easedP) * Math.PI * 4.0;
                scale = Math.max(0.01, easedP);
                opacity = p;
                break;
            case 'flip_card':
                rotY = (1.0 - easedP) * (Math.PI / 2);
                opacity = Math.min(1.0, p * 1.8);
                scale = 0.9 + p * 0.1;
                break;
            case 'smooth_fade':
            default:
                opacity = easedP;
                scale = 1.0;
                break;
        }

        return { opacity, scale, offX, offY, rotX, rotY, rotZ };
    }

    // Setters for Transition Effects & Scheduled Pops
    function setLogoTransitionEffect(effect) { logoTransition.effect = effect || 'smooth_fade'; }
    function setStationLogoTransitionEffect(effect) { stationLogoTransition.effect = effect || 'smooth_fade'; }
    function setFlyerTransitionEffect(effect) { flyerTransition.effect = effect || 'smooth_fade'; }

    function popLogo(durationSec = 15) {
        if (logoPopTimer) clearTimeout(logoPopTimer);
        setLogoVisible(true);
        if (durationSec > 0) {
            logoPopTimer = setTimeout(() => {
                setLogoVisible(false);
                logoPopTimer = null;
            }, durationSec * 1000);
        }
    }

    function popStationLogo(durationSec = 15) {
        if (stationLogoPopTimer) clearTimeout(stationLogoPopTimer);
        setStationLogoVisible(true);
        if (durationSec > 0) {
            stationLogoPopTimer = setTimeout(() => {
                setStationLogoVisible(false);
                stationLogoPopTimer = null;
            }, durationSec * 1000);
        }
    }

    function popFlyer(durationSec = 15) {
        if (flyerPopTimer) clearTimeout(flyerPopTimer);
        setFlyerVisible(true);
        if (durationSec > 0) {
            flyerPopTimer = setTimeout(() => {
                setFlyerVisible(false);
                flyerPopTimer = null;
            }, durationSec * 1000);
        }
    }

    function setFlyerPosition(pos) {
        flyerPosition = pos;
        applyFlyerPlacement();
    }

    function setFlyerVisible(visible, immediate = false) {
        flyerVisible = !!visible;
        if (immediate) {
            flyerTransition.state = visible ? 'visible' : 'hidden';
            flyerTransition.progress = visible ? 1.0 : 0.0;
            flyerGroup.visible = flyerVisible;
        } else {
            triggerLayerVisibility(flyerTransition, flyerVisible, flyerGroup);
        }
    }

    function setFlyerScale(val) {
        flyerBaseScale = Math.max(0.1, Math.min(5.0, Number(val) || 1.0));
        applyFlyerPlacement();
    }

    function setFlyerMode(mode) {
        flyerMode = mode;
        applyFlyerPlacement();
    }

    function setFlyerBassPulse(val) {
        flyerBassPulseAmount = Math.max(0, Math.min(1.0, Number(val) || 0));
    }

    function setFlyerContrast(val) {
        flyerContrast = Math.max(0.5, Math.min(3.0, Number(val) || 1.0));
        flyerShaderMat.uniforms.uContrast.value = flyerContrast;
    }

    function setFlyerBrightness(val) {
        flyerBrightness = Math.max(0.5, Math.min(3.0, Number(val) || 1.0));
        flyerShaderMat.uniforms.uBrightness.value = flyerBrightness;
    }

    function setFlyerBlendMode(modeIdx) {
        flyerShaderMat.uniforms.uBlendMode.value = parseInt(modeIdx, 10) || 0;
    }

    function setFlyerShieldVisible(visible) {
        isFlyerShieldActive = !!visible;
        if (flyerShieldMesh && flyerMode !== 'backdrop') {
            flyerShieldMesh.visible = isFlyerShieldActive;
        }
    }

    function setFlyerSpinMode(mode) {
        if (mode === 'center' || mode === 'orbit' || mode === 'freeroam' || mode === 'free_roam') {
            flyerSpinMode = (mode === 'free_roam') ? 'freeroam' : mode;
        } else if (mode === 'on' || mode === true) {
            flyerSpinMode = 'center';
        } else {
            flyerSpinMode = 'off';
        }
    }

    function setFlyerSpinSpeed(speed) {
        flyerSpinSpeed = typeof speed === 'number' ? speed : 1.0;
    }

    function setFlyerOffsetY(val) {
        flyerOffsetY = Number(val) || 0.0;
        applyFlyerPlacement();
    }

    function setFlyerOffsetX(val) {
        flyerOffsetX = Number(val) || 0.0;
        applyFlyerPlacement();
    }

    function setFlyerEdgeMargin(val) {
        flyerEdgeMargin = Math.max(0.0, Math.min(0.4, Number(val) || 0.04));
        applyFlyerPlacement();
    }

    // =========================================================================
    // CATEGORIZED VFX BANK: 17 SCENES
    // =========================================================================
    const fxRoots = [];
    let currentFXIndex = 0;

    function createFXGroup() {
        const group = new THREE.Group();
        group.visible = false;
        scene.add(group);
        fxRoots.push(group);
        return group;
    }

    // =========================================================================
    // CATEGORY 1: 📊 EQUALIZERS & DECKS (FX 0-3)
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 0: 📊 3D STUDIO PARTICLE SPECTRUM EQUALIZER (Full-Screen Borderless Visualizer)
    // -------------------------------------------------------------------------
    const gEQBars = createFXGroup();
    gEQBars.visible = true;

    // High-Resolution Full-Screen Canvas (16:9 Widescreen)
    const studioEqW = 1600;
    const studioEqH = 900;
    const studioEqCanvas = document.createElement('canvas');
    studioEqCanvas.width = studioEqW;
    studioEqCanvas.height = studioEqH;
    const studioEqCtx = studioEqCanvas.getContext('2d');

    const studioEqTex = new THREE.CanvasTexture(studioEqCanvas);
    studioEqTex.minFilter = THREE.LinearFilter;
    studioEqTex.magFilter = THREE.LinearFilter;

    // Borderless Full-Screen Mesh (Unit plane dynamically scaled to camera viewport)
    const screenGeo = new THREE.PlaneGeometry(1.0, 1.0);
    const screenMat = new THREE.MeshBasicMaterial({ map: studioEqTex, transparent: true, side: THREE.DoubleSide });
    const studioEqScreen = new THREE.Mesh(screenGeo, screenMat);
    studioEqScreen.position.set(0, 0, 0);
    gEQBars.add(studioEqScreen);

    // Spectrum Engine State
    const STUDIO_EQ_BARS = 36;
    const studioEqPeakLevels = new Float32Array(STUDIO_EQ_BARS);
    const studioEqPeakVels = new Float32Array(STUDIO_EQ_BARS);
    const studioEq2DParticles = [];
    const MAX_STUDIO_2D_PARTICLES = 450; // Rich, dense particle canopy reaching the top of the screen

    // Pre-computed color palette cache to guarantee zero garbage collection and zero CSS string parsing
    const studioEqColors = [];
    for (let i = 0; i < STUDIO_EQ_BARS; i++) {
        const freqNorm = i / STUDIO_EQ_BARS;
        let hue = Math.round(185 - freqNorm * 220);
        if (hue < 0) hue += 360;
        studioEqColors.push({
            hue,
            grad0: `hsla(${hue}, 95%, 45%, 0.25)`,
            grad1: `hsla(${hue}, 100%, 55%, 0.85)`,
            grad2: `hsla(${hue}, 100%, 75%, 0.98)`,
            grad3: `hsla(${hue}, 100%, 94%, 1.0)`,
            peak: `hsla(${hue}, 100%, 92%, 0.95)`,
            halo: `hsl(${hue}, 100%, 65%)`,
            core: `hsl(${hue}, 100%, 82%)`
        });
    }

    // -------------------------------------------------------------------------
    // FX 1: 🎯 CIRCULAR SPECTRUM MANDALA
    // -------------------------------------------------------------------------
    const gCircSpec = createFXGroup();
    const circBeamCount = 64;
    const circBeams = [];
    const circRadius = 5.2;

    for (let i = 0; i < circBeamCount; i++) {
        const angle = (i / circBeamCount) * Math.PI * 2;
        const beamGeo = new THREE.BoxGeometry(0.12, 1.0, 0.12);
        beamGeo.translate(0, 0.5, 0);
        const hue = (i / circBeamCount);
        const beamMesh = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 1.0, 0.55) }));
        beamMesh.position.set(Math.cos(angle) * circRadius, Math.sin(angle) * circRadius, 0);
        beamMesh.rotation.z = angle - Math.PI / 2;
        gCircSpec.add(beamMesh);
        circBeams.push(beamMesh);
    }
    const cRingIn = new THREE.Mesh(new THREE.RingGeometry(circRadius - 0.1, circRadius, 64), new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide }));
    const cRingOut = new THREE.Mesh(new THREE.RingGeometry(circRadius + 3.0, circRadius + 3.05, 64), new THREE.MeshBasicMaterial({ color: 0xff007f, side: THREE.DoubleSide }));
    gCircSpec.add(cRingIn);
    gCircSpec.add(cRingOut);

    // -------------------------------------------------------------------------
    // FX 2: 🌊 FLUID GLOWING WAVE MATRIX
    // -------------------------------------------------------------------------
    const gWaveMatrix = createFXGroup();
    const ribbonCount = 16;
    const waveRibbonItems = [];
    const ribbonPalettes = [
        { colA: new THREE.Color(0x00ffff), colB: new THREE.Color(0x9900ff), colC: new THREE.Color(0xff007f) },
        { colA: new THREE.Color(0x00ff88), colB: new THREE.Color(0x00e5ff), colC: new THREE.Color(0x7c3aed) },
        { colA: new THREE.Color(0xff0055), colB: new THREE.Color(0xffaa00), colC: new THREE.Color(0x00ffff) },
        { colA: new THREE.Color(0x38bdf8), colB: new THREE.Color(0xf43f5e), colC: new THREE.Color(0xfbbf24) }
    ];

    for (let r = 0; r < ribbonCount; r++) {
        const pal = ribbonPalettes[r % ribbonPalettes.length];
        const rGeo = new THREE.PlaneGeometry(48, 0.42, 120, 1);
        const rMat = new THREE.ShaderMaterial({
            uniforms: {
                uColorA: { value: pal.colA },
                uColorB: { value: pal.colB },
                uColorC: { value: pal.colC },
                uTime: { value: 0.0 },
                uBass: { value: 0.0 },
                uMid: { value: 0.0 },
                uTreble: { value: 0.0 },
                uRibbonIdx: { value: r }
            },
            vertexShader: FluidWaveRibbonShader.vertexShader,
            fragmentShader: FluidWaveRibbonShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const rMesh = new THREE.Mesh(rGeo, rMat);
        rMesh.position.set(0, -4.0 + r * 0.52, -r * 1.4 + 2.0);
        rMesh.rotation.x = -Math.PI / 3.4;
        gWaveMatrix.add(rMesh);
        waveRibbonItems.push({ mesh: rMesh, mat: rMat, rIdx: r });
    }

    // -------------------------------------------------------------------------
    // FX 3: 🎚️ DJ DECK SCROLLING AUDIO WAVEFORMS (Authentic 3-Band RGB & Phase Sync)
    // -------------------------------------------------------------------------
    const gDJWaveforms = createFXGroup();

    // 1. Live 3-Band Rolling Spectral History Buffer (512 slices wide x 2 deck rows)
    const djAudioHistoryData = new Uint8Array(512 * 2 * 4);
    // Initialize with organic default wave groove so it looks rich before first audio frame
    for (let i = 0; i < 512; i++) {
        const phi = (i / 512) * Math.PI * 16.0;
        const b1 = Math.floor((Math.sin(phi) * 0.4 + 0.5) * 180);
        const m1 = Math.floor((Math.sin(phi * 2.1) * 0.3 + 0.5) * 160);
        const h1 = Math.floor((Math.sin(phi * 4.3) * 0.25 + 0.4) * 140);
        const t1 = (i % 32 === 0) ? 220 : 0;

        const idx1 = i * 4;
        djAudioHistoryData[idx1]     = b1;
        djAudioHistoryData[idx1 + 1] = m1;
        djAudioHistoryData[idx1 + 2] = h1;
        djAudioHistoryData[idx1 + 3] = t1;

        const idx2 = (512 + i) * 4;
        djAudioHistoryData[idx2]     = Math.floor(b1 * 0.85);
        djAudioHistoryData[idx2 + 1] = Math.floor(m1 * 0.90);
        djAudioHistoryData[idx2 + 2] = Math.floor(h1 * 0.80);
        djAudioHistoryData[idx2 + 3] = ((i + 16) % 32 === 0) ? 200 : 0;
    }

    const djAudioHistoryTex = new THREE.DataTexture(djAudioHistoryData, 512, 2, THREE.RGBAFormat, THREE.UnsignedByteType);
    djAudioHistoryTex.minFilter = THREE.LinearFilter;
    djAudioHistoryTex.magFilter = THREE.LinearFilter;
    djAudioHistoryTex.wrapS = THREE.RepeatWrapping;
    djAudioHistoryTex.wrapT = THREE.ClampToEdgeWrapping;
    djAudioHistoryTex.needsUpdate = true;

    // 2. Waveform GPU Shader Material
    const djWaveMat = new THREE.ShaderMaterial({
        uniforms: {
            uAudioHistory: { value: djAudioHistoryTex },
            uHeadPos: { value: 0.0 },
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 },
            uTreble: { value: 0.0 },
            uTransient: { value: 0.0 },
            uBPM: { value: 126.0 },
            uDeck2BPM: { value: 126.0 },
            uBeatPhase: { value: 0.0 },
            uTrackProgress: { value: 0.35 },
            uDeck2Progress: { value: 0.18 },
            uPlayState: { value: 1.0 },
            uZoom: { value: 0.32 }
        },
        vertexShader: DJDeckWaveformShader.vertexShader,
        fragmentShader: DJDeckWaveformShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const djWaveMesh = new THREE.Mesh(new THREE.PlaneGeometry(36.5, 20.5), djWaveMat);
    djWaveMesh.position.set(0, 0, -2.0);
    gDJWaveforms.add(djWaveMesh);

    // 3. 2D High-Resolution Deck HUD Canvas Overlay (2048x1024)
    const djHudCanvas = document.createElement('canvas');
    djHudCanvas.width = 2048;
    djHudCanvas.height = 1024;
    const djHudCtx = djHudCanvas.getContext('2d');
    const djHudTex = new THREE.CanvasTexture(djHudCanvas);
    djHudTex.minFilter = THREE.LinearFilter;
    djHudTex.magFilter = THREE.LinearFilter;

    const djHudMat = new THREE.MeshBasicMaterial({
        map: djHudTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const djHudMesh = new THREE.Mesh(new THREE.PlaneGeometry(36.5, 20.5), djHudMat);
    djHudMesh.position.set(0, 0, -1.9);
    gDJWaveforms.add(djHudMesh);

    // Deck state tracking
    let djHistoryHead = 0;
    let djHudFrameCount = 0;
    let deck1Progress = 0.38;
    let deck2Progress = 0.16;
    let deck1Data = { artist: 'ERIC PRYDZ', title: 'OPUS (LIVE MIX)', bpm: 126.0, key: '8A' };
    let deck2Data = { artist: 'BICEP', title: 'GLUE (CLUB EDIT)', bpm: 126.0, key: '8A' };

    // 4. 3D Full-Spectrum Particle Equalizer Across All Frequency Bands (64 Bins x 28 Particles = 1,792 Particles)
    const specBands = 64;
    const specParticlesPerBand = 28;
    const totalSpecParticles = specBands * specParticlesPerBand;
    const specParticleGeo = new THREE.BufferGeometry();
    const specParticlePos = new Float32Array(totalSpecParticles * 3);
    const specParticleCol = new Float32Array(totalSpecParticles * 3);
    const specParticleBaseX = new Float32Array(totalSpecParticles);
    const specParticleBandIdx = new Float32Array(totalSpecParticles);
    const specParticleLayer = new Float32Array(totalSpecParticles);
    const specParticleSpeed = new Float32Array(totalSpecParticles);

    for (let b = 0; b < specBands; b++) {
        const normBand = b / (specBands - 1);
        const xPos = (normBand - 0.5) * 34.0; // Spans full wide stage width [-17, +17]

        // Harmonious spectral color mapping across audible spectrum
        let hue = 0.52 - normBand * 0.65; // Cyan (0.52) -> Emerald (0.38) -> Gold (0.12) -> Crimson/Magenta (0.90)
        if (hue < 0.0) hue += 1.0;
        const col = new THREE.Color().setHSL(hue, 1.0, 0.60);

        for (let p = 0; p < specParticlesPerBand; p++) {
            const idx = b * specParticlesPerBand + p;
            const layerNorm = p / (specParticlesPerBand - 1);

            specParticleBaseX[idx] = xPos + (Math.random() - 0.5) * 0.45;
            specParticleBandIdx[idx] = b;
            specParticleLayer[idx] = layerNorm;
            specParticleSpeed[idx] = 0.5 + Math.random() * 1.2;

            specParticlePos[idx * 3]     = specParticleBaseX[idx];
            specParticlePos[idx * 3 + 1] = -7.5 + layerNorm * 0.4;
            specParticlePos[idx * 3 + 2] = -1.2 + (Math.random() - 0.5) * 1.5;

            specParticleCol[idx * 3]     = col.r;
            specParticleCol[idx * 3 + 1] = col.g;
            specParticleCol[idx * 3 + 2] = col.b;
        }
    }

    specParticleGeo.setAttribute('position', new THREE.BufferAttribute(specParticlePos, 3));
    specParticleGeo.setAttribute('color', new THREE.BufferAttribute(specParticleCol, 3));

    const specParticleMat = new THREE.PointsMaterial({
        size: 0.28,
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const specParticleField = new THREE.Points(specParticleGeo, specParticleMat);
    gDJWaveforms.add(specParticleField);

    // =========================================================================
    // CATEGORY: 🪩 DISCO (FX 4, 16, 17, 18) & ⚡ LASERS (FX 5, 6, 7)
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 4: 🪩 AUTHENTIC NIGHTCLUB MIRROR BALL RIG [TOP PINSPOTS & FLOOR REFLECTIONS]
    // -------------------------------------------------------------------------
    const gDiscoBall = createFXGroup();

    // 1. Procedural Maps & PMREM Nightclub Environment
    const discoNormalTex = createDiscoNormalMap();
    const discoRoughnessTex = createDiscoRoughnessMap();
    const discoMetalnessTex = createDiscoMetalnessMap();
    const discoTileTex = createDiscoTileTexture();
    const clubEnvMap = createClubEnvironmentMap(renderer);
    const volumetricBeamTex = createVolumetricBeamTexture();
    const floorTileTex = createFloorTileTexture();

    // 2. Big Faceted Chrome & Mirror Glass Disco Ball (Refractive Glass Clearcoat + Silver Backing)
    const dBallGeo = new THREE.SphereGeometry(5.2, 96, 48);
    const dBallMat = new THREE.MeshPhysicalMaterial({
        color: 0xf0f6ff, // Luminous pristine silver / crystal-glass mirror
        metalness: 0.98, // Mirror-silver reflective backing
        roughness: 0.02, // Ultra-sharp crystal mirror glass facets
        normalMap: discoNormalTex,
        normalScale: new THREE.Vector2(1.15, 1.15),
        roughnessMap: discoRoughnessTex,
        metalnessMap: discoMetalnessTex,
        bumpMap: discoTileTex,
        bumpScale: 0.035, // Crisp glass facet bevels
        envMap: clubEnvMap,
        envMapIntensity: 4.6, // High-intensity nightclub HDRI glass reflections
        clearcoat: 1.0, // Clear glass protective coat
        clearcoatRoughness: 0.01,
        reflectivity: 1.0,
        ior: 1.52, // Authentic crown glass refractive index
        iridescence: 0.22, // Subtle glass prism rainbow sheen at glancing angles
        iridescenceIOR: 1.33,
        sheen: 0.30, // Silver glass edge sheen
        sheenColor: new THREE.Color(0xe6f2ff),
        specularIntensity: 1.0,
        specularColor: new THREE.Color(0xffffff)
    });
    const dBallMesh = new THREE.Mesh(dBallGeo, dBallMat);
    dBallMesh.position.set(0, 0.0, 0.0);
    gDiscoBall.add(dBallMesh);

    // 3. Top Mounting Cap & Eyelet Loop (Directly attached to the top pole of the disco ball)
    const discoChainMat = new THREE.MeshStandardMaterial({
        color: 0xdce8fa, // Polished silver chrome chain links & hardware
        metalness: 0.98,
        roughness: 0.10,
        envMap: clubEnvMap,
        envMapIntensity: 3.2
    });

    const discoCapGeo = new THREE.CylinderGeometry(0.72, 0.98, 0.28, 32);
    const discoCapMesh = new THREE.Mesh(discoCapGeo, discoChainMat);
    discoCapMesh.position.set(0, 5.16, 0);
    dBallMesh.add(discoCapMesh);

    const discoEyeletGeo = new THREE.TorusGeometry(0.32, 0.08, 16, 24);
    const discoEyeletMesh = new THREE.Mesh(discoEyeletGeo, discoChainMat);
    discoEyeletMesh.position.set(0, 5.48, 0);
    dBallMesh.add(discoEyeletMesh);

    // 4. Top Hanging Metal Chain & Ceiling Mount (Interlocked Silver Links)
    const discoChainGroup = new THREE.Group();
    const discoChainLinkGeo = new THREE.TorusGeometry(0.28, 0.075, 16, 24);
    const numDiscoChainLinks = 17;
    const discoChainLinks = [];
    for (let l = 0; l < numDiscoChainLinks; l++) {
        const linkMesh = new THREE.Mesh(discoChainLinkGeo, discoChainMat);
        linkMesh.position.set(0, 5.5 + l * 0.48, 0);
        linkMesh.rotation.y = (l % 2 === 0) ? 0 : Math.PI / 2;
        discoChainGroup.add(linkMesh);
        discoChainLinks.push(linkMesh);
    }

    const discoCeilingMountGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.30, 24);
    const discoCeilingMountMesh = new THREE.Mesh(discoCeilingMountGeo, discoChainMat);
    discoCeilingMountMesh.position.set(0, 13.5, 0);
    discoChainGroup.add(discoCeilingMountMesh);
    gDiscoBall.add(discoChainGroup);

    // 5. Dedicated Multi-Directional Concert Stage Pinspots & Stage Lights (Dual Silver Pinspots + Accent Washes)
    const dBallKeyLight = new THREE.DirectionalLight(0xffffff, 2.4); // Brilliant pure-white key pinspot
    dBallKeyLight.position.set(4.0, 7.5, 8.5);
    dBallKeyLight.target = dBallMesh;
    gDiscoBall.add(dBallKeyLight);

    const dBallPinLeft = new THREE.DirectionalLight(0xf0f7ff, 2.2); // Cool-white glass pinspot
    dBallPinLeft.position.set(-6.0, 8.0, 8.0);
    dBallPinLeft.target = dBallMesh;
    gDiscoBall.add(dBallPinLeft);

    const dBallPointSilver = new THREE.PointLight(0xffffff, 3.2, 24.0, 1.2); // Core silver specular highlight
    dBallPointSilver.position.set(0.0, 4.5, 7.5);
    gDiscoBall.add(dBallPointSilver);

    const dBallCyanLight = new THREE.DirectionalLight(0x00ffff, 0.9);
    dBallCyanLight.position.set(-8.0, 2.0, 4.0);
    dBallCyanLight.target = dBallMesh;
    gDiscoBall.add(dBallCyanLight);

    const dBallMagentaLight = new THREE.DirectionalLight(0xff007f, 0.9);
    dBallMagentaLight.position.set(8.0, -2.0, 4.0);
    dBallMagentaLight.target = dBallMesh;
    gDiscoBall.add(dBallMagentaLight);

    const dBallRimLight = new THREE.DirectionalLight(0x5599ff, 1.0);
    dBallRimLight.position.set(0.0, -6.0, -5.0);
    dBallRimLight.target = dBallMesh;
    gDiscoBall.add(dBallRimLight);

    const dBallPointCyan = new THREE.PointLight(0x00ffff, 1.6, 20.0, 1.2);
    dBallPointCyan.position.set(-7.0, 3.0, 5.0);
    gDiscoBall.add(dBallPointCyan);

    const dBallPointMagenta = new THREE.PointLight(0xff007f, 1.6, 20.0, 1.2);
    dBallPointMagenta.position.set(7.0, 3.0, 5.0);
    gDiscoBall.add(dBallPointMagenta);

    // 6. 1,500 Floating 3D Specular Starburst Stars & Sparkles (Subtle Sparkling White & Silver)
    const glintCount = 1500;
    const glintGeo = new THREE.BufferGeometry();
    const glintPos = new Float32Array(glintCount * 3);
    const glintCol = new Float32Array(glintCount * 3);
    const glintPhase = new Float32Array(glintCount);
    const glintSpeed = new Float32Array(glintCount);
    const glintBaseSize = new Float32Array(glintCount);

    // Pure white and silver palette (zero colored hues)
    const silverHues = [
        new THREE.Color(0xffffff), // Diamond Pure White
        new THREE.Color(0xf5f8fc), // Bright Platinum Silver
        new THREE.Color(0xedf3fa), // Shimmering Mirror Silver
        new THREE.Color(0xe2ebf5), // Ice Crystal Silver
        new THREE.Color(0xfcfdff), // Luminous White Star
        new THREE.Color(0xdce6f2)  // Cool Chrome Silver
    ];

    for (let i = 0; i < glintCount; i++) {
        // Distribute in a rich 3D field spanning around and behind the disco ball
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = 6.2 + Math.pow(Math.random(), 1.25) * 28.0;

        glintPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        glintPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        // Slightly bias depth backwards so stars frame and sit behind the disco ball
        glintPos[i * 3 + 2] = r * Math.cos(phi) - 2.5;

        const c = silverHues[i % silverHues.length];
        glintCol[i * 3] = c.r;
        glintCol[i * 3 + 1] = c.g;
        glintCol[i * 3 + 2] = c.b;

        glintPhase[i] = Math.random() * Math.PI * 2;
        glintSpeed[i] = 1.0 + Math.random() * 1.8; // Gentle, subtle sparkle speed
        glintBaseSize[i] = 0.28 + Math.random() * 0.32; // Delicate natural sizes
    }

    glintGeo.setAttribute('position', new THREE.BufferAttribute(glintPos, 3));
    glintGeo.setAttribute('color', new THREE.BufferAttribute(glintCol, 3));
    glintGeo.setAttribute('aPhase', new THREE.BufferAttribute(glintPhase, 1));
    glintGeo.setAttribute('aSpeed', new THREE.BufferAttribute(glintSpeed, 1));
    glintGeo.setAttribute('aBaseSize', new THREE.BufferAttribute(glintBaseSize, 1));

    const glintMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uTexture: { value: starburstTex }
        },
        vertexShader: DiscoSilverStarsShader.vertexShader,
        fragmentShader: DiscoSilverStarsShader.fragmentShader,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    const glintSystem = new THREE.Points(glintGeo, glintMat);
    gDiscoBall.add(glintSystem);

    // -------------------------------------------------------------------------
    // FX 5: ⚡ DUAL-BANK VOLUMETRIC SEARCHLIGHTS
    // -------------------------------------------------------------------------
    const gLasers = createFXGroup();
    const topLaserBeams = [];
    const botLaserBeams = [];
    const allLaserBeams = [];
    const laserApertureFlares = [];

    const topLaserHues = [0x00ffff, 0xff0055, 0x00ff88, 0xffaa00, 0x00e5ff, 0xff007f, 0x39ff14, 0x00ffff];
    const botLaserHues = [0xff007f, 0x00ffcc, 0xffcc00, 0x00ffff, 0x39ff14, 0x9900ff, 0x00e5ff, 0xffffff];

    const laserBeamLength = 64.0;
    const laserCylinderGeo = new THREE.CylinderGeometry(0.018, 0.28, laserBeamLength, 8, 1, true);
    laserCylinderGeo.translate(0, laserBeamLength / 2, 0);
    laserCylinderGeo.rotateX(Math.PI / 2);

    const numTopLasers = 8;
    for (let i = 0; i < numTopLasers; i++) {
        const x = ((i / (numTopLasers - 1)) - 0.5) * 45.0;
        const basePos = new THREE.Vector3(x, 12.8, -6.0);
        const color = new THREE.Color(topLaserHues[i % topLaserHues.length]);

        const laserMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: color },
                uCoreIntensity: { value: 2.5 },
                uGlowIntensity: { value: 1.2 },
                uPulse: { value: 0.0 },
                uTime: { value: 0.0 }
            },
            vertexShader: VolumetricLaserShader.vertexShader,
            fragmentShader: VolumetricLaserShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const beamMesh = new THREE.Mesh(laserCylinderGeo, laserMat);
        beamMesh.position.copy(basePos);
        gLasers.add(beamMesh);

        const pBox = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.85), new THREE.MeshBasicMaterial({ color: 0x111122 }));
        pBox.position.copy(basePos);
        gLasers.add(pBox);

        const flareSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: starburstTex, color: color, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.95 }));
        flareSprite.position.copy(basePos);
        flareSprite.scale.set(1.5, 1.5, 1.0);
        gLasers.add(flareSprite);
        laserApertureFlares.push(flareSprite);

        const item = { mesh: beamMesh, basePos, mat: laserMat, color, type: 'top', idx: i };
        topLaserBeams.push(item);
        allLaserBeams.push(item);
    }

    const numBotLasers = 8;
    for (let i = 0; i < numBotLasers; i++) {
        const x = ((i / (numBotLasers - 1)) - 0.5) * 45.0;
        const basePos = new THREE.Vector3(x, -12.5, -6.0);
        const color = new THREE.Color(botLaserHues[i % botLaserHues.length]);

        const laserMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: color },
                uCoreIntensity: { value: 2.5 },
                uGlowIntensity: { value: 1.2 },
                uPulse: { value: 0.0 },
                uTime: { value: 0.0 }
            },
            vertexShader: VolumetricLaserShader.vertexShader,
            fragmentShader: VolumetricLaserShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const beamMesh = new THREE.Mesh(laserCylinderGeo, laserMat);
        beamMesh.position.copy(basePos);
        gLasers.add(beamMesh);

        const pBox = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.85), new THREE.MeshBasicMaterial({ color: 0x111122 }));
        pBox.position.copy(basePos);
        gLasers.add(pBox);

        const flareSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: starburstTex, color: color, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.95 }));
        flareSprite.position.copy(basePos);
        flareSprite.scale.set(1.5, 1.5, 1.0);
        gLasers.add(flareSprite);
        laserApertureFlares.push(flareSprite);

        const item = { mesh: beamMesh, basePos, mat: laserMat, color, type: 'bot', idx: i };
        botLaserBeams.push(item);
        allLaserBeams.push(item);
    }

    // -------------------------------------------------------------------------
    // FX 7: 💥 SABER MULTI-BEAM DJ FIXTURES
    // -------------------------------------------------------------------------
    const gSaberDisco = createFXGroup();
    const saberPods = [];
    const saberBladeBeams = [];
    const saberPodPositions = [
        { x: -12.5, y: 6.8, z: -6.0, rotDir: 1 },
        { x: 12.5, y: 6.8, z: -6.0, rotDir: -1 },
        { x: -12.5, y: -4.8, z: -6.0, rotDir: -1 },
        { x: 12.5, y: -4.8, z: -6.0, rotDir: 1 }
    ];

    const saberBladeHues = [0x00ffff, 0xff0055, 0x00ff88, 0xffaa00, 0xffffff, 0x9900ff, 0x00e5ff, 0xff007f];
    const saberBladeGeo = new THREE.CylinderGeometry(0.014, 0.22, 52.0, 8, 1, true);
    saberBladeGeo.translate(0, 26.0, 0);
    saberBladeGeo.rotateX(Math.PI / 2);

    saberPodPositions.forEach((podCfg, pIdx) => {
        const podGroup = new THREE.Group();
        podGroup.position.set(podCfg.x, podCfg.y, podCfg.z);
        gSaberDisco.add(podGroup);

        const podRotatingHead = new THREE.Group();
        podGroup.add(podRotatingHead);

        const blades = [];
        for (let b = 0; b < 8; b++) {
            const fanAngle = ((b / 7) - 0.5) * (Math.PI * 0.72);
            const bladeColor = new THREE.Color(saberBladeHues[(b + pIdx * 2) % saberBladeHues.length]);

            const bladeMat = new THREE.ShaderMaterial({
                uniforms: {
                    uColor: { value: bladeColor },
                    uIntensity: { value: 1.0 },
                    uCoreBoost: { value: 2.8 },
                    uTime: { value: 0.0 }
                },
                vertexShader: SaberBeamBladeShader.vertexShader,
                fragmentShader: SaberBeamBladeShader.fragmentShader,
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const bladeMesh = new THREE.Mesh(saberBladeGeo, bladeMat);
            bladeMesh.rotation.y = fanAngle;
            podRotatingHead.add(bladeMesh);

            const bladeItem = { mesh: bladeMesh, mat: bladeMat, baseAngle: fanAngle, color: bladeColor };
            blades.push(bladeItem);
            saberBladeBeams.push(bladeItem);
        }
        saberPods.push({ group: podGroup, head: podRotatingHead, cfg: podCfg, blades });
    });

    // -------------------------------------------------------------------------
    // FX 8: 💫 STROBE HYPER-RINGS & LASER MATRIX
    // -------------------------------------------------------------------------
    const gRings = createFXGroup();
    const hyperRings = [];
    const ringRadii = [2.5, 4.0, 5.5, 7.0, 8.5];
    const ringColors = [0x00ffff, 0xff0055, 0x00ffcc, 0xffaa00, 0x9900ff];

    ringRadii.forEach((rad, idx) => {
        const hrMesh = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.09, 12, 64), new THREE.MeshBasicMaterial({ color: ringColors[idx], wireframe: true }));
        gRings.add(hrMesh);
        hyperRings.push(hrMesh);
    });
    const centerOcta = new THREE.Mesh(new THREE.OctahedronGeometry(1.8, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
    gRings.add(centerOcta);

    // =========================================================================
    // CATEGORY 3: 🕸️ CYBER & RETRO (FX 10-13)
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 8: 🌅 SYNTHWAVE CYBER GRID
    // -------------------------------------------------------------------------
    const gGrid = createFXGroup();
    const gridPlaneGeo = new THREE.PlaneGeometry(74, 100, 96, 120);
    const gridPlaneMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 },
            uSpeed: { value: 1.0 }
        },
        vertexShader: SmoothSynthwaveShader.vertexShader,
        fragmentShader: SmoothSynthwaveShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const gridMesh = new THREE.Mesh(gridPlaneGeo, gridPlaneMat);
    gridMesh.rotation.x = -Math.PI / 2.2;
    gridMesh.position.y = -5.2;
    gridMesh.position.z = -16.0;
    gGrid.add(gridMesh);

    // -------------------------------------------------------------------------
    // FX 11: 🌄 SYNTHWAVE GLOWING RIVER, MOUNTAINS & 80s SUN [NEW]
    // -------------------------------------------------------------------------
    const gSynthwaveRiver = createFXGroup();

    // 1. Distant Twilight Gradient Sky & Twinkling Vector Stars
    const skyGeo = new THREE.PlaneGeometry(160, 90);
    const skyMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 }
        },
        vertexShader: SynthwaveSkyShader.vertexShader,
        fragmentShader: SynthwaveSkyShader.fragmentShader,
        depthWrite: false
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    skyMesh.position.set(0, 8, -48);
    gSynthwaveRiver.add(skyMesh);

    // 2. Retro 80s Segmented Outrun Sun with Blinds & Corona Halo
    const sunGeo = new THREE.PlaneGeometry(36, 36);
    const sunMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 }
        },
        vertexShader: RetroSunShader.vertexShader,
        fragmentShader: RetroSunShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 4.2, -42);
    gSynthwaveRiver.add(sunMesh);

    // 3. 3D Canyon Terrain with River Valley & Wireframe Mountain Peaks
    const riverGeo = new THREE.PlaneGeometry(88, 110, 140, 160);
    const riverMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 }
        },
        vertexShader: SynthwaveRiverMountainShader.vertexShader,
        fragmentShader: SynthwaveRiverMountainShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.rotation.x = -Math.PI / 2.2;
    riverMesh.position.set(0, -4.8, -16.0);
    gSynthwaveRiver.add(riverMesh);

    // -------------------------------------------------------------------------
    // FX 12: 💻 MATRIX CODE RAIN [NEW]
    // -------------------------------------------------------------------------
    const gMatrix = createFXGroup();
    const matrixMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 },
            uGlitch: { value: 0.0 },
            uGlyphMap: { value: matrixGlyphTex }
        },
        vertexShader: MatrixCodeRainShader.vertexShader,
        fragmentShader: MatrixCodeRainShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const matrixMesh = new THREE.Mesh(new THREE.PlaneGeometry(42, 26), matrixMat);
    matrixMesh.position.set(0, 0, -4.0);
    gMatrix.add(matrixMesh);

    // -------------------------------------------------------------------------
    // FX 13: 👾 RETRO ARCADE 80S THEME [NEW]
    // -------------------------------------------------------------------------
    const gArcade = createFXGroup();
    const arcadeMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 }
        },
        vertexShader: RetroArcadeShader.vertexShader,
        fragmentShader: RetroArcadeShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const arcadeMesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), arcadeMat);
    arcadeMesh.position.set(0, 0, -4.0);
    gArcade.add(arcadeMesh);

    // =========================================================================
    // CATEGORY 4: 🌌 SPACE & GALAXY (FX 14-15)
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 14: 🚀 WARP SPEED STARFIELD
    // -------------------------------------------------------------------------
    const gStarfield = createFXGroup();
    const warpStarCount = 2500;
    const warpStarGeo = new THREE.BufferGeometry();
    const warpStarPositions = new Float32Array(warpStarCount * 3);
    const warpStarColors = new Float32Array(warpStarCount * 3);
    const warpStarVelocities = new Float32Array(warpStarCount);

    const colWhiteStar = new THREE.Color(0xffffff);
    const colYellowStar = new THREE.Color(0xffea3d);

    for (let i = 0; i < warpStarCount; i++) {
        warpStarPositions[i * 3] = (Math.random() - 0.5) * 60;
        warpStarPositions[i * 3 + 1] = (Math.random() - 0.5) * 60;
        warpStarPositions[i * 3 + 2] = -Math.random() * 80;
        warpStarVelocities[i] = 0.5 + Math.random() * 1.5;

        const isYellow = Math.random() < 0.18;
        const starC = isYellow ? colYellowStar : colWhiteStar;
        warpStarColors[i * 3] = starC.r;
        warpStarColors[i * 3 + 1] = starC.g;
        warpStarColors[i * 3 + 2] = starC.b;
    }
    warpStarGeo.setAttribute('position', new THREE.BufferAttribute(warpStarPositions, 3));
    warpStarGeo.setAttribute('color', new THREE.BufferAttribute(warpStarColors, 3));
    const warpStarMat = new THREE.PointsMaterial({
        size: 0.36,
        map: roundStarTex,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    const warpStarSystem = new THREE.Points(warpStarGeo, warpStarMat);
    gStarfield.add(warpStarSystem);

    // -------------------------------------------------------------------------
    // FX 15: 🌌 SPIRAL GALAXY COSMIC VORTEX (FULL-SCREEN 3D ACCRETION DIVE)
    // -------------------------------------------------------------------------
    const gPlasmaNebula = createFXGroup();

    const plasmaGeo = new THREE.PlaneGeometry(68, 44, 1, 1);
    const plasmaMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 },
            uPulse: { value: 0.0 }
        },
        vertexShader: PlasmaNebulaShader.vertexShader,
        fragmentShader: PlasmaNebulaShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const plasmaMesh = new THREE.Mesh(plasmaGeo, plasmaMat);
    plasmaMesh.position.set(0, 0, -12.0);
    gPlasmaNebula.add(plasmaMesh);

    const vortexStarCount = 1400;
    const vortexStarGeo = new THREE.BufferGeometry();
    const vortexStarPos = new Float32Array(vortexStarCount * 3);
    const vortexStarCol = new Float32Array(vortexStarCount * 3);
    const vortexStarData = [];

    const vColA = new THREE.Color(0x00ffff);
    const vColB = new THREE.Color(0xff00ff);
    const vColC = new THREE.Color(0xffea3d);
    const vColWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < vortexStarCount; i++) {
        const arm = i % 2;
        const armOffset = arm * Math.PI;
        const rad = 0.5 + Math.pow(Math.random(), 2.0) * 26.0;
        const theta = rad * 0.48 + armOffset + (Math.random() - 0.5) * 0.65;
        const zDepth = -10.0 - (28.0 / (rad + 1.2));

        vortexStarPos[i * 3] = Math.cos(theta) * rad * 1.35;
        vortexStarPos[i * 3 + 1] = Math.sin(theta) * rad * 0.85;
        vortexStarPos[i * 3 + 2] = zDepth;

        const mix = Math.random();
        let c;
        if (rad < 2.5) {
            c = vColWhite.clone().lerp(vColC, Math.random() * 0.5);
        } else if (mix < 0.5) {
            c = vColA.clone().lerp(vColB, mix * 2.0);
        } else {
            c = vColB.clone().lerp(vColC, (mix - 0.5) * 2.0);
        }

        vortexStarCol[i * 3] = c.r;
        vortexStarCol[i * 3 + 1] = c.g;
        vortexStarCol[i * 3 + 2] = c.b;

        vortexStarData.push({
            rad,
            armOffset,
            theta,
            orbitSpeed: 0.6 + (2.5 / (rad + 0.8)),
            inwardSpeed: 0.8 + Math.random() * 1.4,
            jitter: (Math.random() - 0.5) * 0.65
        });
    }

    vortexStarGeo.setAttribute('position', new THREE.BufferAttribute(vortexStarPos, 3));
    vortexStarGeo.setAttribute('color', new THREE.BufferAttribute(vortexStarCol, 3));
    const vortexStarMat = new THREE.PointsMaterial({
        size: 0.32,
        map: roundStarTex,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.9
    });
    const vortexStarSystem = new THREE.Points(vortexStarGeo, vortexStarMat);
    gPlasmaNebula.add(vortexStarSystem);

    // -------------------------------------------------------------------------
    // FX 16: ✨ HYPER PARTICLE STREAM (GPU CURL NOISE & MULTI-STRAND BÉZIER FLOW)
    // Inspired by Szenia Zadvornykh (@zadvorsky) with real-time sound reactivity
    // -------------------------------------------------------------------------
    const gParticleStream = createFXGroup();

    const streamParticleCount = 48000;
    const streamGeo = new THREE.BufferGeometry();

    const streamPos = new Float32Array(streamParticleCount * 3); // Overridden in vertex shader
    const streamOffset = new Float32Array(streamParticleCount * 3);
    const streamProgress = new Float32Array(streamParticleCount);
    const streamSpeed = new Float32Array(streamParticleCount);
    const streamStrand = new Float32Array(streamParticleCount);
    const streamSize = new Float32Array(streamParticleCount);
    const streamColor = new Float32Array(streamParticleCount * 3);
    const streamSeed = new Float32Array(streamParticleCount * 2);

    const pColCyan = new THREE.Color(0x00f3ff);
    const pColPurple = new THREE.Color(0x8a2be2);
    const pColMagenta = new THREE.Color(0xff007f);
    const pColGold = new THREE.Color(0xffb700);
    const pColWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < streamParticleCount; i++) {
        // Strand ID: 0 (core wave), 1 (clockwise helix), 2 (counter helix), 3 (orbital wing), 4 (hyper dart)
        const strand = i % 5;
        streamStrand[i] = strand;

        // Progress phase along stream [0, 1)
        streamProgress[i] = Math.random();

        // Speed variation per particle
        streamSpeed[i] = 0.75 + Math.random() * 0.75;

        // Radial offset / Gaussian dispersion
        const u1 = Math.max(0.0001, Math.random());
        const u2 = Math.random();
        const rad = Math.sqrt(-2.0 * Math.log(u1)) * (strand === 4 ? 0.35 : (strand === 0 ? 0.95 : 1.45));
        const theta = u2 * Math.PI * 2.0;

        streamOffset[i * 3] = Math.cos(theta) * rad;
        streamOffset[i * 3 + 1] = Math.sin(theta) * rad;
        streamOffset[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

        // Particle base size
        const isSpark = Math.random() < 0.08;
        streamSize[i] = isSpark ? (65.0 + Math.random() * 50.0) : (18.0 + Math.random() * 32.0);

        // Individual base color gradient
        const colLerp = Math.random();
        let c;
        if (strand === 0) {
            c = pColCyan.clone().lerp(pColPurple, colLerp);
        } else if (strand === 1) {
            c = pColPurple.clone().lerp(pColMagenta, colLerp);
        } else if (strand === 2) {
            c = pColMagenta.clone().lerp(pColCyan, colLerp);
        } else if (strand === 3) {
            c = pColGold.clone().lerp(pColMagenta, colLerp);
        } else {
            c = isSpark ? pColWhite : pColCyan.clone().lerp(pColGold, colLerp);
        }

        streamColor[i * 3] = c.r;
        streamColor[i * 3 + 1] = c.g;
        streamColor[i * 3 + 2] = c.b;

        // Random seeds for shimmer and curl variations
        streamSeed[i * 2] = Math.random();
        streamSeed[i * 2 + 1] = Math.random();
    }

    streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPos, 3));
    streamGeo.setAttribute('aOffset', new THREE.BufferAttribute(streamOffset, 3));
    streamGeo.setAttribute('aProgress', new THREE.BufferAttribute(streamProgress, 1));
    streamGeo.setAttribute('aSpeed', new THREE.BufferAttribute(streamSpeed, 1));
    streamGeo.setAttribute('aStrand', new THREE.BufferAttribute(streamStrand, 1));
    streamGeo.setAttribute('aSize', new THREE.BufferAttribute(streamSize, 1));
    streamGeo.setAttribute('aColor', new THREE.BufferAttribute(streamColor, 3));
    streamGeo.setAttribute('aSeed', new THREE.BufferAttribute(streamSeed, 2));

    const streamMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uFlowProgress: { value: 0.0 },
            uCurveTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 },
            uTreble: { value: 0.0 },
            uColorCycle: { value: 0.0 }
        },
        vertexShader: ParticleStreamShader.vertexShader,
        fragmentShader: ParticleStreamShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const streamPoints = new THREE.Points(streamGeo, streamMat);
    gParticleStream.add(streamPoints);

    // Orbiting Pulsar Energy Flares
    const pulsarCount = 3;
    const pulsarSprites = [];
    for (let p = 0; p < pulsarCount; p++) {
        const pulsarMat = new THREE.SpriteMaterial({
            map: starburstTex,
            color: p === 0 ? 0x00ffff : (p === 1 ? 0xff00ff : 0xffaa00),
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });
        const pulsarSprite = new THREE.Sprite(pulsarMat);
        pulsarSprite.scale.set(6.0, 6.0, 1.0);
        gParticleStream.add(pulsarSprite);
        pulsarSprites.push({
            sprite: pulsarSprite,
            strand: p,
            progress: p * 0.33,
            speed: 0.040 + p * 0.015
        });
    }

    // Ambient floating star dust
    const streamDustCount = 1800;
    const streamDustGeo = new THREE.BufferGeometry();
    const streamDustPos = new Float32Array(streamDustCount * 3);
    const streamDustCol = new Float32Array(streamDustCount * 3);
    for (let d = 0; d < streamDustCount; d++) {
        streamDustPos[d * 3] = (Math.random() - 0.5) * 60;
        streamDustPos[d * 3 + 1] = (Math.random() - 0.5) * 40;
        streamDustPos[d * 3 + 2] = -50 + Math.random() * 55;

        const dCol = Math.random() > 0.5 ? pColCyan : pColMagenta;
        streamDustCol[d * 3] = dCol.r;
        streamDustCol[d * 3 + 1] = dCol.g;
        streamDustCol[d * 3 + 2] = dCol.b;
    }
    streamDustGeo.setAttribute('position', new THREE.BufferAttribute(streamDustPos, 3));
    streamDustGeo.setAttribute('color', new THREE.BufferAttribute(streamDustCol, 3));
    const streamDustMat = new THREE.PointsMaterial({
        size: 0.40,
        map: roundStarTex,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.55
    });
    const streamDustSystem = new THREE.Points(streamDustGeo, streamDustMat);
    gParticleStream.add(streamDustSystem);

    function getStreamCurvePointJS(t, strand, curveTime) {
        const PI = Math.PI;
        const z = -55.0 + t * 68.0;
        let x = 0, y = 0;
        if (strand === 0) {
            const wave1 = Math.sin(t * PI * 2.0 + curveTime * 0.15);
            const wave2 = Math.cos(t * PI * 4.0 - curveTime * 0.10);
            x = wave1 * 8.5 + Math.sin(t * PI * 5.0) * 2.0;
            y = wave2 * 5.0 + Math.cos(t * PI * 2.5) * 1.5;
        } else if (strand === 1) {
            const theta = t * PI * 10.0 + curveTime * 0.25;
            const r = 4.5 + Math.sin(t * PI * 3.0 + curveTime * 0.12) * 1.5;
            const cx = Math.sin(t * PI * 2.0 + curveTime * 0.15) * 8.5;
            const cy = Math.cos(t * PI * 4.0 - curveTime * 0.10) * 5.0;
            x = cx + Math.cos(theta) * r;
            y = cy + Math.sin(theta) * r;
        } else {
            const theta = -t * PI * 10.0 - curveTime * 0.25 + Math.PI;
            const r = 4.5 + Math.cos(t * PI * 3.0 + curveTime * 0.12) * 1.5;
            const cx = Math.sin(t * PI * 2.0 + curveTime * 0.15) * 8.5;
            const cy = Math.cos(t * PI * 4.0 - curveTime * 0.10) * 5.0;
            x = cx + Math.cos(theta) * r;
            y = cy + Math.sin(theta) * r;
        }
        return { x, y, z };
    }

    // -------------------------------------------------------------------------
    // FX 17: ⏱️ TIME.IS LIVE PRECISION DJ CLOCK & AUDIO SPECTRUM [NEW]
    // -------------------------------------------------------------------------
    const gTimeisClock = createFXGroup();

    const clockCanvas = document.createElement('canvas');
    clockCanvas.width = 2048;
    clockCanvas.height = 1024;
    const clockCtx = clockCanvas.getContext('2d');
    const clockTexture = new THREE.CanvasTexture(clockCanvas);
    clockTexture.minFilter = THREE.LinearFilter;
    clockTexture.magFilter = THREE.LinearFilter;

    const clockPlaneMat = new THREE.MeshBasicMaterial({
        map: clockTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const clockPlaneMesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 18), clockPlaneMat);
    clockPlaneMesh.position.set(0, 0, 0);
    gTimeisClock.add(clockPlaneMesh);

    // 3D Concentric Neon Gyro Rings around Clock
    const gyroRingGeo1 = new THREE.TorusGeometry(8.2, 0.08, 16, 100);
    const gyroRingMat1 = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.65, wireframe: true });
    const gyroRing1 = new THREE.Mesh(gyroRingGeo1, gyroRingMat1);
    gTimeisClock.add(gyroRing1);

    const gyroRingGeo2 = new THREE.TorusGeometry(9.4, 0.06, 16, 100);
    const gyroRingMat2 = new THREE.MeshBasicMaterial({ color: 0xff007f, transparent: true, opacity: 0.55, wireframe: true });
    const gyroRing2 = new THREE.Mesh(gyroRingGeo2, gyroRingMat2);
    gTimeisClock.add(gyroRing2);

    const gyroRingGeo3 = new THREE.TorusGeometry(10.6, 0.05, 16, 100);
    const gyroRingMat3 = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.45, wireframe: true });
    const gyroRing3 = new THREE.Mesh(gyroRingGeo3, gyroRingMat3);
    gTimeisClock.add(gyroRing3);

    // Background floating cyber stars for Time.is depth
    const clockStarCount = 1200;
    const clockStarGeo = new THREE.BufferGeometry();
    const clockStarPositions = new Float32Array(clockStarCount * 3);
    for (let i = 0; i < clockStarCount; i++) {
        clockStarPositions[i * 3] = (Math.random() - 0.5) * 60;
        clockStarPositions[i * 3 + 1] = (Math.random() - 0.5) * 35;
        clockStarPositions[i * 3 + 2] = -10 - Math.random() * 25;
    }
    clockStarGeo.setAttribute('position', new THREE.BufferAttribute(clockStarPositions, 3));
    const clockStarMat = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.25, transparent: true, opacity: 0.7 });
    const clockStarPoints = new THREE.Points(clockStarGeo, clockStarMat);
    gTimeisClock.add(clockStarPoints);

    // -------------------------------------------------------------------------
    // FX 18: 🔦 SWEEPING GODRAY DISCO LIGHTS (WAWA SENSEI R3F-GODRAYS MOVING-HEAD RIG)
    // -------------------------------------------------------------------------
    const gSweepingGodrays = createFXGroup();

    // 1. Stage Rig Truss Header Bar at Top of Screen
    const godrayTrussGeo = new THREE.BoxGeometry(42.0, 0.45, 0.45);
    const godrayTrussMat = new THREE.MeshBasicMaterial({ color: 0x111624 });
    const godrayTrussMesh = new THREE.Mesh(godrayTrussGeo, godrayTrussMat);
    godrayTrussMesh.position.set(0, 11.45, -4.0);
    gSweepingGodrays.add(godrayTrussMesh);

    // 2. 8 Moving-Head Godray Light Pods Spanning Across Top Screen
    const numGodrays = 8;
    const godrayFixtures = [];
    const godrayBeamLength = 36.0;
    const godrayTopRadius = 0.18;
    const godrayBottomRadius = 3.6;

    // Cone geometry extending down from fixture head (apex at 0,0,0)
    const godrayConeGeo = new THREE.CylinderGeometry(godrayTopRadius, godrayBottomRadius, godrayBeamLength, 48, 1, true);
    godrayConeGeo.translate(0, -godrayBeamLength * 0.5, 0); // origin at top lens

    // Hyper-vibrant concert arena palette with blazing saturated neon tones (pure vivid hues, zero pale washouts)
    const godrayPalette = [
        0xffffff, // Fixture 0: Pure Diamond Xenon White
        0xffb700, // Fixture 1: Blazing Sun Gold / Amber Yellow
        0x00ffff, // Fixture 2: Laser Electric Cyan
        0xff0066, // Fixture 3: Hot Neon Magenta / Fuchsia
        0xffee00, // Fixture 4: Ultra Electric Lemon Yellow
        0x00ff66, // Fixture 5: Acid Emerald Green
        0xff5500, // Fixture 6: Blazing Sunset Orange
        0x0088ff  // Fixture 7: Deep Royal Neon Sapphire Blue
    ];

    // Shared geometries & materials for authentic concert moving-head fixtures
    const fixtureYokeGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.22, 16);
    const fixtureHeadGeo = new THREE.CylinderGeometry(0.40, 0.35, 0.85, 20);
    const fixtureBezelGeo = new THREE.RingGeometry(0.16, 0.36, 24);
    const fixtureLensDiscGeo = new THREE.CircleGeometry(0.16, 24);
    const fixtureDarkMat = new THREE.MeshBasicMaterial({ color: 0x0c101c });
    const fixtureBezelMat = new THREE.MeshBasicMaterial({ color: 0x182032 });

    // Flat circular floor reflection pool geometry (lying flat on XZ floor plane, zero square corners)
    const floorPoolGeo = new THREE.CircleGeometry(1.0, 32);

    for (let i = 0; i < numGodrays; i++) {
        const normIdx = i / (numGodrays - 1); // 0.0 to 1.0
        const posX = -17.5 + normIdx * 35.0; // evenly spread from left to right
        const posY = 11.35;
        const posZ = -4.0;

        const podGroup = new THREE.Group();
        podGroup.position.set(posX, posY, posZ);

        // Fixed truss yoke mounting bracket
        const yokeMesh = new THREE.Mesh(fixtureYokeGeo, fixtureDarkMat);
        yokeMesh.position.set(0, 0.45, 0);
        podGroup.add(yokeMesh);

        // Moving-head pivot group (aims the rotating fixture casing & beam synchronously)
        const pivotGroup = new THREE.Group();
        podGroup.add(pivotGroup);

        // Rotating fixture head casing
        const headMesh = new THREE.Mesh(fixtureHeadGeo, fixtureDarkMat);
        headMesh.position.set(0, 0.42, 0);
        pivotGroup.add(headMesh);

        // Outer recessed bezel ring around the lens aperture
        const bezelMesh = new THREE.Mesh(fixtureBezelGeo, fixtureBezelMat);
        bezelMesh.rotation.x = Math.PI / 2;
        bezelMesh.position.set(0, 0.01, 0);
        pivotGroup.add(bezelMesh);

        // Clean glowing optical glass lens disc (clean lens, NO hovering halo sprite!)
        const lensColor = godrayPalette[i % godrayPalette.length];
        const lensDiscMat = new THREE.MeshBasicMaterial({
            color: lensColor,
            transparent: true,
            opacity: 0.90
        });
        const lensDiscMesh = new THREE.Mesh(fixtureLensDiscGeo, lensDiscMat);
        lensDiscMesh.rotation.x = Math.PI / 2;
        lensDiscMesh.position.set(0, 0.005, 0);
        pivotGroup.add(lensDiscMesh);

        // Godray volumetric shader material (Wawa Sensei Worley noise + Inverted Fresnel + Fog Damping)
        const beamMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(lensColor) },
                uCoreColor: { value: new THREE.Color(0xffffff) },
                uIntensity: { value: 0.85 },
                uTime: { value: 0.0 },
                uTimeSpeed: { value: 0.18 },
                uNoiseScale: { value: 3.8 },
                uSmoothTop: { value: 0.16 },
                uSmoothBottom: { value: 0.98 },
                uFresnelPower: { value: 2.2 },
                uPulse: { value: 0.0 }
            },
            vertexShader: WawaSenseiGodrayShader.vertexShader,
            fragmentShader: WawaSenseiGodrayShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const beamMesh = new THREE.Mesh(godrayConeGeo, beamMat);
        pivotGroup.add(beamMesh);

        // Flat circular floor reflection pool using custom FloorSpotShader (exact beam color + white-hot core)
        const floorImpactMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(lensColor) },
                uCoreColor: { value: new THREE.Color(0xffffff) },
                uIntensity: { value: 0.85 },
                uSurge: { value: 0.0 }
            },
            vertexShader: FloorSpotShader.vertexShader,
            fragmentShader: FloorSpotShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const floorImpactMesh = new THREE.Mesh(floorPoolGeo, floorImpactMat);
        floorImpactMesh.rotation.x = -Math.PI / 2; // Flat on the XZ floor plane!
        floorImpactMesh.position.set(posX, -10.59, posZ - 6.0);
        gSweepingGodrays.add(floorImpactMesh);

        gSweepingGodrays.add(podGroup);

        godrayFixtures.push({
            podGroup,
            pivotGroup,
            beamMesh,
            beamMat,
            lensDiscMesh,
            floorImpactMesh,
            floorImpactMat,
            baseColor: new THREE.Color(lensColor),
            normIdx,
            homeX: posX,
            phaseOffset: i * 0.785,
            bassSurge: 0.0
        });
    }

    // 3. Floating Atmospheric Fog Cloud Layers (Spanning stage floor & beam paths)
    const godrayFogGroup = new THREE.Group();
    const floatingFogMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uIntensity: { value: 0.45 },
            uSpotPos: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
            uSpotDir: { value: Array.from({ length: 8 }, () => new THREE.Vector3(0, -1, 0)) },
            uSpotColor: { value: Array.from({ length: 8 }, () => new THREE.Color(0xffffff)) },
            uSpotIntensity: { value: new Float32Array(8) },
            uBass: { value: 0.0 }
        },
        vertexShader: FloatingAtmosphericFogShader.vertexShader,
        fragmentShader: FloatingAtmosphericFogShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const fogPlaneGeo = new THREE.PlaneGeometry(55.0, 38.0, 2, 2);
    const fogLayerHeights = [-6.5, -0.5, 5.5];
    fogLayerHeights.forEach((h, idx) => {
        const fogMesh = new THREE.Mesh(fogPlaneGeo, floatingFogMat);
        fogMesh.rotation.x = -Math.PI * 0.5 + (idx % 2 === 0 ? 0.05 : -0.05);
        fogMesh.rotation.z = (idx * 0.16) - 0.4;
        fogMesh.position.set(0, h, -4.0 + (idx % 2) * 1.5);
        godrayFogGroup.add(fogMesh);
    });
    gSweepingGodrays.add(godrayFogGroup);

    // -------------------------------------------------------------------------
    // FX 17: ☁️ PURE WHITE GODRAYS & PROTEAN VOLUMETRIC CLOUDS
    // -------------------------------------------------------------------------
    const gWhiteGodrayProtean = createFXGroup();

    // 1. Protean Clouds Volumetric Shader Backdrop Plane (nimitz / WebGL2 Fundamentals)
    const proteanCloudGeo = new THREE.PlaneGeometry(160.0, 95.0, 1, 1);
    const proteanCloudMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 },
            uTreble: { value: 0.0 },
            uIntensity: { value: 0.35 }
        },
        vertexShader: ProteanCloudsShader.vertexShader,
        fragmentShader: ProteanCloudsShader.fragmentShader,
        depthWrite: false
    });
    const proteanCloudMesh = new THREE.Mesh(proteanCloudGeo, proteanCloudMat);
    proteanCloudMesh.position.set(0, 0, -30.0);
    gWhiteGodrayProtean.add(proteanCloudMesh);

    // 2. Stage Rig Truss Header Bar at Top of Screen
    const whiteTrussGeo = new THREE.BoxGeometry(42.0, 0.45, 0.45);
    const whiteTrussMat = new THREE.MeshBasicMaterial({ color: 0x141824 });
    const whiteTrussMesh = new THREE.Mesh(whiteTrussGeo, whiteTrussMat);
    whiteTrussMesh.position.set(0, 11.45, -4.0);
    gWhiteGodrayProtean.add(whiteTrussMesh);

    // 3. 8 Moving-Head Diamond Xenon White Godray Pods Spanning Across Top Screen
    const whiteGodrayFixtures = [];
    const whiteBeamLength = 36.0;
    const whiteTopRadius = 0.18;
    const whiteBottomRadius = 3.6;

    const whiteGodrayConeGeo = new THREE.CylinderGeometry(whiteTopRadius, whiteBottomRadius, whiteBeamLength, 48, 1, true);
    whiteGodrayConeGeo.translate(0, -whiteBeamLength * 0.5, 0);

    const whiteFixtureDarkMat = new THREE.MeshBasicMaterial({ color: 0x0c101c });
    const whiteFixtureBezelMat = new THREE.MeshBasicMaterial({ color: 0x222a3e });

    for (let i = 0; i < numGodrays; i++) {
        const normIdx = i / (numGodrays - 1);
        const posX = -17.5 + normIdx * 35.0;
        const posY = 11.35;
        const posZ = -4.0;

        const podGroup = new THREE.Group();
        podGroup.position.set(posX, posY, posZ);

        // Fixed truss mounting bracket
        const yokeMesh = new THREE.Mesh(fixtureYokeGeo, whiteFixtureDarkMat);
        yokeMesh.position.set(0, 0.45, 0);
        podGroup.add(yokeMesh);

        // Moving-head pivot group
        const pivotGroup = new THREE.Group();
        podGroup.add(pivotGroup);

        // Fixture head casing
        const headMesh = new THREE.Mesh(fixtureHeadGeo, whiteFixtureDarkMat);
        headMesh.position.set(0, 0.42, 0);
        pivotGroup.add(headMesh);

        // Outer bezel ring
        const bezelMesh = new THREE.Mesh(fixtureBezelGeo, whiteFixtureBezelMat);
        bezelMesh.rotation.x = Math.PI / 2;
        bezelMesh.position.set(0, 0.01, 0);
        pivotGroup.add(bezelMesh);

        // Diamond Xenon White optical glass lens disc
        const lensDiscMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95
        });
        const lensDiscMesh = new THREE.Mesh(fixtureLensDiscGeo, lensDiscMat);
        lensDiscMesh.rotation.x = Math.PI / 2;
        lensDiscMesh.position.set(0, 0.005, 0);
        pivotGroup.add(lensDiscMesh);

        // Pure Diamond White Godray volumetric shader
        const beamMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(0xffffff) },
                uCoreColor: { value: new THREE.Color(0xffffff) },
                uIntensity: { value: 0.85 },
                uTime: { value: 0.0 },
                uTimeSpeed: { value: 0.18 },
                uNoiseScale: { value: 3.8 },
                uSmoothTop: { value: 0.16 },
                uSmoothBottom: { value: 0.98 },
                uFresnelPower: { value: 2.2 },
                uPulse: { value: 0.0 }
            },
            vertexShader: WawaSenseiGodrayShader.vertexShader,
            fragmentShader: WawaSenseiGodrayShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const beamMesh = new THREE.Mesh(whiteGodrayConeGeo, beamMat);
        pivotGroup.add(beamMesh);

        // Pure White Floor Reflection Pool
        const floorImpactMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(0xffffff) },
                uCoreColor: { value: new THREE.Color(0xffffff) },
                uIntensity: { value: 0.85 },
                uSurge: { value: 0.0 }
            },
            vertexShader: FloorSpotShader.vertexShader,
            fragmentShader: FloorSpotShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const floorImpactMesh = new THREE.Mesh(floorPoolGeo, floorImpactMat);
        floorImpactMesh.rotation.x = -Math.PI / 2;
        floorImpactMesh.position.set(posX, -10.59, posZ - 6.0);
        gWhiteGodrayProtean.add(floorImpactMesh);

        gWhiteGodrayProtean.add(podGroup);

        whiteGodrayFixtures.push({
            podGroup,
            pivotGroup,
            beamMesh,
            beamMat,
            lensDiscMesh,
            floorImpactMesh,
            floorImpactMat,
            normIdx,
            homeX: posX,
            phaseOffset: i * 0.785,
            bassSurge: 0.0
        });
    }

    // 4. Floating Atmospheric Fog Medium Layers (Monochrome White Haze)
    const whiteGodrayFogGroup = new THREE.Group();
    const whiteFloatingFogMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uIntensity: { value: 0.20 },
            uSpotPos: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
            uSpotDir: { value: Array.from({ length: 8 }, () => new THREE.Vector3(0, -1, 0)) },
            uSpotColor: { value: Array.from({ length: 8 }, () => new THREE.Color(0xffffff)) },
            uSpotIntensity: { value: new Float32Array(8) },
            uBass: { value: 0.0 }
        },
        vertexShader: FloatingAtmosphericFogShader.vertexShader,
        fragmentShader: FloatingAtmosphericFogShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    fogLayerHeights.forEach((h, idx) => {
        const fogMesh = new THREE.Mesh(fogPlaneGeo, whiteFloatingFogMat);
        fogMesh.rotation.x = -Math.PI * 0.5 + (idx % 2 === 0 ? 0.05 : -0.05);
        fogMesh.rotation.z = (idx * 0.16) - 0.4;
        fogMesh.position.set(0, h, -4.0 + (idx % 2) * 1.5);
        whiteGodrayFogGroup.add(fogMesh);
    });
    gWhiteGodrayProtean.add(whiteGodrayFogGroup);

    // -------------------------------------------------------------------------
    // FX 18: 🪩 DISCO DANCE FLOOR WITH COLOURED GODRAYS & ATMOSPHERIC SMOKE
    // -------------------------------------------------------------------------
    const gDiscoGodrays = createFXGroup();

    // 1. Protean Clouds Volumetric Shader Backdrop Plane (nimitz / WebGL2 Fundamentals)
    const discoProteanCloudGeo = new THREE.PlaneGeometry(160.0, 95.0, 1, 1);
    const discoProteanCloudMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 },
            uTreble: { value: 0.0 },
            uIntensity: { value: 0.35 }
        },
        vertexShader: ProteanCloudsShader.vertexShader,
        fragmentShader: ProteanCloudsShader.fragmentShader,
        depthWrite: false
    });
    const discoProteanCloudMesh = new THREE.Mesh(discoProteanCloudGeo, discoProteanCloudMat);
    discoProteanCloudMesh.position.set(0, 0, -30.0);
    gDiscoGodrays.add(discoProteanCloudMesh);

    // 2. 70s Saturday Night Fever Illuminated Disco Dance Floor (Flat on Stage Floor)
    const discoStageFloorMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uBPM: { value: 126.0 }
        },
        vertexShader: DiscoFloorShader.vertexShader,
        fragmentShader: DiscoFloorShader.fragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });
    const discoStageFloorMesh = new THREE.Mesh(new THREE.PlaneGeometry(50.0, 36.0), discoStageFloorMat);
    discoStageFloorMesh.rotation.x = -Math.PI / 2; // Flat on stage floor plane
    discoStageFloorMesh.position.set(0, -10.6, -7.0);
    gDiscoGodrays.add(discoStageFloorMesh);

    // 3. Stage Rig Truss Header Bar at Top of Screen
    const discoTrussGeo = new THREE.BoxGeometry(42.0, 0.45, 0.45);
    const discoTrussMat = new THREE.MeshBasicMaterial({ color: 0x111624 });
    const discoTrussMesh = new THREE.Mesh(discoTrussGeo, discoTrussMat);
    discoTrussMesh.position.set(0, 11.45, -4.0);
    gDiscoGodrays.add(discoTrussMesh);

    // 4. 8 Moving-Head Coloured Godray Pods Spanning Across Top Screen
    const discoGodrayFixtures = [];
    const discoBeamLength = 36.0;
    const discoTopRadius = 0.18;
    const discoBottomRadius = 3.6;

    const discoGodrayConeGeo = new THREE.CylinderGeometry(discoTopRadius, discoBottomRadius, discoBeamLength, 48, 1, true);
    discoGodrayConeGeo.translate(0, -discoBeamLength * 0.5, 0);

    const discoFixtureDarkMat = new THREE.MeshBasicMaterial({ color: 0x0c101c });
    const discoFixtureBezelMat = new THREE.MeshBasicMaterial({ color: 0x182032 });

    for (let i = 0; i < numGodrays; i++) {
        const normIdx = i / (numGodrays - 1);
        const posX = -17.5 + normIdx * 35.0;
        const posY = 11.35;
        const posZ = -4.0;

        const podGroup = new THREE.Group();
        podGroup.position.set(posX, posY, posZ);

        // Fixed truss mounting bracket
        const yokeMesh = new THREE.Mesh(fixtureYokeGeo, discoFixtureDarkMat);
        yokeMesh.position.set(0, 0.45, 0);
        podGroup.add(yokeMesh);

        // Moving-head pivot group
        const pivotGroup = new THREE.Group();
        podGroup.add(pivotGroup);

        // Rotating fixture head casing
        const headMesh = new THREE.Mesh(fixtureHeadGeo, discoFixtureDarkMat);
        headMesh.position.set(0, 0.42, 0);
        pivotGroup.add(headMesh);

        // Outer bezel ring
        const bezelMesh = new THREE.Mesh(fixtureBezelGeo, discoFixtureBezelMat);
        bezelMesh.rotation.x = Math.PI / 2;
        bezelMesh.position.set(0, 0.01, 0);
        pivotGroup.add(bezelMesh);

        // Colored optical glass lens disc with softer, refined lens intensity
        const lensColor = godrayPalette[i % godrayPalette.length];
        const lensDiscMat = new THREE.MeshBasicMaterial({
            color: lensColor,
            transparent: true,
            opacity: 0.70
        });
        const lensDiscMesh = new THREE.Mesh(fixtureLensDiscGeo, lensDiscMat);
        lensDiscMesh.rotation.x = Math.PI / 2;
        lensDiscMesh.position.set(0, 0.005, 0);
        pivotGroup.add(lensDiscMesh);

        // Volumetric Godray Shader Material with softer core
        const beamMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(lensColor) },
                uCoreColor: { value: new THREE.Color(0xffffff) },
                uIntensity: { value: 0.75 },
                uTime: { value: 0.0 },
                uTimeSpeed: { value: 0.18 },
                uNoiseScale: { value: 3.8 },
                uSmoothTop: { value: 0.22 },
                uSmoothBottom: { value: 0.98 },
                uFresnelPower: { value: 2.5 },
                uPulse: { value: 0.0 }
            },
            vertexShader: WawaSenseiGodrayShader.vertexShader,
            fragmentShader: WawaSenseiGodrayShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const beamMesh = new THREE.Mesh(discoGodrayConeGeo, beamMat);
        pivotGroup.add(beamMesh);

        // Circular floor reflection spot pool striking the illuminated disco dance floor
        const floorImpactMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(lensColor) },
                uCoreColor: { value: new THREE.Color(0xffffff) },
                uIntensity: { value: 0.85 },
                uSurge: { value: 0.0 }
            },
            vertexShader: FloorSpotShader.vertexShader,
            fragmentShader: FloorSpotShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const floorImpactMesh = new THREE.Mesh(floorPoolGeo, floorImpactMat);
        floorImpactMesh.rotation.x = -Math.PI / 2;
        floorImpactMesh.position.set(posX, -10.59, posZ - 6.0); // 0.01 above disco floor
        gDiscoGodrays.add(floorImpactMesh);

        gDiscoGodrays.add(podGroup);

        discoGodrayFixtures.push({
            podGroup,
            pivotGroup,
            beamMesh,
            beamMat,
            lensDiscMesh,
            floorImpactMesh,
            floorImpactMat,
            baseColor: new THREE.Color(lensColor),
            normIdx,
            homeX: posX,
            phaseOffset: i * 0.785,
            bassSurge: 0.0
        });
    }

    // 5. Floating Atmospheric Fog Medium Layers (Illuminated by Coloured Spotlights)
    const discoGodrayFogGroup = new THREE.Group();
    const discoFloatingFogMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uIntensity: { value: 0.20 },
            uSpotPos: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
            uSpotDir: { value: Array.from({ length: 8 }, () => new THREE.Vector3(0, -1, 0)) },
            uSpotColor: { value: Array.from({ length: 8 }, () => new THREE.Color(0xffffff)) },
            uSpotIntensity: { value: new Float32Array(8) },
            uBass: { value: 0.0 }
        },
        vertexShader: FloatingAtmosphericFogShader.vertexShader,
        fragmentShader: FloatingAtmosphericFogShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    fogLayerHeights.forEach((h, idx) => {
        const fogMesh = new THREE.Mesh(fogPlaneGeo, discoFloatingFogMat);
        fogMesh.rotation.x = -Math.PI * 0.5 + (idx % 2 === 0 ? 0.05 : -0.05);
        fogMesh.rotation.z = (idx * 0.16) - 0.4;
        fogMesh.position.set(0, h, -4.0 + (idx % 2) * 1.5);
        discoGodrayFogGroup.add(fogMesh);
    });
    gDiscoGodrays.add(discoGodrayFogGroup);

    // -------------------------------------------------------------------------
    // FX 21: 📼 VHS GLITCH WORDS & GODRAYS ("DREAMLOVER" / "DO YOU BELIEVE?")
    // -------------------------------------------------------------------------
    const gVhsGlitchWords = createFXGroup();

    // 1. Dynamic VHS Text Canvas Engine
    const vhsWordsCanvas = document.createElement('canvas');
    vhsWordsCanvas.width = 2048;
    vhsWordsCanvas.height = 1024;
    const vhsWordsCtx = vhsWordsCanvas.getContext('2d');
    const vhsWordsTexture = new THREE.CanvasTexture(vhsWordsCanvas);
    vhsWordsTexture.minFilter = THREE.LinearFilter;
    vhsWordsTexture.magFilter = THREE.LinearFilter;
    vhsWordsTexture.generateMipmaps = false;

    const VHS_PHRASES = [
        "DREAMLOVER",
        "DO YOU BELIEVE?"
    ];
    let vhsCurrentPhraseIdx = 0;
    let vhsGlitchSpike = 0.0;
    let vhsLastPhraseSwitchTime = 0.0;

    function renderVhsTextCanvas(phraseIdx) {
        vhsWordsCtx.clearRect(0, 0, vhsWordsCanvas.width, vhsWordsCanvas.height);
        const text = VHS_PHRASES[phraseIdx % VHS_PHRASES.length];

        const cx = vhsWordsCanvas.width / 2;
        const cy = vhsWordsCanvas.height / 2;

        vhsWordsCtx.save();
        vhsWordsCtx.textAlign = 'center';
        vhsWordsCtx.textBaseline = 'middle';

        // Auto-fit typography: Measure text and compute exact optimal font size to fill ~90% of canvas width
        const targetWidth = vhsWordsCanvas.width * 0.90;
        let testFontSize = 320;
        vhsWordsCtx.font = `900 ${testFontSize}px "Impact", "Arial Black", -apple-system, BlinkMacSystemFont, "Montserrat", sans-serif`;
        const measuredWidth = vhsWordsCtx.measureText(text).width;
        let optimalFontSize = Math.floor(testFontSize * (targetWidth / Math.max(1, measuredWidth)));
        optimalFontSize = Math.min(340, Math.max(160, optimalFontSize));

        const letterSpacingPx = Math.max(6, Math.floor(optimalFontSize * 0.045));
        vhsWordsCtx.letterSpacing = `${letterSpacingPx}px`;
        vhsWordsCtx.font = `900 ${optimalFontSize}px "Impact", "Arial Black", -apple-system, BlinkMacSystemFont, "Montserrat", sans-serif`;

        const textTop = cy - optimalFontSize * 0.55;
        const textBottom = cy + optimalFontSize * 0.55;

        // 1. Deep Black High-Contrast Border for Sharp Letter Separation (Prevents blow-out)
        vhsWordsCtx.shadowColor = 'rgba(0, 0, 0, 1.0)';
        vhsWordsCtx.shadowBlur = 18;
        vhsWordsCtx.shadowOffsetX = 0;
        vhsWordsCtx.shadowOffsetY = 4;
        vhsWordsCtx.lineWidth = Math.max(20, optimalFontSize * 0.09);
        vhsWordsCtx.strokeStyle = '#000000';
        vhsWordsCtx.strokeText(text, cx, cy);

        // 2. Pure Crisp White High-Voltage CRT Phosphor Fill
        vhsWordsCtx.shadowBlur = 0;
        vhsWordsCtx.shadowOffsetY = 0;
        const crtGrad = vhsWordsCtx.createLinearGradient(0, textTop, 0, textBottom);
        crtGrad.addColorStop(0.00, '#ffffff'); // Pure Peak White
        crtGrad.addColorStop(0.35, '#fafdff'); // Hyper-Bright Electron Core
        crtGrad.addColorStop(0.70, '#eff6fb'); // Cool Cathode Sheen
        crtGrad.addColorStop(1.00, '#dceaf4'); // CRT Phosphor Base
        
        vhsWordsCtx.fillStyle = crtGrad;
        vhsWordsCtx.fillText(text, cx, cy);

        // 3. Razor-Sharp Inner Cathode Glow Edge
        vhsWordsCtx.lineWidth = 3.5;
        vhsWordsCtx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        vhsWordsCtx.strokeText(text, cx, cy);

        vhsWordsCtx.restore();
        vhsWordsTexture.needsUpdate = true;
    }

    renderVhsTextCanvas(0);

    // 2. 3D Floating VHS Glitch Text Plane (Responsive Screen-Fitted Geometry)
    const vhsTextPlaneMat = new THREE.ShaderMaterial({
        uniforms: {
            tDiffuse: { value: vhsWordsTexture },
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uGlitch: { value: 0.0 },
            uTextColor: { value: new THREE.Color(0xffffff) },
            uSpotPos: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
            uSpotDir: { value: Array.from({ length: 8 }, () => new THREE.Vector3(0, -1, 0)) },
            uSpotColor: { value: Array.from({ length: 8 }, () => new THREE.Color(0xffd866)) },
            uSpotIntensity: { value: new Float32Array(8) }
        },
        vertexShader: VHSGlitchTextShader.vertexShader,
        fragmentShader: VHSGlitchTextShader.fragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const vhsTextPlaneMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), vhsTextPlaneMat);
    vhsTextPlaneMesh.position.set(0, 0.35, 2.5);
    gVhsGlitchWords.add(vhsTextPlaneMesh);

    function updateVhsTextPlaneScale() {
        if (!vhsTextPlaneMesh || !camera) return;
        const aspect = window.innerWidth / Math.max(1, window.innerHeight);
        const vFovRad = (camera.fov * Math.PI) / 180.0;
        const dist = Math.max(1.0, 16.0 - vhsTextPlaneMesh.position.z);
        const frustumH = 2.0 * dist * Math.tan(vFovRad * 0.5);
        const frustumW = frustumH * aspect;

        // Dominant, bold scale: Fill ~92% of screen width, up to ~65% of screen height
        let targetW = frustumW * 0.92;
        let targetH = targetW * 0.5; // 2:1 aspect ratio

        if (targetH > frustumH * 0.65) {
            targetH = frustumH * 0.65;
            targetW = targetH * 2.0;
        }

        vhsTextPlaneMesh.scale.set(targetW, targetH, 1.0);
    }
    updateVhsTextPlaneScale();

    // 3. Stage Rig Truss Header Bar at Top of Screen
    const vhsTrussGeo = new THREE.BoxGeometry(42.0, 0.45, 0.45);
    const vhsTrussMat = new THREE.MeshBasicMaterial({ color: 0x141824 });
    const vhsTrussMesh = new THREE.Mesh(vhsTrussGeo, vhsTrussMat);
    vhsTrussMesh.position.set(0, 11.45, -4.0);
    gVhsGlitchWords.add(vhsTrussMesh);

    // 4. 8 Moving-Head Subtle Golden-Yellow Godray Pods Spanning Across Top Screen
    const vhsGodrayFixtures = [];
    const vhsBeamLength = 36.0;
    const vhsTopRadius = 0.18;
    const vhsBottomRadius = 3.6;

    const vhsGodrayConeGeo = new THREE.CylinderGeometry(vhsTopRadius, vhsBottomRadius, vhsBeamLength, 48, 1, true);
    vhsGodrayConeGeo.translate(0, -vhsBeamLength * 0.5, 0);

    const vhsFixtureDarkMat = new THREE.MeshBasicMaterial({ color: 0x0c101c });
    const vhsFixtureBezelMat = new THREE.MeshBasicMaterial({ color: 0x222a3e });

    for (let i = 0; i < numGodrays; i++) {
        const normIdx = i / (numGodrays - 1);
        const posX = -17.5 + normIdx * 35.0;
        const posY = 11.35;
        const posZ = -4.0;

        const podGroup = new THREE.Group();
        podGroup.position.set(posX, posY, posZ);

        // Fixed truss mounting bracket
        const yokeMesh = new THREE.Mesh(fixtureYokeGeo, vhsFixtureDarkMat);
        yokeMesh.position.set(0, 0.45, 0);
        podGroup.add(yokeMesh);

        // Moving-head pivot group
        const pivotGroup = new THREE.Group();
        podGroup.add(pivotGroup);

        // Rotating fixture head casing
        const headMesh = new THREE.Mesh(fixtureHeadGeo, vhsFixtureDarkMat);
        headMesh.position.set(0, 0.42, 0);
        pivotGroup.add(headMesh);

        // Outer bezel ring
        const bezelMesh = new THREE.Mesh(fixtureBezelGeo, vhsFixtureBezelMat);
        bezelMesh.rotation.x = Math.PI / 2;
        bezelMesh.position.set(0, 0.01, 0);
        pivotGroup.add(bezelMesh);

        // Warm Golden Yellow optical glass lens disc
        const lensDiscMat = new THREE.MeshBasicMaterial({
            color: 0xffd866,
            transparent: true,
            opacity: 0.70
        });
        const lensDiscMesh = new THREE.Mesh(fixtureLensDiscGeo, lensDiscMat);
        lensDiscMesh.rotation.x = Math.PI / 2;
        lensDiscMesh.position.set(0, 0.005, 0);
        pivotGroup.add(lensDiscMesh);

        // Volumetric Godray shader material (Subtle Warm Golden-Yellow Beams)
        const beamMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(0xffd866) },
                uCoreColor: { value: new THREE.Color(0xfff2b3) },
                uIntensity: { value: 0.38 },
                uTime: { value: 0.0 },
                uTimeSpeed: { value: 0.18 },
                uNoiseScale: { value: 3.8 },
                uSmoothTop: { value: 0.18 },
                uSmoothBottom: { value: 0.98 },
                uFresnelPower: { value: 2.2 },
                uPulse: { value: 0.0 }
            },
            vertexShader: WawaSenseiGodrayShader.vertexShader,
            fragmentShader: WawaSenseiGodrayShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const beamMesh = new THREE.Mesh(vhsGodrayConeGeo, beamMat);
        pivotGroup.add(beamMesh);

        // Floor reflection spot pool (Warm Golden-Yellow)
        const floorImpactMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(0xffd866) },
                uCoreColor: { value: new THREE.Color(0xfff2b3) },
                uIntensity: { value: 0.38 },
                uSurge: { value: 0.0 }
            },
            vertexShader: FloorSpotShader.vertexShader,
            fragmentShader: FloorSpotShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const floorImpactMesh = new THREE.Mesh(floorPoolGeo, floorImpactMat);
        floorImpactMesh.rotation.x = -Math.PI / 2;
        floorImpactMesh.position.set(posX, -10.59, posZ - 6.0);
        gVhsGlitchWords.add(floorImpactMesh);

        gVhsGlitchWords.add(podGroup);

        vhsGodrayFixtures.push({
            podGroup,
            pivotGroup,
            beamMesh,
            beamMat,
            lensDiscMesh,
            floorImpactMesh,
            floorImpactMat,
            normIdx,
            homeX: posX,
            phaseOffset: i * 0.785,
            bassSurge: 0.0
        });
    }

    // 5. Dual Inward-Billowing Atmospheric Smoke Medium Layers (Rolling from Left & Right)
    const vhsSmokeGroup = new THREE.Group();
    const vhsSmokeMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uIntensity: { value: 0.32 },
            uSpotPos: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
            uSpotDir: { value: Array.from({ length: 8 }, () => new THREE.Vector3(0, -1, 0)) },
            uSpotColor: { value: Array.from({ length: 8 }, () => new THREE.Color(0xffffff)) },
            uSpotIntensity: { value: new Float32Array(8) },
            uBass: { value: 0.0 }
        },
        vertexShader: DualInwardAtmosphericSmokeShader.vertexShader,
        fragmentShader: DualInwardAtmosphericSmokeShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const vhsSmokeHeights = [-3.0, 0.5, 4.0];
    vhsSmokeHeights.forEach((h, idx) => {
        const smokeMesh = new THREE.Mesh(fogPlaneGeo, vhsSmokeMat);
        smokeMesh.rotation.x = -Math.PI * 0.5 + (idx % 2 === 0 ? 0.06 : -0.06);
        smokeMesh.rotation.z = (idx * 0.14) - 0.35;
        smokeMesh.position.set(0, h, -5.0 + (idx % 3) * 2.5);
        vhsSmokeGroup.add(smokeMesh);
    });
    // -------------------------------------------------------------------------
    // FX 20: 🎃 SPINNING PUMPKIN DISCO BALL & VOLUMETRIC BLUE GODRAYS
    // -------------------------------------------------------------------------
    const gPumpkinDiscoBall = createFXGroup();

    // Procedural Parametric 3D Lobed Pumpkin Geometry (Classic organic pumpkin height 0.88 of width with 10 vertical lobes)
    function createPumpkinDiscoGeometry(baseRadius = 5.2, widthSegments = 128, heightSegments = 64, numLobes = 10) {
        const geo = new THREE.SphereGeometry(baseRadius, widthSegments, heightSegments);
        const pos = geo.attributes.position;
        const v = new THREE.Vector3();

        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);

            const r = v.length();
            if (r < 0.0001) continue;

            const theta = Math.atan2(v.x, v.z);
            const phi = Math.acos(Math.max(-1, Math.min(1, v.y / r)));

            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            // Top stem and bottom pole depression (dimple)
            const poleDimple = 1.0 - 0.08 * Math.pow(Math.abs(cosPhi), 2.5);

            // 10 vertical ribbed lobes
            const lobeWave = Math.cos(numLobes * theta);
            const lobeDepth = 0.08 * lobeWave * Math.pow(sinPhi, 0.85);

            // Slightly reduced height (0.88 ratio) gives authentic pumpkin silhouette
            const radialScale = (1.0 + lobeDepth) * poleDimple;

            v.x = r * sinPhi * Math.sin(theta) * radialScale;
            v.z = r * sinPhi * Math.cos(theta) * radialScale;
            v.y = r * cosPhi * poleDimple * 0.88; // Reduced height gives classic pumpkin shape

            pos.setXYZ(i, v.x, v.y, v.z);
        }

        geo.computeVertexNormals();
        return geo;
    }

    // 1. Textures & Procedural Maps
    const pumpkinTileTex = discoTileTex;
    const pumpkinNormalTex = discoNormalTex;
    const pumpkinRoughnessTex = discoRoughnessTex;
    const pumpkinMetalnessTex = discoMetalnessTex;

    // Organic Curved Pumpkin Stalk / Stem with Pure Silver Mirror Chrome Finish (Directly attached to hanging chain)
    function createPumpkinStemMesh() {
        const stemGroup = new THREE.Group();

        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 4.18, 0),         // Stem base securely in top dimple
            new THREE.Vector3(0.06, 4.70, 0.04),   // Lower stalk
            new THREE.Vector3(0.16, 5.20, 0.10),   // Mid stalk curving out
            new THREE.Vector3(0.14, 5.60, 0.08),   // Upper stalk curve
            new THREE.Vector3(0.04, 5.85, 0.03)    // Stalk tip meeting eyelet
        ]);

        const stemGeo = new THREE.TubeGeometry(curve, 32, 0.30, 16, false);
        const stemPos = stemGeo.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < stemPos.count; i++) {
            v.fromBufferAttribute(stemPos, i);
            const t = Math.max(0, Math.min(1, (v.y - 4.18) / 1.67));
            const taper = 1.25 * (1.0 - t * 0.55);
            const angle = Math.atan2(v.x, v.z);
            const ridge = 1.0 + 0.12 * Math.cos(6 * angle);
            v.x = v.x * taper * ridge;
            v.z = v.z * taper * ridge;
            stemPos.setXYZ(i, v.x, v.y, v.z);
        }
        stemGeo.computeVertexNormals();

        const stemMat = new THREE.MeshStandardMaterial({
            color: 0xf0f5ff,       // Brilliant silver mirror chrome stalk
            roughness: 0.06,
            metalness: 1.0,
            envMap: clubEnvMap,
            envMapIntensity: 3.8
        });

        const stemMesh = new THREE.Mesh(stemGeo, stemMat);
        stemGroup.add(stemMesh);

        // Heavy-duty polished chrome mounting eyelet / shackle ring welded to stem tip
        const stemEyeletGeo = new THREE.TorusGeometry(0.32, 0.08, 16, 24);
        const stemEyeletMesh = new THREE.Mesh(stemEyeletGeo, stemMat);
        stemEyeletMesh.position.set(0.04, 5.85, 0.03);
        stemEyeletMesh.rotation.y = Math.PI * 0.25;
        stemGroup.add(stemEyeletMesh);

        return stemGroup;
    }

    // 2. Pumpkin Disco Ball Pivot & Ultra-Reflective Silver Glass Mirror Mesh
    const pumpkinPivot = new THREE.Group();
    pumpkinPivot.position.set(0, 0.0, 0.0);
    gPumpkinDiscoBall.add(pumpkinPivot);

    const dPumpkinGeo = createPumpkinDiscoGeometry(5.2, 128, 64, 10);
    
    // Spatially-Localized Lighting & Dark Mirror Glass Surface Shader Uniforms
    const pumpkinUniforms = {
        uSpot1Pos: { value: new THREE.Vector3(-1.2, 0.2, 2.5) },
        uSpot2Pos: { value: new THREE.Vector3(1.2, 0.2, 2.5) },
        uSpot1Color: { value: new THREE.Color(0xffffff) },
        uSpot2Color: { value: new THREE.Color(0xffffff) },
        uSpot1Intensity: { value: 1.0 },
        uSpot2Intensity: { value: 1.0 },
        uWhiteSpot1Pos: { value: new THREE.Vector3(-1.0, -2.8, 3.8) },
        uWhiteSpot2Pos: { value: new THREE.Vector3(1.0, -2.8, 3.8) },
        uWhiteSpotIntensity: { value: 0.0 },
        uDarkBaseColor: { value: new THREE.Color(0x331100) },
        uEmissiveThemeColor: { value: new THREE.Color(0xff4400) },
        uFlash: { value: 0.0 },
        uTime: { value: 0.0 },
        uTreble: { value: 0.0 },
        uBassPunch: { value: 0.0 }
    };

    const dPumpkinMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.98,
        roughness: 0.02, // Ultra-sharp crystal mirror glass facets
        normalMap: pumpkinNormalTex,
        normalScale: new THREE.Vector2(1.2, 1.2),
        roughnessMap: pumpkinRoughnessTex,
        metalnessMap: pumpkinMetalnessTex,
        bumpMap: pumpkinTileTex,
        bumpScale: 0.035, // Crisp glass facet bevels
        envMap: clubEnvMap,
        envMapIntensity: 4.8, // Intense nightclub HDRI glass reflections
        clearcoat: 1.0,
        clearcoatRoughness: 0.01,
        reflectivity: 1.0,
        ior: 1.55,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0.0
    });

    // Custom Shader Injection: Glass tiles dynamically change to beaming light color & facet sparkle
    dPumpkinMat.onBeforeCompile = (shader) => {
        shader.uniforms.uSpot1Pos = pumpkinUniforms.uSpot1Pos;
        shader.uniforms.uSpot2Pos = pumpkinUniforms.uSpot2Pos;
        shader.uniforms.uSpot1Color = pumpkinUniforms.uSpot1Color;
        shader.uniforms.uSpot2Color = pumpkinUniforms.uSpot2Color;
        shader.uniforms.uSpot1Intensity = pumpkinUniforms.uSpot1Intensity;
        shader.uniforms.uSpot2Intensity = pumpkinUniforms.uSpot2Intensity;
        shader.uniforms.uWhiteSpot1Pos = pumpkinUniforms.uWhiteSpot1Pos;
        shader.uniforms.uWhiteSpot2Pos = pumpkinUniforms.uWhiteSpot2Pos;
        shader.uniforms.uWhiteSpotIntensity = pumpkinUniforms.uWhiteSpotIntensity;
        shader.uniforms.uDarkBaseColor = pumpkinUniforms.uDarkBaseColor;
        shader.uniforms.uEmissiveThemeColor = pumpkinUniforms.uEmissiveThemeColor;
        shader.uniforms.uFlash = pumpkinUniforms.uFlash;
        shader.uniforms.uTime = pumpkinUniforms.uTime;
        shader.uniforms.uTreble = pumpkinUniforms.uTreble;
        shader.uniforms.uBassPunch = pumpkinUniforms.uBassPunch;

        shader.vertexShader = `
            varying vec2 vPumpkinUv;
            varying vec3 vCustomWorldPos;
        ` + shader.vertexShader;

        shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            `
            #include <worldpos_vertex>
            vPumpkinUv = uv;
            vCustomWorldPos = worldPosition.xyz;
            `
        );

        shader.fragmentShader = `
            uniform vec3 uSpot1Pos;
            uniform vec3 uSpot2Pos;
            uniform vec3 uSpot1Color;
            uniform vec3 uSpot2Color;
            uniform float uSpot1Intensity;
            uniform float uSpot2Intensity;
            uniform vec3 uWhiteSpot1Pos;
            uniform vec3 uWhiteSpot2Pos;
            uniform float uWhiteSpotIntensity;
            uniform vec3 uDarkBaseColor;
            uniform vec3 uEmissiveThemeColor;
            uniform float uFlash;
            uniform float uTime;
            uniform float uTreble;
            uniform float uBassPunch;
            varying vec2 vPumpkinUv;
            varying vec3 vCustomWorldPos;
        ` + shader.fragmentShader;

        // Dynamic Glass Tile Absorption: mirror tiles shift to the beam's color and return when beam moves off
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>

            // Mirror tile grid aligned to 10 lobes (80 columns, 40 rings)
            vec2 tileGridCol = vPumpkinUv * vec2(80.0, 40.0);
            vec2 tileIdCol = floor(tileGridCol);
            vec2 tileLocalCol = fract(tileGridCol) - 0.5;
            float tileFaceCol = smoothstep(0.48, 0.36, max(abs(tileLocalCol.x), abs(tileLocalCol.y)));

            // Spotlight distances on pumpkin surface
            float hitDist1 = length(vCustomWorldPos - uSpot1Pos);
            float hitDist2 = length(vCustomWorldPos - uSpot2Pos);

            // Active spotlight beam footprint on glass tiles
            float beamHit1 = exp(-pow(hitDist1 / 2.7, 2.0)) * clamp(uSpot1Intensity, 0.0, 1.4);
            float beamHit2 = exp(-pow(hitDist2 / 2.7, 2.0)) * clamp(uSpot2Intensity, 0.0, 1.4);
            float totalBeamHit = clamp(beamHit1 + beamHit2, 0.0, 1.0);

            vec3 beamColorBlend = (beamHit1 * uSpot1Color + beamHit2 * uSpot2Color) / max(0.001, beamHit1 + beamHit2);

            // Underneath white spotlights impact on lower mirror tiles
            float whiteDist1Col = length(vCustomWorldPos - uWhiteSpot1Pos);
            float whiteDist2Col = length(vCustomWorldPos - uWhiteSpot2Pos);
            float whiteHit1Col = exp(-pow(whiteDist1Col / 2.0, 2.0));
            float whiteHit2Col = exp(-pow(whiteDist2Col / 2.0, 2.0));
            float totalWhiteHitCol = clamp((whiteHit1Col + whiteHit2Col) * uWhiteSpotIntensity, 0.0, 1.0);

            // Resting state: dark smoked obsidian crystal glass
            vec3 restingGlass = vec3(0.08, 0.05, 0.03);

            // Glass tiles dynamically absorb and change to the beaming light color, then return when beam moves off!
            vec3 tintedGlass = mix(restingGlass, beamColorBlend, totalBeamHit * (0.85 * tileFaceCol + 0.15));
            diffuseColor.rgb = mix(tintedGlass, vec3(0.95), totalWhiteHitCol * (0.85 * tileFaceCol + 0.15));
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `
            #include <emissivemap_fragment>
            
            // 1. Facet coordinate aligned to the 10 pumpkin lobes (80 columns, 40 rings)
            vec2 tileGrid = vPumpkinUv * vec2(80.0, 40.0);
            vec2 tileId = floor(tileGrid);
            vec2 tileLocal = fract(tileGrid) - 0.5;
            float tileInterior = smoothstep(0.48, 0.36, max(abs(tileLocal.x), abs(tileLocal.y)));
            
            // 2. Facet sparkle glints on individual glass mirror tiles
            float facetHash = sin(dot(tileId, vec2(12.9898, 78.233))) * 43758.5453;
            float facetShimmer = pow(clamp(sin(facetHash * 6.283 + uTime * 3.8 + uTreble * 5.0), 0.0, 1.0), 10.0) * tileInterior;
            
            // 3. Spotlight landing intensity on front mirror facets
            float dist1 = length(vCustomWorldPos - uSpot1Pos);
            float dist2 = length(vCustomWorldPos - uSpot2Pos);
            float spotMask1 = exp(-pow(dist1 / 2.7, 2.0)) * clamp(uSpot1Intensity, 0.0, 1.4);
            float spotMask2 = exp(-pow(dist2 / 2.7, 2.0)) * clamp(uSpot2Intensity, 0.0, 1.4);
            float totalSpot = spotMask1 + spotMask2;
            
            // Tile illuminates in the specific beam's color hitting it:
            // Left beam turns tile into left light color, Right beam turns tile into right light color
            vec3 spotTileColor = (spotMask1 * uSpot1Color + spotMask2 * uSpot2Color) / max(0.001, totalSpot);
            
            // Active glass tile illumination: glowing in the true color of the light beam while it hits
            vec3 activeTileIllum = spotTileColor * (clamp(totalSpot, 0.0, 1.3) * (0.85 * tileInterior + 0.15));
            
            // Facet sparkle flares reflecting the spotlight beam
            vec3 facetSparkles = spotTileColor * (facetShimmer * clamp(totalSpot, 0.0, 1.5) * (1.2 + uTreble * 1.8));
            
            // Bass kick seam pulse between tiles (glowing grout seams on heavy drops)
            vec3 kickGrout = uEmissiveThemeColor * (uBassPunch * 0.70 * (1.0 - tileInterior * 0.75));
            
            // Smooth specular glare highlight on direct front hit (sun-through-window feel)
            vec3 sunGlareGlow = spotTileColor * (uFlash * 0.35 * tileInterior);

            // Underneath white spotlights impact and diamond mirror glints
            float whiteDist1 = length(vCustomWorldPos - uWhiteSpot1Pos);
            float whiteDist2 = length(vCustomWorldPos - uWhiteSpot2Pos);
            float whiteHit1 = exp(-pow(whiteDist1 / 2.0, 2.0));
            float whiteHit2 = exp(-pow(whiteDist2 / 2.0, 2.0));
            float totalWhiteHit = (whiteHit1 + whiteHit2) * uWhiteSpotIntensity;
            
            vec3 whiteGlints = vec3(1.0, 1.0, 1.0) * (totalWhiteHit * (0.95 * tileInterior + 0.25) * (1.1 + facetShimmer * 2.2));
            
            totalEmissiveRadiance += activeTileIllum + facetSparkles + kickGrout + sunGlareGlow + whiteGlints;
            `
        );
    };

    const pumpkinMesh = new THREE.Mesh(dPumpkinGeo, dPumpkinMat);
    pumpkinPivot.add(pumpkinMesh);

    // Attach curved pumpkin stalk / stem to pivot so it spins synchronously with the pumpkin
    const pumpkinStem = createPumpkinStemMesh();
    pumpkinPivot.add(pumpkinStem);

    // 3. Top Hanging Metal Chain & Ceiling Mount (Cleanly Interlocked Links)
    const pumpkinChainGroup = new THREE.Group();
    const chainLinkGeo = new THREE.TorusGeometry(0.28, 0.075, 16, 24);
    const chainMat = new THREE.MeshStandardMaterial({
        color: 0xd8e4f8, // Polished silver chrome chain links
        metalness: 0.96,
        roughness: 0.12,
        envMap: clubEnvMap,
        envMapIntensity: 2.8
    });
    const numChainLinks = 16;
    const pumpkinChainLinks = [];
    for (let l = 0; l < numChainLinks; l++) {
        const linkMesh = new THREE.Mesh(chainLinkGeo, chainMat);
        linkMesh.position.set(0, 5.95 + l * 0.46, 0);
        linkMesh.rotation.y = (l % 2 === 0) ? 0 : Math.PI / 2;
        pumpkinChainGroup.add(linkMesh);
        pumpkinChainLinks.push(linkMesh);
    }
    const ceilingMountGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.30, 24);
    const ceilingMountMesh = new THREE.Mesh(ceilingMountGeo, chainMat);
    ceilingMountMesh.position.set(0, 13.5, 0);
    pumpkinChainGroup.add(ceilingMountMesh);
    gPumpkinDiscoBall.add(pumpkinChainGroup);

    // Highly Vibrant True Stage Colors Palette for FX 22 (Pure saturated hues, luminous matching cores, zero pale whites)
    const HALLOWEEN_PALETTE = [
        // 1. Deep Royal Sapphire Cobalt Blue
        { color: new THREE.Color(0x0044ff), core: new THREE.Color(0x3872ff), emissive: new THREE.Color(0x0026b3), name: 'Royal Sapphire Blue' },
        // 2. Deep Saturated Blood Pumpkin Orange
        { color: new THREE.Color(0xff4400), core: new THREE.Color(0xff6e1a), emissive: new THREE.Color(0xcc2900), name: 'Vivid Pumpkin Flame' },
        // 3. Electric Laser Cyan
        { color: new THREE.Color(0x00e5ff), core: new THREE.Color(0x4ff0ff), emissive: new THREE.Color(0x009eb3), name: 'Electric Laser Cyan' },
        // 4. Sinister Witch Velvet Purple
        { color: new THREE.Color(0x9400d3), core: new THREE.Color(0xbd3bfa), emissive: new THREE.Color(0x6a0099), name: 'Witch Velvet Purple' },
        // 5. Radioactive Toxic Acid Neon Green
        { color: new THREE.Color(0x00ff22), core: new THREE.Color(0x47ff5f), emissive: new THREE.Color(0x00b315), name: 'Toxic Acid Green' },
        // 6. Molten Jack-o'-Lantern Amber Gold
        { color: new THREE.Color(0xff8c00), core: new THREE.Color(0xffad2e), emissive: new THREE.Color(0xcc6600), name: 'Molten Amber Gold' },
        // 7. Sinister Blood Ruby Crimson Red
        { color: new THREE.Color(0xff002b), core: new THREE.Color(0xff3b59), emissive: new THREE.Color(0xb3001b), name: 'Blood Ruby Crimson' },
        // 8. Shocking Neon Fuchsia Pink
        { color: new THREE.Color(0xff007f), core: new THREE.Color(0xff3d9f), emissive: new THREE.Color(0xb30056), name: 'Shocking Neon Fuchsia' },
        // 9. High-Voltage Laser Lime
        { color: new THREE.Color(0xa6ff00), core: new THREE.Color(0xc2ff3d), emissive: new THREE.Color(0x73b300), name: 'Laser Lime Gold' },
        // 10. Deep Caribbean Turquoise
        { color: new THREE.Color(0x00ffaa), core: new THREE.Color(0x47ffc2), emissive: new THREE.Color(0x00b374), name: 'Deep Caribbean Turquoise' }
    ];

    function sampleHalloweenPalette(t) {
        if (!HALLOWEEN_PALETTE || HALLOWEEN_PALETTE.length === 0) {
            const fallback = new THREE.Color(0x00e5ff);
            return { color: fallback, core: fallback, emissive: fallback };
        }
        const n = HALLOWEEN_PALETTE.length;
        const progress = ((t % n) + n) % n;
        const idx0 = Math.min(n - 1, Math.max(0, Math.floor(progress)));
        const idx1 = (idx0 + 1) % n;
        const frac = Math.max(0.0, Math.min(1.0, progress - idx0));
        
        // Hold vibrant color plateau for 45% of cycle, smoothly morph across remaining 55%
        const blendFrac = frac < 0.45 ? 0.0 : ((frac - 0.45) / 0.55);
        const smoothFrac = 0.5 - 0.5 * Math.cos(blendFrac * Math.PI);

        const p0 = HALLOWEEN_PALETTE[idx0] || HALLOWEEN_PALETTE[0];
        const p1 = HALLOWEEN_PALETTE[idx1] || HALLOWEEN_PALETTE[0];

        const color = new THREE.Color().lerpColors(p0.color, p1.color, smoothFrac);
        const core = new THREE.Color().lerpColors(p0.core, p1.core, smoothFrac);
        const emissive = new THREE.Color().lerpColors(p0.emissive, p1.emissive, smoothFrac);
        return { color, core, emissive };
    }

    let pumpkinScreenFlash = 0.0;
    let pumpkinLastFlashTime = 0.0;
    let pumpkinDeadOnFlashPulse = 0.0;
    let pumpkinWasDeadOn = false;
    let pumpkinKickThump = 0.0;
    let pumpkinWhiteLightLastBeat = -1;
    let pumpkinWhiteLightOnTimeA = -10.0;
    let pumpkinWhiteLightOnTimeB = -10.0;
    let pumpkinWhiteLightLastGroup = 'B';
    let pumpkinMiniSweepPhase = 0.0;
    let pumpkinPrevBass = 0.0;
    let pumpkinPrevMid = 0.0;
    let pumpkinPrevTreble = 0.0;
    const pumpkinPrevSpectrum = new Float32Array(128);
    let pumpkinLastPhraseIndex = -1;
    let pumpkin8BarFlashPulse = 0.0;
    let pumpkinGlimpsePulse = 0.0;
    let pumpkinWasHitL = false;
    let pumpkinWasHitR = false;

    // 4. Two Bottom-Front DJ Moving-Head Fixtures (Bottom-Left & Bottom-Right)
    const pLeftFixturePos = new THREE.Vector3(-8.8, -6.8, 6.5);
    const pRightFixturePos = new THREE.Vector3(8.8, -6.8, 6.5);

    function createMovingHeadFixture(basePos, scale = 1.0) {
        const fixtureGroup = new THREE.Group();
        fixtureGroup.position.copy(basePos);
        if (scale !== 1.0) {
            fixtureGroup.scale.set(scale, scale, scale);
        }

        const fixtureMat = new THREE.MeshStandardMaterial({
            color: 0x14161f,
            metalness: 0.92,
            roughness: 0.30,
            envMap: clubEnvMap,
            envMapIntensity: 1.8
        });

        const accentMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        // Base plinth
        const baseGeo = new THREE.CylinderGeometry(0.85, 1.05, 0.45, 24);
        const baseMesh = new THREE.Mesh(baseGeo, fixtureMat);
        baseMesh.position.y = 0.22;
        fixtureGroup.add(baseMesh);

        // LED ring on base
        const ledRingGeo = new THREE.TorusGeometry(0.88, 0.035, 12, 24);
        const ledRingMesh = new THREE.Mesh(ledRingGeo, accentMat);
        ledRingMesh.rotation.x = Math.PI / 2;
        ledRingMesh.position.y = 0.35;
        fixtureGroup.add(ledRingMesh);

        // Rotating Yoke (Pan around Y)
        const yokeGroup = new THREE.Group();
        yokeGroup.position.y = 0.45;
        fixtureGroup.add(yokeGroup);

        const yokeBaseGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.22, 24);
        const yokeBaseMesh = new THREE.Mesh(yokeBaseGeo, fixtureMat);
        yokeGroup.add(yokeBaseMesh);

        const armGeo = new THREE.BoxGeometry(0.2, 0.95, 0.35);
        const leftArm = new THREE.Mesh(armGeo, fixtureMat);
        leftArm.position.set(-0.55, 0.5, 0);
        yokeGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, fixtureMat);
        rightArm.position.set(0.55, 0.5, 0);
        yokeGroup.add(rightArm);

        // Moving Head Barrel / Lens Housing (Tilt around X)
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.8, 0);
        yokeGroup.add(headGroup);

        const headBodyGeo = new THREE.CylinderGeometry(0.48, 0.38, 0.95, 24);
        const headBodyMesh = new THREE.Mesh(headBodyGeo, fixtureMat);
        headBodyMesh.rotation.x = Math.PI / 2;
        headGroup.add(headBodyMesh);

        // Lens bezel collar (matte dark metallic rim framing the optical glass)
        const bezelGeo = new THREE.RingGeometry(0.42, 0.485, 28);
        const bezelMat = new THREE.MeshStandardMaterial({
            color: 0x0a0c10,
            metalness: 0.95,
            roughness: 0.25,
            side: THREE.DoubleSide
        });
        const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
        bezelMesh.position.set(0, 0, 0.478);
        headGroup.add(bezelMesh);

        // Concert lens illuminated front halo ring
        const bezelLedGeo = new THREE.TorusGeometry(0.455, 0.018, 12, 28);
        const bezelLedMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const bezelLedMesh = new THREE.Mesh(bezelLedGeo, bezelLedMat);
        bezelLedMesh.position.set(0, 0, 0.480);
        headGroup.add(bezelLedMesh);

        // Primary optical glass lens element (vibrant true-color emissive glass)
        const lensGeo = new THREE.CircleGeometry(0.42, 28);
        const lensMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            side: THREE.DoubleSide
        });
        const lensMesh = new THREE.Mesh(lensGeo, lensMat);
        lensMesh.position.set(0, 0, 0.482);
        headGroup.add(lensMesh);

        // High-output condenser aperture corona (additive glow around inner optics)
        const lensCoronaGeo = new THREE.RingGeometry(0.20, 0.41, 28);
        const lensCoronaMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const lensCoronaMesh = new THREE.Mesh(lensCoronaGeo, lensCoronaMat);
        lensCoronaMesh.position.set(0, 0, 0.485);
        headGroup.add(lensCoronaMesh);

        // High-energy central emitter core (super-bright intense LED/arc lamp core)
        const lensCoreGeo = new THREE.CircleGeometry(0.22, 28);
        const lensCoreMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const lensCoreMesh = new THREE.Mesh(lensCoreGeo, lensCoreMat);
        lensCoreMesh.position.set(0, 0, 0.488);
        headGroup.add(lensCoreMesh);

        return {
            fixtureGroup,
            yokeGroup,
            headGroup,
            lensMat,
            lensCoronaMat,
            lensCoreMat,
            bezelLedMat,
            ledRingMat: accentMat
        };
    }

    const pLeftFixture = createMovingHeadFixture(pLeftFixturePos);
    gPumpkinDiscoBall.add(pLeftFixture.fixtureGroup);

    const pRightFixture = createMovingHeadFixture(pRightFixturePos);
    gPumpkinDiscoBall.add(pRightFixture.fixtureGroup);

    // Dynamic Target Tracking Dummies on the FRONT of the pumpkin
    const pLeftTargetObj = new THREE.Object3D();
    pLeftTargetObj.position.set(-1.2, 0.2, 2.5);
    gPumpkinDiscoBall.add(pLeftTargetObj);

    const pRightTargetObj = new THREE.Object3D();
    pRightTargetObj.position.set(1.2, 0.2, 2.5);
    gPumpkinDiscoBall.add(pRightTargetObj);

    // Smooth Directional Spotlights projecting from bottom fixtures onto the front of the pumpkin
    const pBottomLeftSpot = new THREE.SpotLight(0xffffff, 2.5, 45.0, Math.PI / 5.2, 0.65, 1.0);
    pBottomLeftSpot.position.copy(pLeftFixturePos).add(new THREE.Vector3(0, 1.0, 0));
    pBottomLeftSpot.target = pLeftTargetObj;
    gPumpkinDiscoBall.add(pBottomLeftSpot);

    const pBottomRightSpot = new THREE.SpotLight(0xffffff, 2.5, 45.0, Math.PI / 5.2, 0.65, 1.0);
    pBottomRightSpot.position.copy(pRightFixturePos).add(new THREE.Vector3(0, 1.0, 0));
    pBottomRightSpot.target = pRightTargetObj;
    gPumpkinDiscoBall.add(pBottomRightSpot);

    // Procedural Multi-Plane Volumetric God-Ray Geometry (6 Radial Intersecting Sheets for Smooth 3D Volume)
    function createMultiPlaneRayGeometry(numSheets = 6, baseWidth = 0.60, tipWidth = 4.4, length = 22.0) {
        const geo = new THREE.BufferGeometry();
        const halfBase = baseWidth * 0.5;
        const halfTip = tipWidth * 0.5;

        const positions = [];
        const uvs = [];
        const normals = [];
        const indices = [];

        for (let s = 0; s < numSheets; s++) {
            const angle = (s / numSheets) * Math.PI;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);

            // Base vertices (at y=0, origin at fixture lens)
            const b0x = -halfBase * cosA;
            const b0z = -halfBase * sinA;
            const b1x =  halfBase * cosA;
            const b1z =  halfBase * sinA;

            // Tip vertices (at y=-length)
            const t0x = -halfTip * cosA;
            const t0z = -halfTip * sinA;
            const t1x =  halfTip * cosA;
            const t1z =  halfTip * sinA;

            const baseIdx = s * 4;

            positions.push(
                b0x, 0, b0z,
                b1x, 0, b1z,
                t0x, -length, t0z,
                t1x, -length, t1z
            );

            uvs.push(
                0.0, 0.0,
                1.0, 0.0,
                0.0, 1.0,
                1.0, 1.0
            );

            const nx = -sinA;
            const nz = cosA;
            normals.push(
                nx, 0, nz,
                nx, 0, nz,
                nx, 0, nz,
                nx, 0, nz
            );

            indices.push(
                baseIdx, baseIdx + 2, baseIdx + 1,
                baseIdx + 1, baseIdx + 2, baseIdx + 3
            );
        }

        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geo.setIndex(indices);
        return geo;
    }

    // High-Intensity Volumetric Incoming Beams (Aiming at front glass face of pumpkin)
    const pLeftBeamGeo = createMultiPlaneRayGeometry(8, 0.75, 5.2, 22.0);
    const pLeftBeamMat = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(0xffffff) },
            uCoreColor: { value: new THREE.Color(0xffffff) },
            uIntensity: { value: 1.8 },
            uTime: { value: 0.0 },
            uTimeSpeed: { value: 0.12 },
            uNoiseScale: { value: 3.0 },
            uPulse: { value: 0.0 },
            uShimmer: { value: 0.5 },
            uTreble: { value: 0.0 },
            uHit: { value: 1.0 }
        },
        vertexShader: PumpkinVolumetricRaysShader.vertexShader,
        fragmentShader: PumpkinVolumetricRaysShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const pLeftBeamMesh = new THREE.Mesh(pLeftBeamGeo, pLeftBeamMat);
    pLeftBeamMesh.position.copy(pLeftFixturePos).add(new THREE.Vector3(0, 0.9, 0));
    pLeftBeamMesh.renderOrder = 20;
    gPumpkinDiscoBall.add(pLeftBeamMesh);

    // Inner bright core beam (Left)
    const pLeftCoreBeamGeo = createMultiPlaneRayGeometry(8, 0.35, 2.2, 22.0);
    const pLeftCoreBeamMat = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(0xffffff) },
            uCoreColor: { value: new THREE.Color(0xffffff) },
            uIntensity: { value: 2.2 },
            uTime: { value: 0.0 },
            uTimeSpeed: { value: 0.15 },
            uNoiseScale: { value: 3.2 },
            uPulse: { value: 0.0 },
            uShimmer: { value: 0.6 },
            uTreble: { value: 0.0 },
            uHit: { value: 1.0 }
        },
        vertexShader: PumpkinVolumetricRaysShader.vertexShader,
        fragmentShader: PumpkinVolumetricRaysShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const pLeftCoreBeamMesh = new THREE.Mesh(pLeftCoreBeamGeo, pLeftCoreBeamMat);
    pLeftCoreBeamMesh.position.copy(pLeftFixturePos).add(new THREE.Vector3(0, 0.9, 0));
    pLeftCoreBeamMesh.renderOrder = 21;
    gPumpkinDiscoBall.add(pLeftCoreBeamMesh);

    const pRightBeamGeo = createMultiPlaneRayGeometry(8, 0.75, 5.2, 22.0);
    const pRightBeamMat = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(0xffffff) },
            uCoreColor: { value: new THREE.Color(0xffffff) },
            uIntensity: { value: 1.8 },
            uTime: { value: 0.0 },
            uTimeSpeed: { value: 0.12 },
            uNoiseScale: { value: 3.0 },
            uPulse: { value: 0.0 },
            uShimmer: { value: 0.5 },
            uTreble: { value: 0.0 },
            uHit: { value: 1.0 }
        },
        vertexShader: PumpkinVolumetricRaysShader.vertexShader,
        fragmentShader: PumpkinVolumetricRaysShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const pRightBeamMesh = new THREE.Mesh(pRightBeamGeo, pRightBeamMat);
    pRightBeamMesh.position.copy(pRightFixturePos).add(new THREE.Vector3(0, 0.9, 0));
    pRightBeamMesh.renderOrder = 20;
    gPumpkinDiscoBall.add(pRightBeamMesh);

    // Inner bright core beam (Right)
    const pRightCoreBeamGeo = createMultiPlaneRayGeometry(8, 0.35, 2.2, 22.0);
    const pRightCoreBeamMat = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(0xffffff) },
            uCoreColor: { value: new THREE.Color(0xffffff) },
            uIntensity: { value: 2.2 },
            uTime: { value: 0.0 },
            uTimeSpeed: { value: 0.15 },
            uNoiseScale: { value: 3.2 },
            uPulse: { value: 0.0 },
            uShimmer: { value: 0.6 },
            uTreble: { value: 0.0 },
            uHit: { value: 1.0 }
        },
        vertexShader: PumpkinVolumetricRaysShader.vertexShader,
        fragmentShader: PumpkinVolumetricRaysShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const pRightCoreBeamMesh = new THREE.Mesh(pRightCoreBeamGeo, pRightCoreBeamMat);
    pRightCoreBeamMesh.position.copy(pRightFixturePos).add(new THREE.Vector3(0, 0.9, 0));
    pRightCoreBeamMesh.renderOrder = 21;
    gPumpkinDiscoBall.add(pRightCoreBeamMesh);

    // Front Surface Delicate Sparkle Glints (Where beams touch mirror facets)
    const pLeftHitFlare = new THREE.Sprite(new THREE.SpriteMaterial({
        map: starburstTex,
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.50,
        depthWrite: false
    }));
    pLeftHitFlare.scale.set(1.6, 1.6, 1.0);
    pLeftHitFlare.renderOrder = 23;
    gPumpkinDiscoBall.add(pLeftHitFlare);

    const pRightHitFlare = new THREE.Sprite(new THREE.SpriteMaterial({
        map: starburstTex,
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.50,
        depthWrite: false
    }));
    pRightHitFlare.scale.set(1.6, 1.6, 1.0);
    pRightHitFlare.renderOrder = 23;
    gPumpkinDiscoBall.add(pRightHitFlare);

    // 5. Five Compact Center-Bottom Moving-Head Spotlights (Alternating Beat Rig)
    // Group A (Inner pair): Narrow, punchy xenon strobe beams
    const pMiniBeamGeo = createMultiPlaneRayGeometry(8, 0.40, 2.6, 22.0);
    const pMiniCoreBeamGeo = createMultiPlaneRayGeometry(8, 0.18, 1.2, 22.0);

    // Group B (Trio): Significantly wider, rich volumetric stadium fog beams
    const pMiniBeamGeoB = createMultiPlaneRayGeometry(12, 0.85, 6.2, 22.0);
    const pMiniCoreBeamGeoB = createMultiPlaneRayGeometry(12, 0.45, 3.4, 22.0);

    function createMiniWhiteSpotSetup(fixturePos, initialTargetPos, isWideFoggy = false) {
        const fixture = createMovingHeadFixture(fixturePos, isWideFoggy ? 0.65 : 0.55);
        gPumpkinDiscoBall.add(fixture.fixtureGroup);

        // Pure Xenon white lens optics and accent rings
        fixture.lensMat.color.setHex(0xffffff);
        fixture.lensCoronaMat.color.setHex(0xffffff);
        fixture.lensCoreMat.color.setHex(0xffffff);
        fixture.bezelLedMat.color.setHex(0xffffff);
        fixture.ledRingMat.color.setHex(0xffffff);

        // Dynamic Target Tracking Dummy on FRONT of the pumpkin
        const targetObj = new THREE.Object3D();
        targetObj.position.copy(initialTargetPos);
        gPumpkinDiscoBall.add(targetObj);

        // Upward-shining directional spotlight (wider cone angle & softer penumbra for Group B)
        const spotAngle = isWideFoggy ? (Math.PI / 3.4) : (Math.PI / 6.0);
        const spotPenumbra = isWideFoggy ? 0.90 : 0.75;
        const spot = new THREE.SpotLight(0xffffff, isWideFoggy ? 1.4 : 2.0, 38.0, spotAngle, spotPenumbra, 1.0);
        spot.position.copy(fixturePos).add(new THREE.Vector3(0, 0.69, 0));
        spot.target = targetObj;
        gPumpkinDiscoBall.add(spot);

        // Volumetric God-Ray Beams: Group A uses VU rays shader, Group B uses wide bright foggy shader
        const beamGeo = isWideFoggy ? pMiniBeamGeoB : pMiniBeamGeo;
        const coreBeamGeo = isWideFoggy ? pMiniCoreBeamGeoB : pMiniCoreBeamGeo;
        const chosenShader = isWideFoggy ? PumpkinWhiteFoggyRaysShader : PumpkinWhiteVuRaysShader;

        const beamMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(0xffffff) },
                uCoreColor: { value: new THREE.Color(0xffffff) },
                uIntensity: { value: isWideFoggy ? 1.2 : 1.5 },
                uTime: { value: 0.0 },
                uVuLevel: { value: 0.0 },
                uPulse: { value: 0.0 },
                uTreble: { value: 0.0 },
                uHit: { value: 1.0 }
            },
            vertexShader: chosenShader.vertexShader,
            fragmentShader: chosenShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        beamMesh.position.copy(fixturePos).add(new THREE.Vector3(0, 0.69, 0));
        beamMesh.renderOrder = 20;
        gPumpkinDiscoBall.add(beamMesh);

        const coreBeamMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(0xffffff) },
                uCoreColor: { value: new THREE.Color(0xffffff) },
                uIntensity: { value: isWideFoggy ? 1.5 : 2.0 },
                uTime: { value: 0.0 },
                uVuLevel: { value: 0.0 },
                uPulse: { value: 0.0 },
                uTreble: { value: 0.0 },
                uHit: { value: 1.0 }
            },
            vertexShader: chosenShader.vertexShader,
            fragmentShader: chosenShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const coreBeamMesh = new THREE.Mesh(coreBeamGeo, coreBeamMat);
        coreBeamMesh.position.copy(fixturePos).add(new THREE.Vector3(0, 0.69, 0));
        coreBeamMesh.renderOrder = 21;
        gPumpkinDiscoBall.add(coreBeamMesh);

        // Underneath Front Surface Delicate Sparkle Glints / Fog Bloom
        const hitFlare = new THREE.Sprite(new THREE.SpriteMaterial({
            map: starburstTex,
            color: 0xffffff,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.0,
            depthWrite: false
        }));
        const flareBaseScale = isWideFoggy ? 2.2 : 1.3;
        hitFlare.scale.set(flareBaseScale, flareBaseScale, 1.0);
        hitFlare.renderOrder = 23;
        hitFlare.visible = false;
        gPumpkinDiscoBall.add(hitFlare);

        return {
            fixturePos,
            fixture,
            targetObj,
            spot,
            beamMat,
            beamMesh,
            coreBeamMat,
            coreBeamMesh,
            hitFlare,
            isWideFoggy
        };
    }

    // Five-fixture array spaced at 2.4-unit intervals: [-4.8, -2.4, 0.0, +2.4, +4.8]
    // Group A (2 existing lights at -2.4 and +2.4): Crisp punchy strobe on beat 1 & 3
    const pMiniLeft = createMiniWhiteSpotSetup(new THREE.Vector3(-2.4, -6.8, 5.8), new THREE.Vector3(-1.0, -2.8, 3.8), false);
    const pMiniRight = createMiniWhiteSpotSetup(new THREE.Vector3(2.4, -6.8, 5.8), new THREE.Vector3(1.0, -2.8, 3.8), false);

    // Group B (3 lights: Far-Left, Center, Far-Right): Wide, shaded bright-foggy beam with longer fade cycle on alternate beat 2 & 4
    const pMiniFarLeft = createMiniWhiteSpotSetup(new THREE.Vector3(-4.8, -6.8, 5.8), new THREE.Vector3(-3.0, -2.8, 3.8), true);
    const pMiniCenter = createMiniWhiteSpotSetup(new THREE.Vector3(0.0, -6.8, 5.8), new THREE.Vector3(0.0, -2.8, 3.8), true);
    const pMiniFarRight = createMiniWhiteSpotSetup(new THREE.Vector3(4.8, -6.8, 5.8), new THREE.Vector3(3.0, -2.8, 3.8), true);

    // Convergence Super-Bright Specular Reflection Flare (Ignites when both lights meet on the pumpkin surface)
    const pMeetFlare = new THREE.Sprite(new THREE.SpriteMaterial({
        map: starburstTex,
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
    }));
    pMeetFlare.scale.set(1.0, 1.0, 1.0);
    pMeetFlare.renderOrder = 24;
    pMeetFlare.visible = false;
    gPumpkinDiscoBall.add(pMeetFlare);

    const pMeetAnamorphicFlare = new THREE.Sprite(new THREE.SpriteMaterial({
        map: anamorphicFlareTex,
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
    }));
    pMeetAnamorphicFlare.scale.set(6.0, 1.8, 1.0);
    pMeetAnamorphicFlare.renderOrder = 25;
    pMeetAnamorphicFlare.visible = false;
    gPumpkinDiscoBall.add(pMeetAnamorphicFlare);

    // Front Key Light & Center Pumpkin Core Glow
    const pKeyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    pKeyLight.position.set(0.0, 3.0, 9.0);
    pKeyLight.target = pumpkinMesh;
    gPumpkinDiscoBall.add(pKeyLight);

    const pumpkinFlameLight = new THREE.PointLight(0xffffff, 2.5, 25.0, 1.2);
    pumpkinFlameLight.position.set(0, 0, 0);
    pumpkinPivot.add(pumpkinFlameLight);

    // 6. Softened, Elegant Luminous Halo Corona Flare Mesh framing the pumpkin silhouette
    const pumpkinHaloGeo = new THREE.PlaneGeometry(42.0, 42.0);
    const pumpkinHaloMat = new THREE.ShaderMaterial({
        uniforms: {
            uHaloLeftColor: { value: new THREE.Color(0x00e5ff) },
            uHaloRightColor: { value: new THREE.Color(0xff4400) },
            uLeftIntensity: { value: 0.0 },
            uRightIntensity: { value: 0.0 },
            uConvergenceGlow: { value: 0.0 },
            uTime: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uHaloLeftColor;
            uniform vec3 uHaloRightColor;
            uniform float uLeftIntensity;
            uniform float uRightIntensity;
            uniform float uConvergenceGlow;
            uniform float uTime;
            varying vec2 vUv;

            void main() {
                // Elliptical contour framing the authentic pumpkin silhouette (0.88 height ratio)
                vec2 p = (vUv - 0.5) * 2.0;
                p.y /= 0.88;
                float dist = length(p);
                
                // Outer perimeter halo geometry:
                // Clear inside the pumpkin (dist < 0.24) so mirror facets stay crystal clear
                // Soft, silky corona rim (non-harsh, elegant concert glow)
                float innerCut = smoothstep(0.24, 0.29, dist);
                float rimGlow = smoothstep(0.25, 0.36, dist) * (1.0 - smoothstep(0.36, 0.65, dist));
                float softAura = 1.0 - smoothstep(0.28, 0.88, dist);
                float haloRing = innerCut * (rimGlow * 1.35 + softAura * 0.65);
                
                // Gentle organic shimmer (smooth, calm, non-harsh)
                float angle = atan(p.y, p.x);
                float shimmer = 0.88 + 0.12 * sin(angle * 12.0 + uTime * 2.2);
                
                // Color mapping: Left side matches left light colour, Right side matches right light colour!
                // p.x goes from -1.0 on left to +1.0 on right
                float sideT = smoothstep(-0.40, 0.40, p.x);
                vec3 haloSideColor = mix(uHaloLeftColor, uHaloRightColor, sideT);
                
                // Side-specific gradual intensity (like sun shining through a window)
                float sideIntensity = mix(uLeftIntensity, uRightIntensity, sideT);
                // When both lights meet, add a gentle convergence warmth (soft, non-harsh)
                float totalIntensity = sideIntensity + uConvergenceGlow * 0.35;
                
                if (totalIntensity <= 0.001) discard;
                
                float alpha = haloRing * shimmer * totalIntensity;
                if (alpha < 0.002) discard;

                // Rich, soft true-color emission (NO white blowout or harsh spikes)
                vec3 finalGlow = haloSideColor * (1.10 + uConvergenceGlow * 0.15);
                gl_FragColor = vec4(finalGlow * alpha, clamp(alpha * 0.65, 0.0, 0.65));
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const pumpkinHaloMesh = new THREE.Mesh(pumpkinHaloGeo, pumpkinHaloMat);
    pumpkinHaloMesh.position.set(0, 0, -0.4); // Just behind the pumpkin
    pumpkinHaloMesh.visible = false;
    pumpkinHaloMesh.renderOrder = 18;
    gPumpkinDiscoBall.add(pumpkinHaloMesh);

    // 7 & 9. Procedural Soft Incandescent Ember Texture (Shared by floor hearth and floating embers)
    const emberCanvas = document.createElement('canvas');
    emberCanvas.width = 64;
    emberCanvas.height = 64;
    const emberCtx = emberCanvas.getContext('2d');
    const eGrad = emberCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    eGrad.addColorStop(0.00, 'rgba(255, 255, 245, 1.0)'); // Incandescent core (hot white-gold)
    eGrad.addColorStop(0.18, 'rgba(255, 215, 75, 0.95)');  // Molten bright gold
    eGrad.addColorStop(0.42, 'rgba(255, 115, 20, 0.75)');  // Vivid flame orange
    eGrad.addColorStop(0.70, 'rgba(215, 35, 5, 0.35)');   // Deep smoldering crimson
    eGrad.addColorStop(1.00, 'rgba(100, 10, 0, 0.0)');    // Soft thermal smoke falloff
    emberCtx.fillStyle = eGrad;
    emberCtx.beginPath();
    emberCtx.arc(32, 32, 32, 0, Math.PI * 2);
    emberCtx.fill();
    const bonfireEmberTex = new THREE.CanvasTexture(emberCanvas);

    // 7. Rotating Floor Fire Pit Hearth Embers (Varying sizes, subtle glowing orange embers)
    const pFloorSpotCount = 500;
    const pFloorGeo = new THREE.BufferGeometry();
    const pFloorPos = new Float32Array(pFloorSpotCount * 3);
    const pFloorCol = new Float32Array(pFloorSpotCount * 3);
    const pFloorSize = new Float32Array(pFloorSpotCount);
    const pFloorFlickerSpeed = new Float32Array(pFloorSpotCount);
    const pFloorFlickerPhase = new Float32Array(pFloorSpotCount);

    const firePitPalette = [
        new THREE.Color(0xffbb33), // Molten Bright Gold-Amber
        new THREE.Color(0xff8500), // Vivid Bonfire Flame Orange
        new THREE.Color(0xff5500), // Rich Burning Ember Orange
        new THREE.Color(0xff3d00), // Deep Fiery Orange-Red
        new THREE.Color(0xee2800), // Smoldering Red-Amber Coal
        new THREE.Color(0xffc247), // Golden Hearth Spark
        new THREE.Color(0xd43800)  // Darker Smoldering Charcoal Edge
    ];

    for (let f = 0; f < pFloorSpotCount; f++) {
        // Clustered like a fire pit hearth bed (denser under pumpkin, scattered outwards)
        const rad = 1.4 + Math.pow(Math.random(), 1.35) * 24.0;
        const angle = Math.random() * Math.PI * 2;

        pFloorPos[f * 3] = Math.cos(angle) * rad;
        pFloorPos[f * 3 + 1] = -10.5 + Math.random() * 0.35; // Lying flat on hearth floor
        pFloorPos[f * 3 + 2] = Math.sin(angle) * rad;

        // Rich fire pit glowing ember color
        const col = firePitPalette[Math.floor(Math.random() * firePitPalette.length)];
        pFloorCol[f * 3] = col.r;
        pFloorCol[f * 3 + 1] = col.g;
        pFloorCol[f * 3 + 2] = col.b;

        // Varying sizes similar to previous star sizes (~0.35 to 0.95)
        const sizeR = Math.random();
        if (sizeR < 0.50) {
            pFloorSize[f] = 0.36 + Math.random() * 0.16; // Small glowing sparks
        } else if (sizeR < 0.85) {
            pFloorSize[f] = 0.54 + Math.random() * 0.22; // Medium fire pit embers
        } else {
            pFloorSize[f] = 0.78 + Math.random() * 0.22; // Larger glowing coals
        }

        // Independent subtle breathing flicker rates
        pFloorFlickerSpeed[f] = 1.5 + Math.random() * 3.2;
        pFloorFlickerPhase[f] = Math.random() * Math.PI * 2.0;
    }

    pFloorGeo.setAttribute('position', new THREE.BufferAttribute(pFloorPos, 3));
    pFloorGeo.setAttribute('aColor', new THREE.BufferAttribute(pFloorCol, 3));
    pFloorGeo.setAttribute('aSize', new THREE.BufferAttribute(pFloorSize, 1));
    pFloorGeo.setAttribute('aFlickerSpeed', new THREE.BufferAttribute(pFloorFlickerSpeed, 1));
    pFloorGeo.setAttribute('aFlickerPhase', new THREE.BufferAttribute(pFloorFlickerPhase, 1));

    const pFloorMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uKick: { value: 0.0 },
            uTexture: { value: bonfireEmberTex }
        },
        vertexShader: BonfireFloorEmbersShader.vertexShader,
        fragmentShader: BonfireFloorEmbersShader.fragmentShader,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    const pumpkinFloorSpots = new THREE.Points(pFloorGeo, pFloorMat);
    pumpkinFloorSpots.renderOrder = 19;
    gPumpkinDiscoBall.add(pumpkinFloorSpots);

    // 8. Authentic Bonfire Night Glowing Fire Embers (Bigger, subtly floating upwards)
    const pEmberCount = 380;
    const pEmberGeo = new THREE.BufferGeometry();
    const pEmberPos = new Float32Array(pEmberCount * 3);
    const pEmberVel = new Float32Array(pEmberCount * 3);
    const pEmberSize = new Float32Array(pEmberCount);
    const pEmberFlickerSpeed = new Float32Array(pEmberCount);
    const pEmberFlickerPhase = new Float32Array(pEmberCount);
    const pEmberHeat = new Float32Array(pEmberCount);
    const pEmberDriftSpeed = new Float32Array(pEmberCount);
    const pEmberDriftPhase = new Float32Array(pEmberCount);
    const pEmberDriftAmp = new Float32Array(pEmberCount);

    for (let e = 0; e < pEmberCount; e++) {
        // Natural spatial distribution throughout stage volume (wide & deep)
        pEmberPos[e * 3] = (Math.random() - 0.5) * 32.0;
        pEmberPos[e * 3 + 1] = -9.0 + Math.random() * 23.0;
        pEmberPos[e * 3 + 2] = (Math.random() - 0.5) * 26.0;

        // Subtle buoyant upward velocity (gentle convection, NOT fast bullets)
        pEmberVel[e * 3] = 0.0;
        pEmberVel[e * 3 + 1] = 0.35 + Math.random() * 0.55; // gentle upward loft
        pEmberVel[e * 3 + 2] = 0.0;

        // Bigger ember size distribution (fine sparks, medium cinders, large glowing flakes)
        const sizeRand = Math.random();
        if (sizeRand < 0.60) {
            pEmberSize[e] = 0.46 + Math.random() * 0.24; // Fine sparks (0.46 - 0.70)
        } else if (sizeRand < 0.88) {
            pEmberSize[e] = 0.78 + Math.random() * 0.35; // Medium burning cinders (0.78 - 1.13)
        } else {
            pEmberSize[e] = 1.18 + Math.random() * 0.48; // Large glowing flakes of burning wood (1.18 - 1.66)
        }

        // Independent flicker rates simulating oxygen drafts stoking the ember
        pEmberFlickerSpeed[e] = 2.0 + Math.random() * 4.5;
        pEmberFlickerPhase[e] = Math.random() * Math.PI * 2.0;

        // Per-particle initial temperature (hotter cinders vs cooler smoldering flakes)
        pEmberHeat[e] = Math.random();

        // Horizontal meandering parameters (convective air swirl)
        pEmberDriftSpeed[e] = 0.8 + Math.random() * 1.6;
        pEmberDriftPhase[e] = Math.random() * Math.PI * 2.0;
        pEmberDriftAmp[e] = 0.15 + Math.random() * 0.35;
    }

    pEmberGeo.setAttribute('position', new THREE.BufferAttribute(pEmberPos, 3));
    pEmberGeo.setAttribute('aSize', new THREE.BufferAttribute(pEmberSize, 1));
    pEmberGeo.setAttribute('aFlickerSpeed', new THREE.BufferAttribute(pEmberFlickerSpeed, 1));
    pEmberGeo.setAttribute('aFlickerPhase', new THREE.BufferAttribute(pEmberFlickerPhase, 1));
    pEmberGeo.setAttribute('aHeat', new THREE.BufferAttribute(pEmberHeat, 1));

    const pEmberMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uTexture: { value: bonfireEmberTex }
        },
        vertexShader: BonfireNightEmbersShader.vertexShader,
        fragmentShader: BonfireNightEmbersShader.fragmentShader,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });

    const pumpkinEmbers = new THREE.Points(pEmberGeo, pEmberMat);
    pumpkinEmbers.renderOrder = 22;
    gPumpkinDiscoBall.add(pumpkinEmbers);

    // -------------------------------------------------------------------------
    // Resize Handler
    // -------------------------------------------------------------------------
    function onResize() {
        const w = (container && container.clientWidth > 0) ? container.clientWidth : window.innerWidth;
        const h = (container && container.clientHeight > 0) ? container.clientHeight : window.innerHeight;
        camera.aspect = (w > 0 && h > 0) ? (w / h) : (window.innerWidth / window.innerHeight);
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.setPixelRatio(getOptimalPixelRatio());
        composer.setSize(w, h);
        bloomPass.resolution.set(w, h);
        if (proteanCloudMat && proteanCloudMat.uniforms.uResolution) {
            proteanCloudMat.uniforms.uResolution.value.set(w, h);
        }
        if (discoProteanCloudMat && discoProteanCloudMat.uniforms.uResolution) {
            discoProteanCloudMat.uniforms.uResolution.value.set(w, h);
        }
        updateVhsTextPlaneScale();
        applyLogoPlacement();
        applyStationLogoPlacement();
    }
    window.addEventListener('resize', onResize);

    // -------------------------------------------------------------------------
    // Animation & Calibration State
    // -------------------------------------------------------------------------
    const clock = new THREE.Clock();
    let currentBPM = 126.0;
    let bloomMultiplier = 0.35;
    let manualFlash = 0.0;
    let beatTriggerPulse = 0.0;
    let camRecoilX = 0.0;
    let camRecoilY = 0.0;
    let camRecoilZ = 0.0;

    // FX 18, FX 19 & FX 20 Moving-Head Godray State (Staggered Heavy Bass Chase & Pulse Timers)
    let godrayChaseIndex = 0;
    let godrayLastKickTime = 0.0;
    let whiteGodrayChaseIndex = 0;
    let whiteGodrayLastKickTime = 0.0;
    let discoGodrayChaseIndex = 0;
    let discoGodrayLastKickTime = 0.0;
    let vhsGodrayChaseIndex = 0;
    let vhsGodrayLastKickTime = 0.0;

    // Smooth state variables for Particle Stream (Silky smooth response)
    let streamSmoothBass = 0.0;
    let streamSmoothMid = 0.0;
    let streamSmoothTreble = 0.0;
    let streamFlowProgress = 0.0;
    let streamCurveTime = 0.0;

    function switchFX(index) {
        if (index >= 0 && index < fxRoots.length) {
            fxRoots.forEach((grp, idx) => {
                grp.visible = (idx === index);
            });
            currentFXIndex = index;
            nightclubPass.uniforms.uAberration.value = 0.3;
            manualFlash = 0.3;
            if (index === 19) {
                vhsLastPhraseSwitchTime = clock.getElapsedTime();
                renderVhsTextCanvas(vhsCurrentPhraseIdx);
            }
        }
    }

    function triggerBeatPulse() {
        beatTriggerPulse = 1.0;
    }

    function triggerManualFlash() {
        manualFlash = 1.0;
    }

    function setBPM(bpm) {
        if (bpm && bpm >= 40 && bpm <= 250) {
            currentBPM = bpm;
        }
    }

    function setBloomMultiplier(val) {
        bloomMultiplier = Math.max(0.0, Math.min(2.5, Number(val)));
    }

    // Logo Control API
    function setLogoVisible(visible, immediate = false) {
        logoVisible = !!visible;
        if (immediate) {
            logoTransition.state = visible ? 'visible' : 'hidden';
            logoTransition.progress = visible ? 1.0 : 0.0;
            logoGroup.visible = logoVisible;
        } else {
            triggerLayerVisibility(logoTransition, logoVisible, logoGroup);
        }
    }

    function setLogoOpacity(val) {
        logoBaseOpacity = Math.max(0.0, Math.min(1.0, Number(val)));
        logoShaderMat.uniforms.uOpacity.value = logoBaseOpacity;
    }

    function setLogoScale(val) {
        logoBaseScale = Math.max(0.2, Math.min(3.0, Number(val)));
        applyLogoPlacement();
    }

    function setLogoMode(mode) {
        logoMode = mode;
        applyLogoPlacement();
    }

    function setLogoBassPulse(val) {
        logoBassPulseAmount = Math.max(0.0, Math.min(2.0, Number(val)));
    }

    function setLogoContrast(val) {
        logoContrast = Math.max(0.5, Math.min(3.0, Number(val)));
        logoShaderMat.uniforms.uContrast.value = logoContrast;
    }

    function setLogoBrightness(val) {
        logoBrightness = Math.max(0.5, Math.min(2.5, Number(val)));
        logoShaderMat.uniforms.uBrightness.value = logoBrightness;
    }

    function setLogoBlendMode(modeIdx) {
        logoShaderMat.uniforms.uBlendMode.value = parseInt(modeIdx, 10);
    }

    function setLogoShieldVisible(visible) {
        isShieldActive = !!visible;
        if (logoShieldMesh && logoMode !== 'backdrop') {
            logoShieldMesh.visible = isShieldActive;
        }
    }

    function setLogoSpinMode(mode) {
        if (mode === 'center' || mode === 'orbit' || mode === 'freeroam' || mode === 'free_roam') {
            logoSpinMode = (mode === 'free_roam') ? 'freeroam' : mode;
        } else if (mode === 'on' || mode === true) {
            logoSpinMode = 'center';
        } else {
            logoSpinMode = 'off';
        }
    }

    function setLogoSpinEnabled(enabled) {
        setLogoSpinMode(enabled ? 'center' : 'off');
    }

    function setLogoSpinSpeed(speed) {
        logoSpinSpeed = typeof speed === 'number' ? speed : 1.0;
    }

    function setLogoOffsetY(val) {
        logoOffsetY = Number(val) || 0.0;
        applyLogoPlacement();
    }

    function setLogoOffsetX(val) {
        logoOffsetX = Number(val) || 0.0;
        applyLogoPlacement();
    }

    function setLogoEdgeMargin(val) {
        logoEdgeMargin = Math.max(0.0, Math.min(0.4, Number(val) || 0.04));
        applyLogoPlacement();
    }

    // =========================================================================
    // MAIN RENDER LOOP (18 SCENES)
    // =========================================================================
    function animate(getAudioDataFn) {
        requestAnimationFrame(() => animate(getAudioDataFn));

        const delta = Math.min(clock.getDelta(), 0.1);
        const elapsedTime = clock.getElapsedTime();

        let audio = null;
        if (typeof getAudioDataFn === 'function') {
            try {
                audio = getAudioDataFn();
            } catch (e) {
                console.error('[VFX] getAudioDataFn error:', e);
            }
        }
        if (!audio) {
            audio = {
                bass: 0,
                smoothedBass: 0,
                bassImpact: 0,
                transientImpulse: 0,
                mid: 0,
                smoothedMid: 0,
                treble: 0,
                smoothedTreble: 0,
                overall: 0,
                isOnset: false,
                dataArray: new Uint8Array(128)
            };
        }

        const dataArr = audio.dataArray || [];
        const bassPop = audio.bassImpact || audio.bass || 0;
        const transient = audio.transientImpulse || 0;
        const bps = currentBPM / 60.0;
        const speed = bps * delta;

        // Update Layer Transitions
        updateTransitionState(logoTransition, logoGroup, delta);
        updateTransitionState(stationLogoTransition, stationLogoGroup, delta);
        updateTransitionState(flyerTransition, flyerGroup, delta);

        // 1. Animate Logo Layer
        if (logoGroup.visible && logoMesh) {
            const trans = computeTransitionTransforms(logoTransition);
            logoShaderMat.uniforms.uOpacity.value = logoBaseOpacity * trans.opacity;

            const logoPulse = (bassPop * logoBassPulseAmount * 0.25) + (transient * logoBassPulseAmount * 0.2);
            const wTarget = (logoMode === 'backdrop' ? 45 : (logoMode === 'overlay' ? 4.8 : (logoPosition === 'center' ? 7.5 : 4.8))) * logoBaseScale * currentLogoScaleFactor;
            const wBase = wTarget * (1.0 + logoPulse * 0.25) * trans.scale;
            const hBase = (wBase / (logoAspectRatio || 1.0));

            // Shield stays stationary flat directly behind the logo
            if (logoShieldMesh && isShieldActive && logoMode !== 'backdrop') {
                logoShieldMesh.position.set(0, 0, -0.2);
                logoShieldMesh.rotation.set(0, 0, 0);
                logoShieldMat.opacity = 0.8 * trans.opacity;
            }

            // Mode-specific Horizontal / 3D / Free Roam Rotation Logic
            if (logoSpinMode === 'center') {
                // Mode 1: Pure Horizontal Center Spin
                logoPivot.position.set(currentLogoPosX + trans.offX, currentLogoPosY + trans.offY, currentLogoBaseZ);
                logoPivot.quaternion.copy(camera.quaternion);

                logoSpinAngle += delta * logoSpinSpeed * 2.5;
                const cosSpin = Math.cos(logoSpinAngle);
                logoMesh.scale.set((wBase / 16) * cosSpin, hBase / 16, 1);
                logoMesh.position.set(0, 0, 0);
                logoMesh.rotation.set(trans.rotX, trans.rotY, trans.rotZ);
            } else if (logoSpinMode === 'orbit') {
                // Mode 2: 3D Perspective Depth Offset Orbit Spin
                logoPivot.position.set(currentLogoPosX + trans.offX, currentLogoPosY + trans.offY, currentLogoBaseZ);
                logoPivot.quaternion.copy(camera.quaternion);

                logoSpinAngle += delta * logoSpinSpeed * 2.5;
                logoMesh.scale.set(wBase / 16, hBase / 16, 1);
                logoMesh.position.set(0, 0, 0);
                logoMesh.rotation.order = 'YXZ';
                logoMesh.rotation.y = logoSpinAngle + trans.rotY;
                logoMesh.rotation.x = trans.rotX;
                logoMesh.rotation.z = trans.rotZ;
            } else if (logoSpinMode === 'freeroam') {
                // Mode 3: Free Roam & 3D Drift across the entire display
                logoSpinAngle += delta * logoSpinSpeed * 1.5;
                const roamTime = elapsedTime * logoSpinSpeed * 0.45;

                const boundX = logoMode === 'backdrop' ? 14.0 : (logoMode === 'overlay' ? 2.2 : 5.8);
                const boundY = logoMode === 'backdrop' ? 8.0 : (logoMode === 'overlay' ? 1.2 : 3.4);

                const freeX = Math.sin(roamTime * 1.1) * boundX + Math.sin(roamTime * 2.3) * (boundX * 0.2) + trans.offX;
                const freeY = Math.cos(roamTime * 0.9) * boundY + Math.cos(roamTime * 1.8) * (boundY * 0.15) + trans.offY;
                const freeZ = currentLogoBaseZ + Math.sin(roamTime * 0.7) * 1.0;

                logoPivot.position.set(freeX, freeY, freeZ);
                logoPivot.quaternion.copy(camera.quaternion);

                logoMesh.scale.set(wBase / 16, hBase / 16, 1);
                logoMesh.position.set(0, 0, 0);
                logoMesh.rotation.order = 'YXZ';
                logoMesh.rotation.y = logoSpinAngle + trans.rotY;
                logoMesh.rotation.x = Math.sin(roamTime * 1.4) * 0.2 + trans.rotX;
                logoMesh.rotation.z = Math.cos(roamTime * 1.1) * 0.15 + trans.rotZ;
            } else {
                // Mode 4: Static (Smooth recovery to front-facing)
                logoPivot.position.set(currentLogoPosX + trans.offX, currentLogoPosY + trans.offY, currentLogoBaseZ);
                logoPivot.quaternion.copy(camera.quaternion);

                logoMesh.scale.set(wBase / 16, hBase / 16, 1);
                logoMesh.position.set(0, 0, 0);
                if (Math.abs(logoMesh.rotation.y) > 0.001 || Math.abs(logoMesh.rotation.x) > 0.001 || Math.abs(logoMesh.rotation.z) > 0.001) {
                    logoMesh.rotation.y = THREE.MathUtils.lerp(logoMesh.rotation.y, 0, delta * 8.0);
                    logoMesh.rotation.x = THREE.MathUtils.lerp(logoMesh.rotation.x, 0, delta * 8.0);
                    logoMesh.rotation.z = THREE.MathUtils.lerp(logoMesh.rotation.z, 0, delta * 8.0);
                    if (Math.abs(logoMesh.rotation.y) < 0.001) {
                        logoMesh.rotation.set(trans.rotX, trans.rotY, trans.rotZ);
                        logoSpinAngle = 0;
                    }
                } else {
                    logoMesh.rotation.set(trans.rotX, trans.rotY, trans.rotZ);
                    logoSpinAngle = 0;
                }
            }
        }

        // 1b. Animate Station Logo Layer
        if (stationLogoGroup.visible && stationLogoMesh) {
            const trans = computeTransitionTransforms(stationLogoTransition);
            stationLogoShaderMat.uniforms.uOpacity.value = stationLogoBaseOpacity * trans.opacity;

            const stPulse = (bassPop * stationLogoBassPulseAmount * 0.25) + (transient * stationLogoBassPulseAmount * 0.2);
            const stTarget = (stationLogoMode === 'backdrop' ? 45 : (stationLogoMode === 'overlay' ? 4.8 : (stationLogoPosition === 'center' ? 7.5 : 4.8))) * stationLogoBaseScale * currentStationLogoScaleFactor;
            const wBase = stTarget * (1.0 + stPulse * 0.25) * trans.scale;
            const hBase = (wBase / (stationLogoAspectRatio || 1.0));

            if (stationLogoShieldMesh && isStationShieldActive && stationLogoMode !== 'backdrop') {
                stationLogoShieldMesh.position.set(0, 0, -0.2);
                stationLogoShieldMesh.rotation.set(0, 0, 0);
                stationShieldMat.opacity = 0.8 * trans.opacity;
            }

            if (stationLogoSpinMode === 'center') {
                stationLogoPivot.position.set(currentStationLogoPosX + trans.offX, currentStationLogoPosY + trans.offY, currentStationLogoBaseZ);
                stationLogoPivot.quaternion.copy(camera.quaternion);

                stationLogoSpinAngle += delta * stationLogoSpinSpeed * 2.5;
                const cosSpin = Math.cos(stationLogoSpinAngle);
                stationLogoMesh.scale.set((wBase / 16) * cosSpin, hBase / 16, 1);
                stationLogoMesh.position.set(0, 0, 0);
                stationLogoMesh.rotation.set(trans.rotX, trans.rotY, trans.rotZ);
            } else if (stationLogoSpinMode === 'orbit') {
                stationLogoPivot.position.set(currentStationLogoPosX + trans.offX, currentStationLogoPosY + trans.offY, currentStationLogoBaseZ);
                stationLogoPivot.quaternion.copy(camera.quaternion);

                stationLogoSpinAngle += delta * stationLogoSpinSpeed * 2.5;
                stationLogoMesh.scale.set(wBase / 16, hBase / 16, 1);
                stationLogoMesh.position.set(0, 0, 0);
                stationLogoMesh.rotation.order = 'YXZ';
                stationLogoMesh.rotation.y = stationLogoSpinAngle + trans.rotY;
                stationLogoMesh.rotation.x = trans.rotX;
                stationLogoMesh.rotation.z = trans.rotZ;
            } else if (stationLogoSpinMode === 'freeroam') {
                stationLogoSpinAngle += delta * stationLogoSpinSpeed * 1.5;
                const roamTime = elapsedTime * stationLogoSpinSpeed * 0.45;

                const boundX = stationLogoMode === 'backdrop' ? 14.0 : (stationLogoMode === 'overlay' ? 2.2 : 5.8);
                const boundY = stationLogoMode === 'backdrop' ? 8.0 : (stationLogoMode === 'overlay' ? 1.2 : 3.4);

                const freeX = Math.sin(roamTime * 1.1 + 1.5) * boundX + trans.offX;
                const freeY = Math.cos(roamTime * 0.9 + 1.0) * boundY + trans.offY;
                const freeZ = currentStationLogoBaseZ + Math.sin(roamTime * 0.7) * 1.0;

                stationLogoPivot.position.set(freeX, freeY, freeZ);
                stationLogoPivot.quaternion.copy(camera.quaternion);

                stationLogoMesh.scale.set(wBase / 16, hBase / 16, 1);
                stationLogoMesh.position.set(0, 0, 0);
                stationLogoMesh.rotation.order = 'YXZ';
                stationLogoMesh.rotation.y = stationLogoSpinAngle + trans.rotY;
                stationLogoMesh.rotation.x = Math.sin(roamTime * 1.4) * 0.2 + trans.rotX;
                stationLogoMesh.rotation.z = Math.cos(roamTime * 1.1) * 0.15 + trans.rotZ;
            } else {
                stationLogoPivot.position.set(currentStationLogoPosX + trans.offX, currentStationLogoPosY + trans.offY, currentStationLogoBaseZ);
                stationLogoPivot.quaternion.copy(camera.quaternion);

                stationLogoMesh.scale.set(wBase / 16, hBase / 16, 1);
                stationLogoMesh.position.set(0, 0, 0);
                if (Math.abs(stationLogoMesh.rotation.y) > 0.001 || Math.abs(stationLogoMesh.rotation.x) > 0.001 || Math.abs(stationLogoMesh.rotation.z) > 0.001) {
                    stationLogoMesh.rotation.y = THREE.MathUtils.lerp(stationLogoMesh.rotation.y, 0, delta * 8.0);
                    stationLogoMesh.rotation.x = THREE.MathUtils.lerp(stationLogoMesh.rotation.x, 0, delta * 8.0);
                    stationLogoMesh.rotation.z = THREE.MathUtils.lerp(stationLogoMesh.rotation.z, 0, delta * 8.0);
                    if (Math.abs(stationLogoMesh.rotation.y) < 0.001) {
                        stationLogoMesh.rotation.set(trans.rotX, trans.rotY, trans.rotZ);
                        stationLogoSpinAngle = 0;
                    }
                } else {
                    stationLogoMesh.rotation.set(trans.rotX, trans.rotY, trans.rotZ);
                    stationLogoSpinAngle = 0;
                }
            }
        }

        // 1c. Animate Event Flyer Layer
        if (flyerGroup.visible && flyerMesh) {
            const trans = computeTransitionTransforms(flyerTransition);
            flyerShaderMat.uniforms.uOpacity.value = flyerBaseOpacity * trans.opacity;

            const flPulse = (bassPop * flyerBassPulseAmount * 0.25) + (transient * flyerBassPulseAmount * 0.2);
            const flTarget = (flyerMode === 'backdrop' ? 45 : (flyerMode === 'overlay' ? 4.8 : (flyerPosition === 'center' ? 7.5 : 4.8))) * flyerBaseScale * currentFlyerScaleFactor;
            const wBase = flTarget * (1.0 + flPulse * 0.25) * trans.scale;
            const hBase = (wBase / (flyerAspectRatio || 0.75));

            if (flyerShieldMesh && isFlyerShieldActive && flyerMode !== 'backdrop') {
                flyerShieldMesh.position.set(0, 0, -0.2);
                flyerShieldMesh.rotation.set(0, 0, 0);
                flyerShieldMat.opacity = 0.85 * trans.opacity;
            }

            if (flyerSpinMode === 'center') {
                flyerPivot.position.set(currentFlyerPosX + trans.offX, currentFlyerPosY + trans.offY, currentFlyerBaseZ);
                flyerPivot.quaternion.copy(camera.quaternion);

                flyerSpinAngle += delta * flyerSpinSpeed * 2.5;
                const cosSpin = Math.cos(flyerSpinAngle);
                flyerMesh.scale.set((wBase / 16) * cosSpin, hBase / 16, 1);
                flyerMesh.position.set(0, 0, 0);
                flyerMesh.rotation.set(trans.rotX, trans.rotY, trans.rotZ);
            } else if (flyerSpinMode === 'orbit') {
                flyerPivot.position.set(currentFlyerPosX + trans.offX, currentFlyerPosY + trans.offY, currentFlyerBaseZ);
                flyerPivot.quaternion.copy(camera.quaternion);

                flyerSpinAngle += delta * flyerSpinSpeed * 2.5;
                flyerMesh.scale.set(wBase / 16, hBase / 16, 1);
                flyerMesh.position.set(0, 0, 0);
                flyerMesh.rotation.order = 'YXZ';
                flyerMesh.rotation.y = flyerSpinAngle + trans.rotY;
                flyerMesh.rotation.x = trans.rotX;
                flyerMesh.rotation.z = trans.rotZ;
            } else if (flyerSpinMode === 'freeroam') {
                flyerSpinAngle += delta * flyerSpinSpeed * 1.5;
                const roamTime = elapsedTime * flyerSpinSpeed * 0.45;

                const boundX = flyerMode === 'backdrop' ? 14.0 : (flyerMode === 'overlay' ? 2.2 : 5.8);
                const boundY = flyerMode === 'backdrop' ? 8.0 : (flyerMode === 'overlay' ? 1.2 : 3.4);

                const freeX = Math.sin(roamTime * 1.1 + 3.0) * boundX + trans.offX;
                const freeY = Math.cos(roamTime * 0.9 + 2.0) * boundY + trans.offY;
                const freeZ = currentFlyerBaseZ + Math.sin(roamTime * 0.7) * 1.0;

                flyerPivot.position.set(freeX, freeY, freeZ);
                flyerPivot.quaternion.copy(camera.quaternion);

                flyerMesh.scale.set(wBase / 16, hBase / 16, 1);
                flyerMesh.position.set(0, 0, 0);
                flyerMesh.rotation.order = 'YXZ';
                flyerMesh.rotation.y = flyerSpinAngle + trans.rotY;
                flyerMesh.rotation.x = Math.sin(roamTime * 1.4) * 0.2 + trans.rotX;
                flyerMesh.rotation.z = Math.cos(roamTime * 1.1) * 0.15 + trans.rotZ;
            } else {
                flyerPivot.position.set(currentFlyerPosX + trans.offX, currentFlyerPosY + trans.offY, currentFlyerBaseZ);
                flyerPivot.quaternion.copy(camera.quaternion);

                flyerMesh.scale.set(wBase / 16, hBase / 16, 1);
                flyerMesh.position.set(0, 0, 0);
                flyerMesh.rotation.set(trans.rotX, trans.rotY, trans.rotZ);
            }
        }

        // 2. Animate Active Scene
        // ---------------------------------------------------------------------
        try {
                       if (currentFXIndex === 0) {
                const ctx = studioEqCtx;
                const W = studioEqW;
                const H = studioEqH;

                // Scale the visual plane dynamically to seamlessly fill the camera frustum edge-to-edge
                const vFovRad = (camera.fov * Math.PI) / 180.0;
                const camDist = Math.max(1.0, camera.position.z);
                const frustumH = 2.0 * Math.tan(vFovRad * 0.5) * camDist;
                const aspect = (camera.aspect && !isNaN(camera.aspect)) ? camera.aspect : (window.innerWidth / window.innerHeight);
                const frustumW = frustumH * aspect;
                studioEqScreen.scale.set(frustumW * 1.02, frustumH * 1.02, 1.0);
                studioEqScreen.position.set(0, 0, 0);

                const isAudioActive = (audio.bass > 0.02 || (audio.smoothedMid || audio.mid || 0) > 0.02 || (audio.smoothedTreble || audio.treble || 0) > 0.02 || (audio.overall || 0) > 0.02);

                // 1. Pure Borderless Dark Background (No borders, no boxes, no frames)
                ctx.fillStyle = '#020408';
                ctx.fillRect(0, 0, W, H);

                // 2. Full-Width Spectrum Bars (36 smooth rounded gradient bars rising from bottom edge)
                const barMargin = 16;
                const barSpacing = 5.5;
                const totalBarSpan = W - barMargin * 2;
                const barWidth = (totalBarSpan - (barSpacing * (STUDIO_EQ_BARS - 1))) / STUDIO_EQ_BARS;
                const maxBarHeight = H * 0.62; // Allows dynamic crests up to 62% screen height
                const baseY = H;

                for (let i = 0; i < STUDIO_EQ_BARS; i++) {
                    const binIdx = Math.min((dataArr.length || 1) - 1, Math.floor(Math.pow(i / STUDIO_EQ_BARS, 1.25) * 54) + 1);
                    const idleWave = (Math.sin(elapsedTime * 2.2 + i * 0.28) * 0.5 + 0.5) * 0.07 + 0.03;
                    const rawAmp = (isAudioActive && dataArr[binIdx]) ? (dataArr[binIdx] / 255.0) : idleWave;
                    const boostAmp = rawAmp + (i < 6 ? bassPop * 0.18 : 0);
                    const barHeight = Math.max(8.0, Math.min(maxBarHeight, boostAmp * maxBarHeight));

                    const bx = barMargin + i * (barWidth + barSpacing);
                    const by = baseY - barHeight;

                    // Pre-computed spectral gradient and peak needles (Zero String Allocations)
                    const col = studioEqColors[i];
                    const grad = ctx.createLinearGradient(0, baseY, 0, by);
                    grad.addColorStop(0.0, col.grad0);
                    grad.addColorStop(0.55, col.grad1);
                    grad.addColorStop(0.92, col.grad2);
                    grad.addColorStop(1.0, col.grad3);

                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(bx, by, barWidth, barHeight, [6, 6, 0, 0]);
                    } else {
                        ctx.rect(bx, by, barWidth, barHeight);
                    }
                    ctx.fill();

                    // Peak Hold needle with gravity physics
                    if (barHeight >= studioEqPeakLevels[i]) {
                        studioEqPeakLevels[i] = barHeight;
                        studioEqPeakVels[i] = 0;
                    } else {
                        studioEqPeakVels[i] += delta * 26.0;
                        studioEqPeakLevels[i] = Math.max(8.0, studioEqPeakLevels[i] - studioEqPeakVels[i] * delta * 60.0);
                    }

                    const peakY = baseY - studioEqPeakLevels[i] - 5;
                    ctx.fillStyle = col.peak;
                    if (ctx.roundRect) {
                        ctx.beginPath();
                        ctx.roundRect(bx, peakY, barWidth, 3.5, 2);
                        ctx.fill();
                    } else {
                        ctx.fillRect(bx, peakY, barWidth, 3.5);
                    }

                    // Spawn floating spectrum particles from active bar peaks
                    const spawnThreshold = isAudioActive ? 0.16 : 0.08;
                    if (rawAmp > spawnThreshold && Math.random() < (rawAmp * 0.65) && studioEq2DParticles.length < MAX_STUDIO_2D_PARTICLES) {
                        studioEq2DParticles.push({
                            x: bx + barWidth * 0.5 + (Math.random() - 0.5) * (barWidth * 0.85),
                            y: by,
                            vx: (Math.random() - 0.5) * 1.5,
                            vy: -(3.0 + rawAmp * 6.5 + Math.random() * 3.0),
                            life: 1.0,
                            decay: 0.0035 + Math.random() * 0.0055, // Long lifespan to float all the way to top of screen
                            size: 3.0 + Math.random() * 7.5,
                            seed: Math.random() * 10.0,
                            barIdx: i
                        });
                    }
                }

                // 3. Update & Render Floating Spectrum Particles (Bubbles, Sparks & Orbs floating to top of screen)
                for (let p = studioEq2DParticles.length - 1; p >= 0; p--) {
                    const part = studioEq2DParticles[p];
                    part.x += part.vx + Math.sin(elapsedTime * 2.6 + part.seed) * 0.45;
                    part.y += part.vy;
                    part.vy *= 0.994; // Aerodynamic drag
                    part.vy -= 0.014; // Upward thermal buoyancy lifting them all the way to the top of the screen
                    part.life -= part.decay;

                    // Only cull once decayed or completely floated beyond the top edge of screen
                    if (part.life <= 0 || part.y < -40 || part.x < -40 || part.x > W + 40) {
                        studioEq2DParticles.splice(p, 1);
                        continue;
                    }

                    const col = studioEqColors[part.barIdx] || studioEqColors[0];
                    const rad = Math.max(1.8, part.size * (0.35 + part.life * 0.65));
                    const alpha = Math.min(1.0, part.life * 1.25);

                    // Soft glowing outer halo
                    ctx.globalAlpha = alpha * 0.32;
                    ctx.fillStyle = col.halo;
                    ctx.beginPath();
                    ctx.arc(part.x, part.y, rad * 1.8, 0, Math.PI * 2);
                    ctx.fill();

                    // Saturated neon core
                    ctx.globalAlpha = alpha * 0.95;
                    ctx.fillStyle = col.core;
                    ctx.beginPath();
                    ctx.arc(part.x, part.y, rad * 0.85, 0, Math.PI * 2);
                    ctx.fill();

                    // White-hot center glint for larger particles
                    if (part.size > 5.5) {
                        ctx.globalAlpha = alpha * 0.85;
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(part.x, part.y, rad * 0.35, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.globalAlpha = 1.0;

                studioEqTex.needsUpdate = true;
            }
        // ---------------------------------------------------------------------
        // FX 1: 🎯 Circular Spectrum Mandala
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 1) {
            circBeams.forEach((beam, i) => {
                const bin = (i % 32) + 1;
                const amp = dataArr[bin] ? dataArr[bin] / 255 : 0;
                const scaleLen = Math.max(0.1, amp * 4.5 + (i % 8 === 0 ? bassPop * 2.0 : 0));
                beam.scale.y = THREE.MathUtils.lerp(beam.scale.y, scaleLen, 0.4);
            });
            gCircSpec.rotation.z += delta * (0.2 + bassPop * 0.4);
            cRingOut.scale.setScalar(1.0 + bassPop * 0.15);
        }
        // ---------------------------------------------------------------------
        // FX 2: 🌊 Fluid Wave Matrix
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 2) {
            waveRibbonItems.forEach((item) => {
                item.mat.uniforms.uTime.value = elapsedTime;
                item.mat.uniforms.uBass.value = bassPop;
                item.mat.uniforms.uMid.value = audio.smoothedMid || 0;
                item.mat.uniforms.uTreble.value = audio.smoothedTreble || 0;
            });
            gWaveMatrix.position.y = Math.sin(elapsedTime * 0.8) * 0.35 + (bassPop * 0.4);
            gWaveMatrix.rotation.z = Math.sin(elapsedTime * 0.4) * 0.04;
        }
        // ---------------------------------------------------------------------
        // FX 3: 🎚️ DJ Deck Scrolling Waveforms (Live 3-Band Audio Spectral History & HUD)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 3) {
            // 1. Capture live 3-band audio spectrum amplitudes
            const rawBass = Math.min(1.0, (audio.bass || 0) * 0.75 + (audio.bassImpact || 0) * 0.45);
            const rawMid = Math.min(1.0, (audio.mid || 0) * 1.15);
            const rawTreble = Math.min(1.0, (audio.treble || 0) * 1.25);
            const rawHit = Math.min(1.0, (audio.transientImpulse || 0) * 1.1);

            // 2. Write Deck 1 (Row 0) live spectral history slice
            const d1Offset = djHistoryHead * 4;
            djAudioHistoryData[d1Offset]     = Math.min(255, Math.floor(rawBass * 255));
            djAudioHistoryData[d1Offset + 1] = Math.min(255, Math.floor(rawMid * 255));
            djAudioHistoryData[d1Offset + 2] = Math.min(255, Math.floor(rawTreble * 255));
            djAudioHistoryData[d1Offset + 3] = Math.min(255, Math.floor(rawHit * 255));

            // 3. Write Deck 2 (Row 1) spectral slice (with complementary groove / incoming track simulation)
            const d2Offset = (512 + djHistoryHead) * 4;
            const d2Groove = (Math.sin(elapsedTime * (deck2Data.bpm || currentBPM) / 60.0 * Math.PI) * 0.5 + 0.5);
            const d2Bass = Math.min(1.0, rawBass * 0.85 + d2Groove * 0.15);
            const d2Mid = Math.min(1.0, rawMid * 0.80 + (1.0 - d2Groove) * 0.20);
            const d2Treble = Math.min(1.0, rawTreble * 0.90 + d2Groove * 0.10);
            const d2Hit = (d2Groove > 0.88) ? 0.9 : (rawHit * 0.6);

            djAudioHistoryData[d2Offset]     = Math.min(255, Math.floor(d2Bass * 255));
            djAudioHistoryData[d2Offset + 1] = Math.min(255, Math.floor(d2Mid * 255));
            djAudioHistoryData[d2Offset + 2] = Math.min(255, Math.floor(d2Treble * 255));
            djAudioHistoryData[d2Offset + 3] = Math.min(255, Math.floor(d2Hit * 255));

            djAudioHistoryTex.needsUpdate = true;
            djHistoryHead = (djHistoryHead + 1) % 512;

            // Update 3D Particle Spectrum Field Across All 64 Frequency Bands
            const posArr = specParticleGeo.attributes.position.array;
            const isAudioActive = (rawBass > 0.04 || (audio.smoothedMid || 0) > 0.04 || (audio.smoothedTreble || 0) > 0.04 || (audio.overall || 0) > 0.03);

            for (let i = 0; i < totalSpecParticles; i++) {
                const b = specParticleBandIdx[i];
                const layer = specParticleLayer[i];
                const spd = specParticleSpeed[i];
                
                // Map to actual live FFT bin
                const binIdx = Math.min((dataArr.length || 1) - 1, Math.floor(Math.pow(b / specBands, 1.3) * 56) + 1);
                const rawAmp = (isAudioActive && dataArr[binIdx]) ? (dataArr[binIdx] / 255.0) : 0.0;
                
                // Active height target for this particle in the frequency fountain
                const targetY = -7.5 + (rawAmp * 14.5 * (0.3 + layer * 0.7)) + Math.sin(elapsedTime * 3.0 * spd + b * 0.2) * 0.25 * rawAmp;
                
                // Physics interpolation: rapid rise on audio transient, smooth gravity descent
                const currentY = posArr[i * 3 + 1];
                if (targetY > currentY) {
                    posArr[i * 3 + 1] = THREE.MathUtils.lerp(currentY, targetY, 0.45);
                } else {
                    posArr[i * 3 + 1] = Math.max(-7.5, currentY - delta * (3.5 + layer * 2.0));
                }

                // Subtle lateral turbulence
                posArr[i * 3] = specParticleBaseX[i] + Math.sin(elapsedTime * 2.0 + layer * Math.PI) * (0.15 * rawAmp);
            }
            specParticleGeo.attributes.position.needsUpdate = true;

            // Advance track progress smoothly
            deck1Progress = (deck1Progress + delta * (currentBPM / 126.0) * 0.003) % 1.0;
            deck2Progress = (deck2Progress + delta * ((deck2Data.bpm || currentBPM) / 126.0) * 0.0025) % 1.0;

            const beatPhaseVal = (elapsedTime * (currentBPM / 60.0)) % 1.0;

            // Update Shader Uniforms
            djWaveMat.uniforms.uTime.value = elapsedTime;
            djWaveMat.uniforms.uHeadPos.value = djHistoryHead / 512.0;
            djWaveMat.uniforms.uBass.value = bassPop;
            djWaveMat.uniforms.uMid.value = audio.smoothedMid || 0;
            djWaveMat.uniforms.uTreble.value = audio.smoothedTreble || 0;
            djWaveMat.uniforms.uTransient.value = audio.transientImpulse || 0;
            djWaveMat.uniforms.uBPM.value = currentBPM;
            djWaveMat.uniforms.uDeck2BPM.value = deck2Data.bpm || currentBPM;
            djWaveMat.uniforms.uBeatPhase.value = beatPhaseVal;
            djWaveMat.uniforms.uTrackProgress.value = deck1Progress;
            djWaveMat.uniforms.uDeck2Progress.value = deck2Progress;

            // Update HUD Canvas texture every ~4 frames for smooth time elapsed/remaining readouts
            djHudFrameCount++;
            if (djHudFrameCount % 4 === 0) {
                renderDJDeckHUD(djHudCtx, 2048, 1024, deck1Data, deck2Data, currentBPM, beatPhaseVal, audio.transientImpulse || 0, deck1Progress, deck2Progress);
                djHudTex.needsUpdate = true;
            }
        }
        // ---------------------------------------------------------------------
        // FX 4: 🪩 Authentic Nightclub Mirror Ball Rig [Top Pinspots & Floor Reflections]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 4) {
            // Constant, graceful ball rotation (music reactivity decoupled for now)
            const ballSpinSpeed = 0.24 * speed;
            dBallMesh.rotation.y += ballSpinSpeed * delta * 1.8;
            dBallMesh.rotation.x = Math.sin(elapsedTime * 0.5) * 0.02;
            dBallMesh.rotation.z = Math.cos(elapsedTime * 0.35) * 0.015;

            // 🔗 100% Attached Hanging Chain Dynamic Physics:
            // Calculate world position of the top eyelet ring attached to the disco ball
            const eyeletLocal = new THREE.Vector3(0, 5.48, 0);
            const eyeletWorld = eyeletLocal.clone().applyEuler(dBallMesh.rotation).add(dBallMesh.position);
            const ceilingAnchor = new THREE.Vector3(0, 13.2, 0);

            const totalDiscoLinks = discoChainLinks.length;
            const ballRotY = dBallMesh.rotation.y;
            for (let l = 0; l < totalDiscoLinks; l++) {
                const link = discoChainLinks[l];
                const t0 = l / (totalDiscoLinks - 1);
                const linkPos = new THREE.Vector3().lerpVectors(eyeletWorld, ceilingAnchor, t0);

                // Natural catenary suspension sag
                const sagFactor = Math.sin(t0 * Math.PI) * 0.12;
                linkPos.x += Math.sin(ballRotY * 0.35 + t0 * 1.5) * sagFactor;
                linkPos.z += Math.cos(ballRotY * 0.35 + t0 * 1.5) * sagFactor;
                link.position.copy(linkPos);

                // Alternating link angles aligned to hanging chain
                const baseRotY = (l % 2 === 0) ? (ballRotY * 0.15) : (ballRotY * 0.15 + Math.PI / 2);
                link.rotation.set(
                    dBallMesh.rotation.x * (1.0 - t0),
                    baseRotY,
                    dBallMesh.rotation.z * (1.0 - t0)
                );
            }

            // Steady, elegant stage illumination (music reactivity decoupled for now)
            dBallKeyLight.intensity = 2.5;
            dBallPinLeft.intensity = 2.3;
            dBallPointSilver.intensity = 3.6;
            dBallCyanLight.intensity = 0.8;
            dBallMagentaLight.intensity = 0.8;
            dBallPointCyan.intensity = 1.2;
            dBallPointMagenta.intensity = 1.2;

            // Subtle sparkling white & silver background stars (steady rotation, zero music scale pop)
            glintMat.uniforms.uTime.value = elapsedTime;
            glintSystem.position.set(0, 0, 0);
            glintSystem.rotation.y += 0.04 * speed * delta;
            glintSystem.rotation.x = Math.sin(elapsedTime * 0.25) * 0.02;
            glintSystem.scale.set(1.0, 1.0, 1.0);
        }
        // ---------------------------------------------------------------------
        // FX 5: ⚡ Dual-Bank Volumetric Searchlights
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 5) {
            const sweepTime = elapsedTime * 1.4;
            const choreoPhase = Math.floor(elapsedTime * 0.15) % 3;
            const fanSpread = Math.sin(sweepTime * 0.5) * 0.5 + 0.5;

            topLaserBeams.forEach((laser, idx) => {
                const normIdx = (idx / (numTopLasers - 1)) - 0.5;
                let targetX = 0, targetY = 0, targetZ = -22.0;

                if (choreoPhase === 0) {
                    targetX = normIdx * (22.0 + fanSpread * 26.0) + Math.sin(sweepTime + idx * 0.25) * 6.0;
                    targetY = -5.0 + Math.cos(sweepTime * 1.1 + normIdx * 2.0) * 2.5;
                    targetZ = -20.0 + Math.sin(sweepTime * 0.6) * 4.0;
                } else if (choreoPhase === 1) {
                    targetX = normIdx * 42.0 + Math.sin(sweepTime * 1.1) * 10.0;
                    targetY = -3.5 + Math.sin(sweepTime * 1.4 + idx * 0.25) * 2.0;
                    targetZ = -22.0;
                } else {
                    const waveOffset = Math.sin(sweepTime * 2.0 - idx * 0.5);
                    targetX = normIdx * 38.0;
                    targetY = -3.0 + waveOffset * 4.5;
                    targetZ = -22.0 + waveOffset * 3.0;
                }

                laser.mesh.lookAt(new THREE.Vector3(targetX, targetY, targetZ));
                laser.mat.uniforms.uTime.value = elapsedTime;
                laser.mat.uniforms.uPulse.value = transient * 0.7 + bassPop * 0.4;
            });

            botLaserBeams.forEach((laser, idx) => {
                const normIdx = (idx / (numBotLasers - 1)) - 0.5;
                let targetX = 0, targetY = 0, targetZ = -22.0;

                if (choreoPhase === 0) {
                    targetX = -normIdx * (22.0 + fanSpread * 26.0) - Math.sin(sweepTime + idx * 0.25) * 6.0;
                    targetY = 5.5 - Math.cos(sweepTime * 1.1 + normIdx * 2.0) * 2.5;
                    targetZ = -20.0 + Math.cos(sweepTime * 0.6) * 4.0;
                } else if (choreoPhase === 1) {
                    targetX = normIdx * 42.0 - Math.sin(sweepTime * 1.1) * 10.0;
                    targetY = 4.5 + Math.cos(sweepTime * 1.4 + idx * 0.25) * 2.0;
                    targetZ = -22.0;
                } else {
                    const waveOffset = Math.cos(sweepTime * 2.0 + idx * 0.5);
                    targetX = normIdx * 38.0;
                    targetY = 4.0 + waveOffset * 4.5;
                    targetZ = -22.0 + waveOffset * 3.0;
                }

                laser.mesh.lookAt(new THREE.Vector3(targetX, targetY, targetZ));
                laser.mat.uniforms.uTime.value = elapsedTime;
                laser.mat.uniforms.uPulse.value = transient * 0.7 + bassPop * 0.4;
            });

            laserApertureFlares.forEach((flare, idx) => {
                const flareScale = (1.25 + bassPop * 0.5 + transient * 0.6) * (Math.sin(elapsedTime * 4.0 + idx) * 0.1 + 0.9);
                flare.scale.set(flareScale, flareScale, 1.0);
            });
        }
        // ---------------------------------------------------------------------
        // FX 7: 💥 Saber Multi-Beam DJ Fixtures
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 6) {
            saberPods.forEach((pod, pIdx) => {
                const dir = pod.cfg.rotDir;
                pod.head.rotation.z += speed * (0.35 + pIdx * 0.06) * dir;
                pod.head.rotation.x = Math.sin(elapsedTime * 0.4 + pIdx * 1.2) * 0.45;
                pod.head.rotation.y = Math.cos(elapsedTime * 0.35 + pIdx * 0.9) * 0.40;

                pod.blades.forEach((blade, bIdx) => {
                    blade.mat.uniforms.uTime.value = elapsedTime;
                    const bladeAudio = (transient * 0.8) + (bassPop * 0.4);
                    blade.mat.uniforms.uIntensity.value = 0.9 + bladeAudio * 1.1;
                    blade.mat.uniforms.uCoreBoost.value = 2.4 + (transient * 1.2);
                    blade.mesh.rotation.y = blade.baseAngle + Math.sin(elapsedTime * 0.5 + bIdx * 0.4) * 0.08;
                });
            });
        }
        // ---------------------------------------------------------------------
        // FX 8: 💫 Strobe Hyper-Rings & Laser Matrix
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 7) {
            hyperRings.forEach((hr, idx) => {
                const dir = (idx % 2 === 0) ? 1 : -1;
                hr.rotation.x += speed * (0.5 + idx * 0.15) * dir;
                hr.rotation.y += speed * (0.4 + idx * 0.12) * dir;
                const ringPop = 1.0 + (transient * (0.1 + idx * 0.05)) + (bassPop * 0.1);
                hr.scale.set(ringPop, ringPop, ringPop);
            });
            centerOcta.rotation.x -= delta * 1.2;
            centerOcta.rotation.y += delta * 1.0;
        }
        // ---------------------------------------------------------------------
        // FX 8: 🌅 Synthwave Cyber Grid
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 8) {
            gridPlaneMat.uniforms.uTime.value = elapsedTime;
            gridPlaneMat.uniforms.uBass.value = bassPop;
            gridPlaneMat.uniforms.uMid.value = audio.smoothedMid || 0;
            gridMesh.rotation.z = Math.sin(elapsedTime * 0.15) * 0.035;
            gridMesh.position.x = Math.sin(elapsedTime * 0.12) * 1.2;
        }
        // ---------------------------------------------------------------------
        // FX 11: 🌄 Synthwave Glowing River, Mountains & 80s Sun [NEW]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 9) {
            riverMat.uniforms.uTime.value = elapsedTime;
            riverMat.uniforms.uBass.value = bassPop;
            riverMat.uniforms.uMid.value = audio.smoothedMid || 0;
            sunMat.uniforms.uTime.value = elapsedTime;
            sunMat.uniforms.uBass.value = bassPop;
            skyMat.uniforms.uTime.value = elapsedTime;
            skyMat.uniforms.uBass.value = bassPop;
            sunMesh.position.x = Math.sin(elapsedTime * 0.15) * 1.5;
            riverMesh.position.x = Math.sin(elapsedTime * 0.15) * 0.8;
        }
        // ---------------------------------------------------------------------
        // FX 12: 💻 Matrix Code Rain [NEW]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 10) {
            matrixMat.uniforms.uTime.value = elapsedTime;
            matrixMat.uniforms.uBass.value = bassPop;
            matrixMat.uniforms.uMid.value = audio.smoothedMid || 0;
            matrixMat.uniforms.uGlitch.value = transient;
        }
        // ---------------------------------------------------------------------
        // FX 13: 👾 Retro Arcade 80s Theme [NEW]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 11) {
            arcadeMat.uniforms.uTime.value = elapsedTime;
            arcadeMat.uniforms.uBass.value = bassPop;
            arcadeMat.uniforms.uMid.value = audio.smoothedMid || 0;
        }
        // ---------------------------------------------------------------------
        // FX 14: 🚀 Warp Speed Starfield
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 12) {
            const positions = warpStarGeo.attributes.position.array;
            const warpVelocity = (22.0 + bassPop * 40.0 + transient * 50.0) * delta;

            for (let i = 0; i < warpStarCount; i++) {
                const zIdx = i * 3 + 2;
                positions[zIdx] += warpVelocity * warpStarVelocities[i];
                if (positions[zIdx] > 15) {
                    positions[zIdx] = -80.0;
                    positions[i * 3] = (Math.random() - 0.5) * 60;
                    positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
                }
            }
            warpStarGeo.attributes.position.needsUpdate = true;
            warpStarSystem.rotation.z += delta * 0.03;
        }
        // ---------------------------------------------------------------------
        // FX 15: 🌌 Spiral Galaxy Cosmic Vortex
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 13) {
            plasmaMat.uniforms.uTime.value = elapsedTime;
            plasmaMat.uniforms.uBass.value = bassPop;
            plasmaMat.uniforms.uMid.value = audio.smoothedMid || 0;
            plasmaMat.uniforms.uPulse.value = transient;

            const starPos = vortexStarGeo.attributes.position.array;
            const flowSpeed = (0.35 + bassPop * 0.6 + transient * 0.4) * delta;

            for (let i = 0; i < vortexStarCount; i++) {
                const s = vortexStarData[i];
                s.rad -= s.inwardSpeed * flowSpeed * 3.5;
                if (s.rad < 0.45) {
                    s.rad = 22.0 + Math.random() * 6.0;
                }
                s.theta += (0.5 + (3.2 / (s.rad + 0.6))) * delta * (1.0 + bassPop * 0.5);

                starPos[i * 3] = Math.cos(s.theta) * s.rad * 1.35;
                starPos[i * 3 + 1] = Math.sin(s.theta) * s.rad * 0.85;
                starPos[i * 3 + 2] = -10.0 - (28.0 / (s.rad + 1.2));
            }
            vortexStarGeo.attributes.position.needsUpdate = true;
            plasmaMesh.scale.setScalar(1.0 + (bassPop * 0.08) + (transient * 0.06));
        }
        // ---------------------------------------------------------------------
        // FX 16: ✨ Hyper Particle Stream (GPU Curl & Multi-Strand Spline Flow)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 14) {
            // Soft exponential smoothing for audio responsiveness (zero twitching)
            const rawBass = (audio.smoothedBass || 0.0);
            const rawMid = (audio.smoothedMid || 0.0);
            const rawTreble = (audio.smoothedTreble || 0.0);

            streamSmoothBass = THREE.MathUtils.lerp(streamSmoothBass, rawBass, 0.08);
            streamSmoothMid = THREE.MathUtils.lerp(streamSmoothMid, rawMid, 0.08);
            streamSmoothTreble = THREE.MathUtils.lerp(streamSmoothTreble, rawTreble, 0.08);

            // Monotonic flow progress (slow, continuous, majestic)
            streamFlowProgress += delta * (0.045 + streamSmoothBass * 0.035);
            streamCurveTime += delta * 0.6;

            streamMat.uniforms.uTime.value = elapsedTime;
            streamMat.uniforms.uFlowProgress.value = streamFlowProgress;
            streamMat.uniforms.uCurveTime.value = streamCurveTime;
            streamMat.uniforms.uBass.value = streamSmoothBass;
            streamMat.uniforms.uMid.value = streamSmoothMid;
            streamMat.uniforms.uTreble.value = streamSmoothTreble;
            streamMat.uniforms.uColorCycle.value = (elapsedTime * 0.015) % 1.0;

            // Animate orbiting pulsar flares smoothly along stream strands
            for (let p = 0; p < pulsarCount; p++) {
                const ps = pulsarSprites[p];
                ps.progress = (ps.progress + delta * (ps.speed + streamSmoothBass * 0.020)) % 1.0;
                const pos = getStreamCurvePointJS(ps.progress, ps.strand, streamCurveTime);
                ps.sprite.position.set(pos.x, pos.y, pos.z);
                const targetScale = 5.0 + streamSmoothBass * 2.8;
                ps.sprite.scale.x = THREE.MathUtils.lerp(ps.sprite.scale.x, targetScale, 0.12);
                ps.sprite.scale.y = ps.sprite.scale.x;
            }

            // Serene ambient cosmic dust rotation
            streamDustSystem.rotation.z = elapsedTime * 0.01;
        }
        // ---------------------------------------------------------------------
        // FX 17: ⏱️ Time.is Live Precision DJ Clock & Spectrum [NEW]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 15) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const millis = now.getMilliseconds();
            const tenths = Math.floor(millis / 100);

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const dayName = days[now.getDay()];
            const monthName = months[now.getMonth()];
            const dateNum = now.getDate();
            const yearNum = now.getFullYear();

            // Timezone detection
            let tzName = 'Local Time';
            try {
                tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';
            } catch (e) {}

            const cw = 2048;
            const ch = 1024;
            const cx = cw / 2;
            const cy = ch / 2;

            clockCtx.clearRect(0, 0, cw, ch);

            // 1. Dark Vignette Ambient Radial Background
            const bgGrad = clockCtx.createRadialGradient(cx, cy, 50, cx, cy, 700);
            bgGrad.addColorStop(0, `rgba(15, 20, 45, ${0.7 + bassPop * 0.25})`);
            bgGrad.addColorStop(0.5, 'rgba(6, 8, 22, 0.45)');
            bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
            clockCtx.fillStyle = bgGrad;
            clockCtx.fillRect(0, 0, cw, ch);

            // 2. Audio-Reactive Radial Equalizer Spectrum Orbiting Clock
            const numRadialBars = 80;
            const radialRadius = 380 + bassPop * 30;
            const barMaxLen = 140;
            for (let i = 0; i < numRadialBars; i++) {
                const angle = (i / numRadialBars) * Math.PI * 2 - Math.PI / 2;
                const binIdx = Math.floor(Math.pow(i / numRadialBars, 1.3) * 50) + 1;
                const amp = dataArr[binIdx] ? dataArr[binIdx] / 255 : (Math.sin(elapsedTime * 3 + i) * 0.2 + 0.2);
                const barLen = Math.max(10, amp * barMaxLen * (1.0 + bassPop * 0.5));

                const x1 = cx + Math.cos(angle) * radialRadius;
                const y1 = cy + Math.sin(angle) * (radialRadius * 0.72);
                const x2 = cx + Math.cos(angle) * (radialRadius + barLen);
                const y2 = cy + Math.sin(angle) * ((radialRadius + barLen) * 0.72);

                const hue = (i / numRadialBars) * 120 + 170; // Cyan to Purple / Pink
                clockCtx.strokeStyle = `hsla(${hue}, 100%, ${60 + amp * 30}%, ${0.35 + amp * 0.6})`;
                clockCtx.lineWidth = 4;
                clockCtx.beginPath();
                clockCtx.moveTo(x1, y1);
                clockCtx.lineTo(x2, y2);
                clockCtx.stroke();
            }

            // 3. Smooth Seconds Continuous Progress Arc
            const secProgress = (now.getSeconds() + millis / 1000) / 60;
            const secAngle = secProgress * Math.PI * 2 - Math.PI / 2;
            const arcRadius = 350;

            // Background Track
            clockCtx.beginPath();
            clockCtx.ellipse(cx, cy, arcRadius, arcRadius * 0.72, 0, 0, Math.PI * 2);
            clockCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            clockCtx.lineWidth = 6;
            clockCtx.stroke();

            // Progress Arc with Glowing Cyan Gradient
            clockCtx.beginPath();
            clockCtx.ellipse(cx, cy, arcRadius, arcRadius * 0.72, 0, -Math.PI / 2, secAngle);
            clockCtx.strokeStyle = '#00f3ff';
            clockCtx.shadowColor = '#00f3ff';
            clockCtx.shadowBlur = 20 + bassPop * 25;
            clockCtx.lineWidth = 8;
            clockCtx.stroke();
            clockCtx.shadowBlur = 0;

            // Leading Seconds Tracker Dot
            const headX = cx + Math.cos(secAngle) * arcRadius;
            const headY = cy + Math.sin(secAngle) * (arcRadius * 0.72);
            clockCtx.beginPath();
            clockCtx.arc(headX, headY, 10 + bassPop * 6, 0, Math.PI * 2);
            clockCtx.fillStyle = '#ffffff';
            clockCtx.shadowColor = '#00ffff';
            clockCtx.shadowBlur = 25;
            clockCtx.fill();
            clockCtx.shadowBlur = 0;

            // 4. Header Badge: Time.is Exact Time Synchronized
            clockCtx.textAlign = 'center';
            clockCtx.font = '700 28px "JetBrains Mono", monospace';
            clockCtx.fillStyle = '#00ffcc';
            clockCtx.shadowColor = 'rgba(0, 255, 204, 0.8)';
            clockCtx.shadowBlur = 15;
            clockCtx.fillText(`● TIME.IS EXACT TIME  •  ${tzName.toUpperCase()}`, cx, cy - 230);
            clockCtx.shadowBlur = 0;

            // 5. Main Hero Time Readout (Time.is Signature Big Bold Typography)
            const timeStr = `${hours}:${minutes}:${seconds}`;
            clockCtx.font = '900 190px "Outfit", "JetBrains Mono", sans-serif';
            clockCtx.fillStyle = '#ffffff';
            clockCtx.shadowColor = bassPop > 0.4 ? '#00f3ff' : 'rgba(0, 243, 255, 0.5)';
            clockCtx.shadowBlur = 30 + bassPop * 40;
            clockCtx.fillText(timeStr, cx, cy + 40);
            clockCtx.shadowBlur = 0;

            // Sub-second precision badge
            clockCtx.font = '700 48px "JetBrains Mono", monospace';
            clockCtx.fillStyle = '#ff007f';
            clockCtx.shadowColor = '#ff007f';
            clockCtx.shadowBlur = 18;
            clockCtx.fillText(`.${tenths}`, cx + 430, cy + 30);
            clockCtx.shadowBlur = 0;

            // 6. Full Date & Day Ribbon
            clockCtx.font = '600 42px "Outfit", sans-serif';
            clockCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            clockCtx.fillText(`${dayName}, ${dateNum} ${monthName} ${yearNum}`, cx, cy + 130);

            // 7. Footer: Set BPM / Denon Sync Telemetry
            clockCtx.font = '600 24px "JetBrains Mono", monospace';
            clockCtx.fillStyle = 'rgba(255, 255, 255, 0.55)';
            clockCtx.fillText(`LIVE DJ STAGE SYNC  •  ${Number(currentBPM).toFixed(1)} BPM  •  PRECISION ATOMIC CLOCK`, cx, cy + 200);

            clockTexture.needsUpdate = true;

            // Animate 3D Gyro Rings
            gyroRing1.rotation.x = elapsedTime * 0.4;
            gyroRing1.rotation.y = elapsedTime * 0.3;
            gyroRing1.scale.setScalar(1.0 + bassPop * 0.12);

            gyroRing2.rotation.y = -elapsedTime * 0.35;
            gyroRing2.rotation.z = elapsedTime * 0.25;
            gyroRing2.scale.setScalar(1.0 + (audio.smoothedMid || 0) * 0.12);

            gyroRing3.rotation.x = -elapsedTime * 0.2;
            gyroRing3.rotation.z = -elapsedTime * 0.4;
            gyroRing3.scale.setScalar(1.0 + (audio.smoothedTreble || 0) * 0.12);

            clockStarPoints.rotation.y = elapsedTime * 0.03;
        }
        // ---------------------------------------------------------------------
        // FX 18: 🔦 Sweeping Godray Disco Lights (Slow, Majestic Moving-Head Rig)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 16) {
            // Majestic, fluid arena sweep synced to tempo (graceful, calm, hypnotic)
            const sweepSpeed = 0.14 * (currentBPM / 126.0);
            const sweepTime = elapsedTime * sweepSpeed;

            // Robust heavy bass / kick detection (sensitive, reliable, and musically responsive)
            const rawBassVal = audio.bass || 0;
            const bassPopVal = audio.bassImpact || audio.bass || 0;
            const transientVal = audio.transientImpulse || 0;
            const isKickHit = audio.isOnset || transientVal > 0.35 || bassPopVal > 0.28 || rawBassVal > 0.30;

            if (isKickHit && (elapsedTime - godrayLastKickTime > 0.14)) {
                godrayLastKickTime = elapsedTime;
                // Advance chase index across the 8 moving heads (staggered response, never all at once)
                godrayChaseIndex = (godrayChaseIndex + 1) % numGodrays;

                // Scale surge strength with kick impact
                const kickPower = Math.min(1.6, Math.max(0.9, bassPopVal * 1.5 + transientVal * 0.8));
                godrayFixtures[godrayChaseIndex].bassSurge = kickPower;

                // Symmetrical paired follower (left & right stage balance)
                const pairIdx = (godrayChaseIndex + 4) % numGodrays;
                godrayFixtures[pairIdx].bassSurge = Math.max(godrayFixtures[pairIdx].bassSurge, kickPower * 0.75);
            }

            // Exponential decay of per-fixture bass surge (instant snappy attack, ~400ms smooth fade)
            const surgeDecay = Math.exp(-delta * 3.6);
            godrayFixtures.forEach(fix => {
                fix.bassSurge *= surgeDecay;
                if (fix.bassSurge < 0.005) fix.bassSurge = 0.0;
            });

            // Animate Floating Atmospheric Fog medium smoothly with bass & overall rhythm
            floatingFogMat.uniforms.uTime.value = elapsedTime;
            floatingFogMat.uniforms.uBass.value = (audio.smoothedBass || 0) * 0.50 + (audio.bassImpact || 0) * 0.25;
            floatingFogMat.uniforms.uIntensity.value = 0.28 + (audio.smoothedBass || 0) * 0.18 + (audio.overall || 0) * 0.12;

            const floorY = -10.6;

            godrayFixtures.forEach((fix, idx) => {
                const norm = fix.normIdx - 0.5; // -0.5 (leftmost) to +0.5 (rightmost)

                // Slow, graceful, wide harmonic sways (ultra-fluid, zero sudden motion)
                const panHarmonic1 = Math.sin(sweepTime * 0.85 + fix.phaseOffset) * 0.36;
                const panHarmonic2 = Math.sin(sweepTime * 0.35 + idx * 0.40) * 0.14;
                const rotZ = panHarmonic1 + panHarmonic2 + (norm * 0.22);

                const tiltHarmonic1 = Math.cos(sweepTime * 0.65 + fix.phaseOffset * 0.7) * 0.15;
                const tiltHarmonic2 = Math.sin(sweepTime * 0.25 + idx * 0.20) * 0.06;
                const rotX = 0.28 + tiltHarmonic1 + tiltHarmonic2;

                fix.pivotGroup.rotation.z = rotZ;
                fix.pivotGroup.rotation.x = rotX;

                // 1. Organic base breathing
                const breathCycle = Math.sin(elapsedTime * 0.22 + fix.phaseOffset) * 0.5 + 0.5;
                const baseBreath = 0.34 + Math.pow(breathCycle, 1.4) * 0.24; // 0.34 to 0.58

                // 2. Continuous smooth music reaction (bassline & mid warmth, zero jitter)
                const musicBassGlow = (audio.smoothedBass || 0) * 0.48;
                const musicMidGlow = (audio.smoothedMid || 0) * 0.20;

                // 3. Searing heavy bass surge on active chase fixtures (peaks at 1.8 - 2.5!)
                const bassBoost = fix.bassSurge * 1.65;
                const beamIntensity = baseBreath + musicBassGlow + musicMidGlow + bassBoost;

                // Update Godray Uniforms
                fix.beamMat.uniforms.uTime.value = elapsedTime;
                fix.beamMat.uniforms.uIntensity.value = beamIntensity;

                const activeCol = fix.baseColor;
                fix.beamMat.uniforms.uColor.value.copy(activeCol);

                // Compute exact 3D ray-plane floor intersection (mathematically locks spot to beam)
                const worldDir = new THREE.Vector3(0, -1, 0).applyEuler(fix.pivotGroup.rotation).normalize();
                const t = (floorY - fix.podGroup.position.y) / worldDir.y;
                const hitX = fix.podGroup.position.x + worldDir.x * t;
                const hitY = floorY + 0.01;
                const hitZ = fix.podGroup.position.z + worldDir.z * t;

                fix.floorImpactMesh.position.set(hitX, hitY, hitZ);

                // Cone radius at distance t along beam
                const coneRadius = godrayTopRadius + t * ((godrayBottomRadius - godrayTopRadius) / godrayBeamLength);
                const cosTilt = Math.max(0.35, -worldDir.y);
                const spotWidth = coneRadius * (1.10 + fix.bassSurge * 0.35);
                const spotLength = (coneRadius * (1.10 + fix.bassSurge * 0.35)) / cosTilt;

                fix.floorImpactMesh.scale.set(spotWidth, spotLength, 1.0);
                const floorAngle = Math.atan2(worldDir.x, -worldDir.z);
                fix.floorImpactMesh.rotation.set(-Math.PI / 2, 0, floorAngle, 'ZXY');

                // Update Floor Impact Spot Material (exact color match + intensity + bass surge)
                fix.floorImpactMat.uniforms.uColor.value.copy(activeCol);
                fix.floorImpactMat.uniforms.uIntensity.value = beamIntensity;
                fix.floorImpactMat.uniforms.uSurge.value = fix.bassSurge + (audio.smoothedBass || 0) * 0.30;

                // Update Spotlight parameters to dynamically shade the floating fog medium
                floatingFogMat.uniforms.uSpotPos.value[idx].copy(fix.podGroup.position);
                floatingFogMat.uniforms.uSpotDir.value[idx].copy(worldDir);
                floatingFogMat.uniforms.uSpotColor.value[idx].copy(activeCol);
                floatingFogMat.uniforms.uSpotIntensity.value[idx] = beamIntensity;

                // Clean lens disc on moving head
                fix.lensDiscMesh.material.color.copy(activeCol);
                fix.lensDiscMesh.material.opacity = Math.min(1.0, 0.55 + fix.bassSurge * 0.45 + (audio.smoothedBass || 0) * 0.20);
            });
        }
        // ---------------------------------------------------------------------
        // FX 17: ☁️ Pure White Godrays & Protean Volumetric Clouds
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 17) {
            // Tempo-synchronized majestic arena sweep
            const sweepSpeed = 0.14 * (currentBPM / 126.0);
            const sweepTime = elapsedTime * sweepSpeed;

            // Robust heavy bass / kick transient detection
            const rawBassVal = audio.bass || 0;
            const bassPopVal = audio.bassImpact || audio.bass || 0;
            const transientVal = audio.transientImpulse || 0;
            const isKickHit = audio.isOnset || transientVal > 0.35 || bassPopVal > 0.28 || rawBassVal > 0.30;

            if (isKickHit && (elapsedTime - whiteGodrayLastKickTime > 0.14)) {
                whiteGodrayLastKickTime = elapsedTime;
                whiteGodrayChaseIndex = (whiteGodrayChaseIndex + 1) % numGodrays;

                const kickPower = Math.min(1.6, Math.max(0.9, bassPopVal * 1.5 + transientVal * 0.8));
                whiteGodrayFixtures[whiteGodrayChaseIndex].bassSurge = kickPower;

                const pairIdx = (whiteGodrayChaseIndex + 4) % numGodrays;
                whiteGodrayFixtures[pairIdx].bassSurge = Math.max(whiteGodrayFixtures[pairIdx].bassSurge, kickPower * 0.75);
            }

            // Exponential decay of per-fixture bass surge
            const surgeDecay = Math.exp(-delta * 3.6);
            whiteGodrayFixtures.forEach(fix => {
                fix.bassSurge *= surgeDecay;
                if (fix.bassSurge < 0.005) fix.bassSurge = 0.0;
            });

            // Animate Protean Clouds Volumetric Background Shader (Subtle, Faded Atmospheric Clouds)
            if (proteanCloudMat) {
                proteanCloudMat.uniforms.uTime.value = elapsedTime * 0.22;
                proteanCloudMat.uniforms.uBass.value = (audio.smoothedBass || 0) * 0.45 + (audio.bassImpact || 0) * 0.20;
                proteanCloudMat.uniforms.uMid.value = (audio.smoothedMid || 0);
                proteanCloudMat.uniforms.uTreble.value = (audio.smoothedTreble || 0);
                proteanCloudMat.uniforms.uIntensity.value = 0.35 + (audio.smoothedBass || 0) * 0.12;
            }

            // Animate floating stage fog medium
            whiteFloatingFogMat.uniforms.uTime.value = elapsedTime;
            whiteFloatingFogMat.uniforms.uBass.value = (audio.smoothedBass || 0) * 0.35 + (audio.bassImpact || 0) * 0.15;
            whiteFloatingFogMat.uniforms.uIntensity.value = 0.14 + (audio.smoothedBass || 0) * 0.08 + (audio.overall || 0) * 0.05;

            const floorY = -10.6;

            whiteGodrayFixtures.forEach((fix, idx) => {
                const norm = fix.normIdx - 0.5;

                // Wide harmonic sways
                const panHarmonic1 = Math.sin(sweepTime * 0.85 + fix.phaseOffset) * 0.36;
                const panHarmonic2 = Math.sin(sweepTime * 0.35 + idx * 0.40) * 0.14;
                const rotZ = panHarmonic1 + panHarmonic2 + (norm * 0.22);

                const tiltHarmonic1 = Math.cos(sweepTime * 0.65 + fix.phaseOffset * 0.7) * 0.15;
                const tiltHarmonic2 = Math.sin(sweepTime * 0.25 + idx * 0.20) * 0.06;
                const rotX = 0.28 + tiltHarmonic1 + tiltHarmonic2;

                fix.pivotGroup.rotation.z = rotZ;
                fix.pivotGroup.rotation.x = rotX;

                // Organic base breathing & music reactivity
                const breathCycle = Math.sin(elapsedTime * 0.22 + fix.phaseOffset) * 0.5 + 0.5;
                const baseBreath = 0.34 + Math.pow(breathCycle, 1.4) * 0.24;
                const musicBassGlow = (audio.smoothedBass || 0) * 0.48;
                const musicMidGlow = (audio.smoothedMid || 0) * 0.20;
                const bassBoost = fix.bassSurge * 1.65;
                const beamIntensity = baseBreath + musicBassGlow + musicMidGlow + bassBoost;

                fix.beamMat.uniforms.uTime.value = elapsedTime;
                fix.beamMat.uniforms.uIntensity.value = beamIntensity;
                fix.beamMat.uniforms.uColor.value.set(0xffffff);

                // Compute exact ray-plane intersection on floor
                const worldDir = new THREE.Vector3(0, -1, 0).applyEuler(fix.pivotGroup.rotation).normalize();
                const t = (floorY - fix.podGroup.position.y) / worldDir.y;
                const hitX = fix.podGroup.position.x + worldDir.x * t;
                const hitY = floorY + 0.01;
                const hitZ = fix.podGroup.position.z + worldDir.z * t;

                fix.floorImpactMesh.position.set(hitX, hitY, hitZ);

                const coneRadius = whiteTopRadius + t * ((whiteBottomRadius - whiteTopRadius) / whiteBeamLength);
                const cosTilt = Math.max(0.35, -worldDir.y);
                const spotWidth = coneRadius * (1.10 + fix.bassSurge * 0.35);
                const spotLength = (coneRadius * (1.10 + fix.bassSurge * 0.35)) / cosTilt;

                fix.floorImpactMesh.scale.set(spotWidth, spotLength, 1.0);
                const floorAngle = Math.atan2(worldDir.x, -worldDir.z);
                fix.floorImpactMesh.rotation.set(-Math.PI / 2, 0, floorAngle, 'ZXY');

                // Update Floor Impact Spot
                fix.floorImpactMat.uniforms.uColor.value.set(0xffffff);
                fix.floorImpactMat.uniforms.uIntensity.value = beamIntensity;
                fix.floorImpactMat.uniforms.uSurge.value = fix.bassSurge + (audio.smoothedBass || 0) * 0.30;

                // Update spotlight uniforms in fog
                whiteFloatingFogMat.uniforms.uSpotPos.value[idx].copy(fix.podGroup.position);
                whiteFloatingFogMat.uniforms.uSpotDir.value[idx].copy(worldDir);
                whiteFloatingFogMat.uniforms.uSpotColor.value[idx].set(0xffffff);
                whiteFloatingFogMat.uniforms.uSpotIntensity.value[idx] = beamIntensity;

                // Lens disc
                fix.lensDiscMesh.material.opacity = Math.min(1.0, 0.55 + fix.bassSurge * 0.45 + (audio.smoothedBass || 0) * 0.20);
            });
        }
        // ---------------------------------------------------------------------
        // FX 18: 🪩 Disco Dance Floor with Coloured Godrays & Atmospheric Smoke
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 18) {
            // Animate 70s Saturday Night Fever Disco Dancefloor
            discoStageFloorMat.uniforms.uTime.value = elapsedTime;
            discoStageFloorMat.uniforms.uBass.value = audio.bass || 0;
            discoStageFloorMat.uniforms.uBPM.value = currentBPM;

            // Tempo-synchronized arena sweep
            const sweepSpeed = 0.14 * (currentBPM / 126.0);
            const sweepTime = elapsedTime * sweepSpeed;

            // Robust heavy bass / kick transient detection
            const rawBassVal = audio.bass || 0;
            const bassPopVal = audio.bassImpact || audio.bass || 0;
            const transientVal = audio.transientImpulse || 0;
            const isKickHit = audio.isOnset || transientVal > 0.35 || bassPopVal > 0.28 || rawBassVal > 0.30;

            if (isKickHit && (elapsedTime - discoGodrayLastKickTime > 0.14)) {
                discoGodrayLastKickTime = elapsedTime;
                discoGodrayChaseIndex = (discoGodrayChaseIndex + 1) % numGodrays;

                const kickPower = Math.min(1.5, Math.max(0.85, bassPopVal * 1.4 + transientVal * 0.75));
                discoGodrayFixtures[discoGodrayChaseIndex].bassSurge = kickPower;

                const pairIdx = (discoGodrayChaseIndex + 4) % numGodrays;
                discoGodrayFixtures[pairIdx].bassSurge = Math.max(discoGodrayFixtures[pairIdx].bassSurge, kickPower * 0.75);
            }

            // Exponential decay of per-fixture bass surge
            const surgeDecay = Math.exp(-delta * 3.6);
            discoGodrayFixtures.forEach(fix => {
                fix.bassSurge *= surgeDecay;
                if (fix.bassSurge < 0.005) fix.bassSurge = 0.0;
            });

            // Animate Protean Clouds Volumetric Background Shader (Faded, Moody Smoke)
            if (discoProteanCloudMat) {
                discoProteanCloudMat.uniforms.uTime.value = elapsedTime * 0.22;
                discoProteanCloudMat.uniforms.uBass.value = (audio.smoothedBass || 0) * 0.45 + (audio.bassImpact || 0) * 0.20;
                discoProteanCloudMat.uniforms.uMid.value = (audio.smoothedMid || 0);
                discoProteanCloudMat.uniforms.uTreble.value = (audio.smoothedTreble || 0);
                discoProteanCloudMat.uniforms.uIntensity.value = 0.35 + (audio.smoothedBass || 0) * 0.12;
            }

            // Animate floating stage fog medium
            discoFloatingFogMat.uniforms.uTime.value = elapsedTime;
            discoFloatingFogMat.uniforms.uBass.value = (audio.smoothedBass || 0) * 0.35 + (audio.bassImpact || 0) * 0.15;
            discoFloatingFogMat.uniforms.uIntensity.value = 0.14 + (audio.smoothedBass || 0) * 0.08 + (audio.overall || 0) * 0.05;

            const floorY = -10.6;

            discoGodrayFixtures.forEach((fix, idx) => {
                const norm = fix.normIdx - 0.5;

                // Wide harmonic sways
                const panHarmonic1 = Math.sin(sweepTime * 0.85 + fix.phaseOffset) * 0.36;
                const panHarmonic2 = Math.sin(sweepTime * 0.35 + idx * 0.40) * 0.14;
                const rotZ = panHarmonic1 + panHarmonic2 + (norm * 0.22);

                const tiltHarmonic1 = Math.cos(sweepTime * 0.65 + fix.phaseOffset * 0.7) * 0.15;
                const tiltHarmonic2 = Math.sin(sweepTime * 0.25 + idx * 0.20) * 0.06;
                const rotX = 0.28 + tiltHarmonic1 + tiltHarmonic2;

                fix.pivotGroup.rotation.z = rotZ;
                fix.pivotGroup.rotation.x = rotX;

                // Balanced base breathing & music reactivity with softer lens intensity
                const breathCycle = Math.sin(elapsedTime * 0.22 + fix.phaseOffset) * 0.5 + 0.5;
                const baseBreath = 0.30 + Math.pow(breathCycle, 1.4) * 0.20;
                const musicBassGlow = (audio.smoothedBass || 0) * 0.40;
                const musicMidGlow = (audio.smoothedMid || 0) * 0.16;
                const bassBoost = fix.bassSurge * 1.35;
                const beamIntensity = baseBreath + musicBassGlow + musicMidGlow + bassBoost;

                fix.beamMat.uniforms.uTime.value = elapsedTime;
                fix.beamMat.uniforms.uIntensity.value = beamIntensity;
                const activeCol = fix.baseColor;
                fix.beamMat.uniforms.uColor.value.copy(activeCol);

                // Compute exact ray-plane intersection striking the illuminated disco floor
                const worldDir = new THREE.Vector3(0, -1, 0).applyEuler(fix.pivotGroup.rotation).normalize();
                const t = (floorY - fix.podGroup.position.y) / worldDir.y;
                const hitX = fix.podGroup.position.x + worldDir.x * t;
                const hitY = floorY + 0.01;
                const hitZ = fix.podGroup.position.z + worldDir.z * t;

                fix.floorImpactMesh.position.set(hitX, hitY, hitZ);

                const coneRadius = discoTopRadius + t * ((discoBottomRadius - discoTopRadius) / discoBeamLength);
                const cosTilt = Math.max(0.35, -worldDir.y);
                const spotWidth = coneRadius * (1.10 + fix.bassSurge * 0.35);
                const spotLength = (coneRadius * (1.10 + fix.bassSurge * 0.35)) / cosTilt;

                fix.floorImpactMesh.scale.set(spotWidth, spotLength, 1.0);
                const floorAngle = Math.atan2(worldDir.x, -worldDir.z);
                fix.floorImpactMesh.rotation.set(-Math.PI / 2, 0, floorAngle, 'ZXY');

                // Update Floor Impact Spot Material (illuminating the disco floor tiles)
                fix.floorImpactMat.uniforms.uColor.value.copy(activeCol);
                fix.floorImpactMat.uniforms.uIntensity.value = beamIntensity * 1.15;
                fix.floorImpactMat.uniforms.uSurge.value = fix.bassSurge + (audio.smoothedBass || 0) * 0.30;

                // Update spotlight uniforms in fog
                discoFloatingFogMat.uniforms.uSpotPos.value[idx].copy(fix.podGroup.position);
                discoFloatingFogMat.uniforms.uSpotDir.value[idx].copy(worldDir);
                discoFloatingFogMat.uniforms.uSpotColor.value[idx].copy(activeCol);
                discoFloatingFogMat.uniforms.uSpotIntensity.value[idx] = beamIntensity;

                // Softer lens disc intensity as requested
                fix.lensDiscMesh.material.color.copy(activeCol);
                fix.lensDiscMesh.material.opacity = Math.min(0.65, 0.30 + fix.bassSurge * 0.30 + (audio.smoothedBass || 0) * 0.12);
            });
        }
        // ---------------------------------------------------------------------
        // FX 21: 📼 VHS Glitch Words & Godrays ("DREAMLOVER" / "DO YOU BELIEVE?")
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 19) {
            // Phrase alternation timer (~8.0s cadence / 16 beats, tempo-synced)
            const phraseDuration = Math.max(7.5, 16.0 * (60.0 / currentBPM));
            if (elapsedTime - vhsLastPhraseSwitchTime > phraseDuration) {
                vhsLastPhraseSwitchTime = elapsedTime;
                vhsCurrentPhraseIdx = (vhsCurrentPhraseIdx + 1) % VHS_PHRASES.length;
                vhsGlitchSpike = 1.8; // Dramatic CRT channel-switch / degauss transition
                renderVhsTextCanvas(vhsCurrentPhraseIdx);
            }

            // Heavy bass kick / transient response
            const rawBassVal = audio.bass || 0;
            const bassPopVal = audio.bassImpact || audio.bass || 0;
            const transientVal = audio.transientImpulse || 0;
            const isKickHit = audio.isOnset || transientVal > 0.35 || bassPopVal > 0.28 || rawBassVal > 0.30;

            if (isKickHit) {
                vhsGlitchSpike = Math.min(1.4, vhsGlitchSpike + 0.25);
            }

            // Smooth decay for longer, more cinematic CRT transitions (~1.4s duration)
            vhsGlitchSpike = Math.max(0.0, vhsGlitchSpike - delta * 1.3);

            // Update VHS Text Shader Uniforms
            vhsTextPlaneMat.uniforms.uTime.value = elapsedTime;
            vhsTextPlaneMat.uniforms.uBass.value = (audio.smoothedBass || 0);
            vhsTextPlaneMat.uniforms.uGlitch.value = vhsGlitchSpike;

            // Tempo-synchronized arena godray sweeps focused onto words
            const sweepSpeed = 0.15 * (currentBPM / 126.0);
            const sweepTime = elapsedTime * sweepSpeed;

            if (isKickHit && (elapsedTime - vhsGodrayLastKickTime > 0.14)) {
                vhsGodrayLastKickTime = elapsedTime;
                vhsGodrayChaseIndex = (vhsGodrayChaseIndex + 1) % numGodrays;

                const kickPower = Math.min(1.6, Math.max(0.9, bassPopVal * 1.5 + transientVal * 0.8));
                vhsGodrayFixtures[vhsGodrayChaseIndex].bassSurge = kickPower;

                const pairIdx = (vhsGodrayChaseIndex + 4) % numGodrays;
                vhsGodrayFixtures[pairIdx].bassSurge = Math.max(vhsGodrayFixtures[pairIdx].bassSurge, kickPower * 0.75);
            }

            const surgeDecay = Math.exp(-delta * 3.6);
            vhsGodrayFixtures.forEach(fix => {
                fix.bassSurge *= surgeDecay;
                if (fix.bassSurge < 0.005) fix.bassSurge = 0.0;
            });

            // Animate Inward-Billowing Smoke Medium (rolling in from left & right)
            vhsSmokeMat.uniforms.uTime.value = elapsedTime;
            vhsSmokeMat.uniforms.uBass.value = (audio.smoothedBass || 0) * 0.40 + (audio.bassImpact || 0) * 0.20;
            vhsSmokeMat.uniforms.uIntensity.value = 0.24 + (audio.smoothedBass || 0) * 0.12 + (audio.overall || 0) * 0.06;

            const floorY = -10.6;

            vhsGodrayFixtures.forEach((fix, idx) => {
                const norm = fix.normIdx - 0.5; // -0.5 to +0.5

                let rotZ = 0.0;
                let rotX = 0.30;

                // Inner fixtures (indices 2, 3, 4, 5) cross and shine directly over center words
                // Outer fixtures (indices 0, 1, 6, 7) sweep across incoming left/right smoke billows
                if (idx >= 2 && idx <= 5) {
                    const crossPhase = (idx % 2 === 0 ? 1.0 : -1.0);
                    const focusAngle = -norm * 0.42;
                    const sway = Math.sin(sweepTime * 1.1 + fix.phaseOffset) * 0.14 * crossPhase;
                    rotZ = focusAngle + sway;
                    rotX = 0.32 + Math.cos(sweepTime * 0.8 + idx * 0.3) * 0.08;
                } else {
                    const panHarmonic1 = Math.sin(sweepTime * 0.85 + fix.phaseOffset) * 0.38;
                    const panHarmonic2 = Math.sin(sweepTime * 0.35 + idx * 0.40) * 0.15;
                    rotZ = panHarmonic1 + panHarmonic2 + (norm * 0.20);
                    rotX = 0.28 + Math.cos(sweepTime * 0.65 + fix.phaseOffset * 0.7) * 0.14;
                }

                fix.pivotGroup.rotation.z = rotZ;
                fix.pivotGroup.rotation.x = rotX;

                // Subtle base breathing & music reactivity (Moody Warm Golden-Yellow Beams)
                const breathCycle = Math.sin(elapsedTime * 0.22 + fix.phaseOffset) * 0.5 + 0.5;
                const baseBreath = 0.16 + Math.pow(breathCycle, 1.4) * 0.12;
                const musicBassGlow = (audio.smoothedBass || 0) * 0.20;
                const musicMidGlow = (audio.smoothedMid || 0) * 0.10;
                const bassBoost = fix.bassSurge * 0.50;
                const beamIntensity = baseBreath + musicBassGlow + musicMidGlow + bassBoost;

                const godrayYellow = new THREE.Color(0xffd866);
                const godrayCore = new THREE.Color(0xfff2b3);

                fix.beamMat.uniforms.uTime.value = elapsedTime;
                fix.beamMat.uniforms.uIntensity.value = beamIntensity;
                fix.beamMat.uniforms.uColor.value.copy(godrayYellow);
                fix.beamMat.uniforms.uCoreColor.value.copy(godrayCore);

                // Compute exact ray-plane intersection on floor
                const worldDir = new THREE.Vector3(0, -1, 0).applyEuler(fix.pivotGroup.rotation).normalize();
                const t = (floorY - fix.podGroup.position.y) / worldDir.y;
                const hitX = fix.podGroup.position.x + worldDir.x * t;
                const hitY = floorY + 0.01;
                const hitZ = fix.podGroup.position.z + worldDir.z * t;

                fix.floorImpactMesh.position.set(hitX, hitY, hitZ);

                const coneRadius = vhsTopRadius + t * ((vhsBottomRadius - vhsTopRadius) / vhsBeamLength);
                const cosTilt = Math.max(0.35, -worldDir.y);
                const spotWidth = coneRadius * (1.10 + fix.bassSurge * 0.35);
                const spotLength = (coneRadius * (1.10 + fix.bassSurge * 0.35)) / cosTilt;

                fix.floorImpactMesh.scale.set(spotWidth, spotLength, 1.0);
                const floorAngle = Math.atan2(worldDir.x, -worldDir.z);
                fix.floorImpactMesh.rotation.set(-Math.PI / 2, 0, floorAngle, 'ZXY');

                // Floor Impact Spot
                fix.floorImpactMat.uniforms.uColor.value.copy(godrayYellow);
                fix.floorImpactMat.uniforms.uCoreColor.value.copy(godrayCore);
                fix.floorImpactMat.uniforms.uIntensity.value = beamIntensity * 0.70;
                fix.floorImpactMat.uniforms.uSurge.value = fix.bassSurge + (audio.smoothedBass || 0) * 0.20;

                // Pass spotlight coordinates into smoke shader and text shader
                vhsSmokeMat.uniforms.uSpotPos.value[idx].copy(fix.podGroup.position);
                vhsSmokeMat.uniforms.uSpotDir.value[idx].copy(worldDir);
                vhsSmokeMat.uniforms.uSpotColor.value[idx].copy(godrayYellow);
                vhsSmokeMat.uniforms.uSpotIntensity.value[idx] = beamIntensity;

                vhsTextPlaneMat.uniforms.uSpotPos.value[idx].copy(fix.podGroup.position);
                vhsTextPlaneMat.uniforms.uSpotDir.value[idx].copy(worldDir);
                vhsTextPlaneMat.uniforms.uSpotColor.value[idx].copy(godrayYellow);
                vhsTextPlaneMat.uniforms.uSpotIntensity.value[idx] = beamIntensity;

                // Lens disc
                fix.lensDiscMesh.material.opacity = Math.min(0.80, 0.30 + fix.bassSurge * 0.25 + (audio.smoothedBass || 0) * 0.12);
            });
        }
        // ---------------------------------------------------------------------
        // FX 20: 🎃 Spinning Pumpkin Disco Ball & Volumetric Blue Godrays
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 20) {
            // 1. 🎵 MUSICAL TIMING & TRUE PERCUSSIVE DRUM ONSET DETECTION
            const bps = currentBPM / 60.0;
            const beatDuration = 60.0 / currentBPM;
            const beatTime = elapsedTime * bps;
            const curBeatIdx = Math.floor(beatTime);
            const beatFrac = beatTime % 1.0;

            // Multi-frequency audio signals
            const rawBass = audio.bass || 0;
            const smoothedBass = audio.smoothedBass || 0;
            const bassImpact = audio.bassImpact || 0;
            const rawMid = audio.mid || 0;
            const smoothedMid = audio.smoothedMid || 0;
            const rawTreble = audio.treble || 0;
            const smoothedTreble = audio.smoothedTreble || 0;
            const treblePop = audio.smoothedTreble || audio.treble || 0;

            // A. Rising-Edge Transient Detection across Frequency Bands
            // Only fires on the attack/onset frame when acoustic energy jumps suddenly!
            const deltaBass = Math.max(0.0, rawBass - pumpkinPrevBass);
            const deltaMid = Math.max(0.0, rawMid - pumpkinPrevMid);
            const deltaTreble = Math.max(0.0, rawTreble - pumpkinPrevTreble);

            const midLow = (rawBass + rawMid) * 0.5;
            const prevMidLow = (pumpkinPrevBass + pumpkinPrevMid) * 0.5;
            const deltaMidLow = Math.max(0.0, midLow - prevMidLow);

            // B. High-Resolution Spectral Flux across FFT Spectrum (broadband attacks)
            let flux = 0;
            let fluxBins = 0;
            if (dataArr && dataArr.length > 0) {
                const maxBin = Math.min(dataArr.length, 96);
                for (let i = 2; i < maxBin; i += 2) {
                    const diff = dataArr[i] - pumpkinPrevSpectrum[i];
                    if (diff > 10) flux += diff;
                    pumpkinPrevSpectrum[i] = dataArr[i];
                    fluxBins++;
                }
            }
            const normFlux = fluxBins > 0 ? (flux / (fluxBins * 255)) : 0;

            // -----------------------------------------------------------------
            // STROBE BEAT & DRUM TRIGGER: Light snaps ON on the beat, and snaps OFF between beats!
            // Alternating Effect: Group A (2 inner lights) on even beats, Group B (3 lights: far-left, center, far-right) on odd beats
            // -----------------------------------------------------------------
            // 1. Musical Beat / Kick Drum (fires once per beat on beat index transition)
            const isNewBeat = (curBeatIdx !== pumpkinWhiteLightLastBeat && beatFrac < 0.28);
            // 2. Heavy kick drop or audio hardware onset
            const isDeepKick = (audio.isOnset && (rawBass > 0.25 || bassImpact > 0.30)) || (rawBass > 0.55 && (audio.transientImpulse || 0) > 0.35);

            // 3. Optional offbeat percussion (snare crack / clap) between beats
            const timeSinceLastStrobeA = elapsedTime - pumpkinWhiteLightOnTimeA;
            const timeSinceLastStrobeB = elapsedTime - pumpkinWhiteLightOnTimeB;
            const timeSinceLastStrobe = Math.min(timeSinceLastStrobeA, timeSinceLastStrobeB);
            const isSnareCrack = (deltaMid > 0.06 && rawMid > smoothedMid * 1.15 + 0.05);
            // Crucial: Only allow an offbeat snare flash if previous strobe/fade has completed
            const isOffbeatDrum = timeSinceLastStrobeA > 0.20 && timeSinceLastStrobeB > 0.45 && (isDeepKick || isSnareCrack || audio.isOnset);

            if (isNewBeat) {
                pumpkinWhiteLightLastBeat = curBeatIdx;
                if (curBeatIdx % 2 === 0) {
                    pumpkinWhiteLightOnTimeA = elapsedTime;
                    pumpkinWhiteLightLastGroup = 'A';
                } else {
                    pumpkinWhiteLightOnTimeB = elapsedTime;
                    pumpkinWhiteLightLastGroup = 'B';
                }
            } else if (isOffbeatDrum) {
                pumpkinWhiteLightLastBeat = curBeatIdx;
                // Ping-pong alternate on offbeat drums
                if (pumpkinWhiteLightLastGroup === 'A') {
                    pumpkinWhiteLightOnTimeB = elapsedTime;
                    pumpkinWhiteLightLastGroup = 'B';
                } else {
                    pumpkinWhiteLightOnTimeA = elapsedTime;
                    pumpkinWhiteLightLastGroup = 'A';
                }
            }

            // Save current levels for next frame's delta comparison
            pumpkinPrevBass = rawBass;
            pumpkinPrevMid = rawMid;
            pumpkinPrevTreble = rawTreble;

            if (isDeepKick || (audio.isOnset && rawBass > 0.30)) {
                pumpkinKickThump = 1.0;
            }
            pumpkinKickThump = Math.max(0.0, pumpkinKickThump - delta * 5.2);

            // High-Contrast Crisp Strobe Envelopes: Snaps ON on the beat, snaps OFF to complete darkness
            // Group A (2 Inner Lights): Crisp ~130ms Strobe Snap on Beats 1 & 3
            const onDurationA = Math.min(0.16, Math.max(0.11, beatDuration * 0.30));
            const shutterCloseDurationA = 0.035;

            const timeSinceBeatA = elapsedTime - pumpkinWhiteLightOnTimeA;
            let whiteLightFactorA = 0.0;
            if (timeSinceBeatA >= 0.0 && timeSinceBeatA < onDurationA) {
                whiteLightFactorA = 1.0; // Crisp 100% ON
            } else if (timeSinceBeatA >= onDurationA && timeSinceBeatA < onDurationA + shutterCloseDurationA) {
                whiteLightFactorA = 1.0 - ((timeSinceBeatA - onDurationA) / shutterCloseDurationA);
            } else {
                whiteLightFactorA = 0.0; // Total 100% OFF between beats!
            }

            // Group B (3 Outer & Center Lights): Wide Shaded Bright-Foggy Bloom with Longer Fade In & Fade Out Cycle on Alternate Beats 2 & 4
            const timeSinceBeatB = elapsedTime - pumpkinWhiteLightOnTimeB;
            const fadeBIn = Math.max(0.14, beatDuration * 0.32);    // ~160ms smooth organic swell in
            const sustainB = Math.max(0.10, beatDuration * 0.22);   // ~110ms bright peak sustain
            const fadeBOut = Math.max(0.24, beatDuration * 0.58);   // ~280ms long foggy fade out
            const totalCycleB = fadeBIn + sustainB + fadeBOut;

            let whiteLightFactorB = 0.0;
            if (timeSinceBeatB >= 0.0 && timeSinceBeatB < fadeBIn) {
                // Smooth S-curve swell in (0.0 -> 1.0)
                const tIn = timeSinceBeatB / fadeBIn;
                whiteLightFactorB = 0.5 - 0.5 * Math.cos(tIn * Math.PI);
            } else if (timeSinceBeatB >= fadeBIn && timeSinceBeatB < fadeBIn + sustainB) {
                // Full luminous bright foggy peak
                whiteLightFactorB = 1.0;
            } else if (timeSinceBeatB >= fadeBIn + sustainB && timeSinceBeatB < totalCycleB) {
                // Smooth cosine tail fade out (1.0 -> 0.0)
                const tOut = (timeSinceBeatB - (fadeBIn + sustainB)) / fadeBOut;
                whiteLightFactorB = 0.5 + 0.5 * Math.cos(tOut * Math.PI);
            } else {
                whiteLightFactorB = 0.0; // Total 0.0 OFF between cycles
            }


            // 2. Motorized Disco Spin (Y-axis) with Natural Steady Hanging Sway
            // Smooth, constant rotation speed that stays calm, elegant, and steady
            const spinVelocity = 0.15 * (currentBPM / 126.0);
            pumpkinPivot.rotation.y += delta * spinVelocity;

            // Steady, organic gyroscopic tilt (~3 degrees) like an authentic hanging disco ball (no beat pulse or twitching)
            const rotY = pumpkinPivot.rotation.y;
            const tiltAmount = 0.052;
            pumpkinPivot.rotation.z = Math.sin(rotY) * tiltAmount;
            pumpkinPivot.rotation.x = Math.cos(rotY) * tiltAmount * 0.85;

            // 3. Steady Physical Pumpkin Geometry (NO pulsing with beat - solid authentic mirror disco ball)
            pumpkinMesh.scale.set(1.0, 1.0, 1.0);
            if (pumpkinStem) {
                pumpkinStem.scale.set(1.0, 1.0, 1.0);
            }
            pumpkinPivot.position.y = 0.0;

            // 🔗 100% Attached Hanging Chain Dynamic Physics:
            // Calculate exact world position of the stalk top eyelet ring
            const stalkTipLocal = new THREE.Vector3(0.04, 5.85, 0.03);
            const stalkTipWorld = stalkTipLocal.clone().applyEuler(pumpkinPivot.rotation).add(pumpkinPivot.position);
            const ceilingAnchor = new THREE.Vector3(0, 13.2, 0);

            // Interpolate all chain links between the stalk eyelet and the ceiling mount
            const totalLinks = pumpkinChainLinks.length;
            for (let l = 0; l < totalLinks; l++) {
                const link = pumpkinChainLinks[l];
                const t0 = l / (totalLinks - 1);
                // Position interpolated from stalk tip (l=0) to ceiling (l=15)
                const linkPos = new THREE.Vector3().lerpVectors(stalkTipWorld, ceilingAnchor, t0);
                
                // Natural catenary suspension sag
                const sagFactor = Math.sin(t0 * Math.PI) * 0.14;
                linkPos.x += Math.sin(rotY + t0 * 1.5) * sagFactor;
                linkPos.z += Math.cos(rotY + t0 * 1.5) * sagFactor;
                link.position.copy(linkPos);

                // Alternating link angles aligned to the hanging chain direction
                const baseRotY = (l % 2 === 0) ? (pumpkinPivot.rotation.y * 0.20) : (pumpkinPivot.rotation.y * 0.20 + Math.PI / 2);
                link.rotation.set(
                    pumpkinPivot.rotation.x * (1.0 - t0),
                    baseRotY,
                    pumpkinPivot.rotation.z * (1.0 - t0)
                );
            }

            // 4. Dynamic Rotating Head Sweeping Targets strictly on the FRONT convex surface of the pumpkin
            const tL = elapsedTime * 0.55;
            const txL = -1.0 + Math.sin(tL * 0.85) * 2.3; // -3.3 to +1.3
            const tyL = Math.cos(tL * 0.65) * 2.1;       // -2.1 to +2.1 (spans 0.88 height pumpkin)
            const rSqL = (txL * txL) + ((tyL / 0.88) * (tyL / 0.88));
            const tzL = Math.sqrt(Math.max(4.0, 27.0 - rSqL)); // Front surface of pumpkin
            const targetLeftPos = new THREE.Vector3(txL, tyL, tzL);
            pLeftTargetObj.position.copy(targetLeftPos);

            const tR = elapsedTime * 0.55 + Math.PI * 0.72;
            const txR = 1.0 + Math.cos(tR * 0.82) * 2.3;  // -1.3 to +3.3
            const tyR = Math.sin(tR * 0.68) * 2.1;       // -2.1 to +2.1
            const rSqR = (txR * txR) + ((tyR / 0.88) * (tyR / 0.88));
            const tzR = Math.sqrt(Math.max(4.0, 27.0 - rSqR)); // Front surface of pumpkin
            const targetRightPos = new THREE.Vector3(txR, tyR, tzR);
            pRightTargetObj.position.copy(targetRightPos);

            // Update Rotating Moving-Head Fixture Orientations (Motorized Pan / Tilt tracking)
            const leftFixtureHeadPos = pLeftFixturePos.clone().add(new THREE.Vector3(0, 0.9, 0));
            const leftFixtureDir = targetLeftPos.clone().sub(leftFixtureHeadPos);
            const leftBeamDist = leftFixtureDir.length();
            const leftFixtureDirNorm = leftFixtureDir.clone().normalize();

            pLeftFixture.headGroup.lookAt(targetLeftPos);
            pLeftFixture.yokeGroup.rotation.y = Math.atan2(leftFixtureDirNorm.x, leftFixtureDirNorm.z);

            const rightFixtureHeadPos = pRightFixturePos.clone().add(new THREE.Vector3(0, 0.9, 0));
            const rightFixtureDir = targetRightPos.clone().sub(rightFixtureHeadPos);
            const rightBeamDist = rightFixtureDir.length();
            const rightFixtureDirNorm = rightFixtureDir.clone().normalize();

            pRightFixture.headGroup.lookAt(targetRightPos);
            pRightFixture.yokeGroup.rotation.y = Math.atan2(rightFixtureDirNorm.x, rightFixtureDirNorm.z);

            // Align volumetric beams and inner cores along fixture-to-target vectors
            // Terminate EXACTLY at the front surface hit coordinate (ZERO penetration through or behind pumpkin)
            const upVec = new THREE.Vector3(0, -1, 0);
            pLeftBeamMesh.quaternion.setFromUnitVectors(upVec, leftFixtureDirNorm);
            pLeftCoreBeamMesh.quaternion.setFromUnitVectors(upVec, leftFixtureDirNorm);
            pLeftBeamMesh.scale.set(1.0, leftBeamDist / 22.0, 1.0);
            pLeftCoreBeamMesh.scale.set(1.0, leftBeamDist / 22.0, 1.0);

            pRightBeamMesh.quaternion.setFromUnitVectors(upVec, rightFixtureDirNorm);
            pRightCoreBeamMesh.quaternion.setFromUnitVectors(upVec, rightFixtureDirNorm);
            pRightBeamMesh.scale.set(1.0, rightBeamDist / 22.0, 1.0);
            pRightCoreBeamMesh.scale.set(1.0, rightBeamDist / 22.0, 1.0);

            // 4b. Five Compact Center-Bottom Spotlights Sweeping Across Underneath Front
            // Musical 4-beat cycle: complete sweep every 2 beats, in sync with the bar
            const sweepBaseBps = currentBPM / 60.0;
            pumpkinMiniSweepPhase += delta * sweepBaseBps * (Math.PI * 0.50);

            // Group A: Inner Left & Right Fixtures (-2.4 and +2.4) - Crossing 'X' sweep
            const sweep1 = pumpkinMiniSweepPhase;
            const txMini1 = Math.sin(sweep1) * 4.4;
            const tyMini1 = -2.70 + Math.cos(sweep1 * 0.8) * 0.60;
            const rSqMini1 = (txMini1 * txMini1) + ((tyMini1 / 0.88) * (tyMini1 / 0.88));
            const tzMini1 = Math.sqrt(Math.max(1.0, 27.04 - Math.min(26.0, rSqMini1)));
            const targetMini1Pos = new THREE.Vector3(txMini1, tyMini1, tzMini1);

            const sweep2 = -pumpkinMiniSweepPhase;
            const txMini2 = Math.sin(sweep2) * 4.4;
            const tyMini2 = -2.70 + Math.cos(sweep2 * 0.8 + Math.PI) * 0.60;
            const rSqMini2 = (txMini2 * txMini2) + ((tyMini2 / 0.88) * (tyMini2 / 0.88));
            const tzMini2 = Math.sqrt(Math.max(1.0, 27.04 - Math.min(26.0, rSqMini2)));
            const targetMini2Pos = new THREE.Vector3(txMini2, tyMini2, tzMini2);

            // Group B: Center, Far-Left, Far-Right Fixtures (-4.8, 0.0, +4.8) - 3-beam converging fan
            // Center fixture sweeps upward across the middle front
            const sweepC = pumpkinMiniSweepPhase * 1.25;
            const txCenter = Math.sin(sweepC) * 2.8;
            const tyCenter = -2.50 + Math.cos(sweepC * 0.7) * 0.65;
            const rSqCenter = (txCenter * txCenter) + ((tyCenter / 0.88) * (tyCenter / 0.88));
            const tzCenter = Math.sqrt(Math.max(1.0, 27.04 - Math.min(26.0, rSqCenter)));
            const targetCenterPos = new THREE.Vector3(txCenter, tyCenter, tzCenter);

            // Far Left fixture sweeps inward towards center
            const sweepFL = pumpkinMiniSweepPhase + Math.PI * 0.5;
            const txFarLeft = -1.2 + Math.sin(sweepFL) * 3.6;
            const tyFarLeft = -2.70 + Math.cos(sweepFL * 0.85) * 0.60;
            const rSqFarLeft = (txFarLeft * txFarLeft) + ((tyFarLeft / 0.88) * (tyFarLeft / 0.88));
            const tzFarLeft = Math.sqrt(Math.max(1.0, 27.04 - Math.min(26.0, rSqFarLeft)));
            const targetFarLeftPos = new THREE.Vector3(txFarLeft, tyFarLeft, tzFarLeft);

            // Far Right fixture sweeps inward towards center (symmetrically opposite)
            const sweepFR = -pumpkinMiniSweepPhase - Math.PI * 0.5;
            const txFarRight = 1.2 + Math.sin(sweepFR) * 3.6;
            const tyFarRight = -2.70 + Math.cos(sweepFR * 0.85 + Math.PI) * 0.60;
            const rSqFarRight = (txFarRight * txFarRight) + ((tyFarRight / 0.88) * (tyFarRight / 0.88));
            const tzFarRight = Math.sqrt(Math.max(1.0, 27.04 - Math.min(26.0, rSqFarRight)));
            const targetFarRightPos = new THREE.Vector3(txFarRight, tyFarRight, tzFarRight);

            // Gradual specular sun-glare geometry:
            // "a gradual intensity like the sun glaring through a window hitting your face temporarily as you move past it"
            // Front-facing sweet spot on convex pumpkin facing the viewer/camera (centered around x=0, y=0, z=5.2)
            const leftDistFromFrontCenter = Math.sqrt(txL * txL + (tyL * 1.1) * (tyL * 1.1));
            // Raised-cosine window (smooth entry, gentle crest, smooth exit with zero pop)
            const leftSunGlare = leftDistFromFrontCenter < 2.6
                ? (0.5 + 0.5 * Math.cos((leftDistFromFrontCenter / 2.6) * Math.PI))
                : 0.0;

            const rightDistFromFrontCenter = Math.sqrt(txR * txR + (tyR * 1.1) * (tyR * 1.1));
            const rightSunGlare = rightDistFromFrontCenter < 2.6
                ? (0.5 + 0.5 * Math.cos((rightDistFromFrontCenter / 2.6) * Math.PI))
                : 0.0;

            // Dual-Beam Convergence on Pumpkin Surface (When both lights meet on front)
            const meetDist = targetLeftPos.distanceTo(targetRightPos);
            const meetProximity = meetDist < 3.2
                ? (0.5 + 0.5 * Math.cos((meetDist / 3.2) * Math.PI))
                : 0.0;
            // Gentle, smooth convergence glow (soft, non-harsh)
            const convergencePower = meetProximity * Math.min(1.0, (leftSunGlare + rightSunGlare) * 0.70);

            // 5. Dynamic Color Transition: Fade between vibrant shades of White and deep Halloween colors
            const colorSpeed = 0.08; // Smooth, rich color progression (~80s full cycle)
            const leftSample = sampleHalloweenPalette(elapsedTime * colorSpeed);
            const rightSample = sampleHalloweenPalette(elapsedTime * colorSpeed + 0.85);

            const leftColor = leftSample.color;
            const leftCore = leftSample.core;
            const rightColor = rightSample.color;
            const rightCore = rightSample.core;

            // Multi-frequency lighting surge (controlled, subtle)
            const audioSurge = smoothedBass * 0.30 + pumpkinKickThump * 0.50;

            const pulseMultiL = Math.min(1.3, 0.20 + pumpkinKickThump * 0.45 + audioSurge * 0.25);
            const pulseMultiR = Math.min(1.3, 0.20 + pumpkinKickThump * 0.45 + audioSurge * 0.25);
            const avgPulse = (pulseMultiL + pulseMultiR) * 0.5;

            // Beams power - atmospheric concert plumes (moderate, clear, gentle swells, no blowout)
            const beamLeftPower = Math.max(0.25, (0.45 + leftSunGlare * 0.40 + audioSurge * 0.25 + convergencePower * 0.35) * (0.75 + pulseMultiL * 0.25));
            const beamRightPower = Math.max(0.25, (0.45 + rightSunGlare * 0.40 + audioSurge * 0.25 + convergencePower * 0.35) * (0.75 + pulseMultiR * 0.25));

            // Update Fixture Lens Optics & Status LED Colors: True saturated colors matching the beam
            pLeftFixture.lensMat.color.copy(leftColor);
            pLeftFixture.lensCoronaMat.color.copy(leftColor);
            pLeftFixture.lensCoreMat.color.copy(leftCore);
            pLeftFixture.bezelLedMat.color.copy(leftColor);
            pLeftFixture.ledRingMat.color.copy(leftColor);

            pRightFixture.lensMat.color.copy(rightColor);
            pRightFixture.lensCoronaMat.color.copy(rightColor);
            pRightFixture.lensCoreMat.color.copy(rightCore);
            pRightFixture.bezelLedMat.color.copy(rightColor);
            pRightFixture.ledRingMat.color.copy(rightColor);

            // The Pumpkin body reveals its TRUE dark spooky Halloween colors in unlit spots, and blazes at beam contact spots!
            const pumpkinThemeCol = new THREE.Color().lerpColors(leftColor, rightColor, 0.5);
            const pumpkinEmissiveCol = new THREE.Color().lerpColors(leftSample.emissive, rightSample.emissive, 0.5);

            // Update Spatially-Localized Lighting & Dark Mirror Glass Shader Uniforms
            pumpkinUniforms.uSpot1Pos.value.copy(targetLeftPos);
            pumpkinUniforms.uSpot2Pos.value.copy(targetRightPos);
            pumpkinUniforms.uSpot1Color.value.copy(leftColor);
            pumpkinUniforms.uSpot2Color.value.copy(rightColor);
            pumpkinUniforms.uSpot1Intensity.value = 0.85 + pulseMultiL * 0.35;
            pumpkinUniforms.uSpot2Intensity.value = 0.85 + pulseMultiR * 0.35;
            if (whiteLightFactorA > 0.001) {
                pumpkinUniforms.uWhiteSpot1Pos.value.copy(targetMini1Pos);
                pumpkinUniforms.uWhiteSpot2Pos.value.copy(targetMini2Pos);
                pumpkinUniforms.uWhiteSpotIntensity.value = whiteLightFactorA * 0.50;
            } else if (whiteLightFactorB > 0.001) {
                pumpkinUniforms.uWhiteSpot1Pos.value.copy(targetFarLeftPos);
                pumpkinUniforms.uWhiteSpot2Pos.value.copy(targetFarRightPos);
                pumpkinUniforms.uWhiteSpotIntensity.value = whiteLightFactorB * 0.32;
            } else {
                pumpkinUniforms.uWhiteSpotIntensity.value = 0.0;
            }
            pumpkinUniforms.uDarkBaseColor.value.copy(leftSample.emissive.clone().lerp(rightSample.emissive, 0.5));
            pumpkinUniforms.uEmissiveThemeColor.value.copy(pumpkinEmissiveCol);
            pumpkinUniforms.uFlash.value = Math.max(leftSunGlare, rightSunGlare) * 0.60 + convergencePower * 0.40;
            pumpkinUniforms.uTime.value = elapsedTime;
            pumpkinUniforms.uTreble.value = treblePop;
            pumpkinUniforms.uBassPunch.value = 0.0; // Pumpkin does not pulse with beat

            if (pumpkinStem) {
                pumpkinStem.traverse((child) => {
                    if (child.isMesh && child.material && child.material.color) {
                        child.material.color.copy(pumpkinThemeCol).multiplyScalar(0.70);
                    }
                });
            }

            // Spotlights dip down between pulses to create dramatic stage lighting shadows
            pBottomLeftSpot.color.copy(leftColor);
            pBottomLeftSpot.intensity = Math.max(0.30, (0.65 + leftSunGlare * 1.6 + audioSurge * 0.8 + convergencePower * 1.1 + pumpkinKickThump * 1.2) * pulseMultiL);

            pBottomRightSpot.color.copy(rightColor);
            pBottomRightSpot.intensity = Math.max(0.30, (0.65 + rightSunGlare * 1.6 + audioSurge * 0.8 + convergencePower * 1.1 + pumpkinKickThump * 1.2) * pulseMultiR);

            // Volumetric shaded incoming god rays uniforms with high-contrast beat pulsing and uHit modulation
            pLeftBeamMat.uniforms.uColor.value.copy(leftColor);
            pLeftBeamMat.uniforms.uCoreColor.value.copy(leftCore);
            pLeftBeamMat.uniforms.uIntensity.value = beamLeftPower;
            pLeftBeamMat.uniforms.uTime.value = elapsedTime;
            pLeftBeamMat.uniforms.uTreble.value = treblePop;
            pLeftBeamMat.uniforms.uHit.value = Math.max(0.20, leftSunGlare);

            pLeftCoreBeamMat.uniforms.uColor.value.copy(leftColor);
            pLeftCoreBeamMat.uniforms.uCoreColor.value.copy(leftCore);
            pLeftCoreBeamMat.uniforms.uIntensity.value = beamLeftPower * 1.25;
            pLeftCoreBeamMat.uniforms.uTime.value = elapsedTime;
            pLeftCoreBeamMat.uniforms.uTreble.value = treblePop;
            pLeftCoreBeamMat.uniforms.uHit.value = Math.max(0.20, leftSunGlare);

            pRightBeamMat.uniforms.uColor.value.copy(rightColor);
            pRightBeamMat.uniforms.uCoreColor.value.copy(rightCore);
            pRightBeamMat.uniforms.uIntensity.value = beamRightPower;
            pRightBeamMat.uniforms.uTime.value = elapsedTime;
            pRightBeamMat.uniforms.uTreble.value = treblePop;
            pRightBeamMat.uniforms.uHit.value = Math.max(0.20, rightSunGlare);

            pRightCoreBeamMat.uniforms.uColor.value.copy(rightColor);
            pRightCoreBeamMat.uniforms.uCoreColor.value.copy(rightCore);
            pRightCoreBeamMat.uniforms.uIntensity.value = beamRightPower * 1.25;
            pRightCoreBeamMat.uniforms.uTime.value = elapsedTime;
            pRightCoreBeamMat.uniforms.uTreble.value = treblePop;
            pRightCoreBeamMat.uniforms.uHit.value = Math.max(0.20, rightSunGlare);

            // Convergence Reflection Flare (Softened, refined bloom when lights meet on front)
            if (convergencePower > 0.02) {
                const midHitPos = targetLeftPos.clone().lerp(targetRightPos, 0.5);
                midHitPos.z += 0.12; // Float right on front mirror facets

                const meetCore = new THREE.Color().lerpColors(leftCore, rightCore, 0.5);
                const meetColor = new THREE.Color().lerpColors(leftColor, rightColor, 0.5).lerp(meetCore, 0.35);

                pMeetFlare.position.copy(midHitPos);
                pMeetFlare.material.color.copy(meetColor);
                pMeetFlare.material.opacity = Math.min(0.35, convergencePower * 0.50);
                const meetScale = (1.0 + convergencePower * 1.3);
                pMeetFlare.scale.set(meetScale, meetScale, 1.0);
                pMeetFlare.visible = true;

                pMeetAnamorphicFlare.position.copy(midHitPos);
                pMeetAnamorphicFlare.material.color.copy(meetColor);
                pMeetAnamorphicFlare.material.opacity = Math.min(0.25, Math.pow(convergencePower, 1.3) * 0.38);
                pMeetAnamorphicFlare.scale.set(meetScale * 1.6, meetScale * 0.35, 1.0);
                pMeetAnamorphicFlare.visible = true;
            } else {
                pMeetFlare.visible = false;
                pMeetAnamorphicFlare.visible = false;
            }

            // Front surface delicate sparkle glints on mirror facets (smoothly zeroed out when off pumpkin)
            pLeftHitFlare.position.copy(targetLeftPos);
            pLeftHitFlare.material.color.copy(leftColor);
            pLeftHitFlare.material.opacity = Math.min(0.50, (0.15 + leftSunGlare * 0.35 + convergencePower * 0.15) * (0.6 + pulseMultiL * 0.4));
            const flareScaleL = (0.9 + leftSunGlare * 0.6 + convergencePower * 0.4);
            pLeftHitFlare.scale.set(flareScaleL, flareScaleL, 1.0);

            pRightHitFlare.position.copy(targetRightPos);
            pRightHitFlare.material.color.copy(rightColor);
            pRightHitFlare.material.opacity = Math.min(0.50, (0.15 + rightSunGlare * 0.35 + convergencePower * 0.15) * (0.6 + pulseMultiR * 0.4));
            const flareScaleR = (0.9 + rightSunGlare * 0.6 + convergencePower * 0.4);
            pRightHitFlare.scale.set(flareScaleR, flareScaleR, 1.0);

            // -----------------------------------------------------------------
            // Five White Bottom Spotlights: Alternating Beat Concert Strobe
            // Group A (2 inner lights) on even beats; Group B (3 lights: far-left, center, far-right) on odd beats
            // -----------------------------------------------------------------
            function updateMiniFixture(item, targetPos, whiteFactor) {
                item.targetObj.position.copy(targetPos);

                const headPos = item.fixturePos.clone().add(new THREE.Vector3(0, 0.69, 0));
                const dir = targetPos.clone().sub(headPos);
                const dist = dir.length();
                const dirNorm = dir.clone().normalize();

                item.fixture.headGroup.lookAt(targetPos);
                item.fixture.yokeGroup.rotation.y = Math.atan2(dirNorm.x, dirNorm.z);

                item.beamMesh.quaternion.setFromUnitVectors(upVec, dirNorm);
                item.coreBeamMesh.quaternion.setFromUnitVectors(upVec, dirNorm);
                item.beamMesh.scale.set(1.0, dist / 22.0, 1.0);
                item.coreBeamMesh.scale.set(1.0, dist / 22.0, 1.0);

                if (whiteFactor > 0.001) {
                    const isFoggy = item.isWideFoggy;
                    const beamPower = (isFoggy ? 0.75 : 0.90) * whiteFactor;
                    const spotPower = (isFoggy ? 1.10 : 1.40) * whiteFactor;

                    item.spot.intensity = spotPower;

                    item.beamMesh.visible = true;
                    item.coreBeamMesh.visible = true;

                    item.beamMat.uniforms.uIntensity.value = beamPower;
                    item.beamMat.uniforms.uVuLevel.value = 1.0;
                    item.beamMat.uniforms.uPulse.value = whiteFactor;
                    item.beamMat.uniforms.uTime.value = elapsedTime;
                    item.beamMat.uniforms.uHit.value = 1.0;

                    item.coreBeamMat.uniforms.uIntensity.value = beamPower * (isFoggy ? 1.05 : 1.15);
                    item.coreBeamMat.uniforms.uVuLevel.value = 1.0;
                    item.coreBeamMat.uniforms.uPulse.value = whiteFactor;
                    item.coreBeamMat.uniforms.uTime.value = elapsedTime;
                    item.coreBeamMat.uniforms.uHit.value = 1.0;

                    const lensBright = (isFoggy ? 0.58 : 0.70) * whiteFactor;
                    item.fixture.lensMat.color.setRGB(lensBright, lensBright, lensBright);
                    item.fixture.lensCoronaMat.color.setRGB(lensBright * 0.75, lensBright * 0.75, lensBright * 0.75);
                    item.fixture.lensCoreMat.color.setRGB(lensBright, lensBright, lensBright);

                    item.hitFlare.visible = true;
                    item.hitFlare.position.copy(targetPos);
                    const flareOpacity = (isFoggy ? 0.22 : 0.30) * whiteFactor;
                    item.hitFlare.material.opacity = flareOpacity;
                    const flareScale = isFoggy ? (1.1 + whiteFactor * 0.4) : (0.8 + whiteFactor * 0.30);
                    item.hitFlare.scale.set(flareScale, flareScale, 1.0);
                } else {
                    item.spot.intensity = 0.0;
                    item.beamMesh.visible = false;
                    item.coreBeamMesh.visible = false;

                    item.beamMat.uniforms.uIntensity.value = 0.0;
                    item.beamMat.uniforms.uVuLevel.value = 0.0;
                    item.coreBeamMat.uniforms.uIntensity.value = 0.0;

                    item.fixture.lensMat.color.setRGB(0.04, 0.04, 0.04);
                    item.fixture.lensCoronaMat.color.setRGB(0.0, 0.0, 0.0);
                    item.fixture.lensCoreMat.color.setRGB(0.0, 0.0, 0.0);

                    item.hitFlare.visible = false;
                    item.hitFlare.material.opacity = 0.0;
                }
            }

            // Group A (2 Inner Lights: -2.4 and +2.4)
            updateMiniFixture(pMiniLeft, targetMini1Pos, whiteLightFactorA);
            updateMiniFixture(pMiniRight, targetMini2Pos, whiteLightFactorA);

            // Group B (3 Outer & Center Lights: -4.8, 0.0, +4.8)
            updateMiniFixture(pMiniFarLeft, targetFarLeftPos, whiteLightFactorB);
            updateMiniFixture(pMiniCenter, targetCenterPos, whiteLightFactorB);
            updateMiniFixture(pMiniFarRight, targetFarRightPos, whiteLightFactorB);

            // Front Key Light & Pumpkin Flame (internal flame reacts with deep kicks and convergence)
            pKeyLight.color.copy(pumpkinThemeCol);
            pKeyLight.intensity = (0.80 + (leftSunGlare + rightSunGlare) * 0.35 + convergencePower * 0.50 + pumpkinKickThump * 0.60);

            pumpkinFlameLight.color.copy(pumpkinThemeCol);
            pumpkinFlameLight.intensity = (1.10 + (leftSunGlare + rightSunGlare) * 0.40 + convergencePower * 0.50 + pumpkinKickThump * 1.10);

            // 6. Halo corona around pumpkin: Softened, elegant luminous dual-color flare
            // Matches the relevant light color on each side, with gradual sun-glare intensity
            const haloActive = (leftSunGlare > 0.005 || rightSunGlare > 0.005 || convergencePower > 0.005);
            if (haloActive) {
                pumpkinHaloMesh.visible = true;
                pumpkinHaloMat.uniforms.uHaloLeftColor.value.copy(leftColor);
                pumpkinHaloMat.uniforms.uHaloRightColor.value.copy(rightColor);
                pumpkinHaloMat.uniforms.uLeftIntensity.value = leftSunGlare * 0.75;
                pumpkinHaloMat.uniforms.uRightIntensity.value = rightSunGlare * 0.75;
                pumpkinHaloMat.uniforms.uConvergenceGlow.value = convergencePower * 0.40;
                pumpkinHaloMat.uniforms.uTime.value = elapsedTime;
            } else {
                pumpkinHaloMesh.visible = false;
                pumpkinHaloMat.uniforms.uLeftIntensity.value = 0.0;
                pumpkinHaloMat.uniforms.uRightIntensity.value = 0.0;
                pumpkinHaloMat.uniforms.uConvergenceGlow.value = 0.0;
            }
            pumpkinHaloMesh.position.y = pumpkinPivot.position.y;
            pumpkinHaloMesh.rotation.z = pumpkinPivot.rotation.z;

            // 7. Rotating Floor Fire Pit Hearth Embers (Rotating on floor, subtly glowing like coals in a fire pit)
            pumpkinFloorSpots.rotation.y = pumpkinPivot.rotation.y * 1.25;
            pFloorMat.uniforms.uTime.value = elapsedTime;
            pFloorMat.uniforms.uBass.value = smoothedBass;
            pFloorMat.uniforms.uKick.value = pumpkinKickThump;

            // 8. Authentic Bonfire Fire Embers (Subtly drifting upwards on warm convective currents)
            const emberPosAttr = pEmberGeo.attributes.position;
            const emberArray = emberPosAttr.array;
            pEmberMat.uniforms.uTime.value = elapsedTime;
            pEmberMat.uniforms.uBass.value = smoothedBass + pumpkinKickThump * 0.40;

            // Gentle convective loft speed (subtle floating, never rushing)
            const baseRiseSpeed = delta * 1.35;
            const bassDraftLift = (smoothedBass * 0.25 + pumpkinKickThump * 0.35) * delta;

            for (let e = 0; e < pEmberCount; e++) {
                // Gentle upward convective drift
                emberArray[e * 3 + 1] += (pEmberVel[e * 3 + 1] * baseRiseSpeed) + bassDraftLift;

                // Subtle meandering draft curl (convective swirl across warm air drafts)
                const driftPhase = elapsedTime * pEmberDriftSpeed[e] + pEmberDriftPhase[e];
                emberArray[e * 3] += Math.sin(driftPhase) * delta * pEmberDriftAmp[e];
                emberArray[e * 3 + 2] += Math.cos(driftPhase * 0.85) * delta * (pEmberDriftAmp[e] * 0.8);

                // Respawn at bottom when ember cools and reaches the top
                if (emberArray[e * 3 + 1] > 13.5) {
                    emberArray[e * 3] = (Math.random() - 0.5) * 30.0;
                    emberArray[e * 3 + 1] = -9.0 + (Math.random() - 0.5) * 1.5;
                    emberArray[e * 3 + 2] = (Math.random() - 0.5) * 24.0;
                }
            }
            emberPosAttr.needsUpdate = true;
        }
        } catch (err) {
            console.error('[VFX Frame Animation Error]', err);
        }
        if (audio.isOnset && (currentFXIndex < 16 || currentFXIndex > 20)) {
            camRecoilZ = -0.32 * audio.bassImpact;
            camRecoilY = (Math.random() - 0.5) * 0.12 * audio.bassImpact;
            camRecoilX = (Math.random() - 0.5) * 0.12 * audio.bassImpact;
        } else if (currentFXIndex >= 16 && currentFXIndex <= 20) {
            camRecoilX = 0;
            camRecoilY = 0;
            camRecoilZ = 0;
        }
        camRecoilX *= 0.88;
        camRecoilY *= 0.88;
        camRecoilZ *= 0.88;

        camera.position.x = THREE.MathUtils.lerp(camera.position.x, camRecoilX, 0.25);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, camRecoilY, 0.25);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 16.0 + camRecoilZ, 0.2);

        // 4. Post-Processing: Crisp Neon Bloom & Transient Glitch (Refined Nightclub Contrast)
        const fxBloomBoost = (currentFXIndex === 4 || (currentFXIndex >= 16 && currentFXIndex <= 20)) ? (bassPop * 0.12 + transient * 0.08) : (bassPop * 0.18);
        const targetBloom = Math.min(0.70, (0.20 + fxBloomBoost + (manualFlash * 0.45)) * bloomMultiplier);
        bloomPass.strength = bloomMultiplier <= 0.05 ? 0.0 : THREE.MathUtils.lerp(bloomPass.strength, targetBloom, 0.15);

        const targetAberration = (currentFXIndex >= 16 && currentFXIndex <= 20) ? 0.0 : ((transient > 0.7 ? 0.12 : 0.0) + (manualFlash * 0.4));
        nightclubPass.uniforms.uAberration.value = THREE.MathUtils.lerp(nightclubPass.uniforms.uAberration.value, targetAberration, 0.18);

        const targetGlitch = (currentFXIndex >= 16 && currentFXIndex <= 20) ? 0.0 : ((transient > 0.85) ? (transient * 0.20) : 0.0);
        nightclubPass.uniforms.uGlitch.value = THREE.MathUtils.lerp(nightclubPass.uniforms.uGlitch.value, targetGlitch, 0.20);

        nightclubPass.uniforms.uFlash.value = manualFlash;
        if (manualFlash > 0.01) manualFlash *= 0.82;
        else manualFlash = 0.0;

        if (beatTriggerPulse > 0.01) beatTriggerPulse *= 0.8;
        else beatTriggerPulse = 0.0;

        nightclubPass.uniforms.uTime.value = elapsedTime;

        lightCyan.position.x = Math.sin(elapsedTime * 1.5) * 9;
        lightCyan.position.y = Math.cos(elapsedTime * 1.2) * 7;
        lightCyan.intensity = Math.min(1.5, (0.7 + bassPop * 0.5) * (bloomMultiplier + 0.5));

        lightMagenta.position.x = -Math.sin(elapsedTime * 1.3) * 9;
        lightMagenta.position.y = -Math.cos(elapsedTime * 1.1) * 7;
        lightMagenta.intensity = Math.min(1.5, (0.7 + (audio.smoothedMid || 0) * 0.5) * (bloomMultiplier + 0.5));

        composer.render();
    }

    return {
        animate,
        onResize,
        triggerResize: onResize,
        switchFX,
        triggerBeatPulse,
        triggerManualFlash,
        setBPM,
        setBloomMultiplier,
        loadLogoMedia,
        playLogoVideo,
        setLogoVisible,
        setLogoOpacity,
        setLogoScale,
        setLogoMode,
        setLogoPosition,
        setLogoBassPulse,
        setLogoContrast,
        setLogoBrightness,
        setLogoBlendMode,
        setLogoShieldVisible,
        setLogoSpinMode,
        setLogoSpinEnabled,
        setLogoSpinSpeed,
        setLogoOffsetY,
        setLogoOffsetX,
        setLogoEdgeMargin,
        // Station Logo Layer Exports
        loadStationLogoMedia,
        playStationLogoVideo,
        setStationLogoVisible,
        setStationLogoScale,
        setStationLogoMode,
        setStationLogoPosition,
        setStationLogoOffsetY,
        setStationLogoOffsetX,
        setStationLogoEdgeMargin,
        setStationLogoBassPulse,
        setStationLogoContrast,
        setStationLogoBrightness,
        setStationLogoBlendMode,
        setStationLogoShieldVisible,
        setStationLogoSpinMode,
        setStationLogoSpinSpeed,
        // Layer Transition & Pop Setters
        setLogoTransitionEffect,
        setStationLogoTransitionEffect,
        setFlyerTransitionEffect,
        popLogo,
        popStationLogo,
        popFlyer,
        // Event Flyer Layer Exports
        loadFlyerMedia,
        playFlyerVideo,
        setFlyerVisible,
        setFlyerScale,
        setFlyerMode,
        setFlyerPosition,
        setFlyerOffsetY,
        setFlyerOffsetX,
        setFlyerEdgeMargin,
        setFlyerBassPulse,
        setFlyerContrast,
        setFlyerBrightness,
        setFlyerBlendMode,
        setFlyerShieldVisible,
        setFlyerSpinMode,
        setFlyerSpinSpeed,
        setDeckData: (data) => {
            if (!data) return;
            const targetDeck = (data.deck === 2) ? 2 : 1;
            if (targetDeck === 1) {
                if (data.artist) deck1Data.artist = data.artist;
                if (data.title) deck1Data.title = data.title;
                if (data.bpm) deck1Data.bpm = data.bpm;
                if (data.key) deck1Data.key = data.key;
                if (data.progress !== undefined) deck1Progress = data.progress;
            } else {
                if (data.artist) deck2Data.artist = data.artist;
                if (data.title) deck2Data.title = data.title;
                if (data.bpm) deck2Data.bpm = data.bpm;
                if (data.key) deck2Data.key = data.key;
                if (data.progress !== undefined) deck2Progress = data.progress;
            }
        },
        getCurrentFX: () => currentFXIndex,
        getFXCount: () => fxRoots.length,
        updateLogoPlacements: () => {
            applyLogoPlacement();
            applyStationLogoPlacement();
            applyFlyerPlacement();
        },
        getCurrentScenePalette: () => {
            const SCENE_PALETTES = {
                0: ['#00ffff', '#ff007f', '#00ff66', '#ffaa00', '#9900ff', '#ff0033'], // Neon Cyber Matrix
                1: ['#ff007f', '#00ffff', '#ffaa00', '#ff0033', '#9900ff', '#00ff66'], // Audio Waveform EQ
                2: ['#00ffcc', '#0077ff', '#ff00aa', '#00ff66', '#ffcc00', '#ff0055'], // Circular Spectrum Ring
                3: ['#ffaa00', '#ff3300', '#00e5ff', '#ff007f', '#00ff66', '#9900ff'], // 3D Pioneer Decks
                4: ['#ffd700', '#ff00ff', '#00ffff', '#ff0055', '#00ffaa', '#9900ff'], // Spinning Disco Ball
                5: ['#ff007f', '#00ffff', '#ffee00', '#00ff66', '#ff00aa', '#0088ff'], // 70s Disco Floor
                6: ['#00e5ff', '#ff0033', '#00ff66', '#ff00aa', '#ffee00', '#9900ff'], // Dual-Bank Lasers
                7: ['#ff0055', '#00e5ff', '#ffaa00', '#00ff66', '#9900ff', '#ff3300'], // Saber Multi-Beams
                8: ['#ff007f', '#00ffff', '#00ff66', '#ffaa00', '#9900ff', '#ff0033'], // Strobe Rings
                9: ['#ff0088', '#9900ff', '#00e5ff', '#ffaa00', '#00ff66', '#ff3300'], // Silhouette Dancers
                10: ['#ff007f', '#00ffcc', '#8000ff', '#ff3300', '#ffee00', '#00ffff'], // Liquid Mercury
                11: ['#ff4500', '#ff007f', '#00ffff', '#ffbb00', '#00ff66', '#9900ff'], // Cyber Horizon Grid
                12: ['#00ff66', '#00e5ff', '#ff00aa', '#ffff00', '#ff0055', '#00ffff'], // Neon Warp Tunnel
                13: ['#ffff00', '#00ffff', '#ff0055', '#00ffaa', '#ffaa00', '#9900ff'], // Holographic Decks
                14: ['#00ffff', '#ff00aa', '#ffaa00', '#00ff88', '#9900ff', '#ff0033'], // Neon Wireframe Club
                15: ['#9900ff', '#0044ff', '#ff00aa', '#00ffff', '#ff0055', '#ffff00'], // Deep Space Galaxy
                16: ['#00e1ff', '#ff0055', '#00ff66', '#ffcc00', '#9900ff', '#ff0033'], // Laser Vortex
                17: ['#00ffcc', '#ffaa00', '#ff007f', '#0088ff', '#00ff66', '#ff0033'], // Time Clock
                18: ['#00e5ff', '#ff007f', '#ffaa00', '#00ff66', '#9900ff', '#ff0033'], // Sweeping Godrays
                19: ['#00f0ff', '#ff00aa', '#00ff88', '#ffaa00', '#9900ff', '#00e5ff'], // White Godrays & Fog
                20: ['#00e5ff', '#ff007f', '#ffaa00', '#00ff66', '#9900ff', '#ff0033'], // Disco Floor & Godrays
                21: ['#00ffff', '#ff007f', '#ffaa00', '#00ff66', '#9900ff', '#ff0033'], // VHS Glitch Words
                22: ['#0044ff', '#ff4400', '#00e5ff', '#00ff22', '#9400d3', '#ff007f'], // Pumpkin Disco Ball
            };
            return SCENE_PALETTES[currentFXIndex] || ['#00ffff', '#ff007f', '#ffaa00', '#00ff66', '#9900ff', '#ff0033'];
        },
        getCurrentSceneColor: () => {
            const time = clock.getElapsedTime();
            const bps = currentBPM / 60.0;
            const beatStep = Math.floor(time * bps);

            // FX 20: 🎃 Pumpkin Disco Ball -> Sapphire Blue, Flame Orange & Electric Cyan
            if (currentFXIndex === 20) {
                const pumpkinPalette = ['#0044ff', '#ff4400', '#00e5ff', '#00ff22', '#9400d3', '#ff007f'];
                return pumpkinPalette[beatStep % pumpkinPalette.length];
            }
            // FX 16: 🔦 Sweeping Godrays (U) -> Tracks the active flared moving-head concert fixture!
            if (currentFXIndex === 16 && typeof godrayChaseIndex === 'number' && godrayPalette) {
                const hexNum = godrayPalette[godrayChaseIndex % godrayPalette.length];
                return '#' + hexNum.toString(16).padStart(6, '0');
            }
            // FX 18: 🪩 Disco Floor & Coloured Godrays (O) -> Tracks active disco moving head
            if (currentFXIndex === 18 && typeof discoGodrayChaseIndex === 'number' && godrayPalette) {
                const hexNum = godrayPalette[discoGodrayChaseIndex % godrayPalette.length];
                return '#' + hexNum.toString(16).padStart(6, '0');
            }
            // FX 19: 📼 VHS Glitch Words & Godrays (P) -> Crisp white with electric neon glitch pulses
            if (currentFXIndex === 19) {
                const vhsPalette = ['#ffffff', '#00ffff', '#ffffff', '#ff007f'];
                return vhsPalette[beatStep % vhsPalette.length];
            }
            // FX 17: ☁️ Pure White Godrays & Fog (I)
            if (currentFXIndex === 17) {
                const whitePalette = ['#ffffff', '#e0f7ff', '#ffffff', '#fff0f5'];
                return whitePalette[beatStep % whitePalette.length];
            }

            // Dynamic Rhythmic Palettes for all scenes (rotates harmonically with tempo & beats)
            const defaultPalettes = {
                0: ['#00ffff', '#ff007f', '#00ff66', '#ffaa00', '#9900ff', '#ff0033'],
                1: ['#ff007f', '#00ffff', '#ffaa00', '#ff0033', '#9900ff', '#00ff66'],
                2: ['#00ffcc', '#0077ff', '#ff00aa', '#00ff66', '#ffcc00', '#ff0055'],
                3: ['#ffaa00', '#ff3300', '#00e5ff', '#ff007f', '#00ff66', '#9900ff'],
                4: ['#ffd700', '#ff00ff', '#00ffff', '#ff0055', '#00ffaa', '#9900ff'],
                5: ['#ff007f', '#00ffff', '#ffee00', '#00ff66', '#ff00aa', '#0088ff']
            };
            const pal = defaultPalettes[currentFXIndex] || ['#00ffff', '#ff007f', '#ffaa00', '#00ff66', '#9900ff', '#ffffff'];
            const idx = Math.floor((time * bps) % pal.length);
            return pal[idx] || '#00ffff';
        }
    };
}
