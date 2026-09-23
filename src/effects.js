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

            // Horizontal scanline slice glitch on heavy bass drops
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

            // Strobe Flash
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

// High-Energy Volumetric Laser Beam Shader (Ultra-Vivid Saturated Color, No Blown-out White Washout)
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
            float dist = abs(vUv.x - 0.5) * 2.0; // 0.0 at center, 1.0 at edge
            
            // Ultra-concentrated filament core
            float core = pow(clamp(1.0 - dist, 0.0, 1.0), 16.0) * (1.0 + uPulse * 2.8);
            
            // Atmospheric outer neon Gaussian glow halo
            float glow = pow(clamp(1.0 - dist, 0.0, 1.0), 2.2);
            
            // Longitudinal attenuation (bright at lens, soft fade at far reach)
            float lengthFade = smoothstep(0.0, 0.035, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
            
            // Traveling high-frequency laser wave
            float wave = sin(vUv.y * 36.0 - uTime * 24.0) * 0.12 + 0.88;
            
            // Retain 100% vibrant saturated color with intense emission rather than washing out to white
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

// Saber DJ Multi-Beam Collimated Blade Shader (Ultra-Vivid Neon Saturation)
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
            
            // Razor-sharp blade profile
            float blade = pow(clamp(1.0 - dist, 0.0, 1.0), 5.5);
            float core = pow(clamp(1.0 - dist, 0.0, 1.0), 24.0) * uCoreBoost;
            
            float lengthFade = smoothstep(0.0, 0.025, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
            float shimmer = sin(vUv.y * 40.0 - uTime * 30.0) * 0.1 + 0.9;
            
            // Preserve rich, vivid color saturation
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

// Fluid Glowing Spectrum Wave Ribbon Shader (Less Wireframe, Highly Responsive)
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

            // Deep audio-reactive wave harmonic displacement across ribbon
            float xPhase = pos.x * 0.22 + uTime * 2.8 + uRibbonIdx * 0.42;
            float bassSwell = sin(pos.x * 0.09 + uTime * 1.5) * (1.6 + uBass * 2.8);
            float midRipple = cos(pos.x * 0.45 - uTime * 3.6 + uRibbonIdx * 0.6) * (0.45 + uMid * 1.6);
            float trebleJitter = sin(pos.x * 1.1 + uTime * 7.0 + uRibbonIdx) * (0.15 + uTreble * 0.9);

            float totalElevation = (bassSwell + midRipple + trebleJitter);
            
            // Soft damp at ribbon ends for floating aesthetic
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
            // Smooth illuminated ribbon gradient
            float edgeDist = abs(vUv.y - 0.5) * 2.0;
            
            // Glowing illuminated edge crests and luminous solid center
            float crestGlow = pow(clamp(1.0 - edgeDist, 0.0, 1.0), 3.2) * 1.7;
            float borderHighlight = smoothstep(0.68, 0.98, edgeDist) * 1.5;

            // Vibrant color sweep along ribbon length and time
            float colorT = sin(vUv.x * 3.1415 + uTime * 0.8 + uRibbonIdx * 0.28) * 0.5 + 0.5;
            vec3 col = colorT < 0.5 ? mix(uColorA, uColorB, colorT * 2.0) : mix(uColorB, uColorC, (colorT - 0.5) * 2.0);
            
            // Elevation reactive luminescence
            col += vec3(0.2, 0.2, 0.3) * clamp(vWave * 0.35, 0.0, 1.0);

            float alpha = (crestGlow + borderHighlight) * (0.8 + uBass * 0.45);
            
            // Soft taper on horizontal ends
            float lenFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
            alpha *= lenFade;

            if (alpha < 0.005) discard;
            gl_FragColor = vec4(col * alpha * (1.3 + uBass * 0.7), alpha);
        }
    `
};

// Liquid-Smooth Flowing Cyberpunk Synthwave Highway & Multi-Palette Terrain Shader
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
            // Smooth flowing anti-aliased cyberpunk grid lines
            vec2 gridScale = vec2(32.0, 48.0);
            vec2 gridUv = vUv * gridScale;
            gridUv.y -= uTime * 0.6;

            vec2 gridFract = abs(fract(gridUv - 0.5) - 0.5);
            vec2 gridDeriv = fwidth(gridUv);
            vec2 gridLines = 1.0 - smoothstep(vec2(0.0), gridDeriv * 1.8, gridFract - 0.038);
            float lineIntensity = max(gridLines.x, gridLines.y);

            // Center speed strip (highway center lane)
            float centerDist = abs(vUv.x - 0.5) * 2.0;
            float centerLane = 1.0 - smoothstep(0.0, 0.035, centerDist);
            float centerDash = step(0.4, fract(gridUv.y * 0.5));
            lineIntensity += centerLane * centerDash * 1.6;

            // Multi-Palette Gradual Color Cycling (4 Distinct Vivid Moods)
            float cycleTime = uTime * 0.08;
            float palettePhase = fract(cycleTime);
            int paletteIndex = int(floor(mod(cycleTime * 4.0, 4.0)));

            // Palette 1: Cyberpunk Neon (Indigo / Hot Magenta / Pure Cyan / Sunset Gold)
            vec3 p1_base = vec3(0.03, 0.015, 0.14);
            vec3 p1_crest = vec3(1.0, 0.0, 0.55);
            vec3 p1_line = vec3(0.0, 1.0, 0.95);
            vec3 p1_strip = vec3(1.0, 0.85, 0.28);

            // Palette 2: Emerald Synth (Deep Navy / Electric Teal / Neon Emerald / Lime Gold)
            vec3 p2_base = vec3(0.01, 0.04, 0.12);
            vec3 p2_crest = vec3(0.0, 0.95, 0.7);
            vec3 p2_line = vec3(0.2, 1.0, 0.45);
            vec3 p2_strip = vec3(0.9, 1.0, 0.3);

            // Palette 3: Solar Flare / Sunset (Deep Obsidian / Molten Tangerine / Hot Coral / Radiant Amber)
            vec3 p3_base = vec3(0.12, 0.02, 0.05);
            vec3 p3_crest = vec3(1.0, 0.25, 0.1);
            vec3 p3_line = vec3(1.0, 0.75, 0.15);
            vec3 p3_strip = vec3(1.0, 0.95, 0.4);

            // Palette 4: Ultraviolet Dream (Deep Midnight / Electric Orchid / Ultraviolet / Neon Pink)
            vec3 p4_base = vec3(0.05, 0.01, 0.15);
            vec3 p4_crest = vec3(0.7, 0.1, 1.0);
            vec3 p4_line = vec3(1.0, 0.2, 0.85);
            vec3 p4_strip = vec3(0.4, 0.9, 1.0);

            vec3 cur_base, cur_crest, cur_line, cur_strip;
            float blendT = fract(cycleTime * 4.0);
            blendT = blendT * blendT * (3.0 - 2.0 * blendT); // Smooth Hermite

            if (paletteIndex == 0) {
                cur_base = mix(p1_base, p2_base, blendT);
                cur_crest = mix(p1_crest, p2_crest, blendT);
                cur_line = mix(p1_line, p2_line, blendT);
                cur_strip = mix(p1_strip, p2_strip, blendT);
            } else if (paletteIndex == 1) {
                cur_base = mix(p2_base, p3_base, blendT);
                cur_crest = mix(p2_crest, p3_crest, blendT);
                cur_line = mix(p2_line, p3_line, blendT);
                cur_strip = mix(p2_strip, p3_strip, blendT);
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

            // Glowing animated grid lines
            vec3 activeLineCol = mix(cur_line, cur_strip, clamp(elevNorm * 1.2 + uBass * 0.3, 0.0, 1.0));
            vec3 finalCol = surfaceCol + activeLineCol * lineIntensity * (1.35 + uBass * 0.75);

            // Atmospheric horizon fade
            float horizonFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
            float sideFade = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
            float alpha = clamp(0.25 + lineIntensity * 0.88, 0.0, 1.0) * horizonFade * sideFade;

            if (alpha < 0.005) discard;
            gl_FragColor = vec4(finalCol * alpha, alpha);
        }
    `
};

