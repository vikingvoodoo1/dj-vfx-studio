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
            vec2 offset = (uv - center) * (uAberration * 0.02); // Subtle RGB shift for style without text distortion

            float r = texture2D(tDiffuse, uv + offset).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - offset).b;
            vec3 color = vec3(r, g, b);

            float dist = distance(uv, center);
            float vignette = smoothstep(1.3, 0.4, dist);
            color *= vignette;

            // Flash
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
        uBlendMode: { value: 0 } // 0: Crisp Luma Key (Normal), 1: Additive Holo, 2: Direct
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

            // Contrast & Brightness Enhancer
            vec3 col = texColor.rgb;
            col = (col - 0.5) * uContrast + 0.5 + (uBrightness - 1.0);
            col = clamp(col, 0.0, 1.3);

            float luma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
            float alpha = texColor.a;

            if (uBlendMode == 0) {
                // Crisp Luma Key: Solid, sharp foreground with black knocked out
                float key = smoothstep(uLumaCutoff, uLumaCutoff + uLumaSmooth, luma);
                alpha = alpha * key * uOpacity;
            } else if (uBlendMode == 1) {
                // Additive Hologram
                alpha = alpha * uOpacity;
            } else {
                // Direct Solid
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
        0.5,   // Crisp, subtle base bloom
        0.35,  // Tight bloom radius (no large blurry haze)
        0.45   // High threshold: only intense laser lines glow, scene stays pitch black & sharp
    );

    const nightclubPass = new ShaderPass(NightclubPostFX);
    const outputPass = new OutputPass();

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.addPass(nightclubPass);
    composer.addPass(outputPass);

    // 3. Shared Global Lights (Controlled Intensities)
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
    let logoMode = 'hologram'; // 'hologram', 'backdrop', 'overlay'
    let logoBaseOpacity = 1.0;
    let logoBaseScale = 1.0;
    let logoBassPulseAmount = 0.4;
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

    // Create Logo Mesh with High-Clarity Shader
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
            // Front focus position in front of rotating shapes
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

    // ==========================================
    // FX BANK: 5 Distinct Visual Scenes
    // ==========================================
    const fxRoots = [];
    let currentFXIndex = 0;

    function createFXGroup() {
        const group = new THREE.Group();
        group.visible = false;
        scene.add(group);
        fxRoots.push(group);
        return group;
    }

    // FX 0: Torus
    const gTorus = createFXGroup();
    gTorus.visible = true;

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

    // FX 1: Tunnel
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

    const starCount = 800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
        const radius = 2.0 + Math.random() * 3.5;
        const angle = Math.random() * Math.PI * 2;
        starPos[i] = Math.cos(angle) * radius;
        starPos[i + 1] = Math.sin(angle) * radius;
        starPos[i + 2] = -(Math.random() * tunnelRingCount * tunnelSpacing);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, blending: THREE.AdditiveBlending });
    const tunnelStars = new THREE.Points(starGeo, starMat);
    gTunnel.add(tunnelStars);

    // FX 2: Grid
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

    // FX 3: Orb
    const gOrb = createFXGroup();
    const orbGeo = new THREE.IcosahedronGeometry(4.2, 5);
    const orbBasePositions = orbGeo.attributes.position.array.slice();
    const orbMat = new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        wireframe: true,
        transparent: true,
        opacity: 0.85
    });
    const orbMesh = new THREE.Mesh(orbGeo, orbMat);
    gOrb.add(orbMesh);

    const eqRing1 = new THREE.Mesh(new THREE.RingGeometry(5.8, 5.9, 64), new THREE.MeshBasicMaterial({ color: 0xff007f, side: THREE.DoubleSide }));
    const eqRing2 = new THREE.Mesh(new THREE.RingGeometry(6.4, 6.5, 64), new THREE.MeshBasicMaterial({ color: 0x9900ff, side: THREE.DoubleSide }));
    eqRing2.rotation.x = Math.PI / 2;
    gOrb.add(eqRing1);
    gOrb.add(eqRing2);

    // FX 4: Rings
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

    // Resize Handler
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

    // Animation & Calibration State
    const clock = new THREE.Clock();
    let currentBPM = 126.0;
    let bloomMultiplier = 1.0;
    let manualFlash = 0.0;
    let beatTriggerPulse = 0.0;

    function switchFX(index) {
        if (index >= 0 && index < fxRoots.length) {
            fxRoots.forEach((grp, idx) => {
                grp.visible = (idx === index);
            });
            currentFXIndex = index;
            nightclubPass.uniforms.uAberration.value = 0.4;
            manualFlash = 0.4;
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
        bloomMultiplier = Math.max(0.2, Math.min(3.0, Number(val)));
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
            isOnset: false
        };

        const bassPop = audio.bassImpact || audio.bass || 0;
        const transient = audio.transientImpulse || 0;
        const bps = currentBPM / 60.0;
        const speed = bps * delta;

        // 1. Animate Logo Layer (Physical Scale & Motion Pulse without blinding brightness)
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
        if (currentFXIndex === 0) {
            gTorus.rotation.x += speed * 0.4;
            gTorus.rotation.y += speed * 0.6;
            torusCore.rotation.x -= speed * 1.2;
            torusRing1.rotation.z += speed * 0.5;
            torusRing2.rotation.z -= speed * 0.7;
            torusParticles.rotation.y += delta * 0.05;

            // Scale physics surge on bass
            const scale = 1.0 + (bassPop * 0.5) + (transient * 0.25) + (beatTriggerPulse * 0.15);
            torusKnot.scale.set(scale, scale, scale);
            const coreScale = 1.0 + (audio.smoothedMid || 0) * 0.5;
            torusCore.scale.set(coreScale, coreScale, coreScale);

            const hue = (elapsedTime * 0.06) % 1.0;
            knotMat.color.setHSL(hue, 1.0, 0.55);
            coreMat.color.setHSL((hue + 0.5) % 1.0, 1.0, 0.65);
        }
        else if (currentFXIndex === 1) {
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
        else if (currentFXIndex === 2) {
            const posAttr = gridPlaneGeo.attributes.position;
            const dataArr = audio.dataArray || [];
            for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                const freqSample = dataArr[(i % 32)] ? dataArr[(i % 32)] / 255 : 0;
                const wave = Math.sin(x * 0.3 + elapsedTime * 4.0) * Math.cos(y * 0.2 + elapsedTime * 3.0) * (1.2 + bassPop * 2.2) + (freqSample * 2.0);
                posAttr.setZ(i, wave);
            }
            posAttr.needsUpdate = true;

            const sunScale = 1.0 + (bassPop * 0.3) + (transient * 0.2);
            sunMesh.scale.set(sunScale, sunScale, 1.0);
            sunMat.color.setHSL((elapsedTime * 0.05 + bassPop * 0.2) % 1.0, 1.0, 0.6);
        }
        else if (currentFXIndex === 3) {
            const posAttr = orbGeo.attributes.position;
            const dataArr = audio.dataArray || [];
            const vertCount = posAttr.count;

            for (let i = 0; i < vertCount; i++) {
                const bx = orbBasePositions[i * 3];
                const by = orbBasePositions[i * 3 + 1];
                const bz = orbBasePositions[i * 3 + 2];
                const bin = (i % 64);
                const amp = dataArr[bin] ? (dataArr[bin] / 255) * (1.0 + bassPop * 2.0) : 0;
                const disp = 1.0 + amp * 0.4;
                posAttr.setXYZ(i, bx * disp, by * disp, bz * disp);
            }
            posAttr.needsUpdate = true;

            orbMesh.rotation.x += speed * 0.5;
            orbMesh.rotation.y += speed * 0.8;
            eqRing1.rotation.z += delta * 0.8;
            eqRing2.rotation.x += delta * 0.6;
        }
        else if (currentFXIndex === 4) {
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

        // 3. Post-Processing: Crisp, Tight Neon Bloom (Never Washes Out Scene or Logo)
        const targetBloom = Math.min(1.8, (0.45 + (bassPop * 0.25) + (manualFlash * 0.7)) * bloomMultiplier);
        bloomPass.strength = bloomMultiplier <= 0.05 ? 0.0 : THREE.MathUtils.lerp(bloomPass.strength, targetBloom, 0.2);

        // Subtle Chromatic Aberration Shockwave (doesn't distort text)
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

        // Controlled Point Lights (Steady base illumination)
        lightCyan.position.x = Math.sin(elapsedTime * 2.0) * 10;
        lightCyan.position.y = Math.cos(elapsedTime * 1.5) * 8;
        lightCyan.intensity = Math.min(5.0, (2.2 + bassPop * 1.5) * bloomMultiplier);

        lightMagenta.position.x = -Math.sin(elapsedTime * 1.8) * 10;
        lightMagenta.position.y = -Math.cos(elapsedTime * 1.4) * 8;
        lightMagenta.intensity = Math.min(5.0, (2.2 + (audio.smoothedMid || 0) * 1.5) * bloomMultiplier);

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
        getCurrentFX: () => currentFXIndex
    };
}
