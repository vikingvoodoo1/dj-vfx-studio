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

            color += vec3(uFlash * 0.85, uFlash * 0.8, uFlash * 0.95);

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

// DJ Deck Scrolling Waveforms Shader
const DJDeckWaveformShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uMid: { value: 0.0 },
        uTreble: { value: 0.0 },
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
        uniform float uMid;
        uniform float uTreble;
        uniform float uBPM;

        float hash1(float n) { return fract(sin(n) * 43758.5453123); }

        void main() {
            vec2 uv = vUv;
            float bps = uBPM / 60.0;
            float scrollX = uv.x + uTime * bps * 0.18;

            // Center playhead cursor line (x = 0.5)
            float playheadDist = abs(uv.x - 0.5);
            float playhead = 1.0 - smoothstep(0.0, 0.004, playheadDist);

            // Beat grid vertical markers
            float beatLine = 1.0 - smoothstep(0.0, 0.003, abs(fract(scrollX * 16.0) - 0.5));
            float barLine = 1.0 - smoothstep(0.0, 0.006, abs(fract(scrollX * 4.0) - 0.5));

            // Split into Deck 1 (Top, y in [0.52, 0.95]) and Deck 2 (Bottom, y in [0.05, 0.48])
            bool isDeck1 = uv.y > 0.5;
            float deckUvY = isDeck1 ? (uv.y - 0.74) * 4.5 : (uv.y - 0.26) * 4.5;
            float absY = abs(deckUvY);

            // Multi-frequency RGB audio waveform amplitudes
            float sampleIdx = floor(scrollX * 90.0);
            float rndVal = hash1(sampleIdx + (isDeck1 ? 12.0 : 88.0));
            
            float bassAmp = (0.35 + rndVal * 0.65) * (1.0 + (isDeck1 ? uBass : uMid) * 0.8);
            float midAmp = (0.2 + hash1(sampleIdx * 2.1) * 0.5) * (1.0 + uMid * 0.7);
            float trebleAmp = (0.1 + hash1(sampleIdx * 4.3) * 0.3) * (1.0 + uTreble * 0.8);

            // Waveform layered heights
            float bassLayer = 1.0 - smoothstep(bassAmp - 0.05, bassAmp, absY);
            float midLayer = 1.0 - smoothstep(midAmp - 0.05, midAmp, absY);
            float trebleLayer = 1.0 - smoothstep(trebleAmp - 0.05, trebleAmp, absY);

            // Deck 1: Cyan / Electric Blue / Sky Aqua
            vec3 d1_bass = vec3(0.0, 0.4, 1.0);
            vec3 d1_mid  = vec3(0.0, 0.95, 0.95);
            vec3 d1_high = vec3(0.85, 1.0, 1.0);

            // Deck 2: Hot Orange / Crimson / Golden Amber
            vec3 d2_bass = vec3(1.0, 0.15, 0.1);
            vec3 d2_mid  = vec3(1.0, 0.65, 0.0);
            vec3 d2_high = vec3(1.0, 0.95, 0.6);

            vec3 colBass = isDeck1 ? d1_bass : d2_bass;
            vec3 colMid  = isDeck1 ? d1_mid  : d2_mid;
            vec3 colHigh = isDeck1 ? d1_high : d2_high;

            vec3 waveCol = colBass * bassLayer * 0.7 + colMid * midLayer * 0.9 + colHigh * trebleLayer * 1.2;
            
            // Beat grid overlay & center zero baseline
            waveCol += vec3(0.12, 0.22, 0.35) * beatLine * 0.4;
            waveCol += vec3(0.8, 0.2, 0.4) * barLine * 0.8;
            
            // Center Playhead needle (Bright White/Red)
            waveCol += vec3(1.0, 0.15, 0.25) * playhead * 2.5;

            float alpha = clamp(bassLayer + midLayer + trebleLayer + barLine * 0.5 + playhead, 0.0, 1.0);
            float edgeFade = smoothstep(0.0, 0.03, uv.x) * smoothstep(1.0, 0.97, uv.x);
            alpha *= edgeFade;

            if (alpha < 0.005) discard;
            gl_FragColor = vec4(waveCol * alpha, alpha);
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
// Disco Silhouette Dancers in Glowing Color Box Light Walls Shader (FX 9)
// Features 5-Compartment 3D Lightbox Stage, Curvaceous Shaded Female Dancers,
// Fluid S-Curve Dance Choreography, Fresnel Neon Rim Lighting & Audio Reactivity
// =============================================================================
const DiscoDancerBoxShader = {
    uniforms: {
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uMid: { value: 0.0 },
        uTreble: { value: 0.0 },
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
        uniform float uMid;
        uniform float uTreble;
        uniform float uBPM;

        // Smooth minimum for blending organic body joints
        float smin(float a, float b, float k) {
            float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
            return mix(b, a, h) - k * h * (1.0 - h);
        }

        // Segment SDF
        float sdCapsule(vec2 p, vec2 a, vec2 b, float r1, float r2) {
            vec2 pa = p - a, ba = b - a;
            float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            float r = mix(r1, r2, h);
            return length(pa - ba * h) - r;
        }

        // Circle SDF
        float sdCircle(vec2 p, vec2 c, float r) {
            return length(p - c) - r;
        }

        // Female Shadow Dancer Body SDF with Fluid Sensual Movement, Flowing Hair & Realistic Human Curves
        float sdFemaleDancer(vec2 p, float t, int poseType) {
            // Rhythmic hip sway, spinal S-curve & sensual body-wave ripple
            float hipSway = sin(t) * 0.13 + sin(t * 0.5) * 0.04;
            float chestSway = -sin(t + 0.4) * 0.07;
            float bodyWave = sin(p.y * 3.6 - t * 2.2) * 0.038;
            
            // Central spine anchor curve
            float spineX = mix(hipSway, chestSway, smoothstep(-0.15, 0.52, p.y)) + bodyWave;
            vec2 sp = vec2(p.x - spineX, p.y);

            // 1. Head, Feminine Face Profile & Flowing Long Hair (Backlit Silhouette)
            float headY = 0.65 + cos(t * 1.8) * 0.018;
            float headX = spineX + sin(t * 0.9) * 0.025;
            vec2 headCenter = vec2(headX, headY);
            
            // Cranium & facial chin/jawline
            float dHead = sdCapsule(p, headCenter + vec2(0.0, 0.025), headCenter - vec2(0.0, 0.025), 0.080, 0.058);
            
            // Voluminous hair crown & natural fringe
            float dHairCrown = sdCircle(p, headCenter + vec2(-0.012, 0.035), 0.100);
            float dHairFringe = sdCircle(p, headCenter + vec2(0.042, 0.040), 0.070);
            
            // Long cascading silky hair swaying dynamically with body inertia
            vec2 hairStart = vec2(headX - 0.055, headY + 0.025);
            float hairSwing = sin(t * 1.3 - 0.6) * 0.12 - 0.07;
            vec2 hairMid1 = vec2(headX + hairSwing * 0.8, headY - 0.15);
            vec2 hairMid2 = vec2(headX + hairSwing * 1.4 - 0.02, headY - 0.36);
            vec2 hairTip = vec2(headX + hairSwing * 1.8 - 0.04, headY - 0.56);
            
            float dHair1 = sdCapsule(p, hairStart, hairMid1, 0.068, 0.050);
            float dHair2 = sdCapsule(p, hairMid1, hairMid2, 0.050, 0.032);
            float dHair3 = sdCapsule(p, hairMid2, hairTip, 0.032, 0.010);
            float dHair = min(min(dHairCrown, dHairFringe), min(dHair1, min(dHair2, dHair3)));

            // 2. Slender Graceful Neck & Trapezius Slope
            float dNeck = sdCapsule(p, headCenter - vec2(0.0, 0.025), vec2(spineX, 0.50), 0.045, 0.062);
            float dTraps = sdCapsule(sp, vec2(0.0, 0.50), vec2(0.0, 0.44), 0.062, 0.150);

            // 3. Voluptuous Torso (Natural Feminine Silhouette: Clavicle -> Bust -> Hourglass Waist -> Flared Hips)
            // Ribcage & Chest
            float dChest = sdCapsule(sp, vec2(0.0, 0.48), vec2(0.0, 0.29), 0.150, 0.138);
            
            // Natural rounded bust contour
            float dBustL = sdCircle(sp, vec2(-0.072, 0.34), 0.086);
            float dBustR = sdCircle(sp, vec2(0.072, 0.34), 0.086);
            float dBust = min(dBustL, dBustR);

            // Toned, curvaceous waistline
            float dWaist = sdCapsule(sp, vec2(0.0, 0.29), vec2(0.0, 0.08), 0.138, 0.114);
            
            // Pelvis, glute curvature & curvaceous hips
            float dPelvis = sdCapsule(sp, vec2(0.0, 0.08), vec2(0.0, -0.11), 0.114, 0.180);
            float dHipL = sdCircle(sp, vec2(-0.122, -0.03), 0.112);
            float dHipR = sdCircle(sp, vec2(0.122, -0.03), 0.112);
            float dHips = min(dPelvis, min(dHipL, dHipR));

            // Organic smooth union for torso
            float dTorso = smin(dChest, dBust, 0.045);
            dTorso = smin(dTorso, dWaist, 0.05);
            dTorso = smin(dTorso, dHips, 0.05);
            dTorso = smin(dTorso, dTraps, 0.04);
            dTorso = smin(dTorso, dNeck, 0.035);

            // 4. Expressive Arms, Wrists & Delicate Hands (4 Sensual Shadow Dancer Routines)
            vec2 shL = vec2(spineX - 0.158, 0.45);
            vec2 shR = vec2(spineX + 0.158, 0.45);

            vec2 elbL, wristL, handL, elbR, wristR, handR;

            if (poseType == 0) {
                // Routine A: Sensual hair glide & hand resting on hip curve
                elbL = vec2(spineX - 0.25, 0.58 + sin(t) * 0.05);
                wristL = vec2(headCenter.x - 0.10, headCenter.y + 0.06 + cos(t) * 0.03);
                handL = vec2(headCenter.x + 0.02, headCenter.y + 0.11 + cos(t) * 0.03);
                
                elbR = vec2(spineX + 0.27, 0.23 + cos(t) * 0.04);
                wristR = vec2(spineX + 0.17, 0.02 + sin(t) * 0.03);
                handR = vec2(spineX + 0.13, -0.07 + sin(t) * 0.03);
            } else if (poseType == 1) {
                // Routine B: Dual overhead sensual stretch with arched wrist flourishes
                elbL = vec2(spineX - 0.24, 0.63 + sin(t * 1.3) * 0.06);
                wristL = vec2(spineX - 0.16, 0.83 + cos(t * 1.3) * 0.05);
                handL = vec2(spineX - 0.12, 0.93 + cos(t * 1.3) * 0.05);
                
                elbR = vec2(spineX + 0.24, 0.63 - sin(t * 1.3) * 0.06);
                wristR = vec2(spineX + 0.16, 0.83 - cos(t * 1.3) * 0.05);
                handR = vec2(spineX + 0.12, 0.93 - cos(t * 1.3) * 0.05);
            } else if (poseType == 2) {
                // Routine C: Fluid horizontal side-sweep & décolletage caress
                elbL = vec2(spineX - 0.33, 0.37 + cos(t) * 0.06);
                wristL = vec2(spineX - 0.40, 0.56 + sin(t) * 0.06);
                handL = vec2(spineX - 0.46, 0.64 + sin(t) * 0.06);
                
                elbR = vec2(spineX + 0.20, 0.38 + sin(t) * 0.04);
                wristR = vec2(spineX + 0.02, 0.42 + cos(t) * 0.03);
                handR = vec2(spineX - 0.04, 0.40 + cos(t) * 0.03);
            } else {
                // Routine D: Dynamic rhythm pump & low hip accent
                elbR = vec2(spineX + 0.27, 0.67 + cos(t) * 0.07);
                wristR = vec2(spineX + 0.33, 0.85 + sin(t) * 0.06);
                handR = vec2(spineX + 0.35, 0.95 + sin(t) * 0.06);
                
                elbL = vec2(spineX - 0.25, 0.17 + sin(t) * 0.03);
                wristL = vec2(spineX - 0.17, -0.06);
                handL = vec2(spineX - 0.13, -0.16);
            }

            // Naturally tapered arm segments (deltoid -> bicep -> forearm -> delicate hand)
            float dArmL1 = sdCapsule(p, shL, elbL, 0.052, 0.042);
            float dArmL2 = sdCapsule(p, elbL, wristL, 0.042, 0.028);
            float dHandL = sdCapsule(p, wristL, handL, 0.028, 0.015);
            
            float dArmR1 = sdCapsule(p, shR, elbR, 0.052, 0.042);
            float dArmR2 = sdCapsule(p, elbR, wristR, 0.042, 0.028);
            float dHandR = sdCapsule(p, wristR, handR, 0.028, 0.015);

            float dArms = min(min(dArmL1, min(dArmL2, dHandL)), min(dArmR1, min(dArmR2, dHandR)));
            float dUpper = smin(dTorso, dArms, 0.04);
            dUpper = min(dUpper, dHead);
            dUpper = min(dUpper, dHair);

            // 5. Shapely Legs, Voluptuous Thighs, Sculpted Calves & High-Heeled Stilettos
            vec2 hipL = vec2(spineX - 0.092, -0.09);
            vec2 hipR = vec2(spineX + 0.092, -0.09);

            float legStep = sin(t) * 0.06;
            vec2 kneeL = vec2(spineX - 0.10 + legStep, -0.43);
            vec2 ankleL = vec2(spineX - 0.09 + legStep * 1.1, -0.74);
            vec2 toeL = vec2(spineX - 0.04 + legStep * 1.1, -0.84);
            vec2 heelL = vec2(spineX - 0.13 + legStep * 1.1, -0.84);

            vec2 kneeR = vec2(spineX + 0.10 - legStep, -0.43);
            vec2 ankleR = vec2(spineX + 0.09 - legStep * 1.1, -0.74);
            vec2 toeR = vec2(spineX + 0.13 - legStep * 1.1, -0.84);
            vec2 heelR = vec2(spineX + 0.05 - legStep * 1.1, -0.84);

            // Voluptuous shapely thighs with natural glute flare
            float dThighSegL = sdCapsule(p, hipL, kneeL, 0.110, 0.072);
            float dThighFlareL = sdCircle(p, mix(hipL, kneeL, 0.25) + vec2(-0.022, 0.0), 0.092);
            float dThighL = smin(dThighSegL, dThighFlareL, 0.03);

            float dThighSegR = sdCapsule(p, hipR, kneeR, 0.110, 0.072);
            float dThighFlareR = sdCircle(p, mix(hipR, kneeR, 0.25) + vec2(0.022, 0.0), 0.092);
            float dThighR = smin(dThighSegR, dThighFlareR, 0.03);

            // Defined knee joints
            float dKneeL = sdCircle(p, kneeL, 0.065);
            float dKneeR = sdCircle(p, kneeR, 0.065);

            // Calves with realistic gastrocnemius muscle curve tapering to slender ankle
            float dCalfSegL = sdCapsule(p, kneeL, ankleL, 0.070, 0.036);
            float dCalfBulgeL = sdCircle(p, mix(kneeL, ankleL, 0.32) + vec2(0.018, 0.0), 0.066);
            float dCalfL = smin(dCalfSegL, dCalfBulgeL, 0.03);

            float dCalfSegR = sdCapsule(p, kneeR, ankleR, 0.070, 0.036);
            float dCalfBulgeR = sdCircle(p, mix(kneeR, ankleR, 0.32) + vec2(-0.018, 0.0), 0.066);
            float dCalfR = smin(dCalfSegR, dCalfBulgeR, 0.03);

            // Stiletto High Heels: Arched Instep, Platform Toe & Needle Heel
            float dInstepL = sdCapsule(p, ankleL, toeL, 0.036, 0.024);
            float dToeL = sdCapsule(p, toeL, toeL + vec2(0.038, -0.02), 0.024, 0.016);
            float dStilettoL = sdCapsule(p, ankleL - vec2(0.02, 0.02), heelL, 0.016, 0.009);
            float dFootL = min(dInstepL, min(dToeL, dStilettoL));

            float dInstepR = sdCapsule(p, ankleR, toeR, 0.036, 0.024);
            float dToeR = sdCapsule(p, toeR, toeR + vec2(0.038, -0.02), 0.024, 0.016);
            float dStilettoR = sdCapsule(p, ankleR - vec2(0.02, 0.02), heelR, 0.016, 0.009);
            float dFootR = min(dInstepR, min(dToeR, dStilettoR));

            float dLegL = min(dThighL, min(dKneeL, min(dCalfL, dFootL)));
            float dLegR = min(dThighR, min(dKneeR, min(dCalfR, dFootR)));
            float dLegs = min(dLegL, dLegR);

            return smin(dUpper, dLegs, 0.048);
        }

        void main() {
            vec2 uv = vUv;
            
            // 5-Column Lightbox Wall Layout
            float numBoxes = 5.0;
            float boxCol = floor(uv.x * numBoxes);
            float boxU = fract(uv.x * numBoxes);
            float boxV = uv.y;

            // Box compartment center-relative coordinates [-1, 1]
            vec2 boxP = vec2((boxU - 0.5) * 2.0, (boxV - 0.5) * 2.0);

            // Lightbox Bevel Border Frame
            vec2 frameDist = abs(boxP);
            float isFrame = step(0.92, max(frameDist.x, frameDist.y));
            float neonTrim = smoothstep(0.04, 0.0, abs(max(frameDist.x, frameDist.y) - 0.90));

            // Dynamic 5-Color Neon Lightbox Color Palette
            vec3 cBox;
            if (boxCol < 0.5) {
                // Box 0: Hot Neon Magenta
                cBox = vec3(1.0, 0.05, 0.55);
            } else if (boxCol < 1.5) {
                // Box 1: Electric Cyan (Matching Envato glowing blue reference)
                cBox = vec3(0.0, 0.85, 1.0);
            } else if (boxCol < 2.5) {
                // Box 2: Solar Amber Gold (Center Stage)
                cBox = vec3(1.0, 0.80, 0.10);
            } else if (boxCol < 3.5) {
                // Box 3: Vivid Emerald Lime
                cBox = vec3(0.05, 1.0, 0.45);
            } else {
                // Box 4: Ultraviolet Purple
                cBox = vec3(0.70, 0.10, 1.0);
            }

            // Audio-driven Color Pulse & Strobe
            float beatPulse = uBass * (0.8 + 0.4 * sin(uTime * 4.0 + boxCol));
            vec3 boxBacklight = cBox * (0.80 + beatPulse * 0.90);

            // 3D Inner Lightbox Gradient Shading (Recessed luminous glow effect)
            float innerGlow = (1.0 - length(boxP * vec2(0.7, 0.85)) * 0.72);
            innerGlow = clamp(innerGlow, 0.06, 1.0);
            vec3 bgCol = mix(vec3(0.012, 0.005, 0.035), boxBacklight, pow(innerGlow, 1.5));

            // Atmospheric backlight flare & subtle smoke haze in the booth
            float smokeHaze = sin(boxP.x * 4.0 + uTime * 1.5) * cos(boxP.y * 3.0 - uTime * 1.2) * 0.08 + 0.08;
            bgCol += cBox * smokeHaze * (0.8 + uBass * 0.5);

            // Horizontal neon stage tube lines on back wall
            float tubeGrid = sin(boxV * 35.0) * 0.5 + 0.5;
            tubeGrid = pow(tubeGrid, 8.0) * 0.35;
            bgCol += cBox * tubeGrid;

            // Frame metallic dark bezel with glowing neon tubing
            vec3 frameCol = vec3(0.04, 0.03, 0.06) + cBox * (neonTrim * 2.2 + uBass * 0.4);
            vec3 sceneCol = mix(bgCol, frameCol, isFrame);

            // -----------------------------------------------------------------
            // Render High-Fidelity Glowing Shadow Dancer in this Compartment
            // -----------------------------------------------------------------
            // Scale and center coordinate for the dancer
            vec2 dancerUv = vec2(boxP.x * 0.85, (boxV - 0.52) * 1.85);
            
            // Sync dancer choreography with BPM and column offset
            float danceBps = (uBPM / 60.0);
            float danceTime = uTime * danceBps * 3.14159 + boxCol * 1.25;
            int poseType = int(mod(boxCol, 4.0));

            float dBody = sdFemaleDancer(dancerUv, danceTime, poseType);

            // High-contrast anti-aliased body mask
            float bodyMask = 1.0 - smoothstep(-0.004, 0.004, dBody);

            // Body Surface Normal & 3D Shading
            float eps = 0.0035;
            float dx = sdFemaleDancer(dancerUv + vec2(eps, 0.0), danceTime, poseType) - sdFemaleDancer(dancerUv - vec2(eps, 0.0), danceTime, poseType);
            float dy = sdFemaleDancer(dancerUv + vec2(0.0, eps), danceTime, poseType) - sdFemaleDancer(dancerUv - vec2(0.0, eps), danceTime, poseType);
            vec2 grad = normalize(vec2(dx, dy) + vec2(0.0001));
            float nz = sqrt(max(0.0, 1.0 - dot(grad, grad) * 0.5));

            // Deep obsidian / silky shadow dancer silhouette body core
            vec3 cSilhouette = vec3(0.010, 0.008, 0.018);

            // Glossy highlight reflection on shoulder/bust/hips
            vec2 lightDir = normalize(vec2(0.35, 0.75));
            float spec = pow(max(0.0, dot(grad, lightDir)), 7.0) * (0.40 + uBass * 0.35);
            vec3 bodyShading = cSilhouette + vec3(0.45, 0.50, 0.60) * spec;

            // Intense Glowing Backlit Fresnel Rim Light (Shadow Dancer Aesthetic)
            float fresnel = pow(clamp(1.0 - nz, 0.0, 1.0), 1.9);
            vec3 rimGlow = cBox * fresnel * (2.8 + uBass * 1.5);

            vec3 dancerCol = bodyShading + rimGlow;

            // Volumetric Backlight Corona / Bloom Spill around silhouette contours
            float outerHalo = smoothstep(0.09, 0.0, dBody) * 0.55;
            sceneCol += cBox * outerHalo * (1.1 + uBass * 0.7);

            // Combine Dancer over Lightbox Scene
            vec3 finalCol = mix(sceneCol, dancerCol, bodyMask);

            // Mirrored glossy dance floor reflection at bottom
            if (boxV < 0.16) {
                float floorFade = smoothstep(0.16, 0.0, boxV);
                vec3 floorReflect = cBox * (0.50 + uBass * 0.5) * floorFade;
                finalCol += floorReflect;
            }

            // CRT Scanline & Lens Vignette
            float scanline = sin(vUv.y * 420.0) * 0.08 + 0.92;
            float vignette = smoothstep(0.85, 0.35, length(vUv - 0.5) * 0.9);
            finalCol *= scanline * vignette;

            gl_FragColor = vec4(finalCol, 1.0);
        }
    `
};

// =============================================================================
// Retro Arcade 80s Shader (Pac-Man, Ghost Chase, Screen Perimeter & Space Invader Cannon Shootout)
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

// Offscreen Procedural Disco Ball Mirror Tile Normal/Bump Texture
function createDiscoTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base dark grout seam color
    ctx.fillStyle = '#141418';
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
            const baseLum = Math.floor(190 + (rand - 0.5) * 75); // 150..225

            // Tile body
            ctx.fillStyle = `rgb(${baseLum}, ${baseLum}, ${baseLum})`;
            ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2);

            // Subtle top/left bevel highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.fillRect(x + 1, y + 1, tileW - 2, 1);
            ctx.fillRect(x + 1, y + 1, 1, tileH - 2);

            // Subtle bottom/right bevel shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(x + 1, y + tileH - 2, tileW - 2, 1);
            ctx.fillRect(x + tileW - 2, y + 1, 1, tileH - 2);
        }
    }

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

    const renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'high-performance',
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    const shieldMat = new THREE.MeshBasicMaterial({
        map: shieldTexture,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
        depthWrite: false,
        fog: false
    });
    logoShieldMesh = new THREE.Mesh(new THREE.PlaneGeometry(18, 11), shieldMat);
    logoShieldMesh.renderOrder = 9998;

    // Logo Mesh with High-Clarity Shader (Renders in front of all 3D scene objects)
    const logoGeo = new THREE.PlaneGeometry(16, 9);
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

    applyLogoPlacement();

    function applyLogoPlacement() {
        if (!logoMesh) return;

        let baseZ = 6.8;
        let baseW = 13.5 * logoBaseScale;
        let posX = 0, posY = 0;

        if (logoMode === 'backdrop') {
            baseZ = -22;
            baseW = 58 * logoBaseScale;
            logoShaderMat.blending = THREE.AdditiveBlending;
            if (logoShieldMesh) logoShieldMesh.visible = false;
        } else if (logoMode === 'overlay') {
            baseZ = 12.0;
            baseW = 6.5 * logoBaseScale;
            logoShaderMat.blending = THREE.NormalBlending;
            if (logoShieldMesh) logoShieldMesh.visible = isShieldActive;
        } else {
            // Hologram (3D Front) - Guaranteed in front of disco ball (Z=5.2) and visualizers
            baseZ = 6.8;
            baseW = 13.5 * logoBaseScale;
            logoShaderMat.blending = THREE.NormalBlending;
            if (logoShieldMesh) logoShieldMesh.visible = isShieldActive;
        }

        // Calculate Position Scale Factors
        let scaleFactor = 1.0;
        if (logoPosition === 'center') {
            scaleFactor = 1.0;
        } else if (logoPosition === 'top' || logoPosition === 'bottom' || logoPosition === 'left' || logoPosition === 'right' || logoPosition === 'center-top' || logoPosition === 'top-center' || logoPosition === 'center-bottom' || logoPosition === 'bottom-center' || logoPosition === 'top-quarter' || logoPosition === 'center-top-quarter' || logoPosition === 'center-bottom-quarter' || logoPosition === 'bottom-quarter') {
            scaleFactor = 0.78;
        } else {
            // Corners: top-left, top-right, bottom-left, bottom-right
            scaleFactor = 0.65;
        }

        const w = baseW * scaleFactor;
        const h = (baseW / logoAspectRatio) * scaleFactor;

        // Position coordinates mapped to camera frustum
        if (logoPosition === 'top-left') {
            posX = (logoMode === 'overlay' ? -2.2 : (logoMode === 'backdrop' ? -18.0 : -6.2));
            posY = (logoMode === 'overlay' ? 1.25 : (logoMode === 'backdrop' ? 9.5 : 3.8));
        } else if (logoPosition === 'top-right') {
            posX = (logoMode === 'overlay' ? 2.2 : (logoMode === 'backdrop' ? 18.0 : 6.2));
            posY = (logoMode === 'overlay' ? 1.25 : (logoMode === 'backdrop' ? 9.5 : 3.8));
        } else if (logoPosition === 'bottom-left') {
            posX = (logoMode === 'overlay' ? -2.2 : (logoMode === 'backdrop' ? -18.0 : -6.2));
            posY = (logoMode === 'overlay' ? -1.25 : (logoMode === 'backdrop' ? -9.5 : -3.8));
        } else if (logoPosition === 'bottom-right') {
            posX = (logoMode === 'overlay' ? 2.2 : (logoMode === 'backdrop' ? 18.0 : 6.2));
            posY = (logoMode === 'overlay' ? -1.25 : (logoMode === 'backdrop' ? -9.5 : -3.8));
        } else if (logoPosition === 'top' || logoPosition === 'center-top' || logoPosition === 'top-center') {
            posX = 0;
            posY = (logoMode === 'overlay' ? 1.35 : (logoMode === 'backdrop' ? 9.5 : 3.8));
        } else if (logoPosition === 'bottom' || logoPosition === 'center-bottom' || logoPosition === 'bottom-center') {
            posX = 0;
            posY = (logoMode === 'overlay' ? -1.35 : (logoMode === 'backdrop' ? -9.5 : -3.8));
        } else if (logoPosition === 'left' || logoPosition === 'center-left') {
            posX = (logoMode === 'overlay' ? -2.2 : (logoMode === 'backdrop' ? -18.0 : -6.2));
            posY = 0;
        } else if (logoPosition === 'right' || logoPosition === 'center-right') {
            posX = (logoMode === 'overlay' ? 2.2 : (logoMode === 'backdrop' ? 18.0 : 6.2));
            posY = 0;
        } else if (logoPosition === 'top-quarter' || logoPosition === 'center-top-quarter') {
            posX = 0;
            posY = (logoMode === 'overlay' ? 0.85 : (logoMode === 'backdrop' ? 7.0 : 2.5));
        } else if (logoPosition === 'center-bottom-quarter' || logoPosition === 'bottom-quarter') {
            posX = 0;
            posY = (logoMode === 'overlay' ? -0.85 : (logoMode === 'backdrop' ? -7.0 : -2.5));
        } else {
            // Center
            posX = 0;
            posY = 0;
        }

        currentLogoPosX = posX;
        currentLogoPosY = posY;
        currentLogoBaseZ = baseZ;
        currentLogoScaleFactor = scaleFactor;

        logoPivot.position.set(posX, posY, baseZ);
        logoPivot.quaternion.copy(camera.quaternion);

        logoMesh.position.set(0, 0, 0);
        logoMesh.scale.set(w / 16, h / 9, 1);
        logoMesh.rotation.order = 'YXZ';
        logoMesh.rotation.set(0, 0, 0);

        if (logoShieldMesh && logoMode !== 'backdrop') {
            logoShieldMesh.position.set(0, 0, -0.25);
            logoShieldMesh.rotation.set(0, 0, 0);
            logoShieldMesh.scale.set((w * 1.35) / 18, (h * 1.4) / 11, 1);
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
                video.src = sourceUrl;
                video.crossOrigin = 'anonymous';
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                video.autoplay = true;

                video.addEventListener('loadedmetadata', () => {
                    if (video.videoWidth && video.videoHeight) {
                        logoAspectRatio = video.videoWidth / video.videoHeight;
                        applyLogoPlacement();
                    }
                });

                video.play().catch(() => {});
                logoVideoElement = video;
                logoTexture = new THREE.VideoTexture(video);
                logoTexture.minFilter = THREE.LinearFilter;
                logoTexture.magFilter = THREE.LinearFilter;
                logoTexture.generateMipmaps = false;

                logoShaderMat.uniforms.map.value = logoTexture;
                logoShaderMat.needsUpdate = true;
            } else {
                const textureLoader = new THREE.TextureLoader();
                textureLoader.load(sourceUrl, (tex) => {
                    logoTexture = tex;
                    logoTexture.minFilter = THREE.LinearFilter;
                    logoTexture.magFilter = THREE.LinearFilter;
                    if (tex.image && tex.image.width && tex.image.height) {
                        logoAspectRatio = tex.image.width / tex.image.height;
                        applyLogoPlacement();
                    }
                    logoShaderMat.uniforms.map.value = logoTexture;
                    logoShaderMat.needsUpdate = true;
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
    // FX 0: 📊 3D STUDIO LED EQUALIZER WALL
    // -------------------------------------------------------------------------
    const gEQBars = createFXGroup();
    gEQBars.visible = true;

    const eqCols = 44;
    const eqRows = 16;
    const totalLEDs = eqCols * eqRows;

    const brickGeo = new THREE.BoxGeometry(0.38, 0.28, 0.35);
    const brickMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    const ledInstancedMesh = new THREE.InstancedMesh(brickGeo, brickMat, totalLEDs);
    ledInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    gEQBars.add(ledInstancedMesh);

    const eqRowColors = [];
    const eqColorRamp = [
        { stop: 0.0, color: new THREE.Color(0x00e5ff) },
        { stop: 0.32, color: new THREE.Color(0x0ea5e9) },
        { stop: 0.62, color: new THREE.Color(0xa855f7) },
        { stop: 0.82, color: new THREE.Color(0xf43f5e) },
        { stop: 1.0, color: new THREE.Color(0xfbbf24) }
    ];
    for (let r = 0; r < eqRows; r++) {
        const t = r / (eqRows - 1);
        let col = eqColorRamp[0].color.clone();
        for (let s = 0; s < eqColorRamp.length - 1; s++) {
            if (t >= eqColorRamp[s].stop && t <= eqColorRamp[s + 1].stop) {
                const localT = (t - eqColorRamp[s].stop) / (eqColorRamp[s + 1].stop - eqColorRamp[s].stop);
                col = eqColorRamp[s].color.clone().lerp(eqColorRamp[s + 1].color, localT);
                break;
            }
        }
        eqRowColors.push(col);
    }

    const dummy = new THREE.Object3D();
    const ledBaseY = -4.5;
    const eqArcRadius = 18.0;
    const eqArcAngle = Math.PI * 0.92;
    const colDark = new THREE.Color(0x060810);
    const eqPeakCaps = [];

    for (let c = 0; c < eqCols; c++) {
        const angle = ((c / (eqCols - 1)) - 0.5) * eqArcAngle;
        const posX = Math.sin(angle) * eqArcRadius;
        const posZ = -Math.cos(angle) * eqArcRadius + 14.5;

        for (let r = 0; r < eqRows; r++) {
            const idx = c * eqRows + r;
            const posY = ledBaseY + r * 0.38;
            dummy.position.set(posX, posY, posZ);
            dummy.rotation.y = angle;
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            ledInstancedMesh.setMatrixAt(idx, dummy.matrix);
            ledInstancedMesh.setColorAt(idx, colDark);
        }

        const capMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.40), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        capMesh.position.set(posX, ledBaseY + 0.2, posZ);
        capMesh.rotation.y = angle;
        gEQBars.add(capMesh);
        eqPeakCaps.push({ mesh: capMesh, peakY: ledBaseY + 0.2, peakVel: 0, posX, posZ, angle });
    }
    ledInstancedMesh.instanceMatrix.needsUpdate = true;

    const eqStageFloor = new THREE.Mesh(new THREE.PlaneGeometry(50, 30), new THREE.MeshBasicMaterial({ color: 0x04040c, side: THREE.DoubleSide }));
    eqStageFloor.rotation.x = -Math.PI / 2;
    eqStageFloor.position.set(0, ledBaseY - 0.05, 0);
    gEQBars.add(eqStageFloor);

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
    // FX 3: 🎚️ DJ DECK SCROLLING AUDIO WAVEFORMS [NEW]
    // -------------------------------------------------------------------------
    const gDJWaveforms = createFXGroup();
    const djWaveMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 },
            uTreble: { value: 0.0 },
            uBPM: { value: 126.0 }
        },
        vertexShader: DJDeckWaveformShader.vertexShader,
        fragmentShader: DJDeckWaveformShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const djWaveMesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 18), djWaveMat);
    djWaveMesh.position.set(0, 0, -2.0);
    gDJWaveforms.add(djWaveMesh);

    // =========================================================================
    // CATEGORY 2: ⚡ LASERS & DISCO (FX 4-9)
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

    // 2. Big Faceted Chrome Mirror Ball (MeshPhysicalMaterial with sharp glass facets)
    const dBallGeo = new THREE.SphereGeometry(5.2, 96, 48);
    const dBallMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 1.0,
        roughness: 0.04, // Mirror-smooth glass facets
        normalMap: discoNormalTex,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughnessMap: discoRoughnessTex,
        metalnessMap: discoMetalnessTex,
        bumpMap: discoTileTex,
        bumpScale: 0.03,
        envMap: clubEnvMap,
        envMapIntensity: 3.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.01,
        reflectivity: 1.0
    });
    const dBallMesh = new THREE.Mesh(dBallGeo, dBallMat);
    dBallMesh.position.set(0, 0.0, 0.0);
    gDiscoBall.add(dBallMesh);

    // Dedicated Multi-Directional Vibrant Stage Lights
    const dBallKeyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dBallKeyLight.position.set(4.0, 7.0, 8.0);
    dBallKeyLight.target = dBallMesh;
    gDiscoBall.add(dBallKeyLight);

    const dBallCyanLight = new THREE.DirectionalLight(0x00ffff, 1.4);
    dBallCyanLight.position.set(-8.0, 3.0, 4.0);
    dBallCyanLight.target = dBallMesh;
    gDiscoBall.add(dBallCyanLight);

    const dBallMagentaLight = new THREE.DirectionalLight(0xff007f, 1.4);
    dBallMagentaLight.position.set(8.0, -2.0, 4.0);
    dBallMagentaLight.target = dBallMesh;
    gDiscoBall.add(dBallMagentaLight);

    const dBallRimLight = new THREE.DirectionalLight(0x4488ff, 1.0);
    dBallRimLight.position.set(0.0, -6.0, -5.0);
    dBallRimLight.target = dBallMesh;
    gDiscoBall.add(dBallRimLight);

    const dBallPointCyan = new THREE.PointLight(0x00ffff, 2.5, 22.0, 1.2);
    dBallPointCyan.position.set(-7.0, 4.0, 6.0);
    gDiscoBall.add(dBallPointCyan);

    const dBallPointMagenta = new THREE.PointLight(0xff007f, 2.5, 22.0, 1.2);
    dBallPointMagenta.position.set(7.0, 4.0, 6.0);
    gDiscoBall.add(dBallPointMagenta);

    // 3. 1,200 Floating 3D Specular Starburst Glints & Sparkles
    const glintCount = 1200;
    const glintGeo = new THREE.BufferGeometry();
    const glintPos = new Float32Array(glintCount * 3);
    const glintCol = new Float32Array(glintCount * 3);
    const glintThetas = new Float32Array(glintCount);
    const glintPhis = new Float32Array(glintCount);
    const glintBaseRads = new Float32Array(glintCount);

    const gHues = [
        new THREE.Color(0xffffff),
        new THREE.Color(0x88ffff),
        new THREE.Color(0xff88cc),
        new THREE.Color(0xaaccff),
        new THREE.Color(0xffea88),
        new THREE.Color(0x00ffff),
        new THREE.Color(0xff007f)
    ];

    for (let i = 0; i < glintCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = 5.8 + Math.random() * 22.0;

        glintThetas[i] = theta;
        glintPhis[i] = phi;
        glintBaseRads[i] = r;

        glintPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        glintPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        glintPos[i * 3 + 2] = r * Math.cos(phi);

        const c = gHues[i % gHues.length];
        glintCol[i * 3] = c.r; glintCol[i * 3 + 1] = c.g; glintCol[i * 3 + 2] = c.b;
    }
    glintGeo.setAttribute('position', new THREE.BufferAttribute(glintPos, 3));
    glintGeo.setAttribute('color', new THREE.BufferAttribute(glintCol, 3));
    const glintMat = new THREE.PointsMaterial({
        size: 0.35,
        map: starburstTex,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    const glintSystem = new THREE.Points(glintGeo, glintMat);
    gDiscoBall.add(glintSystem);

    // -------------------------------------------------------------------------
    // FX 5: 🕺 70S DISCO DANCEFLOOR (CLEAN SATURDAY NIGHT FEVER FLOOR)
    // -------------------------------------------------------------------------
    const gDiscoFloor = createFXGroup();

    // 1. Saturday Night Fever Illuminated Dancefloor
    const dfMat = new THREE.ShaderMaterial({
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
    const dfMesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), dfMat);
    dfMesh.rotation.x = -Math.PI / 2.3;
    dfMesh.position.set(0, -6.0, -8.0);
    gDiscoFloor.add(dfMesh);

    // -------------------------------------------------------------------------
    // FX 6: ⚡ DUAL-BANK VOLUMETRIC SEARCHLIGHTS
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

    // -------------------------------------------------------------------------
    // FX 9: 💃 SILHOUETTE CLUB DANCERS IN GLOWING COLOR BOX WALLS [NEW]
    // -------------------------------------------------------------------------
    const gDancers = createFXGroup();
    const dancerBoxGeo = new THREE.PlaneGeometry(38, 22);
    const dancerBoxMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uMid: { value: 0.0 },
            uTreble: { value: 0.0 },
            uBPM: { value: 126.0 }
        },
        vertexShader: DiscoDancerBoxShader.vertexShader,
        fragmentShader: DiscoDancerBoxShader.fragmentShader,
        depthWrite: false
    });
    const dancerBoxMesh = new THREE.Mesh(dancerBoxGeo, dancerBoxMat);
    dancerBoxMesh.position.set(0, 0, -4.5);
    gDancers.add(dancerBoxMesh);

    // =========================================================================
    // CATEGORY 3: 🕸️ CYBER & RETRO (FX 10-13)
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 10: 🌅 SYNTHWAVE CYBER GRID
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
    // Resize Handler
    // -------------------------------------------------------------------------
    function onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        composer.setSize(w, h);
        bloomPass.resolution.set(w, h);
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
    function setLogoVisible(visible) {
        logoVisible = !!visible;
        logoGroup.visible = logoVisible;
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

    // =========================================================================
    // MAIN RENDER LOOP (18 SCENES)
    // =========================================================================
    function animate(getAudioDataFn) {
        requestAnimationFrame(() => animate(getAudioDataFn));

        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        const audio = (typeof getAudioDataFn === 'function') ? getAudioDataFn() : {
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

        const dataArr = audio.dataArray || [];
        const bassPop = audio.bassImpact || audio.bass || 0;
        const transient = audio.transientImpulse || 0;
        const bps = currentBPM / 60.0;
        const speed = bps * delta;

        // 1. Animate Logo Layer
        if (logoVisible && logoMesh) {
            const logoPulse = (bassPop * logoBassPulseAmount * 0.25) + (transient * logoBassPulseAmount * 0.2);
            const wBase = (logoMode === 'backdrop' ? 58 : (logoMode === 'overlay' ? 6.5 : 13.5)) * logoBaseScale * currentLogoScaleFactor * (1.0 + logoPulse * 0.25);
            const hBase = (wBase / logoAspectRatio);

            // Shield stays stationary flat directly behind the logo
            if (logoShieldMesh && isShieldActive && logoMode !== 'backdrop') {
                logoShieldMesh.position.set(0, 0, -0.25);
                logoShieldMesh.rotation.set(0, 0, 0);
            }

            // Mode-specific Horizontal / 3D / Free Roam Rotation Logic
            if (logoSpinMode === 'center') {
                // Mode 1: Pure Horizontal Center Spin (Symmetrical flat horizontal rotation on center point everywhere)
                logoPivot.position.set(currentLogoPosX, currentLogoPosY, currentLogoBaseZ);
                logoPivot.quaternion.copy(camera.quaternion);

                logoSpinAngle += delta * logoSpinSpeed * 2.5;
                const cosSpin = Math.cos(logoSpinAngle);
                logoMesh.scale.set((wBase / 16) * cosSpin, hBase / 9, 1);
                logoMesh.position.set(0, 0, 0);
                logoMesh.rotation.set(0, 0, 0);
            } else if (logoSpinMode === 'orbit') {
                // Mode 2: 3D Perspective Depth Offset Orbit Spin
                logoPivot.position.set(currentLogoPosX, currentLogoPosY, currentLogoBaseZ);
                logoPivot.quaternion.copy(camera.quaternion);

                logoSpinAngle += delta * logoSpinSpeed * 2.5;
                logoMesh.scale.set(wBase / 16, hBase / 9, 1);
                logoMesh.position.set(0, 0, 0);
                logoMesh.rotation.order = 'YXZ';
                logoMesh.rotation.y = logoSpinAngle;
                logoMesh.rotation.x = 0;
                logoMesh.rotation.z = 0;
            } else if (logoSpinMode === 'freeroam') {
                // Mode 3: Free Roam & 3D Drift across the entire display
                logoSpinAngle += delta * logoSpinSpeed * 1.5;
                const roamTime = elapsedTime * logoSpinSpeed * 0.45;

                const boundX = logoMode === 'backdrop' ? 14.0 : (logoMode === 'overlay' ? 2.2 : 5.8);
                const boundY = logoMode === 'backdrop' ? 8.0 : (logoMode === 'overlay' ? 1.2 : 3.4);

                const freeX = Math.sin(roamTime * 1.1) * boundX + Math.sin(roamTime * 2.3) * (boundX * 0.2);
                const freeY = Math.cos(roamTime * 0.9) * boundY + Math.cos(roamTime * 1.8) * (boundY * 0.15);
                const freeZ = currentLogoBaseZ + Math.sin(roamTime * 0.7) * 1.0;

                logoPivot.position.set(freeX, freeY, freeZ);
                logoPivot.quaternion.copy(camera.quaternion);

                logoMesh.scale.set(wBase / 16, hBase / 9, 1);
                logoMesh.position.set(0, 0, 0);
                logoMesh.rotation.order = 'YXZ';
                logoMesh.rotation.y = logoSpinAngle;
                logoMesh.rotation.x = Math.sin(roamTime * 1.4) * 0.2;
                logoMesh.rotation.z = Math.cos(roamTime * 1.1) * 0.15;
            } else {
                // Mode 4: Static (Smooth recovery to front-facing)
                logoPivot.position.set(currentLogoPosX, currentLogoPosY, currentLogoBaseZ);
                logoPivot.quaternion.copy(camera.quaternion);

                logoMesh.scale.set(wBase / 16, hBase / 9, 1);
                logoMesh.position.set(0, 0, 0);
                if (Math.abs(logoMesh.rotation.y) > 0.001 || Math.abs(logoMesh.rotation.x) > 0.001 || Math.abs(logoMesh.rotation.z) > 0.001) {
                    logoMesh.rotation.y = THREE.MathUtils.lerp(logoMesh.rotation.y, 0, delta * 8.0);
                    logoMesh.rotation.x = THREE.MathUtils.lerp(logoMesh.rotation.x, 0, delta * 8.0);
                    logoMesh.rotation.z = THREE.MathUtils.lerp(logoMesh.rotation.z, 0, delta * 8.0);
                    if (Math.abs(logoMesh.rotation.y) < 0.001) {
                        logoMesh.rotation.set(0, 0, 0);
                        logoSpinAngle = 0;
                    }
                } else {
                    logoMesh.rotation.set(0, 0, 0);
                    logoSpinAngle = 0;
                }
            }
        }

        // 2. Animate Active Scene
        // ---------------------------------------------------------------------
        // FX 0: 📊 3D Studio LED Equalizer Wall
        // ---------------------------------------------------------------------
        if (currentFXIndex === 0) {
            for (let c = 0; c < eqCols; c++) {
                const binIdx = Math.floor(Math.pow(c / (eqCols - 1), 1.2) * 56) + 1;
                const amp = dataArr[binIdx] ? dataArr[binIdx] / 255 : 0;
                const targetActiveRows = Math.min(eqRows, Math.floor(amp * (eqRows + 2) + (c < 8 ? bassPop * 3 : 0)));

                for (let r = 0; r < eqRows; r++) {
                    const idx = c * eqRows + r;
                    if (r < targetActiveRows) {
                        ledInstancedMesh.setColorAt(idx, eqRowColors[r]);
                    } else {
                        ledInstancedMesh.setColorAt(idx, colDark);
                    }
                }

                const cap = eqPeakCaps[c];
                const currentTopY = ledBaseY + targetActiveRows * 0.38 + 0.1;
                if (currentTopY > cap.peakY) {
                    cap.peakY = currentTopY;
                    cap.peakVel = 0;
                } else {
                    cap.peakVel += delta * 14.0;
                    cap.peakY -= cap.peakVel * delta;
                    if (cap.peakY < ledBaseY + 0.2) cap.peakY = ledBaseY + 0.2;
                }
                cap.mesh.position.y = cap.peakY;
            }
            if (ledInstancedMesh.instanceColor) ledInstancedMesh.instanceColor.needsUpdate = true;
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
        // FX 3: 🎚️ DJ Deck Scrolling Waveforms [NEW]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 3) {
            djWaveMat.uniforms.uTime.value = elapsedTime;
            djWaveMat.uniforms.uBass.value = bassPop;
            djWaveMat.uniforms.uMid.value = audio.smoothedMid || 0;
            djWaveMat.uniforms.uTreble.value = audio.smoothedTreble || 0;
            djWaveMat.uniforms.uBPM.value = currentBPM;
        }
        // ---------------------------------------------------------------------
        // FX 4: 🪩 Authentic Nightclub Mirror Ball Rig [Top Pinspots & Floor Reflections]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 4) {
            // Audio-driven ball rotation speed & angular velocity
            const ballSpinSpeed = (bps * 0.38 + (audio.energy || 0) * 0.45 + bassPop * 0.8) * speed;
            dBallMesh.rotation.y += ballSpinSpeed * delta * 1.8;
            dBallMesh.rotation.x = Math.sin(elapsedTime * 0.6) * 0.03;
            dBallMesh.rotation.z = Math.cos(elapsedTime * 0.45) * 0.02;

            const bassVal = bassPop;
            const midVal = audio.smoothedMid || 0;

            const isKick = audio.isOnset && (audio.bassImpact > 0.40 || bassPop > 0.50);
            const pulse = isKick ? 1.0 : 0.0;

            // Audio-reactive light pulses
            dBallKeyLight.intensity = 1.8 + bassVal * 1.0 + pulse * 1.2;
            dBallCyanLight.intensity = 1.4 + bassVal * 0.8 + midVal * 0.6;
            dBallMagentaLight.intensity = 1.4 + bassVal * 0.8 + midVal * 0.6;
            dBallPointCyan.intensity = (2.5 + bassVal * 4.0 + pulse * 5.0) * (bloomMultiplier + 0.5);
            dBallPointMagenta.intensity = (2.5 + bassVal * 4.0 + pulse * 5.0) * (bloomMultiplier + 0.5);

            // Orbiting 3D Specular Glints swirling around the big disco ball
            glintSystem.position.set(0, 0, 0);
            glintSystem.rotation.y += ballSpinSpeed * delta * 1.8;
            glintSystem.rotation.x = Math.sin(elapsedTime * 0.4) * 0.05;
            const gScale = 1.0 + (bassPop * 0.12) + (transient * 0.18);
            glintSystem.scale.setScalar(gScale);
            glintMat.size = 0.35 * (1.0 + (bassPop * 0.35) + (transient * 0.30));
        }
        // ---------------------------------------------------------------------
        // FX 5: 🕺 70s Disco Dancefloor (Clean Saturday Night Fever Floor)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 5) {
            dfMat.uniforms.uTime.value = elapsedTime;
            dfMat.uniforms.uBass.value = bassPop;
            dfMat.uniforms.uBPM.value = currentBPM;
        }
        // ---------------------------------------------------------------------
        // FX 6: ⚡ Dual-Bank Volumetric Searchlights
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 6) {
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
        else if (currentFXIndex === 7) {
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
        else if (currentFXIndex === 8) {
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
        // FX 9: 💃 Silhouette Club Dancers in Glowing Color Box Walls [NEW]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 9) {
            dancerBoxMat.uniforms.uTime.value = elapsedTime;
            dancerBoxMat.uniforms.uBass.value = bassPop;
            dancerBoxMat.uniforms.uMid.value = audio.smoothedMid || 0;
            dancerBoxMat.uniforms.uTreble.value = audio.smoothedTreble || 0;
            dancerBoxMat.uniforms.uBPM.value = currentBPM;
        }
        // ---------------------------------------------------------------------
        // FX 10: 🌅 Synthwave Cyber Grid
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 10) {
            gridPlaneMat.uniforms.uTime.value = elapsedTime;
            gridPlaneMat.uniforms.uBass.value = bassPop;
            gridPlaneMat.uniforms.uMid.value = audio.smoothedMid || 0;
            gridMesh.rotation.z = Math.sin(elapsedTime * 0.15) * 0.035;
            gridMesh.position.x = Math.sin(elapsedTime * 0.12) * 1.2;
        }
        // ---------------------------------------------------------------------
        // FX 11: 🌄 Synthwave Glowing River, Mountains & 80s Sun [NEW]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 11) {
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
        else if (currentFXIndex === 12) {
            matrixMat.uniforms.uTime.value = elapsedTime;
            matrixMat.uniforms.uBass.value = bassPop;
            matrixMat.uniforms.uMid.value = audio.smoothedMid || 0;
            matrixMat.uniforms.uGlitch.value = transient;
        }
        // ---------------------------------------------------------------------
        // FX 13: 👾 Retro Arcade 80s Theme [NEW]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 13) {
            arcadeMat.uniforms.uTime.value = elapsedTime;
            arcadeMat.uniforms.uBass.value = bassPop;
            arcadeMat.uniforms.uMid.value = audio.smoothedMid || 0;
        }
        // ---------------------------------------------------------------------
        // FX 14: 🚀 Warp Speed Starfield
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 14) {
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
        else if (currentFXIndex === 15) {
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
        else if (currentFXIndex === 16) {
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
        else if (currentFXIndex === 17) {
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

        // 3. Subwoofer Spring-Damped Camera Recoil
        if (audio.isOnset) {
            camRecoilZ = -0.32 * audio.bassImpact;
            camRecoilY = (Math.random() - 0.5) * 0.12 * audio.bassImpact;
            camRecoilX = (Math.random() - 0.5) * 0.12 * audio.bassImpact;
        }
        camRecoilX *= 0.88;
        camRecoilY *= 0.88;
        camRecoilZ *= 0.88;

        camera.position.x = THREE.MathUtils.lerp(camera.position.x, camRecoilX, 0.25);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, camRecoilY, 0.25);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 16.0 + camRecoilZ, 0.2);

        // 4. Post-Processing: Crisp Neon Bloom & Transient Glitch (Refined Nightclub Contrast)
        const fxBloomBoost = currentFXIndex === 4 ? (bassPop * 0.12 + transient * 0.10) : (bassPop * 0.18);
        const targetBloom = Math.min(0.70, (0.20 + fxBloomBoost + (manualFlash * 0.45)) * bloomMultiplier);
        bloomPass.strength = bloomMultiplier <= 0.05 ? 0.0 : THREE.MathUtils.lerp(bloomPass.strength, targetBloom, 0.15);

        const targetAberration = (transient > 0.7 ? 0.12 : 0.0) + (manualFlash * 0.4);
        nightclubPass.uniforms.uAberration.value = THREE.MathUtils.lerp(nightclubPass.uniforms.uAberration.value, targetAberration, 0.18);

        const targetGlitch = (transient > 0.85) ? (transient * 0.20) : 0.0;
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
        getCurrentFX: () => currentFXIndex,
        getFXCount: () => fxRoots.length,
        getCurrentSceneColor: () => {
            const colors = [
                '#00ffff', '#ff007f', '#00ffcc', '#ffaa00',
                '#ffd700', '#ff00aa', '#00e5ff', '#ff0033',
                '#ffffff', '#ff0088', '#ff007f', '#ff4500',
                '#00ff66', '#ffff00', '#00ffff', '#9900ff',
                '#00e1ff', '#00ffcc'
            ];
            return colors[currentFXIndex] || '#00ffff';
        }
    };
}
