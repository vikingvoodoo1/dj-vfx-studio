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

// High-Energy Volumetric Laser Beam Shader
const VolumetricLaserShader = {
    uniforms: {
        uColor: { value: new THREE.Color(0x00ffff) },
        uCoreIntensity: { value: 2.4 },
        uGlowIntensity: { value: 0.9 },
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
            
            // Ultra-bright razor-sharp white core filament
            float core = pow(clamp(1.0 - dist, 0.0, 1.0), 18.0) * (1.0 + uPulse * 2.5);
            
            // Atmospheric outer neon Gaussian glow halo
            float glow = pow(clamp(1.0 - dist, 0.0, 1.0), 2.2);
            
            // Longitudinal attenuation (bright at lens, soft fade at far reach)
            float lengthFade = smoothstep(0.0, 0.035, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
            
            // Traveling high-frequency laser wave
            float wave = sin(vUv.y * 36.0 - uTime * 24.0) * 0.12 + 0.88;
            
            vec3 finalCol = mix(uColor, vec3(1.0, 1.0, 1.0), clamp(core * 0.95, 0.0, 1.0));
            float alpha = (core * uCoreIntensity + glow * uGlowIntensity) * lengthFade * wave;
            
            if (alpha < 0.005) discard;
            gl_FragColor = vec4(finalCol * alpha, alpha);
        }
    `
};

// Festival Liquid Sky Laser Scan Sheet Shader
const LiquidSkyLaserShader = {
    uniforms: {
        uColorA: { value: new THREE.Color(0x00ffcc) },
        uColorB: { value: new THREE.Color(0xff0055) },
        uTime: { value: 0.0 },
        uBass: { value: 0.0 },
        uScanSpeed: { value: 3.5 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        uniform float uTime;
        uniform float uBass;
        void main() {
            vUv = uv;
            vec3 pos = position;
            // Harmonic wave ripple on laser plane
            pos.y += sin(pos.x * 0.35 + uTime * 4.0) * (0.35 + uBass * 1.0) * sin(pos.z * 0.2 + uTime * 2.0);
            vPos = pos;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uTime;
        uniform float uBass;
        uniform float uScanSpeed;
        varying vec2 vUv;
        varying vec3 vPos;

        void main() {
            // High-speed galvo-scanned laser scanlines
            float scanlines = sin(vUv.y * 80.0 - uTime * 20.0) * 0.5 + 0.5;
            float wave1 = sin(vUv.x * 24.0 + uTime * uScanSpeed) * 0.5 + 0.5;
            float wave2 = cos(vUv.y * 18.0 - uTime * 3.0) * 0.5 + 0.5;
            
            float laserGrid = pow(wave1 * wave2, 2.5) * 1.8 + pow(scanlines, 6.0) * 0.8;
            
            float edgeFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) *
                             smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
                             
            vec3 col = mix(uColorA, uColorB, sin(vUv.x * 3.1415 + uTime * 0.8) * 0.5 + 0.5);
            col += vec3(0.5, 0.5, 0.5) * pow(scanlines, 8.0);
            
            float alpha = laserGrid * edgeFade * (0.65 + uBass * 0.5);
            if (alpha < 0.005) discard;
            gl_FragColor = vec4(col * alpha, alpha);
        }
    `
};

// Saber DJ Multi-Beam Collimated Blade Shader
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
            float blade = pow(clamp(1.0 - dist, 0.0, 1.0), 6.0);
            float core = pow(clamp(1.0 - dist, 0.0, 1.0), 28.0) * uCoreBoost;
            
            float lengthFade = smoothstep(0.0, 0.025, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
            float shimmer = sin(vUv.y * 40.0 - uTime * 30.0) * 0.1 + 0.9;
            
            vec3 col = mix(uColor, vec3(1.0, 1.0, 1.0), clamp(core * 0.9, 0.0, 1.0));
            float alpha = (blade * 1.1 + core * 1.8) * lengthFade * shimmer * uIntensity;
            
            if (alpha < 0.005) discard;
            gl_FragColor = vec4(col * alpha, alpha);
        }
    `
};

// Procedural Multi-Color Spiral Galaxy & Cosmic Plasma Shader
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

        // Smooth Procedural Simplex / FBM Noise
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
            float a = 0.52;
            vec2 shift = vec2(100.0);
            mat2 rot = mat2(cos(0.55), sin(0.55), -sin(0.55), cos(0.55));
            for (int i = 0; i < 5; ++i) {
                v += a * (snoise(p) * 0.5 + 0.5);
                p = rot * p * 2.05 + shift;
                a *= 0.5;
            }
            return v;
        }

        void main() {
            vec2 uv = (vUv - 0.5) * 2.4;
            float t = uTime * 0.14;

            float r = length(uv);
            float theta = atan(uv.y, uv.x);

            // Logarithmic 2-Arm Spiral Galaxy Structure
            float spiralAngle = theta - 3.2 * log(max(0.08, r)) - t * 0.5;
            float spiralArms = pow(cos(spiralAngle) * 0.5 + 0.5, 3.0) + pow(cos(spiralAngle + 3.14159) * 0.5 + 0.5, 3.0);
            spiralArms *= smoothstep(1.3, 0.15, r);

            // Multi-tier FBM Cosmic Dust & Nebulae
            vec2 swirl = vec2(cos(theta + t * 0.2), sin(theta + t * 0.2)) * r;
            vec2 q = vec2(fbm(swirl + vec2(0.0, 0.0) + t * 0.35), fbm(swirl + vec2(5.2, 1.3) + t * 0.25));
            vec2 warp = vec2(fbm(swirl + 3.0 * q + vec2(1.7, 9.2) + t * 0.2), fbm(swirl + 3.0 * q + vec2(8.3, 2.8) + t * 0.3));
            float f = fbm(swirl + 2.5 * warp);

            // Dynamic Galaxy Color Palette Cycles smoothly over time
            float colorPhase = sin(uTime * 0.08) * 0.5 + 0.5;

            // Palette 1: Andromeda (Deep Ultraviolet, Electric Cyan, Hot Magenta)
            vec3 p1_deep = vec3(0.02, 0.03, 0.18);
            vec3 p1_arm  = vec3(0.0, 0.9, 0.95);
            vec3 p1_glow = vec3(0.95, 0.05, 0.55);
            vec3 p1_core = vec3(1.0, 0.92, 0.55);

            // Palette 2: Cygnus Lagoon (Cosmic Navy, Emerald Teal, Electric Violet)
            vec3 p2_deep = vec3(0.01, 0.06, 0.16);
            vec3 p2_arm  = vec3(0.0, 0.98, 0.7);
            vec3 p2_glow = vec3(0.65, 0.1, 0.95);
            vec3 p2_core = vec3(0.85, 0.95, 1.0);

            // Palette 3: Solar Flare Galaxy (Deep Crimson, Amber Gold, Hot Coral)
            vec3 p3_deep = vec3(0.18, 0.02, 0.08);
            vec3 p3_arm  = vec3(1.0, 0.65, 0.1);
            vec3 p3_glow = vec3(1.0, 0.18, 0.45);
            vec3 p3_core = vec3(1.0, 0.98, 0.65);

            vec3 c_deep, c_arm, c_glow, c_core;
            if (colorPhase < 0.5) {
                float w = colorPhase * 2.0;
                c_deep = mix(p1_deep, p2_deep, w);
                c_arm  = mix(p1_arm, p2_arm, w);
                c_glow = mix(p1_glow, p2_glow, w);
                c_core = mix(p1_core, p2_core, w);
            } else {
                float w = (colorPhase - 0.5) * 2.0;
                c_deep = mix(p2_deep, p3_deep, w);
                c_arm  = mix(p2_arm, p3_arm, w);
                c_glow = mix(p2_glow, p3_glow, w);
                c_core = mix(p2_core, p3_core, w);
            }

            // Combine galaxy arms, cosmic dust, and core
            vec3 col = mix(c_deep, c_glow, clamp(f * 2.0, 0.0, 1.0));
            col = mix(col, c_arm, clamp(spiralArms * 1.6 + length(q) * 0.6, 0.0, 1.0));

            // Supermassive Galactic Nucleus & Accretion Glow
            float coreGlow = smoothstep(1.3, 0.0, r) * (1.0 + uBass * 0.7 + uPulse * 0.5);
            float nucleus = pow(smoothstep(0.45, 0.0, r), 2.8) * 2.5;
            col += c_core * (nucleus + spiralArms * 0.4);
            col *= coreGlow;

            float alpha = smoothstep(1.4, 0.12, r) * clamp(length(col) * 1.3, 0.0, 1.0);
            if (alpha < 0.005) discard;
            gl_FragColor = vec4(col, alpha);
        }
    `
};

