import * as THREE from 'three';

// Custom Nightclub FX Shader (Dynamic Chromatic Aberration, Strobe Flash & Bass Drop Glitch)
export const NightclubPostFX = {
    uniforms: {
        tDiffuse: { value: null },
        uAberration: { value: 0.0 },
        uGlitch: { value: 0.0 },
        uFlash: { value: 0.0 },
        uVignette: { value: 1.0 },
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
        uniform float uVignette;
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

            if (uVignette > 0.01) {
                float dist = distance(vUv, center);
                float vignette = smoothstep(1.35, 0.42, dist);
                color *= mix(1.0, vignette, clamp(uVignette, 0.0, 1.0));
            }

            // Smooth additive full-screen flash on light hit (preserves 3D depth and prevents blank washouts)
            color += vec3(clamp(uFlash, 0.0, 1.0) * 0.75);

            gl_FragColor = vec4(color, 1.0);
        }
    `
};

// High-Contrast Luma-Keyed Logo Shader for Razor-Sharp Visibility
export const HighClarityLogoShader = {
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
export const VolumetricLaserShader = {
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
export const SaberBeamBladeShader = {
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
            float safeEdge = clamp(1.0 - dist, 0.0, 1.0);
            float edge2 = safeEdge * safeEdge;
            float blade = edge2 * edge2; // safeEdge^4
            float core = blade * blade * blade * blade * uCoreBoost; // safeEdge^16
            
            float lengthFade = smoothstep(0.0, 0.03, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
            float shimmer = sin(vUv.y * 50.0 - uTime * 35.0) * 0.15 + 0.85;
            
            vec3 col = uColor * (1.2 + uIntensity * 1.5);
            if (core > 0.85) {
                col = mix(col, vec3(1.0, 1.0, 1.0), clamp((core - 0.85) * 2.0, 0.0, 0.95));
            }

            float alpha = (blade * 1.4 + core * 2.2) * lengthFade * shimmer * uIntensity;
            gl_FragColor = vec4(col * alpha, alpha);
        }
    `
};

