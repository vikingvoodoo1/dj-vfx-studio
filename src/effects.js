import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Custom Nightclub FX Shader (Subtle Chromatic Aberration & Strobe Flash)
const NightclubPostFX = {
    uniforms: {
        tDiffuse: { value: null },
        uAberration: { value: 0.0 },
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
        uniform float uFlash;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
            vec2 center = vec2(0.5, 0.5);
            vec2 uv = vUv;
            vec2 offset = (uv - center) * (uAberration * 0.02);

            float r = texture2D(tDiffuse, uv + offset).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - offset).b;
            vec3 color = vec3(r, g, b);

            float dist = distance(uv, center);
            float vignette = smoothstep(1.3, 0.4, dist);
            color *= vignette;

            // Strobe Flash
            color += vec3(uFlash * 0.75, uFlash * 0.7, uFlash * 0.85);

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

export function createVFXScene(container) {
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

    // 2. Post-Processing Chain (Crisp, High-Contrast Neon Bloom)
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
    const ambientLight = new THREE.AmbientLight(0x0a0a14, 1.2);
    scene.add(ambientLight);

    const lightCyan = new THREE.PointLight(0x00ffff, 2.5, 40);
    lightCyan.position.set(6, 6, 6);
    scene.add(lightCyan);

    const lightMagenta = new THREE.PointLight(0xff007f, 2.5, 40);
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
    // FX 0: 3D STUDIO GRAPHIC EQUALIZER BARS (Linear Stadium Array)
    // -------------------------------------------------------------------------
    const gEQBars = createFXGroup();
    gEQBars.visible = true; // Default active

    const eqBarCount = 32;
    const eqBars = [];
    const eqCaps = [];
    const barSpacing = 0.55;
    const eqStartX = -((eqBarCount - 1) * barSpacing) / 2;

    for (let i = 0; i < eqBarCount; i++) {
        // Base segmented bar
        const bGeo = new THREE.BoxGeometry(0.38, 1.0, 0.38);
        bGeo.translate(0, 0.5, 0); // Origin at base

        const hue = (i / eqBarCount) * 0.7; // Cyan to Magenta gradient
        const bMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(hue, 1.0, 0.5),
            wireframe: false
        });
        const bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.position.set(eqStartX + i * barSpacing, -4.5, -2.0);
        gEQBars.add(bMesh);
        eqBars.push(bMesh);

        // Peak Hold LED Cap
        const capGeo = new THREE.BoxGeometry(0.42, 0.12, 0.42);
        const capMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const capMesh = new THREE.Mesh(capGeo, capMat);
        capMesh.position.set(eqStartX + i * barSpacing, -4.4, -2.0);
        gEQBars.add(capMesh);
        eqCaps.push({ mesh: capMesh, peakY: -4.4, peakVel: 0 });
    }

    // Floor Mirror Grid for Equalizer
    const eqGridFloor = new THREE.GridHelper(30, 30, 0x00ffff, 0x220044);
    eqGridFloor.position.set(0, -4.6, -2.0);
    gEQBars.add(eqGridFloor);

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

    // Inner & Outer Neon Ring Enclosures
    const cRingIn = new THREE.Mesh(new THREE.RingGeometry(circRadius - 0.1, circRadius, 64), new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide }));
    const cRingOut = new THREE.Mesh(new THREE.RingGeometry(circRadius + 3.0, circRadius + 3.05, 64), new THREE.MeshBasicMaterial({ color: 0xff007f, side: THREE.DoubleSide }));
    gCircSpec.add(cRingIn);
    gCircSpec.add(cRingOut);

    // -------------------------------------------------------------------------
    // FX 2: SPECTRUM WAVE MATRIX (Audio Ribbon Horizon)
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
    // FX 3: QUANTUM TORUS KNOT & CORE
    // -------------------------------------------------------------------------
    const gTorus = createFXGroup();
    const knotGeo = new THREE.TorusKnotGeometry(4.2, 1.1, 140, 28);
    const knotMat = new THREE.MeshBasicMaterial({ color: 0x9900ff, wireframe: true });
    const torusKnot = new THREE.Mesh(knotGeo, knotMat);
    gTorus.add(torusKnot);

    const coreGeo = new THREE.IcosahedronGeometry(2.1, 2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    const torusCore = new THREE.Mesh(coreGeo, coreMat);
    gTorus.add(torusCore);

    const ringGeo = new THREE.RingGeometry(6.6, 6.66, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide });
    const torusRing1 = new THREE.Mesh(ringGeo, ringMat);
    const torusRing2 = torusRing1.clone();
    torusRing2.rotation.x = Math.PI / 3;
    torusRing2.rotation.y = Math.PI / 4;
    gTorus.add(torusRing1);
    gTorus.add(torusRing2);

    const pCount = 1500;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pCol = new Float32Array(pCount * 3);
    const colA = new THREE.Color(0xff007f);
    const colB = new THREE.Color(0x00ffff);

    for (let i = 0; i < pCount * 3; i += 3) {
        const r = 8 + Math.random() * 32;
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
    const pMat = new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending });
    const torusParticles = new THREE.Points(pGeo, pMat);
    gTorus.add(torusParticles);

    // -------------------------------------------------------------------------
    // FX 4: SYNTHWAVE CYBER GRID & HORIZON SUN
    // -------------------------------------------------------------------------
    const gGrid = createFXGroup();
    const gridDim = 36;
    const gridPlaneGeo = new THREE.PlaneGeometry(60, 80, gridDim, gridDim);
    const gridPlaneMat = new THREE.MeshBasicMaterial({
        color: 0xff007f,
        wireframe: true,
        transparent: true,
        opacity: 0.9
    });
    const gridMesh = new THREE.Mesh(gridPlaneGeo, gridPlaneMat);
    gridMesh.rotation.x = -Math.PI / 2.2;
    gridMesh.position.y = -5.0;
    gridMesh.position.z = -15.0;
    gGrid.add(gridMesh);

    const sunGeo = new THREE.CircleGeometry(7.0, 32);
    const sunMat = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        wireframe: true,
        side: THREE.DoubleSide
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 2.0, -35.0);
    gGrid.add(sunMesh);

    for (let i = 0; i < 8; i++) {
        const pyrGeo = new THREE.ConeGeometry(2, 6, 4);
        const pyrMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
        const pLeft = new THREE.Mesh(pyrGeo, pyrMat);
        pLeft.position.set(-14 - Math.random() * 4, -2.0, -i * 10);
        gGrid.add(pLeft);

        const pRight = new THREE.Mesh(pyrGeo, pyrMat);
        pRight.position.set(14 + Math.random() * 4, -2.0, -i * 10);
        gGrid.add(pRight);
    }

    // -------------------------------------------------------------------------
    // FX 5: 4D WIREFRAME HYPER-CUBE (Tesseract)
    // -------------------------------------------------------------------------
    const gHyperCube = createFXGroup();
    const outerCube = new THREE.Mesh(
        new THREE.BoxGeometry(7.0, 7.0, 7.0),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
    );
    const innerCube = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 3.5, 3.5),
        new THREE.MeshBasicMaterial({ color: 0xff007f, wireframe: true })
    );
    gHyperCube.add(outerCube);
    gHyperCube.add(innerCube);

    // Connecting Diagonal Vertex Beams
    const tesseractLineGeo = new THREE.BufferGeometry();
    const tesseractLinePositions = new Float32Array(8 * 2 * 3);
    tesseractLineGeo.setAttribute('position', new THREE.BufferAttribute(tesseractLinePositions, 3));
    const tesseractLineMat = new THREE.LineBasicMaterial({ color: 0x00ffcc });
    const tesseractLines = new THREE.LineSegments(tesseractLineGeo, tesseractLineMat);
    gHyperCube.add(tesseractLines);

    // =========================================================================
    // CATEGORY 3: 🌌 SPACE & VORTEX TRAVEL
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 6: WARP SPEED STARFIELD (Hyperspace Drive)
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
        size: 0.22,
        blending: THREE.AdditiveBlending,
        transparent: true
    });
    const warpStarSystem = new THREE.Points(warpStarGeo, warpStarMat);
    gStarfield.add(warpStarSystem);

    // -------------------------------------------------------------------------
    // FX 7: CYBER WARP TUNNEL
    // -------------------------------------------------------------------------
    const gTunnel = createFXGroup();
    const tunnelRings = [];
    const tunnelRingCount = 40;
    const tunnelSpacing = 2.0;

    for (let i = 0; i < tunnelRingCount; i++) {
        const tRingGeo = new THREE.TorusGeometry(5.0 + Math.sin(i * 0.3) * 0.5, 0.08, 8, 36);
        const tRingMat = new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0x00ffff : 0xff007f,
            wireframe: true
        });
        const mesh = new THREE.Mesh(tRingGeo, tRingMat);
        mesh.position.z = -i * tunnelSpacing;
        gTunnel.add(mesh);
        tunnelRings.push(mesh);
    }

    // -------------------------------------------------------------------------
    // FX 8: COSMIC NEBULA GALAXY (Double Spiral Vortex)
    // -------------------------------------------------------------------------
    const gGalaxy = createFXGroup();
    const galCount = 3000;
    const galGeo = new THREE.BufferGeometry();
    const galPos = new Float32Array(galCount * 3);
    const galCol = new Float32Array(galCount * 3);
    const galColA = new THREE.Color(0x00ffff);
    const galColB = new THREE.Color(0xff00aa);

    for (let i = 0; i < galCount; i++) {
        const arm = i % 2;
        const dist = Math.random() * 22;
        const angle = dist * 0.6 + (arm * Math.PI) + (Math.random() - 0.5) * 0.5;

        galPos[i * 3] = Math.cos(angle) * dist;
        galPos[i * 3 + 1] = (Math.random() - 0.5) * (3.0 / (dist * 0.2 + 1));
        galPos[i * 3 + 2] = Math.sin(angle) * dist - 8.0;

        const c = galColA.clone().lerp(galColB, dist / 22);
        galCol[i * 3] = c.r;
        galCol[i * 3 + 1] = c.g;
        galCol[i * 3 + 2] = c.b;
    }
    galGeo.setAttribute('position', new THREE.BufferAttribute(galPos, 3));
    galGeo.setAttribute('color', new THREE.BufferAttribute(galCol, 3));
    const galMat = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, blending: THREE.AdditiveBlending });
    const galaxySystem = new THREE.Points(galGeo, galMat);
    galaxySystem.rotation.x = Math.PI / 4;
    gGalaxy.add(galaxySystem);

    // =========================================================================
    // CATEGORY 4: ⚡ LASERS & CLUB LIGHT SHOW
    // =========================================================================

    // -------------------------------------------------------------------------
    // FX 9: FESTIVAL LASER ARRAY (Stage Sweeping Beams)
    // -------------------------------------------------------------------------
    const gLasers = createFXGroup();
    const laserCount = 18;
    const laserLines = [];
    const laserColors = [0x00ffcc, 0xff0055, 0x00ffff, 0xffaa00, 0x9900ff];

    for (let i = 0; i < laserCount; i++) {
        const lGeo = new THREE.BufferGeometry();
        const lPositions = new Float32Array([0, -8, -5, 0, 15, -40]);
        lGeo.setAttribute('position', new THREE.BufferAttribute(lPositions, 3));
        const lMat = new THREE.LineBasicMaterial({
            color: laserColors[i % laserColors.length],
            linewidth: 2,
            transparent: true,
            opacity: 0.95
        });
        const lLine = new THREE.Line(lGeo, lMat);
        gLasers.add(lLine);
        laserLines.push(lLine);
    }

    // -------------------------------------------------------------------------
    // FX 10: FLASHING DISCO LIGHTS & MOVING HEADS
    // -------------------------------------------------------------------------
    const gDisco = createFXGroup();
    const discoSpotCount = 6;
    const discoSpots = [];
    const discoCones = [];

    for (let i = 0; i < discoSpotCount; i++) {
        const cGeo = new THREE.ConeGeometry(3.5, 20, 16, 1, true);
        cGeo.translate(0, 10, 0);
        cGeo.rotateX(Math.PI / 2);

        const cMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL((i / discoSpotCount), 1.0, 0.5),
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const cMesh = new THREE.Mesh(cGeo, cMat);
        cMesh.position.set(0, 8, -5);
        gDisco.add(cMesh);
        discoCones.push(cMesh);
    }

    // Floating Mirror Ball Dots
    const dotCount = 600;
    const dotGeo = new THREE.BufferGeometry();
    const dotPos = new Float32Array(dotCount * 3);
    for (let i = 0; i < dotCount * 3; i += 3) {
        dotPos[i] = (Math.random() - 0.5) * 45;
        dotPos[i + 1] = (Math.random() - 0.5) * 30;
        dotPos[i + 2] = (Math.random() - 0.5) * 40;
    }
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
    const dotMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, blending: THREE.AdditiveBlending });
    const discoDots = new THREE.Points(dotGeo, dotMat);
    gDisco.add(discoDots);

    // -------------------------------------------------------------------------
    // FX 11: STROBE HYPER-RINGS & LASER MATRIX
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
    let bloomMultiplier = 0.4;
    let manualFlash = 0.0;
    let beatTriggerPulse = 0.0;

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
        // FX 0: 3D Studio Graphic Equalizer Bars
        // ---------------------------------------------------------------------
        if (currentFXIndex === 0) {
            eqBars.forEach((bar, i) => {
                const binIdx = Math.floor((i / eqBarCount) * 48) + 1;
                const rawAmp = dataArr[binIdx] ? dataArr[binIdx] / 255 : 0;
                const targetHeight = Math.max(0.15, rawAmp * 7.5 + (i < 6 ? bassPop * 3.0 : 0));

                bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, targetHeight, 0.35);

                // Peak Cap Physics
                const cap = eqCaps[i];
                const currentTop = -4.5 + bar.scale.y;
                if (currentTop > cap.peakY) {
                    cap.peakY = currentTop;
                    cap.peakVel = 0;
                } else {
                    cap.peakVel += delta * 12.0; // Gravity
                    cap.peakY -= cap.peakVel * delta;
                    if (cap.peakY < -4.4) cap.peakY = -4.4;
                }
                cap.mesh.position.y = cap.peakY + 0.08;
            });
            eqGridFloor.position.z = -2.0 + Math.sin(elapsedTime * 0.5) * 0.5;
        }
        // ---------------------------------------------------------------------
        // FX 1: Circular Spectrum Mandala
        // -------------------------------------------------------------------------
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
        // FX 3: Quantum Torus Knot
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 3) {
            gTorus.rotation.x += speed * 0.4;
            gTorus.rotation.y += speed * 0.6;
            torusCore.rotation.x -= speed * 1.2;
            torusRing1.rotation.z += speed * 0.5;
            torusRing2.rotation.z -= speed * 0.7;
            torusParticles.rotation.y += delta * 0.05;

            const scale = 1.0 + (bassPop * 0.45) + (transient * 0.25);
            torusKnot.scale.set(scale, scale, scale);
            const coreScale = 1.0 + (audio.smoothedMid || 0) * 0.5;
            torusCore.scale.set(coreScale, coreScale, coreScale);

            const hue = (elapsedTime * 0.06) % 1.0;
            knotMat.color.setHSL(hue, 1.0, 0.55);
            coreMat.color.setHSL((hue + 0.5) % 1.0, 1.0, 0.65);
        }
        // ---------------------------------------------------------------------
        // FX 4: Synthwave Grid & Sun
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 4) {
            const posAttr = gridPlaneGeo.attributes.position;
            for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                const freqSample = dataArr[(i % 32)] ? dataArr[(i % 32)] / 255 : 0;
                const wave = Math.sin(x * 0.3 + elapsedTime * 4.0) * Math.cos(y * 0.2 + elapsedTime * 3.0) * (1.0 + bassPop * 1.8) + (freqSample * 1.8);
                posAttr.setZ(i, wave);
            }
            posAttr.needsUpdate = true;

            const sunScale = 1.0 + (bassPop * 0.25) + (transient * 0.15);
            sunMesh.scale.set(sunScale, sunScale, 1.0);
            sunMat.color.setHSL((elapsedTime * 0.05 + bassPop * 0.2) % 1.0, 1.0, 0.6);
        }
        // ---------------------------------------------------------------------
        // FX 5: 4D Wireframe Tesseract
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 5) {
            outerCube.rotation.x += speed * 0.5;
            outerCube.rotation.y += speed * 0.7;
            outerCube.rotation.z += delta * 0.2;

            innerCube.rotation.x -= speed * 0.9;
            innerCube.rotation.y -= speed * 1.1;

            const popScale = 1.0 + bassPop * 0.4 + transient * 0.3;
            outerCube.scale.set(popScale, popScale, popScale);
            innerCube.scale.set(popScale * 0.9, popScale * 0.9, popScale * 0.9);

            // Connect outer and inner vertices
            const pos = tesseractLineGeo.attributes.position.array;
            const b = 3.5 * popScale;
            const ib = 1.75 * popScale * 0.9;
            const corners = [
                [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
                [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
            ];
            corners.forEach((c, idx) => {
                pos[idx * 6] = c[0] * b; pos[idx * 6 + 1] = c[1] * b; pos[idx * 6 + 2] = c[2] * b;
                pos[idx * 6 + 3] = c[0] * ib; pos[idx * 6 + 4] = c[1] * ib; pos[idx * 6 + 5] = c[2] * ib;
            });
            tesseractLineGeo.attributes.position.needsUpdate = true;
        }
        // ---------------------------------------------------------------------
        // FX 6: Warp Speed Starfield
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 6) {
            const positions = warpStarGeo.attributes.position.array;
            const warpVelocity = (30.0 + bassPop * 120.0 + transient * 160.0) * delta;

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
            warpStarSystem.rotation.z += delta * 0.08;
        }
        // ---------------------------------------------------------------------
        // FX 7: Cyber Warp Tunnel
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 7) {
            const tunnelSpeed = (18.0 + (bassPop * 30.0) + (transient * 40.0)) * delta;
            tunnelRings.forEach((ring, idx) => {
                ring.position.z += tunnelSpeed;
                ring.rotation.z += delta * (0.5 + idx * 0.05);

                if (ring.position.z > 5) {
                    ring.position.z -= tunnelRingCount * tunnelSpacing;
                }
                const ringScale = 1.0 + Math.sin(elapsedTime * 4 + idx * 0.2) * 0.12 + (transient * 0.2);
                ring.scale.set(ringScale, ringScale, 1.0);
            });
            gTunnel.rotation.z += delta * 0.15;
        }
        // ---------------------------------------------------------------------
        // FX 8: Cosmic Nebula Galaxy
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 8) {
            galaxySystem.rotation.z += delta * (0.12 + bassPop * 0.3);
            const galScale = 1.0 + bassPop * 0.2;
            galaxySystem.scale.set(galScale, galScale, galScale);
        }
        // ---------------------------------------------------------------------
        // FX 9: Festival Laser Array
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 9) {
            laserLines.forEach((laser, idx) => {
                const pos = laser.geometry.attributes.position.array;
                const fanAngle = ((idx / laserCount) - 0.5) * Math.PI * 1.2;
                const sweep = Math.sin(elapsedTime * 2.5 + idx * 0.4) * 12.0;
                const vertSweep = Math.cos(elapsedTime * 3.0 + idx * 0.3) * 8.0;

                pos[0] = Math.sin(fanAngle) * 14.0;
                pos[1] = -7.0;
                pos[2] = -5.0;

                pos[3] = Math.sin(fanAngle) * 35.0 + sweep;
                pos[4] = 8.0 + vertSweep + (transient * 5.0);
                pos[5] = -35.0;

                laser.geometry.attributes.position.needsUpdate = true;
            });
        }
        // ---------------------------------------------------------------------
        // FX 10: Flashing Disco Lights & Moving Heads
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 10) {
            discoCones.forEach((cone, idx) => {
                const sweepX = Math.sin(elapsedTime * 2.0 + idx * 1.0) * 0.8;
                const sweepY = Math.cos(elapsedTime * 1.8 + idx * 0.9) * 0.8;
                cone.rotation.set(Math.PI / 2 + sweepX, sweepY, 0);

                const flashOpacity = 0.2 + (dataArr[(idx * 8) % 32] / 255) * 0.5 + (transient * 0.4);
                cone.material.opacity = flashOpacity;
            });
            discoDots.rotation.y += delta * 0.4;
            discoDots.rotation.x += delta * 0.2;
        }
        // ---------------------------------------------------------------------
        // FX 11: Strobe Hyper-Rings
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 11) {
            hyperRings.forEach((hr, idx) => {
                const dir = (idx % 2 === 0) ? 1 : -1;
                hr.rotation.x += speed * (0.8 + idx * 0.3) * dir;
                hr.rotation.y += speed * (0.6 + idx * 0.2) * dir;
                hr.rotation.z += delta * (0.4 + idx * 0.1);

                const ringPop = 1.0 + (transient * (0.15 + idx * 0.08)) + (bassPop * 0.15);
                hr.scale.set(ringPop, ringPop, ringPop);
            });
            centerOcta.rotation.x -= delta * 2.0;
            centerOcta.rotation.y += delta * 1.5;
            const octaScale = 1.0 + transient * 0.6 + bassPop * 0.4;
            centerOcta.scale.set(octaScale, octaScale, octaScale);
        }

        // 3. Post-Processing: Crisp, Tight Neon Bloom (Never Washes Out Logo)
        const targetBloom = Math.min(1.8, (0.45 + (bassPop * 0.25) + (manualFlash * 0.7)) * bloomMultiplier);
        bloomPass.strength = bloomMultiplier <= 0.05 ? 0.0 : THREE.MathUtils.lerp(bloomPass.strength, targetBloom, 0.2);

        const targetAberration = (transient * 0.25) + (manualFlash * 0.6);
        nightclubPass.uniforms.uAberration.value = THREE.MathUtils.lerp(
            nightclubPass.uniforms.uAberration.value,
            targetAberration,
            0.25
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
        lightCyan.position.x = Math.sin(elapsedTime * 2.0) * 10;
        lightCyan.position.y = Math.cos(elapsedTime * 1.5) * 8;
        lightCyan.intensity = Math.min(5.0, (2.2 + bassPop * 1.5) * (bloomMultiplier + 0.5));

        lightMagenta.position.x = -Math.sin(elapsedTime * 1.8) * 10;
        lightMagenta.position.y = -Math.cos(elapsedTime * 1.4) * 8;
        lightMagenta.intensity = Math.min(5.0, (2.2 + (audio.smoothedMid || 0) * 1.5) * (bloomMultiplier + 0.5));

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