// Offscreen Circular Round Star / Particle Texture Generator (No Square Artifacts)
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

// Offscreen 8-Point Star Lens Flare Generator for Projectors & Mirror Ball Glints
function createStarburstTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const cx = 64;
    const cy = 64;

    // Center radial core
    const radGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 60);
    radGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    radGrad.addColorStop(0.15, 'rgba(200, 255, 255, 0.8)');
    radGrad.addColorStop(0.4, 'rgba(0, 255, 255, 0.3)');
    radGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 128, 128);

    // 8-pointed star rays
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

    // 3. Shared Global Lights & Cinematic PBR Illumination
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
    // CATEGORIZED VFX BANK: 12 Distinct Scenes
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
    // FX 0: PREMIUM 3D STUDIO LED EQUALIZER WALL (Amphitheater Segmented Blocks)
    // -------------------------------------------------------------------------
    const gEQBars = createFXGroup();
    gEQBars.visible = true;

    const eqCols = 44;               // 44 Frequency Columns in an amphitheater curve
    const eqRows = 16;               // 16 Discrete LED Bricks per Column
    const totalLEDs = eqCols * eqRows;

    // InstancedMesh for 704 individual glowing LED Bricks
    const brickGeo = new THREE.BoxGeometry(0.38, 0.28, 0.35);
    const brickMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95
    });
    const ledInstancedMesh = new THREE.InstancedMesh(brickGeo, brickMat, totalLEDs);
    ledInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    gEQBars.add(ledInstancedMesh);

    // Pre-calculate positions & colors for each LED brick
    const dummy = new THREE.Object3D();
    const ledColors = new Float32Array(totalLEDs * 3);
    const ledBaseY = -4.5;
    const eqArcRadius = 18.0;
    const eqArcAngle = Math.PI * 0.92;

    const colCyan = new THREE.Color(0x00ffcc);     // Low tier (1-9)
    const colYellow = new THREE.Color(0xffcc00);   // Mid tier (10-13)
    const colRed = new THREE.Color(0xff0055);      // Peak tier (14-16)
    const colDark = new THREE.Color(0x080c14);     // Inactive off state

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

            // Default dark off color
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

    // Glossy Reflective Stage Floor with Neon Grid
    const eqStageFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 30),
        new THREE.MeshBasicMaterial({ color: 0x050510, side: THREE.DoubleSide })
    );
    eqStageFloor.rotation.x = -Math.PI / 2;
    eqStageFloor.position.set(0, ledBaseY - 0.05, 0);
    gEQBars.add(eqStageFloor);

    const eqFloorGrid = new THREE.GridHelper(40, 40, 0x00ffff, 0x180033);
    eqFloorGrid.position.set(0, ledBaseY - 0.04, 0);
    gEQBars.add(eqFloorGrid);

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
    // FX 2: SPECTRUM WAVE MATRIX
    // -------------------------------------------------------------------------
    const gWaveMatrix = createFXGroup();
    const ribbonCount = 12;
    const ribbonSegments = 60;
    const waveRibbons = [];

    for (let r = 0; r < ribbonCount; r++) {
        const rGeo = new THREE.PlaneGeometry(40, 0.2, ribbonSegments, 1);
        const rMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL((r / ribbonCount) * 0.8, 1.0, 0.55),
            wireframe: true,
            side: THREE.DoubleSide
        });
        const rMesh = new THREE.Mesh(rGeo, rMat);
        rMesh.position.set(0, -3.0 + r * 0.6, -r * 1.5);
        rMesh.rotation.x = -Math.PI / 3;
        gWaveMatrix.add(rMesh);
        waveRibbons.push(rMesh);
    }

    // =========================================================================
    // CATEGORY 2: 🕸️ WIREFRAME GRAPHICS
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 3: QUANTUM CRYSTAL SHARD VORTEX (1,400 INSTANCED SHARDS & SINGULARITY)
    // -------------------------------------------------------------------------
    const gTorus = createFXGroup();
    const shardCount = 1400;

    // Elongated Faceted Diamond Crystal Shard Geometry
    const shardGeo = new THREE.OctahedronGeometry(0.24, 0);
    shardGeo.scale(0.75, 1.85, 0.75);

    // Festival-grade PBR material with high metallic sheen
    const shardMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.18,
        metalness: 0.88,
        flatShading: true,
        wireframe: false
    });

    const shardInstancedMesh = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
    shardInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    gTorus.add(shardInstancedMesh);

    // Dynamic Instance Metadata
    const shardData = [];
    const shardDummy = new THREE.Object3D();
    const shardP = 2; // Torus knot winding p
    const shardQ = 3; // Torus knot winding q
    const shardMajorR = 3.8;
    const shardMinorR = 1.35;

    const shardPalette = [
        new THREE.Color(0x00ffff), // Neon Cyan
        new THREE.Color(0xff007f), // Hot Magenta
        new THREE.Color(0x9900ff), // Ultraviolet
        new THREE.Color(0x00ff88), // Spring Neon Green
        new THREE.Color(0xffcc00), // Electric Gold
        new THREE.Color(0xffffff)  // Diamond White
    ];

    for (let i = 0; i < shardCount; i++) {
        const uBase = i / shardCount;
        const tubeAngle = Math.random() * Math.PI * 2;
        const tubeRadius = 0.25 + Math.random() * 1.35;
        const spinSpeedX = (Math.random() - 0.5) * 4.0;
        const spinSpeedY = (Math.random() - 0.5) * 4.0;
        const spinSpeedZ = (Math.random() - 0.5) * 4.0;
        const baseScale = 0.55 + Math.random() * 0.75;
        const color = shardPalette[i % shardPalette.length].clone();

        shardData.push({
            uBase,
            tubeAngle,
            tubeRadius,
            spinSpeedX,
            spinSpeedY,
            spinSpeedZ,
            rotX: Math.random() * Math.PI,
            rotY: Math.random() * Math.PI,
            rotZ: Math.random() * Math.PI,
            baseScale,
            color
        });

        shardInstancedMesh.setColorAt(i, color);
    }
    if (shardInstancedMesh.instanceColor) shardInstancedMesh.instanceColor.needsUpdate = true;

    // Glowing Singularity Core (Inner faceted gem + outer wireframe shield)
    const coreInnerGeo = new THREE.IcosahedronGeometry(1.6, 1);
    const coreInnerMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        roughness: 0.1,
        metalness: 0.9,
        wireframe: false,
        emissive: 0x004466,
        emissiveIntensity: 0.8
    });
    const torusCoreInner = new THREE.Mesh(coreInnerGeo, coreInnerMat);
    gTorus.add(torusCoreInner);

    const coreWireGeo = new THREE.IcosahedronGeometry(2.3, 1);
    const coreWireMat = new THREE.MeshBasicMaterial({
        color: 0xff007f,
        wireframe: true,
        transparent: true,
        opacity: 0.8
    });
    const torusCoreWire = new THREE.Mesh(coreWireGeo, coreWireMat);
    gTorus.add(torusCoreWire);

    // Planetary Gimbal Quantum Energy Rings
    const ringGeo1 = new THREE.TorusGeometry(6.4, 0.06, 12, 80);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true });
    const torusRing1 = new THREE.Mesh(ringGeo1, ringMat1);
    gTorus.add(torusRing1);

    const ringGeo2 = new THREE.TorusGeometry(5.4, 0.06, 12, 80);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xff007f, wireframe: true });
    const torusRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    torusRing2.rotation.x = Math.PI / 3;
    torusRing2.rotation.y = Math.PI / 4;
    gTorus.add(torusRing2);

    // Ambient Stardust Nebula Field (1,500 particles with round glowing stars)
    const pCount = 1500;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pCol = new Float32Array(pCount * 3);
    const colA = new THREE.Color(0xff007f);
    const colB = new THREE.Color(0x00ffff);

    for (let i = 0; i < pCount * 3; i += 3) {
        const r = 6 + Math.random() * 28;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        pPos[i] = r * Math.sin(phi) * Math.cos(theta);
        pPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        pPos[i + 2] = r * Math.cos(phi);
        const mix = Math.random();
        const c = colA.clone().lerp(colB, mix);
        pCol[i] = c.r; pCol[i + 1] = c.g; pCol[i + 2] = c.b;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const pMat = new THREE.PointsMaterial({
        size: 0.22,
        map: roundStarTex,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const torusParticles = new THREE.Points(pGeo, pMat);
    gTorus.add(torusParticles);

    // -------------------------------------------------------------------------
    // FX 4: SYNTHWAVE CYBER GRID (FLYING OVER TERRAIN & HORIZON LIGHT BARS)
    // -------------------------------------------------------------------------
    const gGrid = createFXGroup();
    const gridDimX = 48;
    const gridDimY = 64;
    const gridPlaneGeo = new THREE.PlaneGeometry(64, 90, gridDimX, gridDimY);
    const gridPlaneMat = new THREE.MeshBasicMaterial({
        color: 0xff007f,
        wireframe: true,
        transparent: true,
        opacity: 0.95
    });
    const gridMesh = new THREE.Mesh(gridPlaneGeo, gridPlaneMat);
    gridMesh.rotation.x = -Math.PI / 2.2;
    gridMesh.position.y = -5.2;
    gridMesh.position.z = -16.0;
    gGrid.add(gridMesh);

    // Horizontal Searchlight Truss / Neon Light Bars on Horizon (Moved from Lasers)
    const horizonTrussTop = new THREE.Mesh(
        new THREE.BoxGeometry(46, 0.45, 0.7),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
    );
    horizonTrussTop.position.set(0, 4.5, -36.0);
    gGrid.add(horizonTrussTop);

    const horizonTrussBot = new THREE.Mesh(
        new THREE.BoxGeometry(46, 0.45, 0.7),
        new THREE.MeshBasicMaterial({ color: 0xff007f, wireframe: true })
    );
    horizonTrussBot.position.set(0, -4.8, -36.0);
    gGrid.add(horizonTrussBot);

    // Dynamic Horizon Stage Light Beacons along the bars (12 Fixtures)
    const horizonBeacons = [];
    const numHBeacons = 12;
    for (let i = 0; i < numHBeacons; i++) {
        const hx = ((i / (numHBeacons - 1)) - 0.5) * 42.0;
        const bCol = i % 2 === 0 ? 0x00ffff : 0xff007f;
        const bMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.4, 0.35),
            new THREE.MeshBasicMaterial({ color: bCol })
        );
        bMesh.position.set(hx, 4.5, -35.6);
        gGrid.add(bMesh);
        horizonBeacons.push(bMesh);
    }

    // Glowing Neon Horizon Line
    const horizonLineGeo = new THREE.BufferGeometry();
    const horizonLinePos = new Float32Array([-40, 0, 0, 40, 0, 0]);
    horizonLineGeo.setAttribute('position', new THREE.BufferAttribute(horizonLinePos, 3));
    const horizonLine = new THREE.Line(horizonLineGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 }));
    horizonLine.position.set(0, -4.8, -36.0);
    gGrid.add(horizonLine);

    // Synthwave flight state
    let synthScrollX = 0;
    let synthScrollY = 0;

    // =========================================================================
    // CATEGORY 3: 🌌 SPACE & NEBULA
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 5: WARP SPEED STARFIELD (ROUND GLOWING STARS)
    // -------------------------------------------------------------------------
    const gStarfield = createFXGroup();
    const warpStarCount = 2500;
    const warpStarGeo = new THREE.BufferGeometry();
    const warpStarPositions = new Float32Array(warpStarCount * 3);
    const warpStarVelocities = new Float32Array(warpStarCount);

    for (let i = 0; i < warpStarCount * 3; i += 3) {
        warpStarPositions[i] = (Math.random() - 0.5) * 60;
        warpStarPositions[i + 1] = (Math.random() - 0.5) * 60;
        warpStarPositions[i + 2] = -Math.random() * 80;
        warpStarVelocities[i / 3] = 0.5 + Math.random() * 1.5;
    }
    warpStarGeo.setAttribute('position', new THREE.BufferAttribute(warpStarPositions, 3));
    const warpStarMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.35,
        map: roundStarTex,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    const warpStarSystem = new THREE.Points(warpStarGeo, warpStarMat);
    gStarfield.add(warpStarSystem);

    // -------------------------------------------------------------------------
    // FX 6: COSMIC SPIRAL GALAXY (ORGANIC MULTI-COLOR NEBULA & ROTATING DISK)
    // -------------------------------------------------------------------------
    const gPlasmaNebula = createFXGroup();

    const plasmaGeo = new THREE.PlaneGeometry(44, 28, 1, 1);
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
    plasmaMesh.position.set(0, 0, -10.0);
    gPlasmaNebula.add(plasmaMesh);

    // 600 Round Stars arranged in Cosmic Spiral Galaxy Arms
    const stardustCount = 600;
    const stardustGeo = new THREE.BufferGeometry();
    const stardustPos = new Float32Array(stardustCount * 3);
    const stardustCol = new Float32Array(stardustCount * 3);
    const starColA = new THREE.Color(0x00ffff);
    const starColB = new THREE.Color(0xff00ff);
    const starColC = new THREE.Color(0xffcc00);

    for (let i = 0; i < stardustCount; i++) {
        const arm = i % 2;
        const armOffset = arm * Math.PI;
        const dist = 0.5 + Math.pow(Math.random(), 1.4) * 15.0;
        const theta = dist * 0.45 + armOffset + (Math.random() - 0.5) * 0.7;

        stardustPos[i * 3] = Math.cos(theta) * dist;
        stardustPos[i * 3 + 1] = Math.sin(theta) * dist * 0.65;
        stardustPos[i * 3 + 2] = (Math.random() - 0.5) * 3.0 - 9.5;

        const mix = Math.random();
        const c = mix < 0.5 ? starColA.clone().lerp(starColB, mix * 2.0) : starColB.clone().lerp(starColC, (mix - 0.5) * 2.0);
        stardustCol[i * 3] = c.r;
        stardustCol[i * 3 + 1] = c.g;
        stardustCol[i * 3 + 2] = c.b;
    }
    stardustGeo.setAttribute('position', new THREE.BufferAttribute(stardustPos, 3));
    stardustGeo.setAttribute('color', new THREE.BufferAttribute(stardustCol, 3));
    const stardustMat = new THREE.PointsMaterial({
        size: 0.28,
        map: roundStarTex,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.85
    });
    const stardustSystem = new THREE.Points(stardustGeo, stardustMat);
    gPlasmaNebula.add(stardustSystem);

    // =========================================================================
    // CATEGORY 4: ⚡ LASERS & CLUB LIGHT SHOW (FESTIVAL GRADE)
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 7: DUAL-BANK VOLUMETRIC SEARCHLIGHTS (8 TOP & 8 BOTTOM RIGS)
    // -------------------------------------------------------------------------
    const gLasers = createFXGroup();
    const starburstTex = createStarburstTexture();

    const topLaserBeams = [];
    const botLaserBeams = [];
    const allLaserBeams = [];
    const laserApertureFlares = [];
    const laserImpactSpots = [];

    const topLaserHues = [0x00ffff, 0xff0055, 0x00ff88, 0xffaa00, 0x00e5ff, 0xff007f, 0x39ff14, 0x00ffff];
    const botLaserHues = [0xff007f, 0x00ffcc, 0xffcc00, 0x00ffff, 0x39ff14, 0x9900ff, 0x00e5ff, 0xffffff];

    const laserBeamLength = 58.0;
    const laserCylinderGeo = new THREE.CylinderGeometry(0.018, 0.28, laserBeamLength, 8, 1, true);
    laserCylinderGeo.translate(0, laserBeamLength / 2, 0);
    laserCylinderGeo.rotateX(Math.PI / 2);

    // 1. Overhead Laser Projectors at Absolute Top of Screen (8 Beams)
    const numTopLasers = 8;
    for (let i = 0; i < numTopLasers; i++) {
        const x = ((i / (numTopLasers - 1)) - 0.5) * 26.0;
        const basePos = new THREE.Vector3(x, 9.8, -6.0);
        const color = new THREE.Color(topLaserHues[i % topLaserHues.length]);

        const laserMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: color },
                uCoreIntensity: { value: 2.5 },
                uGlowIntensity: { value: 0.95 },
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
        const pBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.75), new THREE.MeshBasicMaterial({ color: 0x111122 }));
        pBox.position.copy(basePos);
        gLasers.add(pBox);

        // Aperture Lens Flare
        const flareMat = new THREE.SpriteMaterial({ map: starburstTex, color: color, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9 });
        const flareSprite = new THREE.Sprite(flareMat);
        flareSprite.position.copy(basePos);
        flareSprite.scale.set(1.4, 1.4, 1.0);
        gLasers.add(flareSprite);
        laserApertureFlares.push(flareSprite);

        // Impact Spot
        const impMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
        const impMesh = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.45, 16), impMat);
        gLasers.add(impMesh);
        laserImpactSpots.push(impMesh);

        const item = { mesh: beamMesh, basePos, mat: laserMat, color, type: 'top', idx: i };
        topLaserBeams.push(item);
        allLaserBeams.push(item);
    }

    // 2. Stage Floor Laser Projectors at Absolute Bottom of Screen (8 Beams)
    const numBotLasers = 8;
    for (let i = 0; i < numBotLasers; i++) {
        const x = ((i / (numBotLasers - 1)) - 0.5) * 26.0;
        const basePos = new THREE.Vector3(x, -7.8, -6.0);
        const color = new THREE.Color(botLaserHues[i % botLaserHues.length]);

        const laserMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: color },
                uCoreIntensity: { value: 2.5 },
                uGlowIntensity: { value: 0.95 },
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

        const pBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.75), new THREE.MeshBasicMaterial({ color: 0x111122 }));
        pBox.position.copy(basePos);
        gLasers.add(pBox);

        const flareMat = new THREE.SpriteMaterial({ map: starburstTex, color: color, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9 });
        const flareSprite = new THREE.Sprite(flareMat);
        flareSprite.position.copy(basePos);
        flareSprite.scale.set(1.4, 1.4, 1.0);
        gLasers.add(flareSprite);
        laserApertureFlares.push(flareSprite);

        const impMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
        const impMesh = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.45, 16), impMat);
        gLasers.add(impMesh);
        laserImpactSpots.push(impMesh);

        const item = { mesh: beamMesh, basePos, mat: laserMat, color, type: 'bot', idx: i };
        botLaserBeams.push(item);
        allLaserBeams.push(item);
    }

    // 3. Laser Arena Haze Motes (Round Glowing Particles)
    const laserHazeCount = 700;
    const laserHazeGeo = new THREE.BufferGeometry();
    const laserHazePos = new Float32Array(laserHazeCount * 3);
    for (let i = 0; i < laserHazeCount * 3; i += 3) {
        laserHazePos[i] = (Math.random() - 0.5) * 44;
        laserHazePos[i + 1] = (Math.random() - 0.5) * 24;
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
    // FX 8: SABER MULTI-BEAM DJ FIXTURES (4 PODS, 32 RAZOR BLADES)
    // -------------------------------------------------------------------------
    const gSaberDisco = createFXGroup();

    const saberPods = [];
    const saberBladeBeams = [];
    const saberPodPositions = [
        { x: -12.5, y: 6.8, z: -6.0, rotDir: 1 },  // Top-Left
        { x: 12.5, y: 6.8, z: -6.0, rotDir: -1 },  // Top-Right
        { x: -12.5, y: -4.8, z: -6.0, rotDir: -1 }, // Bottom-Left
        { x: 12.5, y: -4.8, z: -6.0, rotDir: 1 }   // Bottom-Right
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

        // Hardware Housing
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
            const fanAngle = ((b / (numBladesPerPod - 1)) - 0.5) * (Math.PI * 0.72); // ~130 degree fan
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

            // Lens Aperture
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

    // Swirling Reflected Saber Light Dots (Round Caustic Motes)
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
    // FX 9: STROBE HYPER-RINGS & LASER MATRIX
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
        // FX 0: PREMIUM 3D STUDIO LED EQUALIZER WALL
        // ---------------------------------------------------------------------
        if (currentFXIndex === 0) {
            let colorsChanged = false;

            for (let c = 0; c < eqCols; c++) {
                // Map column to frequency bin with logarithmic curve
                const binIdx = Math.floor(Math.pow(c / (eqCols - 1), 1.2) * 56) + 1;
                const amp = dataArr[binIdx] ? dataArr[binIdx] / 255 : 0;
                const targetActiveRows = Math.min(eqRows, Math.floor(amp * (eqRows + 2) + (c < 8 ? bassPop * 3 : 0)));

                for (let r = 0; r < eqRows; r++) {
                    const idx = c * eqRows + r;
                    if (r < targetActiveRows) {
                        // Determine LED Color Tier
                        const activeCol = r < 10 ? colCyan : (r < 14 ? colYellow : colRed);
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
            eqFloorGrid.position.z = -Math.sin(elapsedTime * 0.3) * 1.5;
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
        // FX 2: Spectrum Wave Matrix
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 2) {
            waveRibbons.forEach((ribbon, r) => {
                const posAttr = ribbon.geometry.attributes.position;
                for (let s = 0; s < posAttr.count; s++) {
                    const x = posAttr.getX(s);
                    const bin = Math.abs(Math.floor(s % 32));
                    const sample = dataArr[bin] ? dataArr[bin] / 255 : 0;
                    const wave = Math.sin(x * 0.4 + elapsedTime * 3.0 + r * 0.5) * (0.8 + bassPop * 1.5) + (sample * 2.0);
                    posAttr.setY(s, wave);
                }
                posAttr.needsUpdate = true;
            });
            gWaveMatrix.position.z = Math.sin(elapsedTime) * 1.0;
        }
        // ---------------------------------------------------------------------
        // FX 3: Quantum Crystal Shard Vortex (Instanced Mesh Matrix)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 3) {
            const knotFlowSpeed = elapsedTime * 0.18 + (audio.smoothedBass || 0) * 0.25;
            const bassExpansion = 1.0 + (bassPop * 1.4) + (transient * 0.8);
            const midWave = (audio.smoothedMid || 0) * 2.5;

            // Animate 1,400 Instanced Shards
            for (let i = 0; i < shardCount; i++) {
                const s = shardData[i];
                const u = ((s.uBase + knotFlowSpeed) % 1.0) * Math.PI * 2;

                const qu = shardQ * u;
                const pu = shardP * u;
                const r = shardMajorR + shardMinorR * Math.cos(qu);

                const px = r * Math.cos(pu);
                const py = r * Math.sin(pu);
                const pz = -shardMinorR * 1.8 * Math.sin(qu);

                const dr_du = -shardMinorR * shardQ * Math.sin(qu);
                const tx = dr_du * Math.cos(pu) - r * shardP * Math.sin(pu);
                const ty = dr_du * Math.sin(pu) + r * shardP * Math.cos(pu);
                const tz = -shardMinorR * 1.8 * shardQ * Math.cos(qu);

                const tLen = Math.hypot(tx, ty, tz) || 1.0;
                const ntx = tx / tLen, nty = ty / tLen, ntz = tz / tLen;

                const tubeA = s.tubeAngle + elapsedTime * (0.8 + s.spinSpeedZ * 0.2);
                const currentTubeR = s.tubeRadius * bassExpansion + Math.sin(u * 6.0 + elapsedTime * 4.0) * (0.15 * midWave);

                const nx = -nty, ny = ntx, nz = 0;
                const bx = nty * nz - ntz * ny;
                const by = ntz * nx - ntx * nz;
                const bz = ntx * ny - nty * nx;

                const offX = (nx * Math.cos(tubeA) + bx * Math.sin(tubeA)) * currentTubeR;
                const offY = (ny * Math.cos(tubeA) + by * Math.sin(tubeA)) * currentTubeR;
                const offZ = (nz * Math.cos(tubeA) + bz * Math.sin(tubeA)) * currentTubeR;

                shardDummy.position.set(px + offX, py + offY, pz + offZ);

                s.rotX += s.spinSpeedX * delta * (1.0 + bassPop * 2.0);
                s.rotY += s.spinSpeedY * delta * (1.0 + (audio.smoothedTreble || 0) * 3.0);
                s.rotZ += s.spinSpeedZ * delta;

                shardDummy.rotation.set(s.rotX, s.rotY, s.rotZ);

                const scale = s.baseScale * (1.0 + transient * 0.35 + bassPop * 0.2);
                shardDummy.scale.set(scale, scale * (1.0 + (audio.smoothedTreble || 0) * 0.5), scale);

                shardDummy.updateMatrix();
                shardInstancedMesh.setMatrixAt(i, shardDummy.matrix);
            }
            shardInstancedMesh.instanceMatrix.needsUpdate = true;

            // Animate Singularity Core & Gimbal Rings
            gTorus.rotation.x += speed * 0.3;
            gTorus.rotation.y += speed * 0.5;

            torusCoreInner.rotation.x -= speed * 1.5;
            torusCoreInner.rotation.y += speed * 1.2;
            const coreScale = 1.0 + (audio.smoothedMid || 0) * 0.8 + (transient * 0.4);
            torusCoreInner.scale.setScalar(coreScale);

            torusCoreWire.rotation.x += speed * 0.8;
            torusCoreWire.rotation.z -= speed * 1.0;
            const wireScale = 1.0 + (bassPop * 0.5);
            torusCoreWire.scale.setScalar(wireScale);

            torusRing1.rotation.z += speed * 0.8;
            torusRing1.rotation.x += delta * 0.3;
            torusRing2.rotation.z -= speed * 0.9;
            torusRing2.rotation.y += delta * 0.4;

            torusParticles.rotation.y += delta * 0.08;
            torusParticles.rotation.z += delta * 0.04;
        }
        // ---------------------------------------------------------------------
        // FX 4: Synthwave Cyber Grid (Flying Over Terrain & Horizon Light Bars)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 4) {
            // Smooth forward flight over rolling landscape
            synthScrollY += (14.0 + bassPop * 6.0) * delta;
            synthScrollX += Math.sin(elapsedTime * 0.1) * 3.0 * delta;

            gridMesh.rotation.z = Math.sin(elapsedTime * 0.15) * 0.04;
            gridMesh.position.x = Math.sin(elapsedTime * 0.15) * 1.0;

            const posAttr = gridPlaneGeo.attributes.position;
            for (let i = 0; i < posAttr.count; i++) {
                const origX = posAttr.getX(i);
                const origY = posAttr.getY(i);

                const worldX = origX + synthScrollX;
                const worldY = origY + synthScrollY;

                const freqBin = Math.abs(Math.floor(i % 32));
                const freqSample = dataArr[freqBin] ? dataArr[freqBin] / 255 : 0;

                // Calm rolling mountain ridges
                const hillWave = Math.sin(worldX * 0.14) * Math.cos(worldY * 0.10) * (1.8 + bassPop * 1.5);
                const detailWave = Math.sin(worldX * 0.35 + worldY * 0.25) * (0.5 + freqSample * 0.8);
                posAttr.setZ(i, hillWave + detailWave);
            }
            posAttr.needsUpdate = true;

            // Pulse horizon beacon lights
            horizonBeacons.forEach((b, idx) => {
                const s = 1.0 + Math.sin(elapsedTime * 3.0 + idx * 0.5) * 0.3 + bassPop * 0.4;
                b.scale.set(s, s, 1.0);
            });
        }
        // ---------------------------------------------------------------------
        // FX 5: Warp Speed Starfield
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 5) {
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
        // FX 6: Cosmic Spiral Galaxy (Organic Fluid Dynamics & Rotating Disk)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 6) {
            plasmaMat.uniforms.uTime.value = elapsedTime;
            plasmaMat.uniforms.uBass.value = bassPop;
            plasmaMat.uniforms.uMid.value = audio.smoothedMid || 0;
            plasmaMat.uniforms.uPulse.value = transient;

            stardustSystem.rotation.z -= delta * 0.04;
            const scale = 1.0 + (bassPop * 0.08) + (transient * 0.05);
            plasmaMesh.scale.set(scale, scale, 1.0);
        }
        // ---------------------------------------------------------------------
        // FX 7: Dual-Bank Volumetric Searchlights (Top & Bottom Rigs)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 7) {
            const sweepTime = elapsedTime * 1.5; // Calm, majestic sweep
            const choreoPhase = Math.floor(elapsedTime * 0.15) % 3;
            const fanSpread = Math.sin(sweepTime * 0.5) * 0.5 + 0.5;

            // 1. Overhead Laser Projectors (8 Beams shooting DOWN)
            topLaserBeams.forEach((laser, idx) => {
                const normIdx = (idx / (numTopLasers - 1)) - 0.5;
                let targetX = 0, targetY = 0, targetZ = -22.0;

                if (choreoPhase === 0) {
                    // Scissor Crosshair Sweep into Arena
                    targetX = normIdx * (14.0 + fanSpread * 24.0) + Math.sin(sweepTime + idx * 0.25) * 5.0;
                    targetY = -5.0 + Math.cos(sweepTime * 1.1 + normIdx * 2.0) * 2.5;
                    targetZ = -20.0 + Math.sin(sweepTime * 0.6) * 4.0;
                } else if (choreoPhase === 1) {
                    // Concert Fan Sweep
                    targetX = normIdx * 32.0 + Math.sin(sweepTime * 1.1) * 8.0;
                    targetY = -3.5 + Math.sin(sweepTime * 1.4 + idx * 0.25) * 2.0;
                    targetZ = -22.0;
                } else {
                    // Wave Cascade
                    const waveOffset = Math.sin(sweepTime * 2.0 - idx * 0.5);
                    targetX = normIdx * 28.0;
                    targetY = -3.0 + waveOffset * 4.5;
                    targetZ = -22.0 + waveOffset * 3.0;
                }

                const targetVec = new THREE.Vector3(targetX, targetY, targetZ);
                laser.mesh.lookAt(targetVec);

                laser.mat.uniforms.uTime.value = elapsedTime;
                laser.mat.uniforms.uPulse.value = transient * 0.6 + bassPop * 0.3;

                const splash = laserImpactSpots[idx];
                splash.position.copy(targetVec);
                splash.lookAt(laser.basePos);
                splash.scale.setScalar(1.0 + bassPop * 0.4 + transient * 0.5);
            });

            // 2. Stage Floor Laser Projectors (8 Beams shooting UP)
            botLaserBeams.forEach((laser, idx) => {
                const normIdx = (idx / (numBotLasers - 1)) - 0.5;
                let targetX = 0, targetY = 0, targetZ = -22.0;

                if (choreoPhase === 0) {
                    // Counter-Scissor Upward Fan
                    targetX = -normIdx * (14.0 + fanSpread * 24.0) - Math.sin(sweepTime + idx * 0.25) * 5.0;
                    targetY = 5.5 - Math.cos(sweepTime * 1.1 + normIdx * 2.0) * 2.5;
                    targetZ = -20.0 + Math.cos(sweepTime * 0.6) * 4.0;
                } else if (choreoPhase === 1) {
                    // Counter Parallel Fan
                    targetX = normIdx * 32.0 - Math.sin(sweepTime * 1.1) * 8.0;
                    targetY = 4.5 + Math.cos(sweepTime * 1.4 + idx * 0.25) * 2.0;
                    targetZ = -22.0;
                } else {
                    // Counter Wave Cascade
                    const waveOffset = Math.cos(sweepTime * 2.0 + idx * 0.5);
                    targetX = normIdx * 28.0;
                    targetY = 4.0 + waveOffset * 4.5;
                    targetZ = -22.0 + waveOffset * 3.0;
                }

                const targetVec = new THREE.Vector3(targetX, targetY, targetZ);
                laser.mesh.lookAt(targetVec);

                laser.mat.uniforms.uTime.value = elapsedTime;
                laser.mat.uniforms.uPulse.value = transient * 0.6 + bassPop * 0.3;

                const splash = laserImpactSpots[numTopLasers + idx];
                splash.position.copy(targetVec);
                splash.lookAt(laser.basePos);
                splash.scale.setScalar(1.0 + bassPop * 0.4 + transient * 0.5);
            });

            // Aperture Lens Flares
            laserApertureFlares.forEach((flare, idx) => {
                const flareScale = (1.1 + bassPop * 0.5 + transient * 0.6) * (Math.sin(elapsedTime * 4.0 + idx) * 0.1 + 0.9);
                flare.scale.set(flareScale, flareScale, 1.0);
            });

            laserHaze.rotation.y += delta * 0.03;
        }
        // ---------------------------------------------------------------------
        // FX 8: Saber Multi-Beam DJ Fixtures (Smooth, Majestic Sweeps)
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 8) {
            saberPods.forEach((pod, pIdx) => {
                const dir = pod.cfg.rotDir;
                // Slow, stately rotation for massive fixture feel
                pod.head.rotation.z += speed * (0.35 + pIdx * 0.06) * dir;
                pod.head.rotation.x = Math.sin(elapsedTime * 0.4 + pIdx * 1.2) * 0.45;
                pod.head.rotation.y = Math.cos(elapsedTime * 0.35 + pIdx * 0.9) * 0.40;

                pod.blades.forEach((blade, bIdx) => {
                    blade.mat.uniforms.uTime.value = elapsedTime;
                    const bladeAudio = (transient * 0.8) + (bassPop * 0.4);
                    blade.mat.uniforms.uIntensity.value = 0.85 + bladeAudio * 1.0;
                    blade.mat.uniforms.uCoreBoost.value = 2.4 + (transient * 1.5);

                    const spreadMod = Math.sin(elapsedTime * 0.5 + bIdx * 0.4) * 0.08;
                    blade.mesh.rotation.y = blade.baseAngle + spreadMod;
                });
            });

            // Slow Swirling Caustics
            saberCaustics.rotation.y += speed * 0.12;
            saberCaustics.rotation.x += delta * 0.03;
        }
        // ---------------------------------------------------------------------
        // FX 9: Strobe Hyper-Rings & Laser Matrix
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 9) {
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
