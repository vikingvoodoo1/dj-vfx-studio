import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Custom Nightclub FX Shader (Chromatic Aberration Glitch & Strobe Flash)
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
            vec2 offset = (uv - center) * (uAberration * 0.045);

            // Radial Chromatic Aberration RGB Shift
            float r = texture2D(tDiffuse, uv + offset).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - offset).b;
            vec3 color = vec3(r, g, b);

            // Subdued Vignette for Nightclub Tunnel Focus
            float dist = distance(uv, center);
            float vignette = smoothstep(1.3, 0.4, dist);
            color *= vignette;

            // Strobe flash flashbang injection
            color += vec3(uFlash * 0.75, uFlash * 0.7, uFlash * 0.85);

            gl_FragColor = vec4(color, 1.0);
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
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 2. Post-Processing Chain (RenderPass -> UnrealBloomPass -> NightclubShaderPass -> OutputPass)
    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        2.2,   // Base bloom strength
        0.5,   // Bloom radius
        0.12   // Low threshold so neon wireframes and particles bloom intensely
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

    const lightCyan = new THREE.PointLight(0x00ffff, 4, 40);
    lightCyan.position.set(6, 6, 6);
    scene.add(lightCyan);

    const lightMagenta = new THREE.PointLight(0xff007f, 4, 40);
    lightMagenta.position.set(-6, -6, 6);
    scene.add(lightMagenta);

    // ==========================================
    // FX BANK: 5 Distinct Visual Scenes
    // ==========================================
    const fxRoots = [];
    let currentFXIndex = 0;

    // Helper to register an FX root
    function createFXGroup() {
        const group = new THREE.Group();
        group.visible = false;
        scene.add(group);
        fxRoots.push(group);
        return group;
    }

    // ------------------------------------------
    // FX 0: QUANTUM NEON TORUS & CORE
    // ------------------------------------------
    const gTorus = createFXGroup();
    gTorus.visible = true; // Default scene

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

    // Particle Cloud
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

    // ------------------------------------------
    // FX 1: CYBER WARP TUNNEL (Vortex)
    // ------------------------------------------
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

    // Floating tunnel stars
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

    // ------------------------------------------
    // FX 2: SYNTHWAVE LASER GRID & HORIZON SUN
    // ------------------------------------------
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

    // Horizon Synthwave Sun
    const sunGeo = new THREE.CircleGeometry(7.0, 32);
    const sunMat = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        wireframe: true,
        side: THREE.DoubleSide
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 2.0, -35.0);
    gGrid.add(sunMesh);

    // Side Monolith Pyramids
    const pyramids = [];
    for (let i = 0; i < 8; i++) {
        const pyrGeo = new THREE.ConeGeometry(2, 6, 4);
        const pyrMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
        const pLeft = new THREE.Mesh(pyrGeo, pyrMat);
        pLeft.position.set(-14 - Math.random() * 4, -2.0, -i * 10);
        gGrid.add(pLeft);
        pyramids.push(pLeft);

        const pRight = new THREE.Mesh(pyrGeo, pyrMat);
        pRight.position.set(14 + Math.random() * 4, -2.0, -i * 10);
        gGrid.add(pRight);
        pyramids.push(pRight);
    }

    // ------------------------------------------
    // FX 3: AUDIO SPECTRUM ORB (FFT Deformed Sphere)
    // ------------------------------------------
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

    // Orbit Equator Laser Rings
    const eqRing1 = new THREE.Mesh(new THREE.RingGeometry(5.8, 5.9, 64), new THREE.MeshBasicMaterial({ color: 0xff007f, side: THREE.DoubleSide }));
    const eqRing2 = new THREE.Mesh(new THREE.RingGeometry(6.4, 6.5, 64), new THREE.MeshBasicMaterial({ color: 0x9900ff, side: THREE.DoubleSide }));
    eqRing2.rotation.x = Math.PI / 2;
    gOrb.add(eqRing1);
    gOrb.add(eqRing2);

    // ------------------------------------------
    // FX 4: STROBE HYPER-RINGS & LASER MATRIX
    // ------------------------------------------
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

    // Central Laser Diamond
    const centerOcta = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.8, 1),
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
    );
    gRings.add(centerOcta);

    // ------------------------------------------
    // Window Resize Handler
    // ------------------------------------------
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

    // ------------------------------------------
    // Animation Controller & Calibration State
    // ------------------------------------------
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
            // Visual switch punch
            nightclubPass.uniforms.uAberration.value = 0.8;
            manualFlash = 0.6;
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
        bloomMultiplier = Math.max(0.2, Math.min(4.0, Number(val)));
    }

    function animate(getAudioDataFn) {
        requestAnimationFrame(() => animate(getAudioDataFn));

        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // 1. Fetch Audio Analysis
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

        // 2. Animate Active Scene
        if (currentFXIndex === 0) {
            // FX 0: Torus
            gTorus.rotation.x += speed * 0.4;
            gTorus.rotation.y += speed * 0.6;
            torusCore.rotation.x -= speed * 1.2;
            torusRing1.rotation.z += speed * 0.5;
            torusRing2.rotation.z -= speed * 0.7;
            torusParticles.rotation.y += delta * 0.05;

            // Explosive scale pop on transient kick
            const scale = 1.0 + (bassPop * 0.65) + (transient * 0.35) + (beatTriggerPulse * 0.2);
            torusKnot.scale.set(scale, scale, scale);
            const coreScale = 1.0 + (audio.smoothedMid || 0) * 0.7;
            torusCore.scale.set(coreScale, coreScale, coreScale);

            // Dynamic Neon Color Hue Shift
            const hue = (elapsedTime * 0.06) % 1.0;
            knotMat.color.setHSL(hue, 1.0, 0.55);
            coreMat.color.setHSL((hue + 0.5) % 1.0, 1.0, 0.65);
        }
        else if (currentFXIndex === 1) {
            // FX 1: Cyber Warp Tunnel
            const tunnelSpeed = (18.0 + (bassPop * 40.0) + (transient * 50.0)) * delta;
            tunnelRings.forEach((ring, idx) => {
                ring.position.z += tunnelSpeed;
                ring.rotation.z += delta * (0.5 + idx * 0.05);

                // Recycle ring once past camera
                if (ring.position.z > 5) {
                    ring.position.z -= tunnelRingCount * tunnelSpacing;
                }
                const ringScale = 1.0 + Math.sin(elapsedTime * 4 + idx * 0.2) * 0.15 + (transient * 0.3);
                ring.scale.set(ringScale, ringScale, 1.0);
            });
            gTunnel.rotation.z += delta * 0.15;
        }
        else if (currentFXIndex === 2) {
            // FX 2: Synthwave Grid & Sun
            const posAttr = gridPlaneGeo.attributes.position;
            const dataArr = audio.dataArray || [];
            for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                const freqSample = dataArr[(i % 32)] ? dataArr[(i % 32)] / 255 : 0;
                const wave = Math.sin(x * 0.3 + elapsedTime * 4.0) * Math.cos(y * 0.2 + elapsedTime * 3.0) * (1.5 + bassPop * 3.0) + (freqSample * 2.5);
                posAttr.setZ(i, wave);
            }
            posAttr.needsUpdate = true;

            const sunScale = 1.0 + (bassPop * 0.4) + (transient * 0.3);
            sunMesh.scale.set(sunScale, sunScale, 1.0);
            sunMat.color.setHSL((elapsedTime * 0.05 + bassPop * 0.2) % 1.0, 1.0, 0.6);
        }
        else if (currentFXIndex === 3) {
            // FX 3: Spectrum Orb (FFT Displacement)
            const posAttr = orbGeo.attributes.position;
            const dataArr = audio.dataArray || [];
            const vertCount = posAttr.count;

            for (let i = 0; i < vertCount; i++) {
                const bx = orbBasePositions[i * 3];
                const by = orbBasePositions[i * 3 + 1];
                const bz = orbBasePositions[i * 3 + 2];
                const bin = (i % 64);
                const amp = dataArr[bin] ? (dataArr[bin] / 255) * (1.2 + bassPop * 2.5) : 0;
                const disp = 1.0 + amp * 0.45;

                posAttr.setXYZ(i, bx * disp, by * disp, bz * disp);
            }
            posAttr.needsUpdate = true;

            orbMesh.rotation.x += speed * 0.5;
            orbMesh.rotation.y += speed * 0.8;
            eqRing1.rotation.z += delta * 0.8;
            eqRing2.rotation.x += delta * 0.6;
        }
        else if (currentFXIndex === 4) {
            // FX 4: Strobe Hyper-Rings
            hyperRings.forEach((hr, idx) => {
                const dir = (idx % 2 === 0) ? 1 : -1;
                hr.rotation.x += speed * (0.8 + idx * 0.3) * dir;
                hr.rotation.y += speed * (0.6 + idx * 0.2) * dir;
                hr.rotation.z += delta * (0.4 + idx * 0.1);

                const ringPop = 1.0 + (transient * (0.2 + idx * 0.1)) + (bassPop * 0.2);
                hr.scale.set(ringPop, ringPop, ringPop);
            });
            centerOcta.rotation.x -= delta * 2.0;
            centerOcta.rotation.y += delta * 1.5;
            const octaScale = 1.0 + transient * 0.8 + bassPop * 0.5;
            centerOcta.scale.set(octaScale, octaScale, octaScale);
        }

        // 3. Post-Processing Dynamic Nightclub Glow & Chromatic Shockwave
        // Dynamic Bloom Strength based on bass pops
        const targetBloom = (1.8 + (bassPop * 2.2) + (transient * 2.0) + (manualFlash * 2.0)) * bloomMultiplier;
        bloomPass.strength = THREE.MathUtils.lerp(bloomPass.strength, targetBloom, 0.25);

        // Chromatic Aberration Spike on Kick / Bass Drops
        const targetAberration = (transient * 1.2) + (bassPop > 0.7 ? 0.6 : 0.0) + (manualFlash * 1.0);
        nightclubPass.uniforms.uAberration.value = THREE.MathUtils.lerp(
            nightclubPass.uniforms.uAberration.value,
            targetAberration,
            0.3
        );

        // Strobe Flash decay
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

        // Dynamic Point Lights
        lightCyan.position.x = Math.sin(elapsedTime * 2.0) * 10;
        lightCyan.position.y = Math.cos(elapsedTime * 1.5) * 8;
        lightCyan.intensity = (3.0 + bassPop * 8.0) * bloomMultiplier;

        lightMagenta.position.x = -Math.sin(elapsedTime * 1.8) * 10;
        lightMagenta.position.y = -Math.cos(elapsedTime * 1.4) * 8;
        lightMagenta.intensity = (3.0 + (audio.smoothedMid || 0) * 6.0) * bloomMultiplier;

        // Render Frame
        composer.render();
    }

    return {
        animate,
        switchFX,
        triggerBeatPulse,
        triggerManualFlash,
        setBPM,
        setBloomMultiplier,
        getCurrentFX: () => currentFXIndex
    };
}