// Volumetric Pinspot Beam Shader (Physical Light Ray with Atmospheric Fog, Sharp Core & Impact Bloom)
export const VolumetricPinspotShader = {
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
export const PumpkinVolumetricRaysShader = {
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
export const PumpkinWhiteVuRaysShader = {
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
export const PumpkinWhiteFoggyRaysShader = {
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
export const PumpkinReflectionRaysShader = {
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
export const BonfireNightEmbersShader = {
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
export const BonfireFloorEmbersShader = {
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
export const WawaSenseiGodrayShader = {
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
export const FloorSpotShader = {
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
export const DiscoSilverStarsShader = {
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
            
            // Gentle, smooth organic sinusoidal twinkle per star
            float twinkle = sin(uTime * (aSpeed * 0.6) + aPhase);
            vSparkle = 0.70 + 0.30 * twinkle;

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
export const FloatingAtmosphericFogShader = {
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
export const VHSGlitchTextShader = {
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
export const DualInwardAtmosphericSmokeShader = {
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
export const ProteanCloudsShader = {
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
export const ConcertStageBeamShader = {
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
export const FluidWaveRibbonShader = {
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
export const SmoothSynthwaveShader = {
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
export const SynthwaveRiverMountainShader = {
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
export const RetroSunShader = {
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
export const SynthwaveSkyShader = {
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
export const PlasmaNebulaShader = {
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
export const MatrixCodeRainShader = {
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

// DJ Deck Scrolling Waveforms Shader (Authentic Edison Procedural Incandescent Filament & Dual Deck Architecture)
export const DJDeckWaveformShader = {
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
        uDeck1Progress: { value: 0.35 },
        uDeck2Progress: { value: 0.18 },
        uDeck1Weight: { value: 1.0 },
        uDeck2Weight: { value: 0.0 },
        uPrimaryDeck: { value: 1.0 },
        uDeck2Active: { value: 0.0 },
        uPlayState: { value: 1.0 },
        uZoom: { value: 0.08 },
        uLoopActive: { value: 0.0 },
        uLoopStart: { value: 0.0 },
        uLoopEnd: { value: 0.0 },
        uDeck1SmokePhase: { value: 0.0 },
        uDeck2SmokePhase: { value: 1.0 },
        uTotalBeats: { value: 776.1085 },
        uDeck1TotalBeats: { value: 776.1085 },
        uDeck2TotalBeats: { value: 756.0 }
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
        uniform float uDeck1Progress;
        uniform float uDeck2Progress;
        uniform float uDeck1Weight;
        uniform float uDeck2Weight;
        uniform float uPrimaryDeck;
        uniform float uDeck2Active;
        uniform float uPlayState;
        uniform float uZoom;
        uniform float uLoopActive;
        uniform float uLoopStart;
        uniform float uLoopEnd;
        uniform float uDeck1SmokePhase;
        uniform float uDeck2SmokePhase;
        uniform float uTotalBeats;
        uniform float uDeck1TotalBeats;
        uniform float uDeck2TotalBeats;

        // Fast procedural hash for spark micro-particles
        float fireHash(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
        }

        // Multi-octave fluid convective fire turbulence
        float fireTurbulenceFbm(vec2 p) {
            float f = 0.0;
            f += 0.500 * (sin(p.x * 2.8 + sin(p.y * 3.4)) * 0.5 + 0.5);
            p = p * 2.05 + vec2(1.3, 3.7);
            f += 0.250 * (sin(p.x * 3.6 - sin(p.y * 2.8)) * 0.5 + 0.5);
            p = p * 2.12 - vec2(2.1, 1.4);
            f += 0.125 * (sin(p.x * 5.4 + cos(p.y * 4.1)) * 0.5 + 0.5);
            p = p * 2.0;
            f += 0.0625 * (cos(p.x * 8.2 + p.y * 6.5) * 0.5 + 0.5);
            return f / 0.9375;
        }

        // Procedural Roaring Audio-Reactive Fire Waveform Shader with Multi-Tier Cinders & Smoke Phase-Out Dissolution
        vec4 renderFireWaveform(
            float texU, 
            float absDeckY, 
            float vRow, 
            float totalBeats, 
            vec3 cCore, 
            vec3 cMid, 
            vec3 cBass, 
            vec3 cFlameTip, 
            float weight, 
            float time, 
            float bassImp, 
            float transImp,
            float smokePhase
        ) {
            if (weight <= 0.002 || smokePhase >= 0.998) return vec4(0.0);

            if (texU < 0.0 || texU > 1.0) {
                return vec4(0.0);
            }
            vec4 audioSlice = texture2D(uAudioHistory, vec2(texU, vRow));
            float rawBass = audioSlice.r;
            float rawMid  = audioSlice.g;
            float rawHigh = audioSlice.b;
            float rawHit  = audioSlice.a;

            float beatPos = texU * totalBeats;
            float intraBeat = fract(beatPos);
            float beatEnv = exp(-intraBeat * 3.2) * 0.58 + 0.42;
            float transSpike = exp(-intraBeat * 12.0);

            // 1. Dynamic Convective Fire Updraft & Flame Licking Turbulence
            // Flames lick upwards and outwards from the center baseline
            float fireSpeed = 4.2;
            vec2 fireUV = vec2(texU * 85.0, absDeckY * 9.0 - time * fireSpeed);
            // Lateral licking flutter modulated by audio
            fireUV.x += sin(absDeckY * 16.0 - time * 5.8) * (0.35 + transImp * 0.35);
            float turb = fireTurbulenceFbm(fireUV);

            // Secondary high-speed flame tongue turbulence
            vec2 tongueUV = vec2(texU * 180.0 + sin(time * 7.5) * 2.5, absDeckY * 15.0 - time * 7.2);
            float tongueTurb = fireTurbulenceFbm(tongueUV);

            // 2. Audio-reactive flame envelope with explosive flare attacks
            float bassSurge = (rawBass * 0.94 + rawHit * 0.14 + bassImp * 0.28) * beatEnv;
            float midSurge  = (rawMid  * 0.74 + rawHit * 0.08) * (beatEnv * 0.85 + 0.15);
            float highCrackle = (rawHigh * 0.54 + rawHit * 0.12 + transImp * 0.22) * (transSpike * 0.75 + 0.25);

            float hLow  = clamp(bassSurge + 0.04, 0.03, 0.98);
            float hMid  = clamp(midSurge + 0.02, 0.02, 0.82);
            float hHigh = clamp(highCrackle + 0.015, 0.01, 0.55);

            // Licking flame tongues extending past base envelope
            float flameTongues = (turb * 0.65 + tongueTurb * 0.35) * (0.32 + bassSurge * 0.50 + transSpike * 0.25);
            float hFlame = clamp(hLow * (0.80 + flameTongues * 0.75), 0.03, 1.05);

            // 3. Smoke & Heat Haze Aura beyond flame envelope
            if (absDeckY > hFlame + 0.04) {
                float halo = exp(-(absDeckY - hFlame) * 38.0) * (0.18 + bassSurge * 0.20) * weight * (1.0 - smokePhase);
                vec3 smokeAura = mix(cFlameTip, vec3(0.20, 0.04, 0.01), clamp((absDeckY - hFlame) * 9.0, 0.0, 1.0));
                return vec4(smokeAura * halo, halo * 0.85);
            }

            float lobeU = clamp(absDeckY / max(0.01, hFlame), 0.0, 1.0);

            // 4. Blackbody Fire Thermal Spectrum
            // White-hot plasma core (3400K) -> Molten solar gold -> Blazing fiery amber -> Roaring vermilion fire -> Smoldering flame tips
            vec3 fireCol;
            if (lobeU < 0.16) {
                float f = lobeU / 0.16;
                fireCol = mix(vec3(1.0, 1.0, 0.98), cCore, f);
            } else if (lobeU < 0.48) {
                float f = (lobeU - 0.16) / 0.32;
                fireCol = mix(cCore, cMid, f);
            } else if (lobeU < 0.78) {
                float f = (lobeU - 0.48) / 0.30;
                fireCol = mix(cMid, cBass, f);
            } else {
                float f = (lobeU - 0.78) / 0.22;
                fireCol = mix(cBass, cFlameTip, f);
            }

            // 5. Fire convection streaks & leaping flame tongues modulation
            float flameStrand = smoothstep(0.22, 0.92, turb * 0.72 + tongueTurb * 0.48);
            fireCol *= (0.68 + flameStrand * 0.82);

            // 6. Realistic Multi-Tier Chunky Flying Cinders & Ember Sparks
            // Tier 1: Large Chunky Tumbling Cinders (Random sizes, tumbling oblong shapes, molten cores)
            float totalCinderSpill = 0.0;
            vec2 cinderGrid1 = vec2(texU * 48.0, absDeckY * 14.0 - time * 3.6);
            vec2 cinderCell1 = floor(cinderGrid1);
            float cinderHash1 = fireHash(cinderCell1);
            if (cinderHash1 > 0.80) {
                vec2 cinderFrac = fract(cinderGrid1) - 0.5;
                float cinderAngle = time * (2.8 + cinderHash1 * 4.5) + cinderHash1 * 6.28;
                float cosA = cos(cinderAngle);
                float sinA = sin(cinderAngle);
                vec2 rotFrac = vec2(cinderFrac.x * cosA - cinderFrac.y * sinA, cinderFrac.x * sinA + cinderFrac.y * cosA);
                // Irregular tumbling cinder shape with jagged angular facet
                float cinderDist = length(rotFrac * vec2(1.0, 1.45)) + sin(cinderAngle * 3.0 + rotFrac.x * 8.0) * 0.04;
                // Randomized size: chunky coals up to 3.8x
                float sizeBoost = (cinderHash1 > 0.94) ? 1.65 : 1.0;
                float cinderRadius = (0.22 + (cinderHash1 - 0.80) * 2.6) * sizeBoost;
                if (cinderDist < cinderRadius) {
                    float edge = cinderDist / cinderRadius;
                    vec3 cinderCol = mix(vec3(1.0, 0.98, 0.88), vec3(1.0, 0.42, 0.04), edge * 0.70);
                    // Crusty charred coal edge
                    if (edge > 0.68) {
                        cinderCol = mix(cinderCol, vec3(0.18, 0.05, 0.02), (edge - 0.68) / 0.32);
                    }
                    float cinderGlow = smoothstep(cinderRadius, cinderRadius * 0.15, cinderDist) * (1.2 + bassImp * 1.5);
                    fireCol += cinderCol * cinderGlow;
                    totalCinderSpill = max(totalCinderSpill, cinderGlow * 0.85);
                }
            }

            // Tier 2: Medium Rising Glowing Flecks
            vec2 cinderGrid2 = vec2(texU * 110.0 + sin(time * 3.5) * 2.2, absDeckY * 26.0 - time * 5.8);
            float cinderHash2 = fireHash(floor(cinderGrid2));
            if (cinderHash2 > 0.88) {
                vec2 fFrac = fract(cinderGrid2) - 0.5;
                float fDist = length(fFrac);
                float fRadius = 0.16 + (cinderHash2 - 0.88) * 2.2;
                float fGlow = smoothstep(fRadius, fRadius * 0.20, fDist) * (1.0 + highCrackle * 1.6);
                fireCol += vec3(1.0, 0.76, 0.22) * fGlow;
                totalCinderSpill = max(totalCinderSpill, fGlow * 0.70);
            }

            // Tier 3: Transient Audio-Reactive Micro-Sparks
            vec2 sparkGrid = vec2(texU * 220.0, absDeckY * 42.0 - time * 8.6);
            float sparkCell = fireHash(floor(sparkGrid));
            if (sparkCell > 0.90) {
                vec2 sparkFrac = fract(sparkGrid) - 0.5;
                float sparkDist = length(sparkFrac);
                float sparkIntensity = smoothstep(0.42, 0.05, sparkDist) * (1.3 + transImp * 2.4 + highCrackle * 1.8);
                fireCol += vec3(1.0, 0.98, 0.78) * sparkIntensity;
                totalCinderSpill = max(totalCinderSpill, sparkIntensity * 0.60);
            }

            // 7. White-Hot Fire Spine at zero baseline
            float spine = exp(-absDeckY * 90.0);
            fireCol += vec3(1.0, 0.98, 0.92) * spine * (1.85 + bassImp * 1.35);

            // Anti-aliased outer flame edge mask + leaping cinder spill into air
            float baseFlameMask = 1.0 - smoothstep(hFlame - 0.012, hFlame + 0.006, absDeckY);
            float alpha = clamp(baseFlameMask + totalCinderSpill, 0.0, 1.0);

            // 8. Inactive Deck Smoke Phase-Out Dissolution FX
            // When a deck is not in play, flame cools into smoldering charcoal & dissolves in convective smoke curls
            if (smokePhase > 0.001) {
                // A. Thermal Extinction: White-hot fire cools into smoldering charcoal & dark ash
                vec3 ashSootCol = vec3(0.22, 0.12, 0.07);
                vec3 smokeDustCol = vec3(0.38, 0.32, 0.28);
                vec3 deadFlame = mix(ashSootCol, smokeDustCol, fireTurbulenceFbm(vec2(texU * 42.0, absDeckY * 11.0 - time * 1.9)));
                fireCol = mix(fireCol, deadFlame * (0.35 + 0.65 * (1.0 - smokePhase)), smoothstep(0.04, 0.70, smokePhase));

                // B. Convective Smoke Vortex Erosion: Smoke curls dissolve waveform geometry
                vec2 smokeUV = vec2(texU * 34.0 + sin(absDeckY * 7.5 - time * 2.4) * 0.45, absDeckY * 8.0 - time * 3.4);
                float smokeErosion = fireTurbulenceFbm(smokeUV);
                float dissolveCut = smokePhase * 1.18;
                float smokeMask = smoothstep(dissolveCut - 0.22, dissolveCut + 0.16, smokeErosion + (1.0 - absDeckY) * 0.42);

                alpha *= smokeMask * (1.0 - smokePhase);
                fireCol *= smokeMask;
            }

            return vec4(fireCol * weight, clamp(alpha * weight, 0.0, 1.0));
        }

        void main() {
            vec2 uv = vUv;
            vec3 col = vec3(0.008, 0.012, 0.018);
            float alpha = 0.0;
            float playheadDist = abs(uv.x - 0.5);

            // -----------------------------------------------------------------
            // DENON PRIME 4 MOVING WAVEFORM DISPLAY (Roaring Fire Shader)
            // (Takes up central region: uv.y from ~0.24 to 0.76)
            // -----------------------------------------------------------------
            float waveCenterY = 0.500;
            float waveHalfH   = 0.260;

            if (abs(uv.y - waveCenterY) <= waveHalfH) {
                float normDeckY = (uv.y - waveCenterY) / waveHalfH;
                float absDeckY = abs(normDeckY);
                // Deck 1 UV & Beats (Fixed 32-beat hardware window matching Denon Prime 4 display)
                float bpmVal1 = uBPM;
                float totalTrackBeats1 = (uDeck1TotalBeats > 10.0) ? uDeck1TotalBeats : ((364.0 / 60.0) * bpmVal1);
                float zoomU1 = 32.0 / max(32.0, totalTrackBeats1);
                float texU1 = uDeck1Progress + (uv.x - 0.5) * zoomU1;

                // Deck 2 UV & Beats
                float bpmVal2 = (uDeck2BPM > 40.0) ? uDeck2BPM : uBPM;
                float totalTrackBeats2 = (uDeck2TotalBeats > 10.0) ? uDeck2TotalBeats : ((360.0 / 60.0) * bpmVal2);
                float zoomU2 = 32.0 / max(32.0, totalTrackBeats2);
                float texU2 = uDeck2Progress + (uv.x - 0.5) * zoomU2;

                // Deck 1 Caribbean Bonfire Fire Palette (Solar White Core -> Blazing Amber -> Roaring Scarlet -> Burnt Ruby Ember)
                vec3 cCore1     = vec3(1.00, 0.96, 0.78);
                vec3 cMid1      = vec3(1.00, 0.58, 0.08);
                vec3 cBass1     = vec3(0.96, 0.24, 0.03);
                vec3 cFlameTip1 = vec3(0.45, 0.07, 0.01);

                // Deck 2 Volcanic Dragon Fire Palette (Sunset Champagne Core -> Molten Vermilion -> Electric Ruby -> Volcanic Ember)
                vec3 cCore2     = vec3(1.00, 0.92, 0.82);
                vec3 cMid2      = vec3(1.00, 0.42, 0.10);
                vec3 cBass2     = vec3(0.98, 0.15, 0.06);
                vec3 cFlameTip2 = vec3(0.48, 0.05, 0.02);

                // Compute audio-reactive fire waveforms with smoke phase-out
                vec4 wave1 = renderFireWaveform(
                    texU1, absDeckY, 0.25, totalTrackBeats1,
                    cCore1, cMid1, cBass1, cFlameTip1,
                    uDeck1Weight, uTime, uBass, uTransient,
                    uDeck1SmokePhase
                );

                vec4 wave2 = renderFireWaveform(
                    texU2, absDeckY, 0.75, totalTrackBeats2,
                    cCore2, cMid2, cBass2, cFlameTip2,
                    uDeck2Weight, uTime, uBass, uTransient,
                    uDeck2SmokePhase
                );

                vec3 waveCol = vec3(0.0);
                float waveAlpha = 0.0;

                if (wave1.a > 0.001 && wave2.a > 0.001) {
                    // Both decks blending into dual fire inferno
                    waveCol = wave1.rgb + wave2.rgb * 1.15;
                    waveAlpha = max(wave1.a, wave2.a);
                } else if (wave2.a > 0.001) {
                    // Deck 2 active fire
                    waveCol = wave2.rgb;
                    waveAlpha = wave2.a;
                } else {
                    // Deck 1 active fire
                    waveCol = wave1.rgb;
                    waveAlpha = wave1.a;
                }

                // Dynamic Fire Thermal Flickering
                float time = uTime;
                float cycle = fract(time * 0.217);
                float sag = 0.0;
                if (cycle > 0.12 && cycle < 0.20) {
                    sag -= 0.52 * sin(((cycle - 0.12) / 0.08) * 3.14159);
                } else if (cycle >= 0.20 && cycle < 0.28) {
                    sag += 0.22 * sin(((cycle - 0.20) / 0.08) * 3.14159);
                } else if (cycle > 0.38 && cycle < 0.48) {
                    sag -= 0.68 * sin(((cycle - 0.38) / 0.10) * 3.14159);
                } else if (cycle >= 0.48 && cycle < 0.58) {
                    sag += 0.28 * sin(((cycle - 0.48) / 0.10) * 3.14159);
                } else if (cycle > 0.72 && cycle < 0.80) {
                    sag -= 0.45 * sin(((cycle - 0.72) / 0.08) * 3.14159);
                }
                float hum = sin(time * 314.16) * 0.035 + sin(time * 628.3) * 0.02;
                float wander = sin(time * 7.3) * 0.04 + sin(time * 19.1) * 0.025;
                float flicker = clamp(0.96 + sag + hum + wander, 0.25, 1.32);
                float heat = clamp((flicker - 0.25) / 1.05, 0.0, 1.0);

                // Radiant Center Playhead Pillar of Fire (attenuated when decks are phased out in smoke)
                float deckActivity = clamp(max(1.0 - uDeck1SmokePhase, 1.0 - uDeck2SmokePhase), 0.0, 1.0);
                vec3 flameGold = vec3(1.0, 0.75, 0.22);
                vec3 fireCore = vec3(1.0, 0.98, 0.92);
                vec3 warmHoneyAmber = (uPrimaryDeck == 2.0) ? vec3(1.0, 0.38, 0.10) : vec3(1.0, 0.52, 0.06);

                float playheadCore = (1.0 - smoothstep(0.0, 0.0035, playheadDist)) * deckActivity;
                float playheadHalo = exp(-playheadDist * 55.0) * (0.25 + heat * 0.85) * flicker * deckActivity;

                waveCol += fireCore * playheadCore * 2.8 * flicker + mix(warmHoneyAmber, flameGold, playheadCore) * playheadHalo * 2.2;

                // Fire Refraction & Thermal Sheen near boundaries
                float glassSheen = pow(absDeckY, 12.0) * 0.35 * (0.6 + heat * 0.4) * deckActivity;
                vec3 glassCol = mix(warmHoneyAmber, flameGold, heat);
                waveCol += glassCol * glassSheen;

                // Horizontal Window Border Rails: Fiery ember guidelines
                float windowBorder = (1.0 - smoothstep(0.0, 0.018, abs(absDeckY - 1.0))) * deckActivity;
                waveCol += mix(warmHoneyAmber, flameGold, heat) * windowBorder * (0.50 + heat * 0.45);

                // Horizontal Zero-Line: Radiant ember guideline
                float zeroLine = (1.0 - smoothstep(0.0, 0.015, absDeckY)) * deckActivity;
                waveCol += warmHoneyAmber * zeroLine * (0.18 + heat * 0.26);

                // Smooth horizontal edge fade
                float edgeFade = smoothstep(0.0, 0.035, uv.x) * smoothstep(1.0, 0.965, uv.x);
                float finalAlpha = clamp(waveAlpha + playheadCore + playheadHalo * 0.35 + windowBorder * 0.25 + zeroLine * 0.25 + glassSheen * 0.4, 0.0, 1.0);
                finalAlpha *= edgeFade;

                col = waveCol * edgeFade;
                alpha = finalAlpha;

                gl_FragColor = vec4(col, alpha);
                return;
            }

            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
    `
};

// 70s Disco Dancefloor Shader (Saturday Night Fever Illuminated Tile Grid)
export const DiscoFloorShader = {
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
export const RetroArcadeShader = {
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
export const ParticleStreamShader = {
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


// FX 21 GLSL Shader: Witch Broomstick Magical Plasma Thrust Flame (Single Unified Shaded Effect)
export const WitchBroomThrustShader = {
    uniforms: {
        uTime: { value: 0.0 },
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
        uniform float uIntensity;
        varying vec2 vUv;

        void main() {
            // Coordinate: x = 0 at broom bristles nozzle, x = 1 at flame plume tip
            float x = clamp(1.0 - vUv.x, 0.0, 1.0);
            float y = (vUv.y - 0.5) * 2.0;

            // Sleek aerodynamic teardrop flame width with high-speed exhaust flutter
            float plumeWidth = (1.0 - x * 0.78) * (0.65 + 0.15 * sin(uTime * 34.0 + x * 14.0));
            float coreDist = abs(y) / max(0.015, plumeWidth);

            // Fluid exhaust heat ripples
            float turb = sin(uTime * 46.0 - x * 24.0) * 0.12 + cos(uTime * 30.0 + y * 12.0) * 0.08;
            coreDist += turb * x;

            // Smooth feathered alpha falloff (eliminates all blocky or hard edges!)
            float alpha = smoothstep(1.0, 0.08, coreDist);
            alpha *= smoothstep(1.0, 0.18, x); // Natural tapered plume tip
            alpha = pow(alpha, 1.5) * uIntensity;

            // Single cohesive magical flame gradient:
            // Incandescent white-hot core -> luminous golden fire -> deep fiery amber -> ethereal mystic purple halo
            vec3 coreCol = vec3(1.0, 0.98, 0.92);    // White-hot flame center
            vec3 fireCol = vec3(1.0, 0.56, 0.08);    // Luminous fiery gold
            vec3 amberCol = vec3(0.92, 0.18, 0.04);   // Fiery orange-red ember
            vec3 haloCol = vec3(0.72, 0.14, 0.95);   // Soft ethereal mystic purple aura

            vec3 col = mix(coreCol, fireCol, clamp(coreDist * 1.5, 0.0, 1.0));
            col = mix(col, amberCol, clamp(x * 1.15, 0.0, 1.0));
            col = mix(col, haloCol, clamp(coreDist * 1.6 + x * 0.4 - 0.7, 0.0, 1.0));

            // Shock diamond exhaust pulses along core
            float shock = pow(abs(sin(x * 16.0 - uTime * 28.0)), 7.0) * (1.0 - x) * 1.2;
            col += vec3(shock);

            gl_FragColor = vec4(col * 2.2, alpha * 0.96);
        }
    `
};