// Immersive Full-Screen Spiral Galaxy Cosmic Vortex Shader
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

        // Smooth Procedural Simplex Noise
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
            // Full-screen wide aspect mapping
            vec2 uv = (vUv - 0.5) * vec2(2.6, 1.6);
            float t = uTime * 0.16;

            float r = length(uv);
            float theta = atan(uv.y, uv.x);

            // Deep Inward Vortex Accretion Flow (Camera Diving into the Core)
            float vortexPull = theta - 3.8 * log(max(0.04, r)) - t * 0.7;
            float armProfile1 = pow(clamp(cos(vortexPull) * 0.5 + 0.5, 0.0, 1.0), 4.2);
            float armProfile2 = pow(clamp(cos(vortexPull + 3.14159) * 0.5 + 0.5, 0.0, 1.0), 4.2);
            float spiralArms = (armProfile1 + armProfile2) * smoothstep(1.8, 0.12, r);

            // Dense Swirling Cosmic Gas Filaments
            vec2 swirl = vec2(cos(theta + t * 0.25), sin(theta + t * 0.25)) * r;
            float dustNoise = fbm(swirl * 1.8 + vec2(t * 0.3, t * 0.2));
            float dustFilament = pow(clamp(dustNoise - 0.22, 0.0, 1.0) / 0.78, 2.0) * 0.6;

            // Multi-Color Palette Cycling
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

            // Immense Galaxy Vortex Composition
            vec3 col = c_glow * dustFilament * 0.85;
            col += c_arm * spiralArms * (1.6 + uBass * 0.5);

            // Gravitational Singularity Core & Accretion Halo
            float nucleus = pow(smoothstep(0.42, 0.0, r), 2.8) * (2.6 + uBass * 1.0 + uPulse * 0.6);
            col += c_core * nucleus;

            float alpha = smoothstep(1.9, 0.1, r) * clamp(length(col) * 1.35, 0.0, 0.98);
            if (alpha < 0.005) discard;
            gl_FragColor = vec4(col * alpha, alpha);
        }
    `
};

// Offscreen Circular Round Star / Particle Texture Generator
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

// Offscreen 8-Point Star Lens Flare Generator for Projectors
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

export function createVFXScene(container) {
    const roundStarTex = createRoundStarTexture();

    // 1. Scene, Camera, WebGL Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020208, 0.02);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // 2. Post-Processing Chain
    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,
        0.35,
        0.45
    );

    const nightclubPass = new ShaderPass(NightclubPostFX);
    const outputPass = new OutputPass();

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.addPass(nightclubPass);
    composer.addPass(outputPass);

    // 3. Shared Global Lights
    const ambientLight = new THREE.AmbientLight(0x0a0a14, 1.4);
    scene.add(ambientLight);

    const dirKeyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirKeyLight.position.set(0, 15, 12);
    scene.add(dirKeyLight);

    const lightCyan = new THREE.PointLight(0x00ffff, 2.8, 45);
    lightCyan.position.set(6, 6, 6);
    scene.add(lightCyan);

    const lightMagenta = new THREE.PointLight(0xff007f, 2.8, 45);
    lightMagenta.position.set(-6, -6, 6);
    scene.add(lightMagenta);

    // ==========================================
    // HIGH-CLARITY LOGO & VIDEO LAYER
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
    let logoBaseOpacity = 1.0;
    let logoBaseScale = 1.0;
    let logoBassPulseAmount = 0.35;
    let logoAspectRatio = 16 / 9;
    let logoContrast = 1.35;
    let logoBrightness = 1.05;
    let isShieldActive = true;

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
        depthWrite: false,
        fog: false
    });
    logoShieldMesh = new THREE.Mesh(new THREE.PlaneGeometry(18, 11), shieldMat);
    logoGroup.add(logoShieldMesh);

    // Logo Mesh with High-Clarity Shader
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
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide
    });

    logoMesh = new THREE.Mesh(logoGeo, logoShaderMat);
    logoGroup.add(logoMesh);
    applyLogoPlacement();

    function applyLogoPlacement() {
        if (!logoMesh) return;

        if (logoMode === 'backdrop') {
            logoMesh.position.set(0, 0, -22);
            const w = 58 * logoBaseScale;
            const h = (58 / logoAspectRatio) * logoBaseScale;
            logoMesh.scale.set(w / 16, h / 9, 1);
            logoShaderMat.blending = THREE.AdditiveBlending;
            if (logoShieldMesh) logoShieldMesh.visible = false;
        } else if (logoMode === 'hologram') {
            logoMesh.position.set(0, 0, 3.5);
            const w = 13.5 * logoBaseScale;
            const h = (13.5 / logoAspectRatio) * logoBaseScale;
            logoMesh.scale.set(w / 16, h / 9, 1);
            logoShaderMat.blending = THREE.NormalBlending;

            if (logoShieldMesh) {
                logoShieldMesh.visible = isShieldActive;
                logoShieldMesh.position.set(0, 0, 3.35);
                logoShieldMesh.scale.set((w * 1.35) / 18, (h * 1.4) / 11, 1);
            }
        } else if (logoMode === 'overlay') {
            logoMesh.position.set(0, 0, 11);
            const w = 7.0 * logoBaseScale;
            const h = (7.0 / logoAspectRatio) * logoBaseScale;
            logoMesh.scale.set(w / 16, h / 9, 1);
            logoShaderMat.blending = THREE.NormalBlending;

            if (logoShieldMesh) {
                logoShieldMesh.visible = isShieldActive;
                logoShieldMesh.position.set(0, 0, 10.9);
                logoShieldMesh.scale.set((w * 1.3) / 18, (h * 1.35) / 11, 1);
            }
        }
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

                video.play().catch(e => {
                    console.log("[Logo] Video waiting for user gesture:", e);
                });

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
    // CATEGORIZED VFX BANK: 9 Distinct Scenes
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
    // CATEGORY 1: 📊 EQUALIZERS & SPECTRUM
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 0: PREMIUM 3D STUDIO LED EQUALIZER WALL (Subtle Blended OLED Spectrum)
    // -------------------------------------------------------------------------
    const gEQBars = createFXGroup();
    gEQBars.visible = true;

    const eqCols = 44;
    const eqRows = 16;
    const totalLEDs = eqCols * eqRows;

    const brickGeo = new THREE.BoxGeometry(0.38, 0.28, 0.35);
    const brickMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95
    });
    const ledInstancedMesh = new THREE.InstancedMesh(brickGeo, brickMat, totalLEDs);
    ledInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    gEQBars.add(ledInstancedMesh);

    // Pre-calculate smoothly blended vertical LED tier colors (Subtle OLED Spectrum Ramp)
    const eqRowColors = [];
    const eqColorRamp = [
        { stop: 0.0, color: new THREE.Color(0x00e5ff) }, // Soft Cyan-Teal
        { stop: 0.32, color: new THREE.Color(0x0ea5e9) }, // Sky Blue
        { stop: 0.62, color: new THREE.Color(0xa855f7) }, // Orchid Violet
        { stop: 0.82, color: new THREE.Color(0xf43f5e) }, // Coral Rose
        { stop: 1.0, color: new THREE.Color(0xfbbf24) }  // Warm Amber Gold
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

        // Peak Hold Glowing Cap
        const capGeo = new THREE.BoxGeometry(0.44, 0.12, 0.40);
        const capMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const capMesh = new THREE.Mesh(capGeo, capMat);
        capMesh.position.set(posX, ledBaseY + 0.2, posZ);
        capMesh.rotation.y = angle;
        gEQBars.add(capMesh);
        eqPeakCaps.push({ mesh: capMesh, peakY: ledBaseY + 0.2, peakVel: 0, posX, posZ, angle });
    }

    ledInstancedMesh.instanceMatrix.needsUpdate = true;
    if (ledInstancedMesh.instanceColor) ledInstancedMesh.instanceColor.needsUpdate = true;

    // Dark Mirror Stage Floor (Subtle & Luxurious, No Moving Cyan Cross)
    const eqStageFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 30),
        new THREE.MeshBasicMaterial({ color: 0x04040c, side: THREE.DoubleSide })
    );
    eqStageFloor.rotation.x = -Math.PI / 2;
    eqStageFloor.position.set(0, ledBaseY - 0.05, 0);
    gEQBars.add(eqStageFloor);

    // -------------------------------------------------------------------------
    // FX 1: CIRCULAR SPECTRUM MANDALA
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
        const beamMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(hue, 1.0, 0.55),
            wireframe: false
        });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
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
    // FX 2: FLUID GLOWING WAVE MATRIX (Illuminated Ribbons, Highly Responsive)
    // -------------------------------------------------------------------------
    const gWaveMatrix = createFXGroup();
    const ribbonCount = 16;
    const ribbonSegments = 120;
    const waveRibbonItems = [];

    const ribbonPalettes = [
        { colA: new THREE.Color(0x00ffff), colB: new THREE.Color(0x9900ff), colC: new THREE.Color(0xff007f) },
        { colA: new THREE.Color(0x00ff88), colB: new THREE.Color(0x00e5ff), colC: new THREE.Color(0x7c3aed) },
        { colA: new THREE.Color(0xff0055), colB: new THREE.Color(0xffaa00), colC: new THREE.Color(0x00ffff) },
        { colA: new THREE.Color(0x38bdf8), colB: new THREE.Color(0xf43f5e), colC: new THREE.Color(0xfbbf24) }
    ];

    for (let r = 0; r < ribbonCount; r++) {
        const pal = ribbonPalettes[r % ribbonPalettes.length];
        const rGeo = new THREE.PlaneGeometry(48, 0.42, ribbonSegments, 1);
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
        const posY = -4.0 + r * 0.52;
        const posZ = -r * 1.4 + 2.0;
        rMesh.position.set(0, posY, posZ);
        rMesh.rotation.x = -Math.PI / 3.4;
        gWaveMatrix.add(rMesh);
        waveRibbonItems.push({ mesh: rMesh, mat: rMat, rIdx: r });
    }

    // =========================================================================
    // CATEGORY 2: 🕸️ CYBER HIGHWAY & SYNTHWAVE
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 3: LIQUID-SMOOTH SYNTHWAVE HIGHWAY & MULTI-PALETTE COLOR CYCLING
    // -------------------------------------------------------------------------
    const gGrid = createFXGroup();
    const gridDimX = 96;
    const gridDimY = 120;
    const gridPlaneGeo = new THREE.PlaneGeometry(74, 100, gridDimX, gridDimY);
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

    const horizonLineGeo = new THREE.BufferGeometry();
    const horizonLinePos = new Float32Array([-42, 0, 0, 42, 0, 0]);
    horizonLineGeo.setAttribute('position', new THREE.BufferAttribute(horizonLinePos, 3));
    const horizonLine = new THREE.Line(horizonLineGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 }));
    horizonLine.position.set(0, -4.8, -36.0);
    gGrid.add(horizonLine);

    // =========================================================================
    // CATEGORY 3: 🌌 SPACE & GALAXY
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 4: WARP SPEED STARFIELD (WHITE & RADIANT WARM YELLOW STARS)
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
    // FX 5: SPIRAL GALAXY COSMIC VORTEX (IMMERSIVE FULL-SCREEN 3D ACCRETION DIVE)
    // -------------------------------------------------------------------------
    const gPlasmaNebula = createFXGroup();

    // Full-screen wide nebula plane filling all peripheral screen space
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

    // 1,400 3D Clustered Stars spiraling deep into the singularity funnel
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
        // Exponential distribution: dense clustering near the core, trailing outward
        const rad = 0.5 + Math.pow(Math.random(), 2.0) * 26.0;
        const theta = rad * 0.48 + armOffset + (Math.random() - 0.5) * 0.65;
        const zDepth = -10.0 - (28.0 / (rad + 1.2)); // 3D funnel cone towards singularity

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

    // =========================================================================
    // CATEGORY 4: ⚡ LASERS & CLUB LIGHT SHOW
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 6: DUAL-BANK VOLUMETRIC SEARCHLIGHTS (FULL-BLEED TOP & BOTTOM RIGS)
    // -------------------------------------------------------------------------
    const gLasers = createFXGroup();
    const starburstTex = createStarburstTexture();

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

    // 1. Overhead Laser Projectors at Absolute Top Edge of Screen (y = 12.8, x spread across 45 units)
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

        // Hardware Projector Box
        const pBox = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.85), new THREE.MeshBasicMaterial({ color: 0x111122 }));
        pBox.position.copy(basePos);
        gLasers.add(pBox);

        // Aperture Lens Flare
        const flareMat = new THREE.SpriteMaterial({ map: starburstTex, color: color, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.95 });
        const flareSprite = new THREE.Sprite(flareMat);
        flareSprite.position.copy(basePos);
        flareSprite.scale.set(1.5, 1.5, 1.0);
        gLasers.add(flareSprite);
        laserApertureFlares.push(flareSprite);

        const item = { mesh: beamMesh, basePos, mat: laserMat, color, type: 'top', idx: i };
        topLaserBeams.push(item);
        allLaserBeams.push(item);
    }

    // 2. Stage Floor Laser Projectors at Absolute Bottom Edge of Screen (y = -12.5, x spread across 45 units)
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

        const flareMat = new THREE.SpriteMaterial({ map: starburstTex, color: color, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.95 });
        const flareSprite = new THREE.Sprite(flareMat);
        flareSprite.position.copy(basePos);
        flareSprite.scale.set(1.5, 1.5, 1.0);
        gLasers.add(flareSprite);
        laserApertureFlares.push(flareSprite);

        const item = { mesh: beamMesh, basePos, mat: laserMat, color, type: 'bot', idx: i };
        botLaserBeams.push(item);
        allLaserBeams.push(item);
    }

    // 3. Laser Arena Haze Motes
    const laserHazeCount = 700;
    const laserHazeGeo = new THREE.BufferGeometry();
    const laserHazePos = new Float32Array(laserHazeCount * 3);
    for (let i = 0; i < laserHazeCount * 3; i += 3) {
        laserHazePos[i] = (Math.random() - 0.5) * 48;
        laserHazePos[i + 1] = (Math.random() - 0.5) * 28;
        laserHazePos[i + 2] = (Math.random() - 0.5) * 40 - 8;
    }
    laserHazeGeo.setAttribute('position', new THREE.BufferAttribute(laserHazePos, 3));
    const laserHazeMat = new THREE.PointsMaterial({
        color: 0x00ffcc,
        size: 0.24,
        map: roundStarTex,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.65
    });
    const laserHaze = new THREE.Points(laserHazeGeo, laserHazeMat);
    gLasers.add(laserHaze);

    // -------------------------------------------------------------------------
    // FX 7: SABER MULTI-BEAM DJ FIXTURES (4 PODS, 32 RAZOR BLADES, ULTRA-VIVID)
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
    const saberBeamLength = 52.0;
    const saberBladeGeo = new THREE.CylinderGeometry(0.014, 0.22, saberBeamLength, 8, 1, true);
    saberBladeGeo.translate(0, saberBeamLength / 2, 0);
    saberBladeGeo.rotateX(Math.PI / 2);

    saberPodPositions.forEach((podCfg, pIdx) => {
        const podGroup = new THREE.Group();
        podGroup.position.set(podCfg.x, podCfg.y, podCfg.z);
        gSaberDisco.add(podGroup);

        const podChassis = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 1.0, 0.6, 12),
            new THREE.MeshBasicMaterial({ color: 0x151525 })
        );
        podChassis.rotation.x = Math.PI / 2;
        podGroup.add(podChassis);

        const podRotatingHead = new THREE.Group();
        podGroup.add(podRotatingHead);

        const blades = [];
        const numBladesPerPod = 8;
        for (let b = 0; b < numBladesPerPod; b++) {
            const fanAngle = ((b / (numBladesPerPod - 1)) - 0.5) * (Math.PI * 0.72);
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
            bladeMesh.rotation.x = Math.sin(b * 1.5) * 0.15;
            podRotatingHead.add(bladeMesh);

            const lensMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8),
                new THREE.MeshBasicMaterial({ color: bladeColor })
            );
            lensMesh.rotation.x = Math.PI / 2;
            lensMesh.position.set(Math.sin(fanAngle) * 0.75, 0, Math.cos(fanAngle) * 0.75);
            podRotatingHead.add(lensMesh);

            const bladeItem = { mesh: bladeMesh, mat: bladeMat, baseAngle: fanAngle, color: bladeColor, podIdx: pIdx };
            blades.push(bladeItem);
            saberBladeBeams.push(bladeItem);
        }

        saberPods.push({
            group: podGroup,
            head: podRotatingHead,
            cfg: podCfg,
            blades
        });
    });

    const saberCausticCount = 1200;
    const saberCausticGeo = new THREE.BufferGeometry();
    const saberCausticPos = new Float32Array(saberCausticCount * 3);
    const saberCausticCol = new Float32Array(saberCausticCount * 3);
    const sPalette = [new THREE.Color(0xff007f), new THREE.Color(0x00ffff), new THREE.Color(0xffcc00), new THREE.Color(0x00ff88), new THREE.Color(0xffffff), new THREE.Color(0x9900ff)];

    for (let i = 0; i < saberCausticCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 10.0 + Math.random() * 26.0;

        saberCausticPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        saberCausticPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        saberCausticPos[i * 3 + 2] = r * Math.cos(phi) - 4.5;

        const c = sPalette[i % sPalette.length];
        saberCausticCol[i * 3] = c.r;
        saberCausticCol[i * 3 + 1] = c.g;
        saberCausticCol[i * 3 + 2] = c.b;
    }
    saberCausticGeo.setAttribute('position', new THREE.BufferAttribute(saberCausticPos, 3));
    saberCausticGeo.setAttribute('color', new THREE.BufferAttribute(saberCausticCol, 3));
    const saberCausticMat = new THREE.PointsMaterial({
        size: 0.3,
        map: roundStarTex,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    const saberCaustics = new THREE.Points(saberCausticGeo, saberCausticMat);
    gSaberDisco.add(saberCaustics);

    // -------------------------------------------------------------------------
    // FX 8: STROBE HYPER-RINGS & LASER MATRIX
    // -------------------------------------------------------------------------
    const gRings = createFXGroup();
    const hyperRings = [];
    const ringRadii = [2.5, 4.0, 5.5, 7.0, 8.5];
    const ringColors = [0x00ffff, 0xff007f, 0x00ffcc, 0xffaa00, 0x9900ff];

    ringRadii.forEach((rad, idx) => {
        const hrGeo = new THREE.TorusGeometry(rad, 0.09, 12, 64);
        const hrMat = new THREE.MeshBasicMaterial({ color: ringColors[idx], wireframe: true });
        const hrMesh = new THREE.Mesh(hrGeo, hrMat);
        gRings.add(hrMesh);
        hyperRings.push(hrMesh);
    });

    const centerOcta = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.8, 1),
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
    );
    gRings.add(centerOcta);

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

    // =========================================================================
    // MAIN RENDER LOOP
    // =========================================================================
    function animate(getAudioDataFn) {
        requestAnimationFrame(() => animate(getAudioDataFn));

        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // Audio Data
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

            if (logoMode === 'backdrop') {
                const w = 58 * logoBaseScale * (1.0 + logoPulse * 0.25);
                const h = (58 / logoAspectRatio) * logoBaseScale * (1.0 + logoPulse * 0.25);
                logoMesh.scale.set(w / 16, h / 9, 1);
            } else if (logoMode === 'hologram') {
                const w = 13.5 * logoBaseScale * (1.0 + logoPulse * 0.35);
                const h = (13.5 / logoAspectRatio) * logoBaseScale * (1.0 + logoPulse * 0.35);
                logoMesh.scale.set(w / 16, h / 9, 1);
                logoMesh.position.y = Math.sin(elapsedTime * 1.5) * 0.2;

                if (logoShieldMesh && isShieldActive) {
                    logoShieldMesh.position.y = logoMesh.position.y;
                    logoShieldMesh.scale.set((w * 1.35) / 18, (h * 1.4) / 11, 1);
                }
            } else if (logoMode === 'overlay') {
                const w = 7.0 * logoBaseScale * (1.0 + logoPulse * 0.2);
                const h = (7.0 / logoAspectRatio) * logoBaseScale * (1.0 + logoPulse * 0.2);
                logoMesh.scale.set(w / 16, h / 9, 1);
            }
        }

        // 2. Animate Active Scene
        // ---------------------------------------------------------------------
        // FX 0: PREMIUM 3D STUDIO LED EQUALIZER WALL (Subtle Blended OLED Spectrum)
        // ---------------------------------------------------------------------
        if (currentFXIndex === 0) {
            for (let c = 0; c < eqCols; c++) {
                const binIdx = Math.floor(Math.pow(c / (eqCols - 1), 1.2) * 56) + 1;
                const amp = dataArr[binIdx] ? dataArr[binIdx] / 255 : 0;
                const targetActiveRows = Math.min(eqRows, Math.floor(amp * (eqRows + 2) + (c < 8 ? bassPop * 3 : 0)));

                for (let r = 0; r < eqRows; r++) {
                    const idx = c * eqRows + r;
                    if (r < targetActiveRows) {
                        const activeCol = eqRowColors[r];
                        ledInstancedMesh.setColorAt(idx, activeCol);
                    } else {
                        ledInstancedMesh.setColorAt(idx, colDark);
                    }
                }

                // Peak Cap Physics
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

            if (ledInstancedMesh.instanceColor) {
                ledInstancedMesh.instanceColor.needsUpdate = true;
            }
        }
        // ---------------------------------------------------------------------
        // FX 1: Circular Spectrum Mandala
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
        // FX 2: Fluid Glowing Wave Matrix (Illuminated Ribbons, Highly Responsive)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 2) {
            waveRibbonItems.forEach((item) => {
                item.mat.uniforms.uTime.value = elapsedTime;
                item.mat.uniforms.uBass.value = bassPop;
                item.mat.uniforms.uMid.value = audio.smoothedMid || 0;
                item.mat.uniforms.uTreble.value = audio.smoothedTreble || 0;
            });

            // Smooth undulating whole-group wave camera drift
            gWaveMatrix.position.y = Math.sin(elapsedTime * 0.8) * 0.35 + (bassPop * 0.4);
            gWaveMatrix.rotation.z = Math.sin(elapsedTime * 0.4) * 0.04;
        }
        // ---------------------------------------------------------------------
        // FX 3: Liquid-Smooth Synthwave Highway (Multi-Palette Color Cycling)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 3) {
            gridPlaneMat.uniforms.uTime.value = elapsedTime;
            gridPlaneMat.uniforms.uBass.value = bassPop;
            gridPlaneMat.uniforms.uMid.value = audio.smoothedMid || 0;

            gridMesh.rotation.z = Math.sin(elapsedTime * 0.15) * 0.035;
            gridMesh.position.x = Math.sin(elapsedTime * 0.12) * 1.2;
        }
        // ---------------------------------------------------------------------
        // FX 4: Warp Speed Starfield (White & Warm Radiant Yellow Stars)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 4) {
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
        // FX 5: Spiral Galaxy Cosmic Vortex (Inward Singularity Fly-Through)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 5) {
            plasmaMat.uniforms.uTime.value = elapsedTime;
            plasmaMat.uniforms.uBass.value = bassPop;
            plasmaMat.uniforms.uMid.value = audio.smoothedMid || 0;
            plasmaMat.uniforms.uPulse.value = transient;

            // Animate 3D Stars Spiraling Continuously Inward into the Singularity Cone
            const starPos = vortexStarGeo.attributes.position.array;
            const flowSpeed = (0.35 + bassPop * 0.6 + transient * 0.4) * delta;

            for (let i = 0; i < vortexStarCount; i++) {
                const s = vortexStarData[i];
                
                // Inward radial pull
                s.rad -= s.inwardSpeed * flowSpeed * 3.5;
                if (s.rad < 0.45) {
                    // Respawn at outer galaxy rim for seamless continuous dive
                    s.rad = 22.0 + Math.random() * 6.0;
                }

                // Spiral angular velocity increases near the singularity
                s.theta += (0.5 + (3.2 / (s.rad + 0.6))) * delta * (1.0 + bassPop * 0.5);

                const currentX = Math.cos(s.theta) * s.rad * 1.35;
                const currentY = Math.sin(s.theta) * s.rad * 0.85;
                const currentZ = -10.0 - (28.0 / (s.rad + 1.2));

                starPos[i * 3] = currentX;
                starPos[i * 3 + 1] = currentY;
                starPos[i * 3 + 2] = currentZ;
            }
            vortexStarGeo.attributes.position.needsUpdate = true;

            // Gentle forward zoom into core on heavy beats
            plasmaMesh.scale.setScalar(1.0 + (bassPop * 0.08) + (transient * 0.06));
        }
        // ---------------------------------------------------------------------
        // FX 6: Dual-Bank Volumetric Searchlights (Ultra-Vivid Neon, Full-Bleed Rigs)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 6) {
            const sweepTime = elapsedTime * 1.4;
            const choreoPhase = Math.floor(elapsedTime * 0.15) % 3;
            const fanSpread = Math.sin(sweepTime * 0.5) * 0.5 + 0.5;

            // 1. Overhead Laser Projectors (8 Beams shooting DOWN)
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

                const targetVec = new THREE.Vector3(targetX, targetY, targetZ);
                laser.mesh.lookAt(targetVec);

                laser.mat.uniforms.uTime.value = elapsedTime;
                laser.mat.uniforms.uPulse.value = transient * 0.7 + bassPop * 0.4;
            });

            // 2. Stage Floor Laser Projectors (8 Beams shooting UP)
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

                const targetVec = new THREE.Vector3(targetX, targetY, targetZ);
                laser.mesh.lookAt(targetVec);

                laser.mat.uniforms.uTime.value = elapsedTime;
                laser.mat.uniforms.uPulse.value = transient * 0.7 + bassPop * 0.4;
            });

            // Aperture Lens Flares
            laserApertureFlares.forEach((flare, idx) => {
                const flareScale = (1.25 + bassPop * 0.5 + transient * 0.6) * (Math.sin(elapsedTime * 4.0 + idx) * 0.1 + 0.9);
                flare.scale.set(flareScale, flareScale, 1.0);
            });

            laserHaze.rotation.y += delta * 0.03;
        }
        // ---------------------------------------------------------------------
        // FX 7: Saber Multi-Beam DJ Fixtures (Ultra-Vivid Neon)
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

                    const spreadMod = Math.sin(elapsedTime * 0.5 + bIdx * 0.4) * 0.08;
                    blade.mesh.rotation.y = blade.baseAngle + spreadMod;
                });
            });

            saberCaustics.rotation.y += speed * 0.12;
            saberCaustics.rotation.x += delta * 0.03;
        }
        // ---------------------------------------------------------------------
        // FX 8: Strobe Hyper-Rings & Laser Matrix
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 8) {
            hyperRings.forEach((hr, idx) => {
                const dir = (idx % 2 === 0) ? 1 : -1;
                hr.rotation.x += speed * (0.5 + idx * 0.15) * dir;
                hr.rotation.y += speed * (0.4 + idx * 0.12) * dir;
                hr.rotation.z += delta * (0.2 + idx * 0.05);

                const ringPop = 1.0 + (transient * (0.1 + idx * 0.05)) + (bassPop * 0.1);
                hr.scale.set(ringPop, ringPop, ringPop);
            });
            centerOcta.rotation.x -= delta * 1.2;
            centerOcta.rotation.y += delta * 1.0;
            const octaScale = 1.0 + transient * 0.4 + bassPop * 0.25;
            centerOcta.scale.set(octaScale, octaScale, octaScale);
        }

        // 3. Subwoofer Spring-Damped Camera Recoil (Smooth Physical Bass Thud)
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

        // 4. Post-Processing: Crisp Neon Bloom & Transient Glitch Tearing
        const targetBloom = Math.min(1.4, (0.35 + (bassPop * 0.18) + (manualFlash * 0.6)) * bloomMultiplier);
        bloomPass.strength = bloomMultiplier <= 0.05 ? 0.0 : THREE.MathUtils.lerp(bloomPass.strength, targetBloom, 0.15);

        const targetAberration = (transient > 0.7 ? 0.15 : 0.0) + (manualFlash * 0.5);
        nightclubPass.uniforms.uAberration.value = THREE.MathUtils.lerp(
            nightclubPass.uniforms.uAberration.value,
            targetAberration,
            0.18
        );

        const targetGlitch = (transient > 0.85) ? (transient * 0.25) : 0.0;
        nightclubPass.uniforms.uGlitch.value = THREE.MathUtils.lerp(
            nightclubPass.uniforms.uGlitch.value,
            targetGlitch,
            0.20
        );

        nightclubPass.uniforms.uFlash.value = manualFlash;
        if (manualFlash > 0.01) {
            manualFlash *= 0.82;
        } else {
            manualFlash = 0.0;
        }

        if (beatTriggerPulse > 0.01) {
            beatTriggerPulse *= 0.8;
        } else {
            beatTriggerPulse = 0.0;
        }

        nightclubPass.uniforms.uTime.value = elapsedTime;

        // Controlled Point Lights
        lightCyan.position.x = Math.sin(elapsedTime * 1.5) * 9;
        lightCyan.position.y = Math.cos(elapsedTime * 1.2) * 7;
        lightCyan.intensity = Math.min(4.5, (1.8 + bassPop * 1.2) * (bloomMultiplier + 0.5));

        lightMagenta.position.x = -Math.sin(elapsedTime * 1.3) * 9;
        lightMagenta.position.y = -Math.cos(elapsedTime * 1.1) * 7;
        lightMagenta.intensity = Math.min(4.5, (1.8 + (audio.smoothedMid || 0) * 1.2) * (bloomMultiplier + 0.5));

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
        setLogoBassPulse,
        setLogoContrast,
        setLogoBrightness,
        setLogoBlendMode,
        setLogoShieldVisible,
        getCurrentFX: () => currentFXIndex,
        getFXCount: () => fxRoots.length
    };
}
