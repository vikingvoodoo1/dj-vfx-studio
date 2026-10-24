import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import {
    NightclubPostFX,
    HighClarityLogoShader,
    VolumetricLaserShader,
    SaberBeamBladeShader,
    VolumetricPinspotShader,
    PumpkinVolumetricRaysShader,
    PumpkinWhiteVuRaysShader,
    PumpkinWhiteFoggyRaysShader,
    PumpkinReflectionRaysShader,
    BonfireNightEmbersShader,
    BonfireFloorEmbersShader,
    WawaSenseiGodrayShader,
    FloorSpotShader,
    DiscoSilverStarsShader,
    FloatingAtmosphericFogShader,
    VHSGlitchTextShader,
    DualInwardAtmosphericSmokeShader,
    ProteanCloudsShader,
    ConcertStageBeamShader,
    FluidWaveRibbonShader,
    SmoothSynthwaveShader,
    SynthwaveRiverMountainShader,
    RetroSunShader,
    SynthwaveSkyShader,
    PlasmaNebulaShader,
    MatrixCodeRainShader,
    DJDeckWaveformShader,
    DiscoFloorShader,
    RetroArcadeShader,
    ParticleStreamShader,
    WitchBroomThrustShader
} from './vfx/shaders.js';
import {
    createRoundStarTexture,
    createStarburstTexture,
    createAnamorphicFlareTexture,
    createDiscoNormalMap,
    createDiscoRoughnessMap,
    createDiscoMetalnessMap,
    createDiscoTileTexture,
    createPumpkinJackFaceTexture,
    createClubEnvironmentMap,
    createSilverGlassEnvironmentMap,
    createVolumetricBeamTexture,
    createFloorTileTexture
} from './vfx/textures-club.js';
import {
    createSingleHauntedLeafTexture,
    createHauntedPorchLanternTexture,
    createHauntedMoonTexture,
    createHauntedSkyCloudsTexture,
    createBroodingStormCloudsTexture,
    renderProceduralForkedLightning,
    createHauntedManorTexture,
    createHauntedFrontDoorTexture,
    createHauntedStaircaseTexture,
    createScreamGhoulTexture,
    createHauntedJumpSpookTexture,
    drawZombieHand,
    drawDancingZombie,
    renderHauntedManorWindows,
    createHauntedForestTreesTexture,
    createHauntedFenceTexture,
    createHauntedGateWingTexture,
    createHauntedGrassTuftTexture,
    createHauntedDirtPathTexture,
    createHauntedGraveyardTexture,
    createWillOTheWispTexture,
    createPurpleWillOTheWispTexture,
    createHauntedSpecterTexture,
    createHauntedGargoyleTexture,
    createHauntedPumpkinTexture,
    createHauntedGnarledTreeTexture,
    createHauntedEyesTexture,
    createHauntedBatBodyTexture,
    createHauntedBatWingTexture,
    createHauntedWitchTexture,
    createHauntedMistPuffTexture,
    createMatrixGlyphTexture
} from './vfx/textures-haunted.js';
import {
    formatDeckTime,
    loadDeckArtwork,
    getVintageBulbFlicker,
    getVintageBulbStyle,
    getPiratesCandleFlicker,
    renderDJDeckHUD
} from './vfx/deck-hud-renderer.js';

export function createVFXScene(container) {
    const roundStarTex = createRoundStarTexture();
    const starburstTex = createStarburstTexture();
    const anamorphicFlareTex = createAnamorphicFlareTexture();
    const matrixGlyphTex = createMatrixGlyphTexture();
    let pinspotShineEnvelope = 0.0;

    // 1. Scene, Camera, WebGL Renderer
    let currentFXIndex = 0;
    let videoRenderQuality = 'ultra'; // 'ultra' (VLC Native Clarity), 'direct' (Direct Hardware Surface), 'retro' (Nightclub FX)

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020208, 0.02);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 16);

    function getOptimalPixelRatio() {
        const dpr = window.devicePixelRatio || 1;
        // On Scene 22 (Video loops in Ultra or Direct mode), unlock full native Retina / 4K resolution (up to 2.5x)
        if (currentFXIndex === 22 && (videoRenderQuality === 'ultra' || videoRenderQuality === 'direct')) {
            return Math.min(dpr, 2.5);
        }
        const maxDim = Math.max(window.innerWidth, window.innerHeight);
        if (maxDim >= 2560) return Math.min(dpr, 1.25);
        if (maxDim >= 1920) return Math.min(dpr, 1.5);
        return Math.min(dpr, 2.0);
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

    const oldOverlay = document.getElementById('vfx-direct-video-overlay');
    if (oldOverlay && oldOverlay.parentNode) {
        oldOverlay.parentNode.removeChild(oldOverlay);
    }

    const directVideoOverlay = document.createElement('video');
    directVideoOverlay.id = 'vfx-direct-video-overlay';
    directVideoOverlay.style.position = 'absolute';
    directVideoOverlay.style.inset = '0';
    directVideoOverlay.style.width = '100%';
    directVideoOverlay.style.height = '100%';
    directVideoOverlay.style.objectFit = 'contain';
    directVideoOverlay.style.backgroundColor = '#000000';
    directVideoOverlay.style.pointerEvents = 'none';
    directVideoOverlay.style.display = 'none';
    directVideoOverlay.style.zIndex = '0';
    directVideoOverlay.loop = true;
    directVideoOverlay.muted = true;
    directVideoOverlay.playsInline = true;
    directVideoOverlay.autoplay = true;
    container.appendChild(directVideoOverlay);

    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.zIndex = '1';
    renderer.domElement.style.pointerEvents = 'none';
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
    currentFXIndex = 0;

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
        const u = i / 512.0;
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

        // Deck 2 Synthetic Track Profile (Distinct club track arrangement for seamless dual-deck blending)
        let prof2 = 0.52;
        let bRatio2 = 0.38;
        let mRatio2 = 0.62;
        if (u < 0.12) {
            prof2 = 0.42 + Math.sin(u * 90.0) * 0.09;
            bRatio2 = 0.30;
        } else if (u < 0.32) {
            prof2 = 0.65 + Math.sin(u * 110.0) * 0.12 + Math.cos(u * 220.0) * 0.05;
            bRatio2 = 0.40;
        } else if (u < 0.45) {
            prof2 = 0.92 + Math.sin(u * 140.0) * 0.08;
            bRatio2 = 0.42;
        } else if (u < 0.58) {
            prof2 = 0.32 + Math.sin(u * 50.0) * 0.08;
            bRatio2 = 0.08; // Atmospheric breakdown
        } else if (u < 0.88) {
            prof2 = 0.98 + Math.sin(u * 160.0) * 0.05 + Math.cos(u * 310.0) * 0.04;
            bRatio2 = 0.44; // Main high-energy drop
        } else {
            prof2 = (0.50 + Math.sin(u * 80.0) * 0.08) * ((1.0 - u) / 0.12);
        }
        const b2 = Math.floor(prof2 * bRatio2 * 255);
        const m2 = Math.floor(prof2 * mRatio2 * 255);
        const h2 = Math.floor(prof2 * 0.85 * 255);
        const t2 = (i % 32 === 0) ? 220 : 0;

        const idx2 = (512 + i) * 4;
        djAudioHistoryData[idx2]     = b2;
        djAudioHistoryData[idx2 + 1] = m2;
        djAudioHistoryData[idx2 + 2] = h2;
        djAudioHistoryData[idx2 + 3] = t2;
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
            uDeck1Progress: { value: 0.35 },
            uDeck2Progress: { value: 0.0 },
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

    // 2b. Wave Smoke Shader (Atmospheric vapor & dense billowing smoke phase-out on inactive decks)
    const WaveSmokeShader = {
        uniforms: {
            uAudioHistory: { value: djAudioHistoryTex },
            uTrackProgress: { value: 0.35 },
            uDeck1Progress: { value: 0.35 },
            uDeck2Progress: { value: 0.0 },
            uDeck1Weight: { value: 1.0 },
            uDeck2Weight: { value: 0.0 },
            uDeck1SmokePhase: { value: 0.0 },
            uDeck2SmokePhase: { value: 1.0 },
            uPrimaryDeck: { value: 1.0 },
            uZoom: { value: 0.08 },
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uTransient: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldPos;
            void main() {
                vUv = uv;
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPos.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            varying vec3 vWorldPos;
            uniform sampler2D uAudioHistory;
            uniform float uTrackProgress;
            uniform float uDeck1Progress;
            uniform float uDeck2Progress;
            uniform float uDeck1Weight;
            uniform float uDeck2Weight;
            uniform float uDeck1SmokePhase;
            uniform float uDeck2SmokePhase;
            uniform float uPrimaryDeck;
            uniform float uZoom;
            uniform float uTime;
            uniform float uBass;
            uniform float uTransient;

            // Ultra-fast silky procedural smoke turbulence matching atmospheric fog
            float waveSmokeTurbulence(vec3 p) {
                float w1 = sin(p.x * 1.35 + p.y * 0.95 + sin(p.z * 1.15 + p.x * 0.65)) * 0.5 + 0.5;
                float w2 = sin(p.y * 2.10 - p.z * 1.65 + sin(p.x * 1.85 + p.y * 0.45)) * 0.5 + 0.5;
                float w3 = cos(p.z * 3.10 + p.x * 2.45 - p.y * 1.40) * 0.5 + 0.5;
                return w1 * 0.55 + w2 * 0.32 + w3 * 0.18;
            }

            void main() {
                // 1. Audio wave lobe sampling at this X coordinate
                float headPos = uTrackProgress;
                float texU = fract(headPos + (vUv.x - 0.5) * uZoom);
                vec4 audioSlice = texture2D(uAudioHistory, vec2(texU, 0.25));
                float waveAmp = (audioSlice.r * 0.55 + audioSlice.g * 0.30 + audioSlice.b * 0.15);

                // 2. Procedural convective curling turbulence rising vertically
                vec3 p1 = vec3(vWorldPos.x * 0.14, vWorldPos.y * 0.18 - uTime * 0.11, uTime * 0.04);
                p1.x += sin(uTime * 0.08 + vWorldPos.y * 0.25) * 0.35;
                float n1 = waveSmokeTurbulence(p1);

                vec3 p2 = vec3(vWorldPos.x * 0.28 + 2.3, vWorldPos.y * 0.32 - uTime * 0.17, uTime * 0.07 + 1.8);
                float n2 = waveSmokeTurbulence(p2);

                float curl = n1 * 0.65 + n2 * 0.35;

                // 3. Smoke emission envelope (rising off the wave lobes into the air)
                float waveLobeY = 0.46 + waveAmp * 0.24;
                float bottomOrigin = smoothstep(0.18, 0.38, vUv.y);
                float upwardFade = 1.0 - smoothstep(0.60, 0.95, vUv.y);
                float waveEmanation = smoothstep(0.20, waveLobeY, vUv.y) * upwardFade * bottomOrigin;

                // Soft horizontal boundary edge falloff
                float horizontalFade = smoothstep(0.02, 0.15, vUv.x) * smoothstep(0.98, 0.85, vUv.x);

                // 4. Subtle ambient smoke density on playing wave
                float rawDensity = smoothstep(0.20, 0.75, curl);
                float audioReact = 0.65 + uBass * 0.40 + waveAmp * 0.45 + uTransient * 0.30;
                float ambientSmoke = rawDensity * waveEmanation * horizontalFade * audioReact * 0.18;

                // 5. Billowing Dissolution Smoke FX when a deck is not in play
                // Thick plumes of curling smoke erupt over the inactive/phasing deck to make it disappear
                float billow1 = smoothstep(0.01, 0.45, uDeck1SmokePhase) * (1.0 - smoothstep(0.68, 1.0, uDeck1SmokePhase * 0.96));
                float billow2 = smoothstep(0.01, 0.45, uDeck2SmokePhase) * (1.0 - smoothstep(0.68, 1.0, uDeck2SmokePhase * 0.96));
                float activeBillow = max(billow1, billow2);

                // Lingering subtle wisps of smoke when completely phased out
                float lingeringSmoke = max(uDeck1SmokePhase, uDeck2SmokePhase) * 0.10;

                // Plume envelops the entire waveform height during phase-out
                float phaseHeightMask = smoothstep(0.10, 0.28, vUv.y) * (1.0 - smoothstep(0.70, 0.98, vUv.y));
                float phaseBillowSmoke = smoothstep(0.14, 0.68, curl) * (activeBillow * 0.76 + lingeringSmoke * 0.35) * horizontalFade * phaseHeightMask;

                float totalDensity = ambientSmoke + phaseBillowSmoke;

                // 6. Smoldering ash and smoke color palette
                vec3 ambientColor = mix(vec3(0.96, 0.72, 0.42), vec3(0.48, 0.36, 0.25), curl * 0.45);
                vec3 ashSmokeColor = mix(vec3(0.58, 0.46, 0.38), vec3(0.32, 0.26, 0.22), curl * 0.60);
                vec3 finalSmokeCol = mix(ambientColor, ashSmokeColor, clamp(activeBillow * 1.4 + lingeringSmoke, 0.0, 1.0));

                gl_FragColor = vec4(finalSmokeCol, clamp(totalDensity, 0.0, 0.88));
            }
        `
    };

    const waveSmokeMat = new THREE.ShaderMaterial({
        uniforms: WaveSmokeShader.uniforms,
        vertexShader: WaveSmokeShader.vertexShader,
        fragmentShader: WaveSmokeShader.fragmentShader,
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false
    });
    const waveSmokeMesh = new THREE.Mesh(new THREE.PlaneGeometry(36.5, 14.0), waveSmokeMat);
    waveSmokeMesh.position.set(0, 0.5, -1.95);
    waveSmokeMesh.renderOrder = 15;
    gDJWaveforms.add(waveSmokeMesh);

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
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
    });
    const djHudMesh = new THREE.Mesh(new THREE.PlaneGeometry(36.5, 20.5), djHudMat);
    window._djHudCanvas = djHudCanvas;
    window._djHudMesh = djHudMesh;
    djHudMesh.position.set(0, 0, -1.9);
    djHudMesh.renderOrder = 20;
    djWaveMesh.renderOrder = 10;
    gDJWaveforms.add(djHudMesh);

    // Deck state tracking
    let djHistoryHead = 0;
    let djHudFrameCount = 0;
    let deck1Progress = 0.0;
    let deck1WireProgress = 0.0;
    let lastDeck1WireTime = 0;
    let deck1LoopActive = false;
    let deck1LoopStart = 0.0;
    let deck1LoopEnd = 0.0;
    let deck2Progress = 0.0;
    let deck2WireProgress = 0.0;
    let lastDeck2WireTime = 0;
    let deck1Active = false;
    let deck1Playing = false;
    let deck1Fader = null;
    let deck2Active = false;
    let deck2Playing = false;
    let deck2Fader = null;
    let primaryDeck = 1;
    let manualPrimaryDeck = null;
    let faderHandoverThreshold = 0.85;
    try {
        const savedThresh = localStorage.getItem('dj_vfx_handover_threshold');
        if (savedThresh !== null) {
            const parsed = parseFloat(savedThresh);
            if (!isNaN(parsed) && parsed >= 0.40 && parsed <= 0.99) faderHandoverThreshold = parsed;
        }
    } catch (e) {}
    let deck1Weight = 0.0;
    let deck2Weight = 0.0;
    let smoothDeck1SmokePhase = 1.0;
    let smoothDeck2SmokePhase = 1.0;
    let deck1Stationary = true;
    let deck2Stationary = true;
    let deck1LastBeat = undefined;
    let deck1LastBeatTime = 0;
    let deck2LastBeat = undefined;
    let deck2LastBeatTime = 0;
    let deck1HasHardwareWaveform = false;
    let deck2HasHardwareWaveform = false;
    let deck1Data = { 
        artist: "", 
        title: "", 
        bpm: null, 
        key: "",
        duration: 0,
        totalBeats: 0,
        cues: [],
        loops: [],
        artworkUrl: "",
        artworkImg: null,
        samples: null,
        unloaded: true,
        offline: true
    };

    let deck2Data = { 
        artist: "", 
        title: "", 
        bpm: null, 
        key: "",
        duration: 0,
        totalBeats: 0,
        cues: [],
        loops: [],
        artworkUrl: "",
        artworkImg: null,
        samples: null,
        unloaded: true,
        offline: true
    };

    // Persistent low-pass temporal smoothing state for jitter-free audio reactivity
    let wireSmoothBass = 0.0;
    let wireSmoothMid = 0.0;
    let wireSmoothTreble = 0.0;
    let wireSmoothHit = 0.0;
    const wireSmoothBins = new Float32Array(128);
    let deck1BeatInBar = 1;

    function updateSynthesizedDeckSpectrum() {
        if (!deck1HasHardwareWaveform && !deck1Active) return;

        // Dynamic transient impulses
        const kickPulse = beatTriggerPulse; // Pulses 1.0 on every true downbeat and decays naturally
        const isBackBeat = (deck1BeatInBar === 2 || deck1BeatInBar === 4);
        const snarePulse = isBackBeat ? (kickPulse * 0.85) : (kickPulse * 0.20);
        const hatPulse = (1.0 - kickPulse) * 0.65; // Hat sizzles between kicks

        const liveBass = Math.min(1.0, wireSmoothBass * 0.55 + kickPulse * 0.75 + wireSmoothHit * 0.25);
        const liveMid = Math.min(1.0, wireSmoothMid * 0.65 + snarePulse * 0.45 + wireSmoothHit * 0.15);
        const liveTreble = Math.min(1.0, wireSmoothTreble * 0.60 + hatPulse * 0.40 + kickPulse * 0.20);

        for (let i = 0; i < 128; i++) {
            let targetAmp = 0;
            // Harmonic multi-band EQ curve with organic per-bin variation
            const harmonic = Math.sin(i * 0.45) * 0.08 + Math.cos(i * 1.1) * 0.05;
            if (i < 16) {
                // Sub-bass & Kick punch (20Hz - 100Hz)
                const curve = Math.exp(-Math.pow((i - 4) / 6.0, 2)); // Peak at bin 4 (~60Hz kick thump)
                targetAmp = (liveBass * (0.45 + curve * 0.70) + kickPulse * (0.60 + curve * 0.50) + harmonic) * 255;
            } else if (i < 48) {
                // Bass body & Low-mid (100Hz - 600Hz)
                const curve = Math.exp(-Math.pow((i - 28) / 14.0, 2)); // Peak at bin 28 (~300Hz punch)
                targetAmp = (liveMid * (0.40 + curve * 0.55) + snarePulse * 0.45 + harmonic * 0.8) * 255;
            } else if (i < 85) {
                // Mid & High-mid vocal/lead (600Hz - 4kHz)
                const curve = Math.exp(-Math.pow((i - 60) / 18.0, 2));
                targetAmp = (liveMid * 0.50 + liveTreble * (0.35 + curve * 0.40) + harmonic * 0.6) * 255;
            } else {
                // High treble & air (4kHz - 20kHz)
                const curve = (127 - i) / 42.0;
                targetAmp = (liveTreble * (0.35 + curve * 0.45) + hatPulse * 0.35 + harmonic * 0.5) * 255;
            }
            // Fast attack, smooth analog decay
            const targetClamped = Math.max(0, Math.min(255, targetAmp));
            if (targetClamped > wireSmoothBins[i]) {
                wireSmoothBins[i] += (targetClamped - wireSmoothBins[i]) * 0.65;
            } else {
                wireSmoothBins[i] += (targetClamped - wireSmoothBins[i]) * 0.22;
            }
        }
    }

    function setDeckWaveform(packet) {
        if (!packet) return;
        const dNum = Number(packet.deck);
        const targetDeck = (dNum === 2 || packet.deck === "2" || packet.deck === "B" || dNum === 4 || packet.deck === "4") ? 2 : 1;
        if (packet.unloaded || packet.offline || !packet.samples || packet.samples.length < 3) {
            if (targetDeck === 1) {
                deck1HasHardwareWaveform = false;
                deck1Data.samples = null;
            } else {
                deck2HasHardwareWaveform = false;
                deck2Data.samples = null;
            }
            return;
        }
        const totalTriplets = Math.floor(packet.samples.length / 3);

        if (targetDeck === 1) {
            deck1HasHardwareWaveform = true;
            deck1Data.samples = packet.samples;
            deck1Data.unloaded = false;
            deck1Data.offline = false;
            if (packet.title) {
                if (deck1Data.title !== packet.title) {
                    deck1Data.artworkImg = null;
                    deck1Data.artworkUrl = '';
                    deck1Data._artRequested = false;
                    loadDeckArtwork(packet.title, packet.artist || deck1Data.artist, deck1Data);
                }
                deck1Data.title = packet.title;
            }
            if (packet.artist) deck1Data.artist = packet.artist;
            if (packet.bpm) deck1Data.bpm = packet.bpm;
            if (packet.cues && Array.isArray(packet.cues) && packet.cues.length > 0) deck1Data.cues = packet.cues;
            if (packet.loops && Array.isArray(packet.loops) && packet.loops.length > 0) deck1Data.loops = packet.loops;
            if (packet.totalBeats) deck1Data.totalBeats = Number(packet.totalBeats);

            for (let i = 0; i < 512; i++) {
                const sIdx = Math.floor((i / 512) * totalTriplets) * 3;
                const r = packet.samples[sIdx] || 0;
                const g = packet.samples[sIdx + 1] || 0;
                const b = packet.samples[sIdx + 2] || 0;
                const hit = (r > 180 || (r + g) > 280) ? 220 : 0;

                const destIdx = i * 4;
                djAudioHistoryData[destIdx]     = r;
                djAudioHistoryData[destIdx + 1] = g;
                djAudioHistoryData[destIdx + 2] = b;
                djAudioHistoryData[destIdx + 3] = hit;
            }
            djAudioHistoryTex.needsUpdate = true;
        } else {
            deck2HasHardwareWaveform = true;
            deck2Data.samples = packet.samples;
            deck2Data.unloaded = false;
            deck2Data.offline = false;
            if (packet.title) {
                if (deck2Data.title !== packet.title) {
                    deck2Data.artworkImg = null;
                    deck2Data.artworkUrl = '';
                    deck2Data._artRequested = false;
                    loadDeckArtwork(packet.title, packet.artist || deck2Data.artist, deck2Data);
                }
                deck2Data.title = packet.title;
            }
            if (packet.artist) deck2Data.artist = packet.artist;
            if (packet.bpm) deck2Data.bpm = packet.bpm;
            if (packet.cues && Array.isArray(packet.cues) && packet.cues.length > 0) deck2Data.cues = packet.cues;
            if (packet.loops && Array.isArray(packet.loops) && packet.loops.length > 0) deck2Data.loops = packet.loops;
            if (packet.totalBeats) deck2Data.totalBeats = Number(packet.totalBeats);

            for (let i = 0; i < 512; i++) {
                const sIdx = Math.floor((i / 512) * totalTriplets) * 3;
                const r = packet.samples[sIdx] || 0;
                const g = packet.samples[sIdx + 1] || 0;
                const b = packet.samples[sIdx + 2] || 0;
                const hit = (r > 180 || (r + g) > 280) ? 220 : 0;

                const destIdx = (512 + i) * 4;
                djAudioHistoryData[destIdx]     = r;
                djAudioHistoryData[destIdx + 1] = g;
                djAudioHistoryData[destIdx + 2] = b;
                djAudioHistoryData[destIdx + 3] = hit;
            }
            djAudioHistoryTex.needsUpdate = true;
        }
    }

    // -------------------------------------------------------------------------
    // 4. 🔥 AUDIO-REACTIVE PROCEDURAL FLAME SPECTRUM EQUALIZER
    // -------------------------------------------------------------------------
    // Roaring, fluid, blackbody radiant flames rising from the dancefloor base
    // across all 64 audio frequency bands. Dynamic licking fire tongues, turbulent
    // convective updrafts, and glowing fire embers floating into the air.
    const specBands = 64;
    const specSmoothBands = new Float32Array(specBands);

    // 64-band 1D dynamic audio texture for GPU bilinear interpolation of flame heights
    const specFlameData = new Uint8Array(specBands * 4);
    for (let i = 0; i < specBands; i++) {
        specFlameData[i * 4]     = 40;
        specFlameData[i * 4 + 1] = 40;
        specFlameData[i * 4 + 2] = 40;
        specFlameData[i * 4 + 3] = 255;
    }
    const specFlameTex = new THREE.DataTexture(specFlameData, specBands, 1, THREE.RGBAFormat);
    specFlameTex.magFilter = THREE.LinearFilter;
    specFlameTex.minFilter = THREE.LinearFilter;
    specFlameTex.wrapS = THREE.ClampToEdgeWrapping;
    specFlameTex.wrapT = THREE.ClampToEdgeWrapping;
    specFlameTex.needsUpdate = true;

    const FlameShader = {
        uniforms: {
            uSpecTex: { value: specFlameTex },
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uTransient: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldPos;
            void main() {
                vUv = uv;
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPos.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            varying vec3 vWorldPos;
            uniform sampler2D uSpecTex;
            uniform float uTime;
            uniform float uBass;
            uniform float uTransient;

            // Ultra-fast, silky continuous procedural fire turbulence
            float fireTurbulence(vec2 p, float t) {
                float w1 = sin(p.x * 2.6 + sin(p.y * 3.2 - t * 4.5)) * 0.5 + 0.5;
                float w2 = cos(p.y * 4.2 - t * 7.0 + sin(p.x * 3.6 + t * 2.2)) * 0.5 + 0.5;
                float w3 = sin((p.x * 1.6 + p.y * 2.2) * 2.8 - t * 9.5) * 0.5 + 0.5;
                return w1 * 0.52 + w2 * 0.32 + w3 * 0.16;
            }

            void main() {
                // 1. Audio-reactive frequency amplitude sampled from 64-band spectrum texture
                float specAmp = texture2D(uSpecTex, vec2(vUv.x, 0.5)).r;

                // 2. Dynamic audio-reactive flame height envelope
                // Resting baseline fire at 0.14 height, surges up to ~0.95 on audio attacks
                float bassBoost = (1.0 - smoothstep(0.0, 0.40, vUv.x)) * uBass * 0.38;
                float flameBaseHeight = 0.14 + specAmp * 0.78 + bassBoost + uTransient * 0.15;
                
                // High-frequency flickers & tongue agitation
                float jitter = sin(vUv.x * 54.0 + uTime * 16.0) * 0.05 * specAmp;
                jitter += cos(vUv.x * 96.0 - uTime * 24.0) * 0.03 * specAmp;
                float totalHeight = clamp(flameBaseHeight + jitter, 0.06, 0.98);

                // 3. Multi-octave convective upward-flowing fire turbulence
                vec2 p1 = vec2(vUv.x * 9.0, vUv.y * 2.6);
                vec2 p2 = vec2(vUv.x * 20.0 + 1.8, vUv.y * 5.2);
                float n1 = fireTurbulence(p1, uTime * 2.8);
                float n2 = fireTurbulence(p2, uTime * 4.6);
                float fireCurl = n1 * 0.65 + n2 * 0.35;

                // Flame contour cutoff with sharp licking tongues per frequency band
                float tongue = abs(sin(vUv.x * 47.1238 + sin(vUv.x * 94.247 + uTime * 6.0) * 0.45));
                tongue = pow(tongue, 0.70);
                float flamePeak = totalHeight * (0.44 + fireCurl * 0.38 + tongue * 0.35);
                float flameMask = 1.0 - smoothstep(flamePeak - 0.18, flamePeak + 0.04, vUv.y);

                // Soft base ground fade (eliminates flat horizontal line at bottom)
                float baseFade = smoothstep(0.002, 0.07, vUv.y);
                flameMask *= baseFade;

                // Horizontal edge fade (soft boundary at left and right walls)
                flameMask *= smoothstep(0.005, 0.06, vUv.x) * smoothstep(0.995, 0.94, vUv.x);

                if (flameMask < 0.005) {
                    discard;
                }

                // 4. Blackbody Thermal Radiation Color Mapping:
                // Core (bottom) = Incandescent Gold-White -> Mid = Radiant Golden Amber -> Tips = Fiery Ruby Crimson
                float normY = clamp(vUv.y / max(0.01, flamePeak), 0.0, 1.0);
                float heat = clamp((1.0 - normY) * (0.50 + fireCurl * 0.50), 0.0, 1.0);

                vec3 colCore  = vec3(1.0, 0.94, 0.72);  // Incandescent Warm White-Gold Core
                vec3 colGold  = vec3(1.0, 0.68, 0.08);  // Bright Radiant Golden Yellow
                vec3 colAmber = vec3(1.0, 0.36, 0.01);  // Deep Luminous Amber-Orange
                vec3 colRuby  = vec3(0.85, 0.10, 0.00); // Fiery Ruby Crimson Tips
                vec3 colSmoke = vec3(0.20, 0.08, 0.02); // Smoky Charcoal Vapor

                vec3 fireColor;
                if (heat > 0.75) {
                    fireColor = mix(colGold, colCore, (heat - 0.75) / 0.25);
                } else if (heat > 0.45) {
                    fireColor = mix(colAmber, colGold, (heat - 0.45) / 0.30);
                } else if (heat > 0.18) {
                    fireColor = mix(colRuby, colAmber, (heat - 0.18) / 0.27);
                } else {
                    fireColor = mix(colSmoke, colRuby, heat / 0.18);
                }

                // 5. Intense luminous flame output
                float alpha = flameMask * (0.85 + heat * 0.35);
                gl_FragColor = vec4(fireColor * (1.10 + heat * 0.45) * alpha, alpha);
            }
        `
    };

    const flameMat = new THREE.ShaderMaterial({
        uniforms: FlameShader.uniforms,
        vertexShader: FlameShader.vertexShader,
        fragmentShader: FlameShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    // Plane spans from Y = -9.3 up to Y = -2.1 (height 7.2, centered at Y = -5.7)
    const flameMesh = new THREE.Mesh(new THREE.PlaneGeometry(35.0, 7.2, 64, 16), flameMat);
    flameMesh.position.set(0, -5.7, -2.12);
    flameMesh.renderOrder = 12;
    gDJWaveforms.add(flameMesh);

    // 5. 🔥 Rising Fire Embers & Cinders (Multi-tier irregular tumbling burning cinders)
    const flameEmberCount = 520;
    const flameEmberGeo = new THREE.BufferGeometry();
    const flameEmberPos = new Float32Array(flameEmberCount * 3);
    const flameEmberCol = new Float32Array(flameEmberCount * 3);
    const flameEmberSize = new Float32Array(flameEmberCount);
    const flameEmberSpeed = new Float32Array(flameEmberCount);
    const flameEmberSeed = new Float32Array(flameEmberCount);
    const flameEmberTumble = new Float32Array(flameEmberCount);
    const flameEmberChar = new Float32Array(flameEmberCount);

    for (let i = 0; i < flameEmberCount; i++) {
        // Broad screen-wide distribution
        flameEmberPos[i * 3]     = (Math.random() - 0.5) * 36.0;
        // Distribute from base up through upper screen so embers are active across all heights immediately
        flameEmberPos[i * 3 + 1] = -8.8 + Math.random() * 18.6;
        // In front of waveform and HUD planes (z = -1.78)
        flameEmberPos[i * 3 + 2] = -1.78 + (Math.random() - 0.5) * 0.25;

        // Multi-tier power law size distribution: chunky cinders, medium embers, and micro-sparks
        const uSize = Math.random();
        if (uSize < 0.22) {
            // 22% Large Chunky Molten Coals / Tumbling Cinders (prominent, dramatic)
            flameEmberSize[i] = 2.8 + Math.random() * 2.6; // 2.8 to 5.4
            flameEmberSpeed[i] = 0.45 + Math.random() * 0.75; // Heavier buoyant drift
        } else if (uSize < 0.65) {
            // 43% Medium Glowing Embers
            flameEmberSize[i] = 1.3 + Math.random() * 1.4; // 1.3 to 2.7
            flameEmberSpeed[i] = 0.75 + Math.random() * 1.1;
        } else {
            // 35% Flecks & Crackling Hot Sparks
            flameEmberSize[i] = 0.45 + Math.random() * 0.75; // 0.45 to 1.2
            flameEmberSpeed[i] = 1.2 + Math.random() * 1.6; // High velocity zip
        }

        // Fiery ember colors: white-gold core, blazing amber, hot ruby
        const uCol = Math.random();
        if (uCol < 0.25) {
            // White-hot gold spark
            flameEmberCol[i * 3]     = 1.0;
            flameEmberCol[i * 3 + 1] = 0.94;
            flameEmberCol[i * 3 + 2] = 0.65;
        } else if (uCol < 0.72) {
            // Radiant golden amber ember
            flameEmberCol[i * 3]     = 1.0;
            flameEmberCol[i * 3 + 1] = 0.56;
            flameEmberCol[i * 3 + 2] = 0.08;
        } else {
            // Hot ruby cinder
            flameEmberCol[i * 3]     = 0.98;
            flameEmberCol[i * 3 + 1] = 0.22;
            flameEmberCol[i * 3 + 2] = 0.02;
        }

        flameEmberSeed[i]   = Math.random() * 100.0;
        flameEmberTumble[i] = (Math.random() - 0.5) * 4.5;
        flameEmberChar[i]   = Math.random();
    }

    flameEmberGeo.setAttribute('position', new THREE.BufferAttribute(flameEmberPos, 3));
    flameEmberGeo.setAttribute('color', new THREE.BufferAttribute(flameEmberCol, 3));
    flameEmberGeo.setAttribute('aSize', new THREE.BufferAttribute(flameEmberSize, 1));
    flameEmberGeo.setAttribute('aSeed', new THREE.BufferAttribute(flameEmberSeed, 1));
    flameEmberGeo.setAttribute('aTumble', new THREE.BufferAttribute(flameEmberTumble, 1));
    flameEmberGeo.setAttribute('aChar', new THREE.BufferAttribute(flameEmberChar, 1));

    const flameEmberMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uTransient: { value: 0.0 }
        },
        vertexShader: `
            attribute vec3 color;
            attribute float aSize;
            attribute float aSeed;
            attribute float aTumble;
            attribute float aChar;
            varying vec3 vColor;
            varying float vSeed;
            varying float vTumble;
            varying float vChar;
            uniform float uTime;
            uniform float uBass;
            uniform float uTransient;

            void main() {
                vColor = color;
                vSeed = aSeed;
                vTumble = aTumble;
                vChar = aChar;

                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                // Audio-reactive heat expansion & transient pulse
                float heatPulse = 1.0 + sin(uTime * 9.0 + aSeed * 3.7) * 0.14 + uBass * 0.35 + uTransient * 0.45;
                float pSize = aSize * heatPulse * (850.0 / -mvPos.z);
                gl_PointSize = clamp(pSize, 5.0, 150.0);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vSeed;
            varying float vTumble;
            varying float vChar;
            uniform float uTime;

            void main() {
                vec2 p = gl_PointCoord - vec2(0.5);
                float angle = atan(p.y, p.x) + vTumble * uTime * 1.6;
                float dist = length(p);

                // Irregular cinder deformation (chunky, angular, realistic)
                float deform = sin(angle * 3.0 + vSeed) * 0.08 + cos(angle * 5.0 + vSeed * 2.3) * 0.05 + sin(angle * 7.0) * 0.03;
                float r = dist + deform;

                // Outer incandescent heat aura around the cinder
                float aura = exp(-dist * 5.0) * 0.38;

                if (r > 0.48 && aura < 0.02) discard;

                float coreU = clamp(r / 0.48, 0.0, 1.0);
                float flicker = 0.88 + sin(uTime * 14.0 + vSeed * 11.0) * 0.12;

                vec3 col;
                if (coreU < 0.22) {
                    // Molten white-hot gold core
                    col = mix(vec3(1.0, 0.98, 0.90), vColor * 1.35, coreU / 0.22);
                } else if (coreU < 0.65) {
                    // Radiant amber-ruby body
                    col = mix(vColor * 1.35, vColor, (coreU - 0.22) / 0.43);
                } else {
                    // Burnt crusty rim / charcoal perimeter
                    float crust = (coreU - 0.65) / 0.35;
                    vec3 darkCrust = mix(vColor * 0.30, vec3(0.09, 0.02, 0.01), vChar * 0.85);
                    col = mix(vColor, darkCrust, crust);
                }

                float coreAlpha = smoothstep(0.48, 0.30, r);
                float alpha = clamp(coreAlpha + aura, 0.0, 1.0) * flicker;
                vec3 finalCol = col * flicker + vec3(1.0, 0.55, 0.12) * aura;
                gl_FragColor = vec4(finalCol, alpha * 0.95);
            }
        `,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false
    });

    const flameEmberField = new THREE.Points(flameEmberGeo, flameEmberMat);
    flameEmberField.frustumCulled = false;
    flameEmberField.renderOrder = 25;
    window._flameEmberField = flameEmberField;
    window._flameEmberMat = flameEmberMat;
    gDJWaveforms.add(flameEmberField);

    // -------------------------------------------------------------------------
    // 💡 3D BOHO WOVEN RATTAN BASKET LANTERNS (Low Lights, Glowing, Soothing)
    // -------------------------------------------------------------------------
    function createEdisonGlowTexture() {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 128;
        const ctx = c.getContext('2d');
        const cx = 64, cy = 64;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 64);
        grad.addColorStop(0.0, 'rgba(255, 245, 215, 0.95)');
        grad.addColorStop(0.20, 'rgba(255, 180, 60, 0.75)');
        grad.addColorStop(0.45, 'rgba(235, 120, 20, 0.35)');
        grad.addColorStop(0.75, 'rgba(180, 60, 10, 0.10)');
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
        const tex = new THREE.CanvasTexture(c);
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        return tex;
    }

    const edisonGlowTex = createEdisonGlowTexture();

    // Natural Boho Woven Rattan & Bamboo Materials
    const wickerMat = new THREE.MeshStandardMaterial({
        color: 0xcd873e,      // Natural golden-amber bamboo cane
        roughness: 0.85,      // Matte organic fibrous cane
        metalness: 0.04
    });

    const wickerBindingMat = new THREE.MeshStandardMaterial({
        color: 0x824e22,      // Darker wrapped cane bark binding rings
        roughness: 0.90,
        metalness: 0.04
    });

    const wickerRopeMat = new THREE.MeshStandardMaterial({
        color: 0x2a2218,      // Natural dark twisted hemp / cotton cord
        roughness: 0.96,
        metalness: 0.02
    });

    const edisonGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffdf9f, // warm vintage amber glass
        transparent: true,
        opacity: 0.30,
        roughness: 0.08,
        metalness: 0.04,
        transmission: 0.78,
        ior: 1.52,
        reflectivity: 0.85,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    // Reusable Bulb Envelope Geometry: Teardrop Edison Bulb inside basket
    const ptsST64 = [
        new THREE.Vector2(0.20, 0.0),
        new THREE.Vector2(0.24, -0.15),
        new THREE.Vector2(0.36, -0.38),
        new THREE.Vector2(0.62, -0.78),
        new THREE.Vector2(0.75, -1.25),
        new THREE.Vector2(0.66, -1.70),
        new THREE.Vector2(0.42, -2.10),
        new THREE.Vector2(0.14, -2.35),
        new THREE.Vector2(0.0, -2.40)
    ];
    const geoST64 = new THREE.LatheGeometry(ptsST64, 24);

    // 3D Wound Tungsten Filament
    function createSquirrelCageFilament() {
        const pts = [];
        const runs = 8;
        const r = 0.22;
        const topY = -0.55;
        const botY = -1.55;
        for (let i = 0; i <= runs; i++) {
            const theta = (i / runs) * Math.PI * 1.88 - Math.PI * 0.94;
            const isTop = (i % 2 === 0);
            pts.push(new THREE.Vector3(
                Math.sin(theta) * r,
                isTop ? topY : botY,
                Math.cos(theta) * r
            ));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        return new THREE.TubeGeometry(curve, 44, 0.016, 6, false);
    }
    const geoSquirrelFilament = createSquirrelCageFilament();

    // Woven Rattan Basket Generator matching user uploaded photo
    function createWickerBasketGroup(type = 'bell') {
        const basket = new THREE.Group();

        // Profile curve [y, radius]
        let profile;
        if (type === 'globe') {
            profile = [
                [0.0,  0.34],
                [-0.30, 0.58],
                [-0.75, 0.96],
                [-1.30, 1.15],
                [-1.85, 1.08],
                [-2.35, 0.86],
                [-2.70, 0.62],
                [-2.90, 0.52]
            ];
        } else {
            // Elongated bell basket matching photo
            profile = [
                [0.0,  0.36],
                [-0.35, 0.54],
                [-0.85, 0.82],
                [-1.40, 0.96],
                [-1.90, 0.92],
                [-2.40, 0.80],
                [-2.80, 0.64],
                [-3.05, 0.55]
            ];
        }

        const topR = profile[0][1];
        const botR = profile[profile.length - 1][1];
        const botY = profile[profile.length - 1][0];

        // 1. Top wrapped binding collar ring
        const topRing = new THREE.Mesh(
            new THREE.TorusGeometry(topR, 0.045, 8, 24),
            wickerBindingMat
        );
        topRing.rotation.x = Math.PI / 2;
        topRing.position.y = 0.0;
        basket.add(topRing);

        // 2. Bottom open rim ring
        const botRing = new THREE.Mesh(
            new THREE.TorusGeometry(botR, 0.042, 8, 24),
            wickerBindingMat
        );
        botRing.rotation.x = Math.PI / 2;
        botRing.position.y = botY;
        basket.add(botRing);

        // 3. Horizontal hoop rings (8 open-lattice hoops spaced down the basket)
        const hoopYPositions = [-0.35, -0.70, -1.05, -1.40, -1.75, -2.10, -2.45, -2.75];
        for (let h = 0; h < hoopYPositions.length; h++) {
            const hy = hoopYPositions[h];
            let hr = 0.75;
            for (let p = 0; p < profile.length - 1; p++) {
                if (hy <= profile[p][0] && hy >= profile[p + 1][0]) {
                    const t = (hy - profile[p][0]) / (profile[p + 1][0] - profile[p][0]);
                    hr = profile[p][1] + t * (profile[p + 1][1] - profile[p][1]);
                    break;
                }
            }
            const hoop = new THREE.Mesh(
                new THREE.TorusGeometry(hr, 0.022, 6, 24),
                wickerMat
            );
            hoop.rotation.x = Math.PI / 2;
            hoop.position.y = hy;
            basket.add(hoop);
        }

        // 4. Vertical curved bamboo ribs (16 ribs around circumference)
        const numRibs = 16;
        for (let i = 0; i < numRibs; i++) {
            const theta = (i / numRibs) * Math.PI * 2;
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);

            const ribPts = [];
            for (let p = 0; p < profile.length; p++) {
                const py = profile[p][0];
                const pr = profile[p][1];
                ribPts.push(new THREE.Vector3(cosT * pr, py, sinT * pr));
            }

            const ribCurve = new THREE.CatmullRomCurve3(ribPts);
            const ribGeo = new THREE.TubeGeometry(ribCurve, 18, 0.022, 5, false);
            const ribMesh = new THREE.Mesh(ribGeo, wickerMat);
            basket.add(ribMesh);
        }

        return basket;
    }

    const edisonBulbs = [];
    const gEdisonBulbRig = new THREE.Group();
    gDJWaveforms.add(gEdisonBulbRig);

    const edisonBulbConfigs = [
        // Top Ceiling Framing (positioned high above waveforms, framing UI badges cleanly)
        { x: -12.8, z: -4.0, cordLen: 0.85, type: 'bell',  seed: 0.25 },
        { x: -4.6,  z: -4.5, cordLen: 0.65, type: 'globe', seed: 1.65 },
        { x: 4.6,   z: -4.5, cordLen: 0.65, type: 'globe', seed: 2.85 },
        { x: 12.8,  z: -4.0, cordLen: 0.85, type: 'bell',  seed: 4.10 }
    ];

    const ceilingY = 12.5;

    for (let i = 0; i < edisonBulbConfigs.length; i++) {
        const cfg = edisonBulbConfigs[i];

        // Pendulum Pivot Group (anchored at ceiling)
        const pivot = new THREE.Group();
        pivot.position.set(cfg.x, ceilingY, cfg.z);
        gEdisonBulbRig.add(pivot);

        // Ceiling Canopy Rosette
        const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.08, 16), wickerBindingMat);
        pivot.add(canopy);

        // Twisted Hemp / Rope Drop Cord
        const cordGeo = new THREE.CylinderGeometry(0.032, 0.032, cfg.cordLen, 8);
        const cordMesh = new THREE.Mesh(cordGeo, wickerRopeMat);
        cordMesh.position.y = -cfg.cordLen / 2;
        pivot.add(cordMesh);

        // Lantern Assembly (at bottom of cord, elegantly proportioned)
        const lanternAssembly = new THREE.Group();
        lanternAssembly.position.y = -cfg.cordLen;
        lanternAssembly.scale.set(0.72, 0.72, 0.72);
        pivot.add(lanternAssembly);

        // 1. Woven Wicker Basket Shade matching user photo
        const basket = createWickerBasketGroup(cfg.type);
        lanternAssembly.add(basket);

        // 2. Suspended Teardrop Bulb inside the Basket (centered at y = -1.40)
        const bulbGroup = new THREE.Group();
        bulbGroup.position.y = -0.55;
        lanternAssembly.add(bulbGroup);

        const bulbGlass = new THREE.Mesh(geoST64, edisonGlassMat);
        bulbGroup.add(bulbGlass);

        // 3. Glowing Tungsten Filament
        const filamentMat = new THREE.MeshBasicMaterial({ color: 0xff9922 });
        const filamentMesh = new THREE.Mesh(geoSquirrelFilament, filamentMat);
        bulbGroup.add(filamentMesh);

        // 4. Soft Radial Bloom Sprite
        const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: edisonGlowTex,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.45
        }));
        const spriteY = -1.40;
        glowSprite.position.set(0, spriteY, 0);
        glowSprite.scale.set(2.6, 2.6, 1.0);
        lanternAssembly.add(glowSprite);

        // 5. Low-Light Soothing Point Light (Warm 2200K Candlelight)
        const pLight = new THREE.PointLight(0xff8c1a, 0.55, 11.0, 1.8);
        pLight.position.set(0, spriteY, 0);
        lanternAssembly.add(pLight);

        // Natural Pendulum Frequency (clamped minimum length for soothing sway)
        const omega = Math.sqrt(9.81 / Math.max(2.4, cfg.cordLen)) * 0.58;

        edisonBulbs.push({
            pivot,
            cordLen: cfg.cordLen,
            omega,
            seed: cfg.seed,
            filamentMat,
            glowSprite,
            light: pLight,
            origLightPos: new THREE.Vector3(0, spriteY, 0)
        });
    }

    // Warm Vintage Loft Ambient Dust Motes
    const edisonDustCount = 160;
    const edisonDustGeo = new THREE.BufferGeometry();
    const edisonDustPos = new Float32Array(edisonDustCount * 3);
    const edisonDustSpeeds = new Float32Array(edisonDustCount);
    for (let i = 0; i < edisonDustCount; i++) {
        edisonDustPos[i * 3]     = (Math.random() - 0.5) * 36.0;
        edisonDustPos[i * 3 + 1] = -7.5 + Math.random() * 18.0;
        edisonDustPos[i * 3 + 2] = -5.8 + Math.random() * 3.5;
        edisonDustSpeeds[i]      = 0.12 + Math.random() * 0.20;
    }
    edisonDustGeo.setAttribute('position', new THREE.BufferAttribute(edisonDustPos, 3));
    const edisonDustMat = new THREE.PointsMaterial({
        color: 0xffa834,
        size: 0.055,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const edisonDustField = new THREE.Points(edisonDustGeo, edisonDustMat);
    edisonDustField.frustumCulled = false;
    gDJWaveforms.add(edisonDustField);



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
    const silverGlassEnvMap = createSilverGlassEnvironmentMap(renderer);
    const volumetricBeamTex = createVolumetricBeamTexture();
    const floorTileTex = createFloorTileTexture();

    // 2. Big Faceted Chrome & Mirror Glass Disco Ball (Refractive Glass Clearcoat + Pure Silver Backing)
    const dBallGeo = new THREE.SphereGeometry(5.2, 96, 48);
    const dBallMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, // Pure silver-white mirror
        metalness: 1.0, // Mirror-silver reflective backing
        roughness: 0.02, // Ultra-sharp crystal mirror glass facets
        normalMap: discoNormalTex,
        normalScale: new THREE.Vector2(1.15, 1.15),
        roughnessMap: discoRoughnessTex,
        metalnessMap: discoMetalnessTex,
        bumpMap: discoTileTex,
        bumpScale: 0.035, // Crisp glass facet bevels
        envMap: silverGlassEnvMap, // Pure monochrome silver & white studio reflections (zero colored lights)
        envMapIntensity: 5.0, // High-intensity silver glass reflections
        clearcoat: 1.0, // Clear optical glass protective coat
        clearcoatRoughness: 0.01,
        reflectivity: 1.0,
        ior: 1.52, // Authentic crown glass refractive index
        iridescence: 0.0, // Strictly ZERO rainbow color interference (no pinks, purples, cyans)
        sheen: 0.0, // Strictly ZERO colored sheen
        specularIntensity: 1.0,
        specularColor: new THREE.Color(0xffffff)
    });
    const dBallMesh = new THREE.Mesh(dBallGeo, dBallMat);
    dBallMesh.position.set(0, 0.0, 0.0);
    gDiscoBall.add(dBallMesh);

    // 3. Top Mounting Cap & Eyelet Loop (Directly attached to the top pole of the disco ball)
    const discoChainMat = new THREE.MeshStandardMaterial({
        color: 0xf2f7fc, // Polished silver chrome chain links & hardware
        metalness: 0.98,
        roughness: 0.08,
        envMap: silverGlassEnvMap,
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

    // 5. Dedicated Multi-Directional Pure White & Silver Studio Pinspots (Zero Colored Lights)
    const dBallKeyLight = new THREE.DirectionalLight(0xffffff, 2.8); // Brilliant pure-white key pinspot
    dBallKeyLight.position.set(4.0, 7.5, 8.5);
    dBallKeyLight.target = dBallMesh;
    gDiscoBall.add(dBallKeyLight);

    const dBallPinLeft = new THREE.DirectionalLight(0xffffff, 2.6); // Pure-white left pinspot
    dBallPinLeft.position.set(-6.0, 8.0, 8.0);
    dBallPinLeft.target = dBallMesh;
    gDiscoBall.add(dBallPinLeft);

    const dBallPinTop = new THREE.DirectionalLight(0xffffff, 2.2); // Pure-white overhead downlight
    dBallPinTop.position.set(0.0, 9.5, 3.0);
    dBallPinTop.target = dBallMesh;
    gDiscoBall.add(dBallPinTop);

    const dBallRimLight = new THREE.DirectionalLight(0xffffff, 1.4); // Pure-white rim backlight
    dBallRimLight.position.set(0.0, -6.0, -5.0);
    dBallRimLight.target = dBallMesh;
    gDiscoBall.add(dBallRimLight);

    const dBallFillLight = new THREE.DirectionalLight(0xf2f6fa, 1.2); // Neutral silver-white front fill
    dBallFillLight.position.set(-5.0, -2.0, 6.0);
    dBallFillLight.target = dBallMesh;
    gDiscoBall.add(dBallFillLight);

    const dBallPointSilver = new THREE.PointLight(0xffffff, 4.2, 26.0, 1.2); // High-specular pure white center highlight
    dBallPointSilver.position.set(0.0, 4.5, 7.5);
    gDiscoBall.add(dBallPointSilver);

    // 6. 1,500 Floating 3D Specular Starburst Stars & Sparkles (Subtle Sparkling White & Silver)
    const glintCount = 1500;
    const glintGeo = new THREE.BufferGeometry();
    const glintPos = new Float32Array(glintCount * 3);
    const glintCol = new Float32Array(glintCount * 3);
    const glintPhase = new Float32Array(glintCount);
    const glintSpeed = new Float32Array(glintCount);
    const glintBaseSize = new Float32Array(glintCount);

    // Pure monochrome white and silver palette (strictly zero colors)
    const silverHues = [
        new THREE.Color(0xffffff), // Diamond Pure White
        new THREE.Color(0xf6f9fc), // Brilliant Platinum Silver
        new THREE.Color(0xedf2f8), // Pure Mirror Silver
        new THREE.Color(0xffffff), // Pure White
        new THREE.Color(0xf2f6fa), // Pale Chrome Silver
        new THREE.Color(0xffffff)  // Pure White
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

    // Procedural Parametric 3D Lobed Pumpkin Geometry (Defined organic pumpkin shape, squashed to 0.76 height ratio with 10 vertical ribbed lobes)
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

            // Natural concave dimple at top stem and bottom pole
            const poleDimple = 1.0 - 0.08 * Math.pow(Math.abs(cosPhi), 2.5);

            // 10 vertical ribbed lobes with defined organic crevices
            const lobeWave = Math.cos(numLobes * theta);
            const lobeDepth = 0.075 * lobeWave * Math.pow(sinPhi, 0.90);

            // Natural organic pumpkin profile: slightly fuller in lower hemisphere
            const subtleTaper = 1.0 - 0.035 * cosPhi;
            const equatorialBulge = 1.0 + 0.025 * Math.pow(sinPhi, 1.3);
            const radialScale = (1.0 + lobeDepth) * poleDimple * equatorialBulge * subtleTaper;

            v.x = r * sinPhi * Math.sin(theta) * radialScale;
            v.z = r * sinPhi * Math.cos(theta) * radialScale;
            // Authentic round pumpkin profile: 0.94 height ratio (eliminates squashed look)
            v.y = r * cosPhi * poleDimple * 0.94;

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
            new THREE.Vector3(0, 4.46, 0),         // Stem base securely in top dimple
            new THREE.Vector3(0.06, 5.00, 0.04),   // Lower stalk
            new THREE.Vector3(0.16, 5.54, 0.10),   // Mid stalk curving out
            new THREE.Vector3(0.14, 5.98, 0.08),   // Upper stalk curve
            new THREE.Vector3(0.04, 6.26, 0.03)    // Stalk tip meeting eyelet
        ]);

        const stemGeo = new THREE.TubeGeometry(curve, 32, 0.30, 16, false);
        const stemPos = stemGeo.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < stemPos.count; i++) {
            v.fromBufferAttribute(stemPos, i);
            const t = Math.max(0, Math.min(1, (v.y - 4.46) / 1.80));
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
        stemEyeletMesh.position.set(0.04, 6.26, 0.03);
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
            lensMesh,
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
                // Elliptical contour framing the authentic round pumpkin silhouette (0.94 height ratio)
                vec2 p = (vUv - 0.5) * 2.0;
                p.y /= 0.94;
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

    // =========================================================================
    // FX 21: 🏚️ HAUNTED MANOR & MOONLIT FOREST [FLYING BATS, GATES & THUNDERSTORM]
    // =========================================================================
    const gHauntedManor = createFXGroup();

    // 1. Procedural High-Resolution Textures
    const hauntedMoonTex = createHauntedMoonTexture();
    const hauntedSkyTex = createHauntedSkyCloudsTexture();
    const hauntedManorTex = createHauntedManorTexture();
    const hauntedTreesTex = createHauntedForestTreesTexture();
    const hauntedFenceTex = createHauntedFenceTexture();
    const hauntedGateWingTex = createHauntedGateWingTexture();
    const hauntedGrassTex = createHauntedGrassTuftTexture();
    const hauntedPathTex = createHauntedDirtPathTexture();
    const hauntedBatBodyTex = createHauntedBatBodyTexture();
    const hauntedBatWingTex = createHauntedBatWingTexture();
    const hauntedWitchTex = createHauntedWitchTexture();
    const hauntedMistTex = createHauntedMistPuffTexture();
    const hauntedGraveyardTex = createHauntedGraveyardTexture();
    const hauntedWispTex = createWillOTheWispTexture();
    const hauntedSpecterTex = createHauntedSpecterTexture();
    const hauntedGargoyleTex = createHauntedGargoyleTexture();
    const hauntedPumpkinTex = createHauntedPumpkinTexture();
    const hauntedGnarledTreeTex = createHauntedGnarledTreeTexture();
    const hauntedRedEyesTex = createHauntedEyesTexture(true);
    const hauntedYellowEyesTex = createHauntedEyesTexture(false);

    // 2. Layer 1: Gothic Night Sky Backdrop & Glowing Full Moon (z = -28.0, 160x95 full-screen span)
    const hauntedSkyGeo = new THREE.PlaneGeometry(160.0, 95.0);
    const hauntedSkyMat = new THREE.MeshBasicMaterial({
        map: hauntedSkyTex,
        depthWrite: false
    });
    const hauntedSkyMesh = new THREE.Mesh(hauntedSkyGeo, hauntedSkyMat);
    hauntedSkyMesh.position.set(0, 4.0, -28.0);
    gHauntedManor.add(hauntedSkyMesh);

    // Glowing Full Moon Disc (Brought in closer at z = -17.5 for grand dramatic presence!)
    const hauntedMoonPos = new THREE.Vector3(-3.2, 5.5, -17.5);
    const hauntedMoonGeo = new THREE.PlaneGeometry(8.2, 8.2);
    const hauntedMoonMat = new THREE.MeshBasicMaterial({
        map: hauntedMoonTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending
    });
    const hauntedMoonMesh = new THREE.Mesh(hauntedMoonGeo, hauntedMoonMat);
    hauntedMoonMesh.position.copy(hauntedMoonPos);
    gHauntedManor.add(hauntedMoonMesh);

    // Additive Lunar Corona Glow Halo
    const hauntedCoronaGeo = new THREE.PlaneGeometry(16.0, 16.0);
    const hauntedCoronaMat = new THREE.MeshBasicMaterial({
        map: hauntedMoonTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.75
    });
    const hauntedCoronaMesh = new THREE.Mesh(hauntedCoronaGeo, hauntedCoronaMat);
    hauntedCoronaMesh.position.set(hauntedMoonPos.x, hauntedMoonPos.y, hauntedMoonPos.z - 0.2);
    gHauntedManor.add(hauntedCoronaMesh);

    // Drifting Stormy Moonlit Cloud Plane (Layer 2: z = -18.0, 160x65 full-screen span)
    const hauntedCloudGeo = new THREE.PlaneGeometry(160.0, 65.0);
    const hauntedCloudMat1 = new THREE.MeshBasicMaterial({
        map: hauntedSkyTex,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const hauntedCloudMesh1 = new THREE.Mesh(hauntedCloudGeo, hauntedCloudMat1);
    hauntedCloudMesh1.position.set(0, 6.0, -18.0);
    gHauntedManor.add(hauntedCloudMesh1);

    // 2b. Wicked Flying Witch on Broomstick with Trailing Cape, Black Cat & Magic Sparkles
    const hauntedWitchGroup = new THREE.Group();
    const hauntedWitchGeo = new THREE.PlaneGeometry(4.2, 3.314);
    const hauntedWitchMat = new THREE.MeshBasicMaterial({
        map: hauntedWitchTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const hauntedWitchMesh = new THREE.Mesh(hauntedWitchGeo, hauntedWitchMat);
    hauntedWitchGroup.add(hauntedWitchMesh);

    // Witch Broomstick Magical Plasma Thrust Exhaust (Custom GLSL Shader - Attached Strictly to Broom Bristles at Rear)
    const hauntedWitchThrustGeo = new THREE.PlaneGeometry(2.4, 0.95);
    hauntedWitchThrustGeo.translate(-1.2, 0, 0); // Origin at broom bristles nozzle
    const hauntedWitchThrustMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uIntensity: { value: 1.0 }
        },
        vertexShader: WitchBroomThrustShader.vertexShader,
        fragmentShader: WitchBroomThrustShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const hauntedWitchThrustMesh = new THREE.Mesh(hauntedWitchThrustGeo, hauntedWitchThrustMat);
    // Connect strictly to the rear broom bristles (-2.08, -0.81) extending backward (-X)
    hauntedWitchThrustMesh.position.set(-2.08, -0.81, 0.02);
    hauntedWitchGroup.add(hauntedWitchThrustMesh);

    hauntedWitchGroup.visible = false;
    gHauntedManor.add(hauntedWitchGroup);

    // 3. Layer 3: Spooky Gnarled Bare Forest Trees & Overhanging Limbs (z = -13.0, 76x38 span)
    const hauntedTreesGeo = new THREE.PlaneGeometry(76.0, 38.0);
    const hauntedTreesMat = new THREE.MeshBasicMaterial({
        map: hauntedTreesTex,
        transparent: true,
        depthWrite: false
    });
    const hauntedTreesMesh = new THREE.Mesh(hauntedTreesGeo, hauntedTreesMat);
    hauntedTreesMesh.position.set(0.0, 4.4, -13.0);
    gHauntedManor.add(hauntedTreesMesh);

    // 4. Layer 4: Victorian Gothic Haunted Mansion Facade (Brought in closer at z = -10.2)
    const hauntedManorGeo = new THREE.PlaneGeometry(21.5, 19.5);
    const hauntedManorMat = new THREE.MeshBasicMaterial({
        map: hauntedManorTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const hauntedManorMesh = new THREE.Mesh(hauntedManorGeo, hauntedManorMat);
    hauntedManorMesh.position.set(4.2, 3.5, -10.2);
    gHauntedManor.add(hauntedManorMesh);

    // Dynamic Illuminated Windows Overlay (Synchronized Rave Colors, Green Laser, Slow Dancing Zombies, Faulty Electricity, Candlelight)
    const hauntedWindowsCanvas = document.createElement('canvas');
    hauntedWindowsCanvas.width = 1024;
    hauntedWindowsCanvas.height = 1024;
    const hauntedWindowsCtx = hauntedWindowsCanvas.getContext('2d');
    const hauntedWindowsTex = new THREE.CanvasTexture(hauntedWindowsCanvas);
    hauntedWindowsTex.wrapS = THREE.ClampToEdgeWrapping;
    hauntedWindowsTex.wrapT = THREE.ClampToEdgeWrapping;

    const hauntedWindowsMat = new THREE.MeshBasicMaterial({
        map: hauntedWindowsTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const hauntedWindowsMesh = new THREE.Mesh(hauntedManorGeo, hauntedWindowsMat);
    hauntedWindowsMesh.position.set(4.2, 3.5, -10.16);
    gHauntedManor.add(hauntedWindowsMesh);

    // Grand Entrance Porch Hanging Carriage Lantern (Hangs directly in dead center of porch from ceiling beam)
    const hauntedPorchLanternTex = createHauntedPorchLanternTexture();
    const hauntedPorchLanternGroup = new THREE.Group();
    hauntedPorchLanternGroup.position.set(2.06, 1.82, -10.05); // Dead center of porch ceiling beam directly between columns 2 & 3

    const hauntedPorchLanternGeo = new THREE.PlaneGeometry(0.75, 1.5);
    hauntedPorchLanternGeo.translate(0, -0.75, 0); // Origin at top of chain so it swings naturally like a pendulum
    const hauntedPorchLanternMat = new THREE.MeshBasicMaterial({
        map: hauntedPorchLanternTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const hauntedPorchLanternMesh = new THREE.Mesh(hauntedPorchLanternGeo, hauntedPorchLanternMat);
    hauntedPorchLanternGroup.add(hauntedPorchLanternMesh);
    gHauntedManor.add(hauntedPorchLanternGroup);

    // =========================================================================
    // 3D Grand Entrance Hallway Corridor with Procedural GLSL Perspective Shaders
    // (Floor, Ceiling, Walls, Back Grand Staircase aligned in true perspective with front doors)
    // =========================================================================
    const hauntedHallwayGroup = new THREE.Group();

    const hauntedHallwayVertexShader = `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `;

    const hauntedHallwayFragmentShader = `
        uniform float uTime;
        uniform float uGreenGlow;
        uniform float uBass;
        uniform int uSurface; // 0: floor, 1: ceiling, 2: left wall, 3: right wall, 4: back staircase wall
        varying vec2 vUv;
        varying vec3 vWorldPos;

        float hHash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }
        float hNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hHash(i), hHash(i + vec2(1.0, 0.0)), f.x),
                       mix(hHash(i + vec2(0.0, 1.0)), hHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }

        void main() {
            // Darker base gothic shadows throughout the interior
            vec3 col = vec3(0.008, 0.012, 0.018);
            vec3 greenSpooky = vec3(0.018, 0.52, 0.16); // Darker, eerie emerald-moss green
            vec3 bloodRed = vec3(0.96, 0.03, 0.06);     // Searing blood-red shines

            // Multi-octave creeping volumetric fog
            float mistN = hNoise(vUv * 6.5 + vec2(uTime * 0.28, -uTime * 0.14));
            float mistN2 = hNoise(vUv * 13.0 - vec2(-uTime * 0.20, uTime * 0.32));
            float mist = (mistN * 0.65 + mistN2 * 0.35) * (0.35 + 0.65 * sin(vWorldPos.y * 2.2 + uTime * 1.5));

            if (uSurface == 0) {
                // FLOOR: Dark ancient mahogany parquet with crimson velvet runner
                float runner = 1.0 - smoothstep(0.27, 0.31, abs(vUv.x - 0.5));
                vec3 wood = vec3(0.035, 0.018, 0.009) * (0.8 + 0.2 * sin(vUv.y * 70.0));
                vec3 carpet = vec3(0.22, 0.012, 0.022) * (0.85 + 0.15 * hNoise(vUv * 45.0));
                float goldBorder = smoothstep(0.25, 0.27, abs(vUv.x - 0.5)) * (1.0 - smoothstep(0.29, 0.31, abs(vUv.x - 0.5)));
                carpet += vec3(0.35, 0.24, 0.04) * goldBorder;
                col = mix(wood, carpet, runner);
            } else if (uSurface == 1) {
                // CEILING: Dark coffered oak beams lost in high gloom
                float beamX = abs(sin(vUv.x * 3.14159 * 4.0));
                float beamY = abs(sin(vUv.y * 3.14159 * 8.0));
                col = vec3(0.02, 0.014, 0.01) * (0.6 + 0.4 * max(beamX, beamY));
            } else if (uSurface == 2 || uSurface == 3) {
                // WALLS: Gothic carved wood wainscoting (bottom) + dark damask wallpaper & ancestral portraits (top)
                if (vUv.y < 0.42) {
                    float panel = sin(vUv.x * 24.0);
                    col = vec3(0.045, 0.022, 0.012) * (0.75 + 0.25 * smoothstep(-0.2, 0.2, panel));
                    if (abs(vUv.y - 0.41) < 0.015) col = vec3(0.09, 0.05, 0.025);
                } else {
                    float pattern = hNoise(vUv * vec2(12.0, 18.0));
                    col = mix(vec3(0.025, 0.035, 0.025), vec3(0.01, 0.018, 0.012), pattern);
                    float frameX = fract(vUv.x * 3.0);
                    if (frameX > 0.35 && frameX < 0.65 && vUv.y > 0.52 && vUv.y < 0.82) {
                        float isBorder = (frameX < 0.38 || frameX > 0.62 || vUv.y < 0.55 || vUv.y > 0.79) ? 1.0 : 0.0;
                        col = mix(vec3(0.02, 0.015, 0.015), vec3(0.22, 0.17, 0.05), isBorder);
                    }
                }
                float sconce = pow(max(0.0, sin(vUv.x * 3.14159 * 3.0)), 4.0) * smoothstep(0.4, 0.7, vUv.y);
                col += (vec3(0.7, 0.45, 0.12) * 0.35 + greenSpooky * 0.4) * sconce * (0.8 + 0.2 * sin(uTime * 15.0));
            } else {
                // BACK WALL: Imposing Grand Victorian Staircase Ascending into Darkness
                // 1. Perspective staircase step risers and deep shadow tread overhangs
                float stepCoord = (1.0 - vUv.y) * 16.0;
                float stepIndex = floor(stepCoord);
                float stepFrac = fract(stepCoord);
                // Bullnose tread shadow & highlight
                float stepShading = smoothstep(0.0, 0.15, stepFrac) * (1.0 - 0.35 * smoothstep(0.85, 1.0, stepFrac));
                vec3 stoneRiser = vec3(0.055, 0.035, 0.028) * (0.75 + 0.25 * mod(stepIndex, 2.0));
                col = stoneRiser * stepShading;

                // 2. Rich crimson velvet center runner cascading down the flights
                float runnerDist = abs(vUv.x - 0.5);
                float runnerMask = 1.0 - smoothstep(0.22, 0.26, runnerDist);
                vec3 runnerVelvet = vec3(0.28, 0.015, 0.028) * (0.8 + 0.2 * hNoise(vUv * 35.0));
                // Gold braided edge trim along runner borders
                float runnerTrim = smoothstep(0.20, 0.22, runnerDist) * (1.0 - smoothstep(0.24, 0.26, runnerDist));
                runnerVelvet += vec3(0.38, 0.28, 0.05) * runnerTrim;
                col = mix(col, runnerVelvet, runnerMask * smoothstep(0.0, 0.65, 1.0 - vUv.y));

                // 3. Ornate carved balustrades with turned spindles curving upward on both flanks
                float balustradeL = smoothstep(0.28, 0.32, abs(vUv.x - 0.22));
                float balustradeR = smoothstep(0.28, 0.32, abs(vUv.x - 0.78));
                if ((vUv.x > 0.24 && vUv.x < 0.30) || (vUv.x > 0.70 && vUv.x < 0.76)) {
                    float spindle = abs(sin(vUv.y * 38.0));
                    col = mix(col, vec3(0.12, 0.07, 0.035), smoothstep(0.4, 0.6, spindle));
                }

                // 4. Heavy gothic carved newel posts at bottom corners
                if (vUv.y < 0.32 && (abs(vUv.x - 0.23) < 0.045 || abs(vUv.x - 0.77) < 0.045)) {
                    col = vec3(0.08, 0.045, 0.022);
                    if (vUv.y > 0.27) col += vec3(0.05, 0.03, 0.015); // Carved finial cap
                }

                // 5. Towering Gothic arched lancet window above landing (vUv.y > 0.55)
                if (vUv.y > 0.55 && abs(vUv.x - 0.5) < 0.22) {
                    vec2 winUv = (vUv - vec2(0.5, 0.55)) / vec2(0.44, 0.42);
                    float archDist = length(vec2(winUv.x, max(0.0, winUv.y - 0.45)));
                    if (archDist < 0.48) {
                        // Sinister stained glass panes: deep midnight sapphire, emerald, and ruby
                        float paneY = floor(winUv.y * 8.0);
                        float paneX = floor((winUv.x + 0.5) * 6.0);
                        vec3 glassColor = vec3(0.02, 0.06, 0.12);
                        if (mod(paneX + paneY, 3.0) == 0.0) glassColor = vec3(0.55, 0.02, 0.04); // Ruby panes
                        if (mod(paneX + paneY, 3.0) == 1.0) glassColor = vec3(0.01, 0.25, 0.08); // Emerald panes
                        // Ornate stone lancet tracery and lead came mullions
                        float traceryX = abs(sin(winUv.x * 18.84));
                        float traceryY = abs(sin(winUv.y * 25.13));
                        float mullion = max(smoothstep(0.82, 0.95, traceryX), smoothstep(0.82, 0.95, traceryY));
                        col = mix(glassColor, vec3(0.008, 0.008, 0.01), mullion);
                    }
                }
            }

            // Darker, thick spooky green volumetric fog filling the hallway
            float greenMist = (mist * 0.75 + 0.25) * uGreenGlow;
            col = mix(col, greenSpooky, greenMist * 0.52);
            col += greenSpooky * (uGreenGlow * 0.28 + uBass * 0.18);

            // Shines and shafts of searing blood-red light piercing through the dark green fog
            float redAngle = (vUv.x - 0.5) * 3.8 + (vUv.y - 0.4) * 2.5;
            float redRay1 = pow(max(0.0, sin(redAngle * 2.8 - uTime * 1.35)), 6.0);
            float redRay2 = pow(max(0.0, cos(vUv.y * 10.0 - redAngle * 1.8 + uTime * 0.85)), 5.0);
            float redShafts = (redRay1 * 0.72 + redRay2 * 0.48) * (0.65 + 0.35 * sin(uTime * 3.2 + vWorldPos.x * 2.2));
            float redGlowIntensity = (redShafts * 0.95 + 0.12 * mist) * uGreenGlow;
            col += bloodRed * redGlowIntensity * (1.1 + uBass * 0.7);

            gl_FragColor = vec4(col, 1.0);
        }
    `;

    function createHallwaySurfaceMat(surfaceId) {
        return new THREE.ShaderMaterial({
            vertexShader: hauntedHallwayVertexShader,
            fragmentShader: hauntedHallwayFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uGreenGlow: { value: 0.0 },
                uBass: { value: 0.0 },
                uSurface: { value: surfaceId }
            },
            depthWrite: true,
            side: THREE.DoubleSide
        });
    }

    const hauntedHallwayFloorMat = createHallwaySurfaceMat(0);
    const hauntedHallwayCeilMat = createHallwaySurfaceMat(1);
    const hauntedHallwayLeftMat = createHallwaySurfaceMat(2);
    const hauntedHallwayRightMat = createHallwaySurfaceMat(3);
    const hauntedHallwayBackMat = createHallwaySurfaceMat(4);

    const hauntedHallwayMats = [hauntedHallwayFloorMat, hauntedHallwayCeilMat, hauntedHallwayLeftMat, hauntedHallwayRightMat, hauntedHallwayBackMat];

    // Floor (Width: 2.16, Depth: 7.30, at y = -1.98, z = -13.85)
    const hallwayFloorGeo = new THREE.PlaneGeometry(2.16, 7.30);
    const hallwayFloorMesh = new THREE.Mesh(hallwayFloorGeo, hauntedHallwayFloorMat);
    hallwayFloorMesh.position.set(2.06, -1.98, -13.85);
    hallwayFloorMesh.rotation.x = -Math.PI / 2;
    hauntedHallwayGroup.add(hallwayFloorMesh);

    // Ceiling (Width: 2.16, Depth: 7.30, at y = +0.87, z = -13.85)
    const hallwayCeilGeo = new THREE.PlaneGeometry(2.16, 7.30);
    const hallwayCeilMesh = new THREE.Mesh(hallwayCeilGeo, hauntedHallwayCeilMat);
    hallwayCeilMesh.position.set(2.06, 0.87, -13.85);
    hallwayCeilMesh.rotation.x = Math.PI / 2;
    hauntedHallwayGroup.add(hallwayCeilMesh);

    // Left Wall (Depth: 7.30, Height: 2.85, at x = 0.98, y = -0.55, z = -13.85)
    const hallwayWallGeo = new THREE.PlaneGeometry(7.30, 2.85);
    const hallwayLeftMesh = new THREE.Mesh(hallwayWallGeo, hauntedHallwayLeftMat);
    hallwayLeftMesh.position.set(0.98, -0.55, -13.85);
    hallwayLeftMesh.rotation.y = Math.PI / 2;
    hauntedHallwayGroup.add(hallwayLeftMesh);

    // Right Wall (Depth: 7.30, Height: 2.85, at x = 3.14, y = -0.55, z = -13.85)
    const hallwayRightMesh = new THREE.Mesh(hallwayWallGeo, hauntedHallwayRightMat);
    hallwayRightMesh.position.set(3.14, -0.55, -13.85);
    hallwayRightMesh.rotation.y = -Math.PI / 2;
    hauntedHallwayGroup.add(hallwayRightMesh);

    // Back Grand Staircase Wall (Width: 2.16, Height: 2.85, at z = -17.50)
    const hallwayBackGeo = new THREE.PlaneGeometry(2.16, 2.85);
    const hallwayBackMesh = new THREE.Mesh(hallwayBackGeo, hauntedHallwayBackMat);
    hallwayBackMesh.position.set(2.06, -0.55, -17.50);
    hauntedHallwayGroup.add(hallwayBackMesh);

    gHauntedManor.add(hauntedHallwayGroup);

    // Eerie Spooky Dark Green Volumetric Hallway Light
    const hauntedHallwayLight = new THREE.PointLight(0x00c853, 0.0, 9.5);
    hauntedHallwayLight.position.set(2.06, -0.4, -10.5);
    gHauntedManor.add(hauntedHallwayLight);

    // Piercing Blood-Red Volumetric Hallway Light (Shining forward from deep staircase)
    const hauntedHallwayRedLight = new THREE.PointLight(0xff1824, 0.0, 11.5);
    hauntedHallwayRedLight.position.set(2.06, 0.2, -15.5);
    gHauntedManor.add(hauntedHallwayRedLight);

    // 3D Carved Gothic Double Front Doors Attached to Building Facade (Opening OUTWARDS)
    const hauntedFrontDoorTex = createHauntedFrontDoorTexture();
    const hauntedDoorWingGeo = new THREE.PlaneGeometry(1.05, 2.85);
    const hauntedDoorWingMat = new THREE.MeshBasicMaterial({
        map: hauntedFrontDoorTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    // 3D Door Frame Jamb Trims & Iron Hinge Mounts (Visibly attaching doors to building facade)
    const doorFrameGroup = new THREE.Group();
    const jambGeo = new THREE.PlaneGeometry(0.12, 2.95);
    const jambMat = new THREE.MeshBasicMaterial({ color: 0x182436, side: THREE.DoubleSide });
    const leftJamb = new THREE.Mesh(jambGeo, jambMat);
    leftJamb.position.set(0.98, -0.55, -10.15);
    doorFrameGroup.add(leftJamb);

    const rightJamb = new THREE.Mesh(jambGeo, jambMat);
    rightJamb.position.set(3.14, -0.55, -10.15);
    doorFrameGroup.add(rightJamb);

    const headerGeo = new THREE.PlaneGeometry(2.28, 0.14);
    const headerMesh = new THREE.Mesh(headerGeo, jambMat);
    headerMesh.position.set(2.06, 0.90, -10.15);
    doorFrameGroup.add(headerMesh);

    // Wrought-iron decorative strap hinge brackets on facade
    const hingeGeo = new THREE.PlaneGeometry(0.22, 0.08);
    const hingeMat = new THREE.MeshBasicMaterial({ color: 0x05080c, side: THREE.DoubleSide });
    [-0.35, -0.75, +0.45].forEach(hy => {
        const hLeft = new THREE.Mesh(hingeGeo, hingeMat);
        hLeft.position.set(0.96, hy, -10.14);
        doorFrameGroup.add(hLeft);

        const hRight = new THREE.Mesh(hingeGeo, hingeMat);
        hRight.position.set(3.16, hy, -10.14);
        doorFrameGroup.add(hRight);
    });
    gHauntedManor.add(doorFrameGroup);

    // Left Door Pivot (Attached to building at x = 1.01, y = -0.55, z = -10.16)
    const hauntedLeftDoorPivot = new THREE.Group();
    hauntedLeftDoorPivot.position.set(1.01, -0.55, -10.16);
    const hauntedLeftDoorMesh = new THREE.Mesh(hauntedDoorWingGeo, hauntedDoorWingMat);
    hauntedLeftDoorMesh.position.set(0.525, 0, 0);
    hauntedLeftDoorPivot.add(hauntedLeftDoorMesh);
    gHauntedManor.add(hauntedLeftDoorPivot);

    // Right Door Pivot (Attached to building at x = 3.11, y = -0.55, z = -10.16)
    const hauntedRightDoorPivot = new THREE.Group();
    hauntedRightDoorPivot.position.set(3.11, -0.55, -10.16);
    const hauntedRightDoorMesh = new THREE.Mesh(hauntedDoorWingGeo, hauntedDoorWingMat);
    hauntedRightDoorMesh.position.set(-0.525, 0, 0);
    hauntedRightDoorMesh.scale.set(-1.0, 1.0, 1.0);
    hauntedRightDoorPivot.add(hauntedRightDoorMesh);
    gHauntedManor.add(hauntedRightDoorPivot);

    // Terrifying Scream Ghostface Jumpscare Apparition (Leaps out from open doors brandishing Buck 120 knife)
    const hauntedJumpSpookTex = createScreamGhoulTexture();
    const hauntedJumpSpookGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const hauntedJumpSpookMat = new THREE.MeshBasicMaterial({
        map: hauntedJumpSpookTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        opacity: 0.0,
        side: THREE.DoubleSide
    });
    const hauntedJumpSpookMesh = new THREE.Mesh(hauntedJumpSpookGeo, hauntedJumpSpookMat);
    hauntedJumpSpookMesh.position.set(2.06, -0.55, -10.3);
    hauntedJumpSpookMesh.scale.set(0.1, 0.1, 0.1);
    gHauntedManor.add(hauntedJumpSpookMesh);

    // 5. Layer 5: Winding Curving Estate Road / Driveway (Ground Plane: 110x75 full terrain span)
    const hauntedPathGeo = new THREE.PlaneGeometry(110.0, 75.0);
    const hauntedPathMat = new THREE.MeshStandardMaterial({
        map: hauntedPathTex,
        roughness: 0.38,
        metalness: 0.18,
        color: 0xccddee,
        transparent: true,
        depthWrite: false
    });
    const hauntedPathMesh = new THREE.Mesh(hauntedPathGeo, hauntedPathMat);
    hauntedPathMesh.position.set(0.0, -7.5, -5.0);
    hauntedPathMesh.rotation.x = -Math.PI / 2 + 0.08;
    gHauntedManor.add(hauntedPathMesh);

    // =========================================================================
    // 5b. Spooky Middle Ground Features (React to Music & Beats)
    // =========================================================================

    // 1. Haunted Graveyard with Runed Headstones & Celtic Crosses (Left Middle Lawn, z = -5.5)
    const hauntedGraveyardGroup = new THREE.Group();
    const hauntedGraveyardGeo = new THREE.PlaneGeometry(13.2, 6.6);
    const hauntedGraveyardMat = new THREE.MeshBasicMaterial({
        map: hauntedGraveyardTex,
        transparent: true,
        depthWrite: false
    });
    const hauntedGraveyardMesh = new THREE.Mesh(hauntedGraveyardGeo, hauntedGraveyardMat);
    hauntedGraveyardMesh.position.set(-8.8, -4.2, -5.5);
    hauntedGraveyardMesh.rotation.x = 0.08;
    hauntedGraveyardGroup.add(hauntedGraveyardMesh);

    // Floating Will-o'-the-Wisps (Spirit Orbs) hovering above the graves
    const hauntedWispGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const hauntedWispMat = new THREE.MeshBasicMaterial({
        map: hauntedWispTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.85
    });
    const hauntedWispData = [
        { bx: -12.2, by: -3.8, bz: -5.2, speedX: 1.2, speedY: 1.8, phase: 0.0 },
        { bx: -10.5, by: -3.2, bz: -5.8, speedX: 1.5, speedY: 2.1, phase: 1.2 },
        { bx: -8.8, by: -2.8, bz: -5.0, speedX: 1.1, speedY: 1.6, phase: 2.4 },
        { bx: -7.2, by: -3.4, bz: -5.4, speedX: 1.7, speedY: 2.3, phase: 3.6 },
        { bx: -6.0, by: -3.9, bz: -4.8, speedX: 1.3, speedY: 1.7, phase: 4.8 },
        { bx: -9.8, by: -2.4, bz: -6.2, speedX: 0.9, speedY: 1.4, phase: 5.5 },
        { bx: -11.4, by: -3.5, bz: -4.6, speedX: 1.4, speedY: 1.9, phase: 0.8 }
    ];
    const hauntedWispMeshes = hauntedWispData.map((d) => {
        const mesh = new THREE.Mesh(hauntedWispGeo, hauntedWispMat.clone());
        mesh.position.set(d.bx, d.by, d.bz);
        hauntedGraveyardGroup.add(mesh);
        return mesh;
    });

    // Spirit Orb Bioluminescent Glow Light (Casting spectral cyan-emerald glow on graves & grass)
    const hauntedWispLight = new THREE.PointLight(0x28ffd0, 1.2, 12.0);
    hauntedWispLight.position.set(-8.8, -3.2, -5.2);
    hauntedGraveyardGroup.add(hauntedWispLight);
    gHauntedManor.add(hauntedGraveyardGroup);

    // 2. Spectral Wandering Apparition / Phantom Wraith (Right Middle Lawn, z = -6.2)
    const hauntedSpecterGroup = new THREE.Group();
    const hauntedSpecterGeo = new THREE.PlaneGeometry(4.2, 8.4);
    const hauntedSpecterMat = new THREE.MeshBasicMaterial({
        map: hauntedSpecterTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.40
    });
    const hauntedSpecterMesh = new THREE.Mesh(hauntedSpecterGeo, hauntedSpecterMat);
    hauntedSpecterMesh.position.set(9.2, -2.4, -6.2);
    hauntedSpecterGroup.add(hauntedSpecterMesh);
    gHauntedManor.add(hauntedSpecterGroup);

    // 2b. Floating Purple / Amethyst Will-o'-the-Wisps (Spirit Orbs on the Right Lawn & Trees, z = -5.8)
    const hauntedPurpleWispTex = createPurpleWillOTheWispTexture();
    const hauntedPurpleWispGroup = new THREE.Group();
    const hauntedPurpleWispGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const hauntedPurpleWispMat = new THREE.MeshBasicMaterial({
        map: hauntedPurpleWispTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.85
    });
    const hauntedPurpleWispData = [
        { bx: 6.8, by: -3.5, bz: -5.0, speedX: 1.3, speedY: 1.7, phase: 0.5 },
        { bx: 8.5, by: -2.8, bz: -5.8, speedX: 1.6, speedY: 2.2, phase: 1.8 },
        { bx: 10.2, by: -2.4, bz: -6.2, speedX: 1.0, speedY: 1.5, phase: 3.1 },
        { bx: 11.8, by: -3.2, bz: -5.4, speedX: 1.4, speedY: 2.0, phase: 4.4 },
        { bx: 9.0, by: -3.8, bz: -4.6, speedX: 1.2, speedY: 1.8, phase: 5.7 }
    ];
    const hauntedPurpleWispMeshes = hauntedPurpleWispData.map((d) => {
        const mesh = new THREE.Mesh(hauntedPurpleWispGeo, hauntedPurpleWispMat.clone());
        mesh.position.set(d.bx, d.by, d.bz);
        hauntedPurpleWispGroup.add(mesh);
        return mesh;
    });

    // Violet / Amethyst bioluminescent glow light on right lawn
    const hauntedPurpleWispLight = new THREE.PointLight(0xba14ff, 1.2, 11.0);
    hauntedPurpleWispLight.position.set(9.2, -2.8, -5.5);
    hauntedPurpleWispGroup.add(hauntedPurpleWispLight);
    gHauntedManor.add(hauntedPurpleWispGroup);

    // 3. Gothic Watcher Gargoyles with Glowing Cursed Eyes (Flanking Front Driveway Approach to Manor)
    const hauntedGargoylesGroup = new THREE.Group();
    const hauntedGargoyleGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const hauntedGargoyleMat = new THREE.MeshBasicMaterial({
        map: hauntedGargoyleTex,
        transparent: true,
        depthWrite: false
    });

    // Left Gargoyle perched proudly flanking front carriage approach
    const hauntedGargoyleLeft = new THREE.Mesh(hauntedGargoyleGeo, hauntedGargoyleMat);
    hauntedGargoyleLeft.position.set(-3.8, -3.0, -4.8);
    hauntedGargoylesGroup.add(hauntedGargoyleLeft);

    // Right Gargoyle perched proudly flanking front carriage approach (Mirrored facing inward)
    const hauntedGargoyleRight = new THREE.Mesh(hauntedGargoyleGeo, hauntedGargoyleMat);
    hauntedGargoyleRight.position.set(3.8, -3.0, -4.8);
    hauntedGargoyleRight.scale.x = -1.0;
    hauntedGargoylesGroup.add(hauntedGargoyleRight);

    // Cursed Glowing Eyes Sprites for Gargoyles
    const cursedEyeGeo = new THREE.PlaneGeometry(0.7, 0.35);
    const cursedEyeMat = new THREE.MeshBasicMaterial({
        map: hauntedRedEyesTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.90
    });
    const hauntedGargoyleEyeLeft = new THREE.Mesh(cursedEyeGeo, cursedEyeMat);
    hauntedGargoyleEyeLeft.position.set(-3.8, -2.75, -4.75);
    hauntedGargoylesGroup.add(hauntedGargoyleEyeLeft);

    const hauntedGargoyleEyeRight = new THREE.Mesh(cursedEyeGeo, cursedEyeMat.clone());
    hauntedGargoyleEyeRight.position.set(3.8, -2.75, -4.75);
    hauntedGargoylesGroup.add(hauntedGargoyleEyeRight);

    gHauntedManor.add(hauntedGargoylesGroup);

    // 4. Jack-O'-Lantern Pathway Guardians with Coloured Lights in Cut-out Mouths
    const hauntedPumpkinsGroup = new THREE.Group();
    const pumpkinGeo = new THREE.PlaneGeometry(1.4, 1.4);

    const pumpkinConfigs = [
        { x: -3.2, y: -4.60, z: -1.4, scale: 1.25, rotZ: 0.04, lightType: 0, lightHex: 0xff7722 }, // Left curb by gates: Warm amber candle
        { x: 3.1, y: -4.60, z: -1.6, scale: 1.20, rotZ: -0.05, lightType: 2, lightHex: 0xaa33dd }, // Right curb by gates: Witch amethyst candle
        { x: -4.0, y: -4.85, z: -3.6, scale: 1.15, rotZ: -0.06, lightType: 1, lightHex: 0x33dd66 }, // Mid-curve left: Eerie spectral green
        { x: 1.8, y: -4.85, z: -3.8, scale: 1.10, rotZ: 0.06, lightType: 3, lightHex: 0xff9911 },  // Mid-curve right: Harvest gold candle
        { x: -1.8, y: -5.00, z: -6.2, scale: 1.05, rotZ: 0.05, lightType: 4, lightHex: 0x00e5ff }, // Approach left: Electric cyan rave
        { x: 4.5, y: -5.00, z: -6.4, scale: 1.00, rotZ: -0.04, lightType: 5, lightHex: 0xff007f }, // Approach right: Hot disco magenta
        { x: -7.8, y: -4.20, z: -4.8, scale: 1.12, rotZ: 0.08, lightType: 2, lightHex: 0xba14ff }, // Graveyard entrance by Celtic cross
        { x: -9.5, y: -4.05, z: -6.0, scale: 0.95, rotZ: -0.07, lightType: 1, lightHex: 0x00ff88 }, // Deep graveyard headstone mound
        { x: 8.5, y: -3.85, z: -5.5, scale: 1.15, rotZ: 0.05, lightType: 5, lightHex: 0xff0066 },  // Right lawn beneath gnarled branches
        { x: 10.4, y: -3.95, z: -7.0, scale: 1.05, rotZ: -0.04, lightType: 4, lightHex: 0x00ccff }, // Far right estate boundary
        { x: -0.8, y: -3.20, z: -9.4, scale: 0.92, rotZ: -0.03, lightType: 0, lightHex: 0xff6600 }, // Manor porch terrace left steps
        { x: 5.2, y: -3.20, z: -9.4, scale: 0.92, rotZ: 0.04, lightType: 3, lightHex: 0xffbb00 }   // Manor porch terrace right steps
    ];

    const hauntedPumpkinMeshes = pumpkinConfigs.map((cfg) => {
        const customPumpkinTex = createHauntedPumpkinTexture(cfg.lightType);
        const mat = new THREE.MeshBasicMaterial({
            map: customPumpkinTex,
            transparent: true,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(pumpkinGeo, mat);
        mesh.position.set(cfg.x, cfg.y, cfg.z);
        mesh.scale.setScalar(cfg.scale);
        mesh.rotation.z = cfg.rotZ;
        hauntedPumpkinsGroup.add(mesh);
        return mesh;
    });

    // Flickering candle flame point lights casting natural warm light onto the wet cobblestones
    const hauntedPumpkinLights = pumpkinConfigs.map((cfg) => {
        const pLight = new THREE.PointLight(cfg.lightHex, 1.2, 5.0);
        pLight.position.set(cfg.x, cfg.y + 0.2, cfg.z + 0.3);
        hauntedPumpkinsGroup.add(pLight);
        return pLight;
    });

    gHauntedManor.add(hauntedPumpkinsGroup);

    // 5. Possessed Gnarled Trees with Watching Eyes (Flanking middle ground, z = -6.5)
    const hauntedGnarledTreesGroup = new THREE.Group();
    const gnarledTreeGeo = new THREE.PlaneGeometry(7.5, 15.0);
    const gnarledTreeMat = new THREE.MeshBasicMaterial({
        map: hauntedGnarledTreeTex,
        transparent: true,
        depthWrite: false
    });

    // Left Gnarled Tree
    const hauntedGnarledTreeLeft = new THREE.Mesh(gnarledTreeGeo, gnarledTreeMat);
    hauntedGnarledTreeLeft.position.set(-14.2, -1.2, -6.5);
    hauntedGnarledTreesGroup.add(hauntedGnarledTreeLeft);

    // Right Gnarled Tree (Mirrored)
    const hauntedGnarledTreeRight = new THREE.Mesh(gnarledTreeGeo, gnarledTreeMat);
    hauntedGnarledTreeRight.position.set(14.2, -1.2, -6.5);
    hauntedGnarledTreeRight.scale.x = -1.0;
    hauntedGnarledTreesGroup.add(hauntedGnarledTreeRight);

    // Watching Eyes in Tree Hollows (Aligned accurately inside trunk knot cavities, subtle & small)
    const treeEyeGeo = new THREE.PlaneGeometry(0.38, 0.18);
    const treeEyeRedMat = new THREE.MeshBasicMaterial({
        map: hauntedRedEyesTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.35
    });
    const treeEyeYellowMat = new THREE.MeshBasicMaterial({
        map: hauntedYellowEyesTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.35
    });

    const treeEyePositions = [
        { x: -14.42, y: -2.78, z: -6.45, isRed: false }, // Left tree lower trunk knot
        { x: -14.02, y: -0.73, z: -6.45, isRed: true },  // Left tree mid trunk knot
        { x: -14.35, y: 1.17, z: -6.45, isRed: false },  // Left tree upper trunk crook
        { x: 14.42, y: -2.78, z: -6.45, isRed: true },   // Right tree lower trunk knot
        { x: 14.02, y: -0.73, z: -6.45, isRed: false },  // Right tree mid trunk knot
        { x: 14.35, y: 1.17, z: -6.45, isRed: true }    // Right tree upper trunk crook
    ];

    const hauntedTreeEyeMeshes = treeEyePositions.map(pos => {
        const eyeMat = pos.isRed ? treeEyeRedMat.clone() : treeEyeYellowMat.clone();
        const eyeMesh = new THREE.Mesh(treeEyeGeo, eyeMat);
        eyeMesh.position.set(pos.x, pos.y, pos.z);
        hauntedGnarledTreesGroup.add(eyeMesh);
        return eyeMesh;
    });

    gHauntedManor.add(hauntedGnarledTreesGroup);

    // 6. Layer 6: Extended Wrought-Iron Cemetery Fencing & Articulated Swinging Gates (Lowered a Touch, z = 0.0)
    // Height lowered from 16.5 to 13.8 at y = -3.2, keeping bottom well below screen edge (zero bottom gap) while opening the view!
    const hauntedFenceGeo = new THREE.PlaneGeometry(26.0, 13.8);
    const hauntedFenceMat = new THREE.MeshBasicMaterial({
        map: hauntedFenceTex,
        transparent: true,
        depthWrite: false
    });
    const hauntedFenceLeftMesh = new THREE.Mesh(hauntedFenceGeo, hauntedFenceMat);
    hauntedFenceLeftMesh.position.set(-16.0, -3.2, 0.0);
    gHauntedManor.add(hauntedFenceLeftMesh);

    // Mirrored Right Perimeter Fence Railings
    const hauntedFenceRightMesh = new THREE.Mesh(hauntedFenceGeo, hauntedFenceMat);
    hauntedFenceRightMesh.position.set(16.0, -3.2, 0.0);
    hauntedFenceRightMesh.scale.set(-1.0, 1.0, 1.0);
    gHauntedManor.add(hauntedFenceRightMesh);

    // Articulated Swinging Gates (Lowered a touch: Width 4.2, Height 11.2; swinging wide open on 3D hinges at z = 0.0)
    const hauntedGateWingGeo = new THREE.PlaneGeometry(4.2, 11.2);
    const hauntedGateWingMat = new THREE.MeshBasicMaterial({
        map: hauntedGateWingTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    // Left Gate Wing Pivot (Hinge at x = -3.8, y = -3.2, z = 0.0)
    const hauntedLeftGatePivot = new THREE.Group();
    hauntedLeftGatePivot.position.set(-3.8, -3.2, 0.0);
    const hauntedLeftGateMesh = new THREE.Mesh(hauntedGateWingGeo, hauntedGateWingMat);
    hauntedLeftGateMesh.position.set(2.1, 0, 0); // Offset so hinge is at pivot origin
    hauntedLeftGatePivot.add(hauntedLeftGateMesh);
    gHauntedManor.add(hauntedLeftGatePivot);

    // Right Gate Wing Pivot (Hinge at x = +3.8, y = -3.2, z = 0.0)
    const hauntedRightGatePivot = new THREE.Group();
    hauntedRightGatePivot.position.set(3.8, -3.2, 0.0);
    const hauntedRightGateMesh = new THREE.Mesh(hauntedGateWingGeo, hauntedGateWingMat);
    hauntedRightGateMesh.position.set(-2.1, 0, 0); // Offset so hinge is at pivot origin
    hauntedRightGateMesh.scale.set(-1.0, 1.0, 1.0);
    hauntedRightGatePivot.add(hauntedRightGateMesh);
    gHauntedManor.add(hauntedRightGatePivot);

    // 6b. Realistic Dark Cemetery Wild Grass along Fence Line (Aligned to Front of Fence at z = +0.08, Lowered to y = -6.8)
    const hauntedGrassTufts = [];
    const hauntedGrassGroup = new THREE.Group();
    const hauntedGrassGeo = new THREE.PlaneGeometry(2.4, 2.6);
    hauntedGrassGeo.translate(0, 1.3, 0);

    const hauntedGrassMat = new THREE.MeshBasicMaterial({
        map: hauntedGrassTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const numGrassTufts = 76;
    for (let g = 0; g < numGrassTufts; g++) {
        const tuftMesh = new THREE.Mesh(hauntedGrassGeo, hauntedGrassMat.clone());
        let gx;
        if (g < 38) {
            const t = g / 37;
            gx = -26.0 + t * 22.4;
        } else {
            const t = (g - 38) / 37;
            gx = 3.6 + t * 22.4;
        }

        const gy = -6.8 + (Math.random() - 0.5) * 0.18; // Aligned with lowered fence base
        const gz = 0.08 + (Math.random() - 0.5) * 0.08;
        const scale = 0.95 + Math.random() * 0.35;
        const scaleX = scale * (Math.random() > 0.5 ? 1.0 : -1.0);
        const baseRot = (Math.random() - 0.5) * 0.12;

        tuftMesh.position.set(gx, gy, gz);
        tuftMesh.scale.set(scaleX, scale, 1.0);
        tuftMesh.rotation.z = baseRot;
        hauntedGrassGroup.add(tuftMesh);

        hauntedGrassTufts.push({
            mesh: tuftMesh,
            baseRot: baseRot,
            baseScaleX: Math.abs(scaleX),
            baseScaleY: scale,
            idleSpeed: 0.35 + Math.random() * 0.35,
            phase: Math.random() * Math.PI * 2.0,
            windFactor: 0.85 + Math.random() * 0.55
        });
    }
    gHauntedManor.add(hauntedGrassGroup);

    // 6c. Dark Autumn Dead Leaves Swirling Across the Screen in the Wind Gusts (85 individual separate dead leaves)
    const hauntedLeafTextures = [
        createSingleHauntedLeafTexture(0),
        createSingleHauntedLeafTexture(1),
        createSingleHauntedLeafTexture(2)
    ];
    const hauntedLeafMaterials = hauntedLeafTextures.map(tex => new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    }));
    const hauntedLeavesGroup = new THREE.Group();
    const hauntedLeafGeo = new THREE.PlaneGeometry(0.36, 0.36);

    const hauntedLeaves = [];
    const numHauntedLeaves = 85;
    for (let l = 0; l < numHauntedLeaves; l++) {
        // Each mesh is ONE single separate leaf with its own individual texture
        const leafMesh = new THREE.Mesh(hauntedLeafGeo, hauntedLeafMaterials[l % 3]);
        const lx = (Math.random() - 0.5) * 56.0;
        const ly = -6.8 + Math.random() * 6.5;
        const lz = -1.5 + Math.random() * 4.2;
        leafMesh.position.set(lx, ly, lz);

        const leafScale = 0.75 + Math.random() * 0.55;
        leafMesh.scale.set(leafScale, leafScale, leafScale);
        leafMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        hauntedLeavesGroup.add(leafMesh);

        hauntedLeaves.push({
            mesh: leafMesh,
            baseY: ly,
            baseZ: lz,
            speedFactor: 0.85 + Math.random() * 0.55,
            liftFactor: 0.65 + Math.random() * 0.70,
            rotSpeedX: (Math.random() - 0.5) * 6.5,
            rotSpeedY: (Math.random() - 0.5) * 8.0,
            rotSpeedZ: (Math.random() - 0.5) * 5.0,
            phase: Math.random() * Math.PI * 2.0
        });
    }
    gHauntedManor.add(hauntedLeavesGroup);

    // 7. Layer 7: Flocks of 3D Articulated Flying Vampire Bats (32 dynamic bats with hinged flapping wings)
    const hauntedBatCount = 32;
    const hauntedBatBodyGeo = new THREE.PlaneGeometry(0.38, 0.72);
    const hauntedBatBodyMat = new THREE.MeshBasicMaterial({
        map: hauntedBatBodyTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const hauntedBatWingGeo = new THREE.PlaneGeometry(0.85, 0.85);
    const hauntedBatWingMat = new THREE.MeshBasicMaterial({
        map: hauntedBatWingTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const hauntedBats = [];
    const hauntedBatGroup = new THREE.Group();

    function respawnHauntedBat(bObj, fromScratch = false) {
        // 3 Screen-Traversing Flight Types (Flying in and out of the scene with varied majestic speeds):
        // 0: High Sky Crosser (Slow gliding across moon & upper atmosphere, edge to edge)
        // 1: Spire & Mansion Diver (Diagonal swoop over Victorian towers & weeping willows)
        // 2: Foreground Gate Swooper (Diving forward past iron gates into camera view)
        const type = Math.floor(Math.random() * 3);
        bObj.flightType = type;
        bObj.phase = Math.random() * Math.PI * 2.0;
        bObj.flapSpeed = 5.2 + Math.random() * 4.8; // Varied biological wing flap rhythm

        const fromLeft = Math.random() > 0.5;
        let startX, startY, startZ;
        let endX, endY, endZ;
        let speed;

        if (type === 0) {
            // High Sky Crosser (Slow majestic gliding edge-to-edge across moon and upper sky)
            startX = fromLeft ? (-36.0 - Math.random() * 8.0) : (36.0 + Math.random() * 8.0);
            endX = fromLeft ? (38.0 + Math.random() * 8.0) : (-38.0 - Math.random() * 8.0);
            startY = 5.5 + Math.random() * 6.0;
            endY = 4.5 + Math.random() * 6.5;
            startZ = -16.5 + (Math.random() - 0.5) * 2.5;
            endZ = -16.5 + (Math.random() - 0.5) * 2.5;
            speed = 2.4 + Math.random() * 2.4; // 2.4 to 4.8 units/s (gentle gliding)
            bObj.baseScale = 0.52 + Math.random() * 0.30;
        } else if (type === 1) {
            // Mansion Spires Diver (Graceful swoops around gables and spires)
            startX = fromLeft ? (-34.0 - Math.random() * 6.0) : (34.0 + Math.random() * 6.0);
            endX = fromLeft ? (36.0 + Math.random() * 6.0) : (-36.0 - Math.random() * 6.0);
            startY = 2.0 + Math.random() * 7.5;
            endY = 0.5 + Math.random() * 6.5;
            startZ = -9.2 + (Math.random() - 0.5) * 3.5;
            endZ = -9.0 + (Math.random() - 0.5) * 3.5;
            speed = 3.6 + Math.random() * 2.8; // 3.6 to 6.4 units/s (moderate banking flight)
            bObj.baseScale = 0.85 + Math.random() * 0.40;
        } else {
            // Foreground Gate Swooper (Diving through the stone pillars and wrought iron gates into foreground)
            startX = fromLeft ? (-30.0 - Math.random() * 6.0) : (30.0 + Math.random() * 6.0);
            endX = fromLeft ? (32.0 + Math.random() * 6.0) : (-32.0 - Math.random() * 6.0);
            startY = 3.5 + Math.random() * 5.0;
            endY = -3.2 + Math.random() * 4.0;
            startZ = -5.5 + Math.random() * 4.0;
            endZ = 2.5 + Math.random() * 3.5;
            speed = 5.2 + Math.random() * 3.0; // 5.2 to 8.2 units/s (dynamic swoops)
            bObj.baseScale = 1.45 + Math.random() * 0.65;
        }

        if (fromScratch) {
            const prog = Math.random();
            bObj.pos.set(
                startX + (endX - startX) * prog,
                startY + (endY - startY) * prog,
                startZ + (endZ - startZ) * prog
            );
        } else {
            bObj.pos.set(startX, startY, startZ);
        }

        const dir = new THREE.Vector3(endX - startX, endY - startY, endZ - startZ).normalize();
        bObj.velocity.copy(dir.multiplyScalar(speed));
        bObj.batRoot.position.copy(bObj.pos);
        bObj.batRoot.scale.setScalar(bObj.baseScale);
    }

    for (let b = 0; b < hauntedBatCount; b++) {
        const batRoot = new THREE.Group();

        // Central furry bat torso & head with crimson eyes
        const bodyMesh = new THREE.Mesh(hauntedBatBodyGeo, hauntedBatBodyMat);
        batRoot.add(bodyMesh);

        // Articulated Left Wing (Shoulder Hinge at x = -0.10)
        const leftWingPivot = new THREE.Group();
        leftWingPivot.position.set(-0.10, 0.04, 0);
        const leftWingMesh = new THREE.Mesh(hauntedBatWingGeo, hauntedBatWingMat);
        leftWingMesh.position.set(-0.42, 0, 0);
        leftWingPivot.add(leftWingMesh);
        batRoot.add(leftWingPivot);

        // Articulated Right Wing (Shoulder Hinge at x = +0.10, Mirrored)
        const rightWingPivot = new THREE.Group();
        rightWingPivot.position.set(0.10, 0.04, 0);
        const rightWingMesh = new THREE.Mesh(hauntedBatWingGeo, hauntedBatWingMat);
        rightWingMesh.position.set(0.42, 0, 0);
        rightWingMesh.scale.x = -1.0;
        rightWingPivot.add(rightWingMesh);
        batRoot.add(rightWingPivot);

        hauntedBatGroup.add(batRoot);

        const batItem = {
            batRoot,
            bodyMesh,
            leftWingPivot,
            rightWingPivot,
            pos: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            flightType: 0,
            baseScale: 1.0,
            flapSpeed: 10.0,
            phase: Math.random() * Math.PI * 2.0
        };
        respawnHauntedBat(batItem, true);
        hauntedBats.push(batItem);
    }
    gHauntedManor.add(hauntedBatGroup);

    // 8. Layer 8: Edge-to-Edge Rolling Ground Fog Ocean (96 Volumetric Fog Puffs Spanning Across Entire Screen from One Side to the Other)
    const hauntedPathFogPuffs = [];
    const hauntedPathFogGroup = new THREE.Group();
    const hauntedPathFogGeo = new THREE.PlaneGeometry(12.5, 7.5);
    const hauntedPathFogMat = new THREE.MeshBasicMaterial({
        map: hauntedMistTex,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.NormalBlending,
        color: 0x9ec7f5
    });

    const numPathFogPuffs = 96;
    for (let f = 0; f < numPathFogPuffs; f++) {
        const puffMesh = new THREE.Mesh(hauntedPathFogGeo, hauntedPathFogMat.clone());
        puffMesh.rotation.x = -Math.PI / 2 + 0.16; // Hugging tilted ground
        const scale = 0.95 + Math.random() * 0.70;
        puffMesh.scale.set(scale, scale * 0.72, 1.0);
        hauntedPathFogGroup.add(puffMesh);

        // Distribute across entire screen width from x = -26.0 (far left) to x = +26.0 (far right)
        // Group A (56 puffs): Wide blanket spreading across the sides of the path all the way from one side of the screen to the other
        // Group B (40 puffs): Dense tendrils channeling along the driveway through the open gates and fanning across foreground
        const isWideBlanket = f < 56;
        let xCenter, xSpread;
        if (isWideBlanket) {
            // Evenly spaced lateral stations across full width (-26.0 to +26.0)
            const t = f / 55;
            xCenter = -26.0 + t * 52.0;
            xSpread = (Math.random() - 0.5) * 4.0;
        } else {
            // Path and gate zone with billowing outward spread
            xCenter = 0.0;
            xSpread = (Math.random() - 0.5) * 12.0;
        }

        hauntedPathFogPuffs.push({
            mesh: puffMesh,
            progress: (f / numPathFogPuffs + Math.random() * 0.05) % 1.0,
            speed: 0.024 + Math.random() * 0.020,
            rotSpeed: (Math.random() - 0.5) * 0.038,
            xCenter: xCenter,
            xSpread: xSpread,
            driftSpeed: (Math.random() - 0.45) * 0.6, // Lateral drift wafting with the wind
            isWideBlanket: isWideBlanket,
            baseScale: scale,
            phase: Math.random() * Math.PI * 2.0
        });
    }
    gHauntedManor.add(hauntedPathFogGroup);

    // Ambient Rolling Graveyard Lawn Mist Particles (80 distant mist puffs)
    const hauntedMistCount = 80;
    const hauntedMistGeo = new THREE.BufferGeometry();
    const hauntedMistPos = new Float32Array(hauntedMistCount * 3);
    const hauntedMistSize = new Float32Array(hauntedMistCount);
    const hauntedMistSpeed = new Float32Array(hauntedMistCount);
    const hauntedMistPhase = new Float32Array(hauntedMistCount);

    for (let m = 0; m < hauntedMistCount; m++) {
        hauntedMistPos[m * 3] = (Math.random() - 0.5) * 60.0;
        hauntedMistPos[m * 3 + 1] = -5.8 + Math.random() * 3.0;
        hauntedMistPos[m * 3 + 2] = -4.0 - Math.random() * 22.0;

        hauntedMistSize[m] = 6.0 + Math.random() * 7.5;
        hauntedMistSpeed[m] = 0.2 + Math.random() * 0.4;
        hauntedMistPhase[m] = Math.random() * Math.PI * 2.0;
    }

    hauntedMistGeo.setAttribute('position', new THREE.BufferAttribute(hauntedMistPos, 3));
    hauntedMistGeo.setAttribute('aSize', new THREE.BufferAttribute(hauntedMistSize, 1));
    hauntedMistGeo.setAttribute('aPhase', new THREE.BufferAttribute(hauntedMistPhase, 1));

    const hauntedMistMat = new THREE.PointsMaterial({
        map: hauntedMistTex,
        size: 16.0,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.NormalBlending,
        color: 0x90b4dc
    });
    const hauntedMistParticles = new THREE.Points(hauntedMistGeo, hauntedMistMat);
    gHauntedManor.add(hauntedMistParticles);

    // 9. Dedicated Haunted Lighting Rig
    // Cool Moonlight Directional Fixture
    const hauntedMoonLight = new THREE.DirectionalLight(0xb8d4f8, 1.8);
    hauntedMoonLight.position.set(-3.2, 8.5, -12.0);
    gHauntedManor.add(hauntedMoonLight);

    // Gothic Dark Ambient Atmospheric Light
    const hauntedAmbientLight = new THREE.AmbientLight(0x0a1222, 0.45);
    gHauntedManor.add(hauntedAmbientLight);

    // Warm Candlelight Point Light at Manor Windows (positioned at new manor coordinates)
    const hauntedCandleLight = new THREE.PointLight(0xff9922, 2.5, 24.0, 1.2);
    hauntedCandleLight.position.set(4.2, 3.8, -9.2);
    gHauntedManor.add(hauntedCandleLight);

    // Warm Lantern Light at Grand Entrance Portico & Steps (Dead center of porch directly above front doors)
    const hauntedLanternLight = new THREE.PointLight(0xffaa33, 1.8, 16.0, 1.5);
    hauntedLanternLight.position.set(2.06, 1.07, -9.95);
    gHauntedManor.add(hauntedLanternLight);

    // ⚡ Cinematic Thunderstorm Lightning Directional Light (Intense Blinding Flash Capacity)
    const hauntedLightningLight = new THREE.DirectionalLight(0xddeeff, 0.0);
    hauntedLightningLight.position.set(0.0, 16.0, 6.0);
    gHauntedManor.add(hauntedLightningLight);

    let hauntedLightningTimer = 0.0;
    let hauntedLastLightningTime = 0.0;

    // 10. Dynamic Brooding Storm Scene (Clouds Floating at Top, Multi-Layer Driving Rain, Blinding Lightning Flash)
    // 10a. Dark Brooding Cumulus Storm Clouds Floating Across Upper Sky
    const hauntedStormCloudsTex = createBroodingStormCloudsTexture();
    const hauntedStormCloudsGroup = new THREE.Group();
    const stormCloudGeo = new THREE.PlaneGeometry(44.0, 18.0);
    const stormCloudMat = new THREE.MeshBasicMaterial({
        map: hauntedStormCloudsTex,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        blending: THREE.NormalBlending
    });
    const cloudOffsets = [-26.0, -8.0, 10.0, 28.0];
    const hauntedStormCloudMeshes = cloudOffsets.map((cx, i) => {
        const mesh = new THREE.Mesh(stormCloudGeo, stormCloudMat.clone());
        mesh.position.set(cx, 13.2, -15.8 + i * 0.1);
        mesh.scale.set(i % 2 === 0 ? 1 : -1, 1, 1);
        hauntedStormCloudsGroup.add(mesh);
        return mesh;
    });
    gHauntedManor.add(hauntedStormCloudsGroup);

    // 10b. Realistic Multi-Layered Driving Rain System
    // Layer 1: Foreground Heavy Driving Downpour (1,600 Streaks Falling In Front Of and Past Railings, z = -1.5 to +4.0)
    // Per-drop white gradient streak colours: tail vertex = transparent black, head vertex = white * brightness
    function buildRainStreakColors(count, minBright, maxBright) {
        const cols = new Float32Array(count * 6);
        for (let r = 0; r < count; r++) {
            const b = minBright + Math.random() * (maxBright - minBright);
            // Tail (top) fades out completely under additive blending
            cols[r * 6] = 0.0; cols[r * 6 + 1] = 0.0; cols[r * 6 + 2] = 0.0;
            // Head (bottom) crisp white
            cols[r * 6 + 3] = b; cols[r * 6 + 4] = b; cols[r * 6 + 5] = b;
        }
        return cols;
    }

    const hauntedForeRainCount = 1400;
    const hauntedForeRainGeo = new THREE.BufferGeometry();
    const hauntedForeRainPos = new Float32Array(hauntedForeRainCount * 6);
    const hauntedForeRainVel = new Float32Array(hauntedForeRainCount);
    const hauntedForeRainLen = new Float32Array(hauntedForeRainCount);
    for (let r = 0; r < hauntedForeRainCount; r++) {
        const rx = (Math.random() - 0.5) * 60.0;
        const ry = -8.5 + Math.random() * 26.0;
        // Spans right across foreground past railings (z = 0.0) up to +4.0!
        const rz = -1.5 + Math.random() * 5.5;
        const len = 1.1 + Math.random() * 1.3; // Varied motion-blurred streak lengths
        hauntedForeRainLen[r] = len;
        hauntedForeRainPos[r * 6] = rx;
        hauntedForeRainPos[r * 6 + 1] = ry;
        hauntedForeRainPos[r * 6 + 2] = rz;
        hauntedForeRainPos[r * 6 + 3] = rx - 0.3;
        hauntedForeRainPos[r * 6 + 4] = ry - len;
        hauntedForeRainPos[r * 6 + 5] = rz;
        hauntedForeRainVel[r] = 30.0 + Math.random() * 18.0;
    }
    hauntedForeRainGeo.setAttribute('position', new THREE.BufferAttribute(hauntedForeRainPos, 3));
    hauntedForeRainGeo.setAttribute('color', new THREE.BufferAttribute(buildRainStreakColors(hauntedForeRainCount, 0.45, 1.0), 3));
    const hauntedForeRainMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        vertexColors: true,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const hauntedForeRainLines = new THREE.LineSegments(hauntedForeRainGeo, hauntedForeRainMat);
    gHauntedManor.add(hauntedForeRainLines);

    // Layer 2: Deep Atmospheric Driving Rain (1,600 Streaks Over Estate & Manor, z = -15.5 to -1.5)
    const hauntedMidRainCount = 1600;
    const hauntedMidRainGeo = new THREE.BufferGeometry();
    const hauntedMidRainPos = new Float32Array(hauntedMidRainCount * 6);
    const hauntedMidRainVel = new Float32Array(hauntedMidRainCount);
    const hauntedMidRainLen = new Float32Array(hauntedMidRainCount);
    for (let r = 0; r < hauntedMidRainCount; r++) {
        const rx = (Math.random() - 0.5) * 64.0;
        const ry = -8.5 + Math.random() * 28.0;
        const rz = -15.5 + Math.random() * 14.0;
        const len = 0.6 + Math.random() * 0.8;
        hauntedMidRainLen[r] = len;
        hauntedMidRainPos[r * 6] = rx;
        hauntedMidRainPos[r * 6 + 1] = ry;
        hauntedMidRainPos[r * 6 + 2] = rz;
        hauntedMidRainPos[r * 6 + 3] = rx - 0.2;
        hauntedMidRainPos[r * 6 + 4] = ry - len;
        hauntedMidRainPos[r * 6 + 5] = rz;
        hauntedMidRainVel[r] = 22.0 + Math.random() * 14.0;
    }
    hauntedMidRainGeo.setAttribute('position', new THREE.BufferAttribute(hauntedMidRainPos, 3));
    hauntedMidRainGeo.setAttribute('color', new THREE.BufferAttribute(buildRainStreakColors(hauntedMidRainCount, 0.25, 0.7), 3));
    const hauntedMidRainMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        vertexColors: true,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const hauntedMidRainLines = new THREE.LineSegments(hauntedMidRainGeo, hauntedMidRainMat);
    gHauntedManor.add(hauntedMidRainLines);

    // 10c. Blinding Full-Sky Atmospheric Lightning Flash Plane (Massive ambient flash across entire screen)
    const hauntedSkyFlashGeo = new THREE.PlaneGeometry(86.0, 52.0);
    const hauntedSkyFlashMat = new THREE.MeshBasicMaterial({
        color: 0xd2efff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const hauntedSkyFlashMesh = new THREE.Mesh(hauntedSkyFlashGeo, hauntedSkyFlashMat);
    hauntedSkyFlashMesh.position.set(0.0, 7.5, -16.2);
    gHauntedManor.add(hauntedSkyFlashMesh);

    // 10d. Towering Procedural Forked Lightning Bolt (Multi-Branch Electrical Tree Mesh)
    const hauntedForkedLightningCanvas = document.createElement('canvas');
    hauntedForkedLightningCanvas.width = 512;
    hauntedForkedLightningCanvas.height = 1024;
    const hauntedForkedLightningTex = new THREE.CanvasTexture(hauntedForkedLightningCanvas);
    const hauntedForkedLightningGeo = new THREE.PlaneGeometry(26.0, 32.0); // Spans high sky down through spires!
    const hauntedForkedLightningMat = new THREE.MeshBasicMaterial({
        map: hauntedForkedLightningTex,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const hauntedForkedLightningMesh = new THREE.Mesh(hauntedForkedLightningGeo, hauntedForkedLightningMat);
    hauntedForkedLightningMesh.position.set(2.0, 6.0, -15.4);
    gHauntedManor.add(hauntedForkedLightningMesh);

    // Dynamic Weather State Machine (Intermittent): 'clear' -> 'gathering' -> 'storm' -> 'clearing' -> 'clear'
    let hauntedWeatherState = 'clear';
    let hauntedWeatherTimer = 0.0;
    let hauntedWeatherPhaseDuration = 8.0; // Short dry moonlit spell before the first storm rolls in
    let hauntedRainAlpha = 0.0; // Dry clear night to start
    let hauntedCloudsAlpha = 0.0; // Clear moonlit sky to start
    let hauntedForkedLightningTimer = 0.0;
    let hauntedNextStormLightningTime = 0.0;

    // Wicked Flying Witch State Machine (2 Passes: across moon behind manor, then larger in front of manor)
    let hauntedWitchState = 'idle'; // 'idle', 'pass1_background', 'between_passes', 'pass2_foreground'
    let hauntedWitchX = -32.0;
    let hauntedWitchNextTime = 4.5; // Appears shortly after scene start!
    let hauntedWitchBetweenTimer = 0.0;

    // Sudden & Random Wind Gust State (Slow, eerie stillness broken by sudden wind gusts)
    let hauntedGustActive = false;
    let hauntedGustStartTime = 0.0;
    let hauntedGustDuration = 2.2;
    let hauntedGustStrength = 0.0;
    let hauntedNextGustTime = 3.0;

    // Random Haunted Manor Window Light Flicker State ("flicker randomly every now and then")
    let hauntedFlickerActive = false;
    let hauntedFlickerStartTime = 0.0;
    let hauntedFlickerDuration = 0.0;
    let hauntedNextFlickerTime = 3.5;
    let hauntedFlickerType = 0;

    // Independent Faulty Electricity Wiring State for Right Wing Windows (Top and Bottom Floors Flicker Independently)
    let hauntedFaultyTopActive = false;
    let hauntedFaultyTopStartTime = 0.0;
    let hauntedFaultyTopDuration = 0.8;
    let hauntedFaultyTopNextTime = 2.5;

    let hauntedFaultyBottomActive = false;
    let hauntedFaultyBottomStartTime = 0.0;
    let hauntedFaultyBottomDuration = 0.8;
    let hauntedFaultyBottomNextTime = 4.2;

    // =========================================================================
    // FX 22: 🎬 CYBER CINEMA VIDEO PLAYBACK [SEAMLESS DUAL-CHANNEL VIDEO ARENA]
    // =========================================================================
    const gVideoPlayback = createFXGroup();

    // Dual-Channel Video Players for Zero-Gap Seamless Transitions
    const videoChannelA = document.createElement('video');
    videoChannelA.loop = true;
    videoChannelA.muted = true;
    videoChannelA.playsInline = true;
    videoChannelA.autoplay = true;
    videoChannelA.src = '';

    const videoChannelB = document.createElement('video');
    videoChannelB.loop = true;
    videoChannelB.muted = true;
    videoChannelB.playsInline = true;
    videoChannelB.autoplay = true;
    videoChannelB.src = '';

    const maxAniso = (renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function')
        ? renderer.capabilities.getMaxAnisotropy()
        : 1;

    const videoTexA = new THREE.VideoTexture(videoChannelA);
    videoTexA.minFilter = THREE.LinearFilter;
    videoTexA.magFilter = THREE.LinearFilter;
    videoTexA.generateMipmaps = false;
    videoTexA.anisotropy = maxAniso;
    videoTexA.colorSpace = THREE.NoColorSpace;

    const videoTexB = new THREE.VideoTexture(videoChannelB);
    videoTexB.minFilter = THREE.LinearFilter;
    videoTexB.magFilter = THREE.LinearFilter;
    videoTexB.generateMipmaps = false;
    videoTexB.anisotropy = maxAniso;
    videoTexB.colorSpace = THREE.NoColorSpace;

    let videoActiveChannel = 'A'; // 'A' or 'B'
    let videoTransitionActive = false;
    let videoTransitionStartTime = 0.0;
    let videoTransitionDuration = 1.0;
    let videoTransitionType = 0; // 0: Crossfade, 1: Glitch, 2: Zoom, 3: Strobe, 4: Cut
    let videoCurrentTitle = 'No Video Selected';
    let videoCurrentUrl = '';
    let videoSpeedSetting = 1.0;
    let videoMutedSetting = true;
    let videoLoopSetting = 'playlist'; // 'single' or 'playlist'

    // 1. Direct Flat Video Screen Mesh (Fills viewport cleanly with aspect-ratio preservation)
    const cinemaGeo = new THREE.PlaneGeometry(1.0, 1.0);

    const cinemaScreenShaderMat = new THREE.ShaderMaterial({
        uniforms: {
            uTextureA: { value: videoTexA },
            uTextureB: { value: videoTexB },
            uMix: { value: 0.0 },
            uTransitionType: { value: 0 },
            uTime: { value: 0.0 },
            uBass: { value: 0.0 },
            uHasVideo: { value: 0.0 },
            uLinearOutput: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D uTextureA;
            uniform sampler2D uTextureB;
            uniform float uMix;
            uniform int uTransitionType;
            uniform float uTime;
            uniform float uBass;
            uniform float uHasVideo;
            uniform float uLinearOutput;
            varying vec2 vUv;

            void main() {
                vec4 outCol;

                if (uHasVideo > 0.5) {
                    vec2 uvA = vUv;
                    vec2 uvB = vUv;
                    vec4 colA = texture2D(uTextureA, uvA);
                    vec4 colB = texture2D(uTextureB, uvB);

                    if (uTransitionType == 0) {
                        // 0: Crossfade Dissolve
                        outCol = mix(colA, colB, uMix);
                    } else if (uTransitionType == 1) {
                        // 1: Glitch Wipe (Chromatic Offset)
                        float sliceJitter = sin(vUv.y * 45.0 + uTime * 25.0) * 0.08 * sin(uMix * 3.14159);
                        float slice = step(vUv.x + sliceJitter, uMix);
                        vec2 gUvA = vUv + vec2(sin(uTime * 30.0) * 0.02 * (1.0 - abs(uMix - 0.5) * 2.0), 0.0);
                        vec2 gUvB = vUv - vec2(cos(uTime * 25.0) * 0.02 * (1.0 - abs(uMix - 0.5) * 2.0), 0.0);
                        vec4 ca = texture2D(uTextureA, gUvA);
                        vec4 cb = texture2D(uTextureB, gUvB);
                        outCol = mix(ca, cb, slice);
                    } else if (uTransitionType == 2) {
                        // 2: Zoom Dissolve
                        float zA = 1.0 + uMix * 0.35;
                        float zB = 1.35 - uMix * 0.35;
                        vec2 zuvA = clamp((vUv - 0.5) / zA + 0.5, 0.0, 1.0);
                        vec2 zuvB = clamp((vUv - 0.5) / zB + 0.5, 0.0, 1.0);
                        outCol = mix(texture2D(uTextureA, zuvA), texture2D(uTextureB, zuvB), smoothstep(0.0, 1.0, uMix));
                    } else if (uTransitionType == 3) {
                        // 3: Strobe Flash Cut
                        float flash = sin(uMix * 3.14159);
                        vec4 base = uMix < 0.5 ? colA : colB;
                        outCol = mix(base, vec4(1.0, 1.0, 1.0, 1.0), flash * 0.88);
                    } else {
                        // 4: Instant Cut
                        outCol = uMix < 0.5 ? colA : colB;
                    }
                } else {
                    // STANDBY SCREEN (Clean minimalist media standby)
                    vec2 cUv = (vUv - 0.5) * 2.0;
                    float dist = length(cUv);
                    vec3 bg = mix(vec3(0.025, 0.032, 0.048), vec3(0.008, 0.010, 0.016), dist * 0.8);

                    // Subtle elegant play triangle in center
                    vec2 p = cUv * 3.5;
                    p.x += 0.2;
                    float d1 = p.x - 0.8;
                    float d2 = -p.x * 0.5 + p.y * 0.866 - 0.4;
                    float d3 = -p.x * 0.5 - p.y * 0.866 - 0.4;
                    float tri = max(d1, max(d2, d3));
                    float icon = smoothstep(0.06, 0.0, abs(tri));

                    vec3 iconCol = vec3(0.0, 0.85, 0.75);
                    outCol = vec4(mix(bg, iconCol, icon * 0.45), 1.0);
                }

                if (uLinearOutput > 0.5) {
                    outCol.rgb = pow(clamp(outCol.rgb, 0.0, 1.0), vec3(2.2));
                }

                gl_FragColor = outCol;
            }
        `,
        side: THREE.DoubleSide
    });

    const cinemaScreenMesh = new THREE.Mesh(cinemaGeo, cinemaScreenShaderMat);
    cinemaScreenMesh.position.set(0.0, 0.0, 0.0);
    gVideoPlayback.add(cinemaScreenMesh);

    function updateVideoScreenScale() {
        const curVid = (videoActiveChannel === 'A') ? videoChannelA : videoChannelB;
        let vidAspect = 16.0 / 9.0;
        if (curVid && curVid.videoWidth > 0 && curVid.videoHeight > 0) {
            vidAspect = curVid.videoWidth / curVid.videoHeight;
        }

        const vFovRad = (camera.fov * Math.PI) / 180;
        const dist = Math.abs(camera.position.z - 0.0);
        const visibleHalfHeight = Math.tan(vFovRad / 2) * dist;
        const visibleHalfWidth = visibleHalfHeight * camera.aspect;

        const viewportW = visibleHalfWidth * 2.0;
        const viewportH = visibleHalfHeight * 2.0;
        const screenAspect = viewportW / (viewportH || 1.0);

        let planeW, planeH;
        if (vidAspect >= screenAspect) {
            planeW = viewportW;
            planeH = viewportW / vidAspect;
        } else {
            planeH = viewportH;
            planeW = viewportH * vidAspect;
        }

        cinemaScreenMesh.scale.set(planeW, planeH, 1.0);
        cinemaScreenMesh.position.set(0.0, 0.0, 0.0);
    }

    videoChannelA.addEventListener('loadedmetadata', () => {
        updateVideoScreenScale();
    });
    videoChannelB.addEventListener('loadedmetadata', () => {
        updateVideoScreenScale();
    });
    updateVideoScreenScale();

    // -------------------------------------------------------------------------
    // Resize Handler
    // -------------------------------------------------------------------------
    function onResize() {
        const w = (container && container.clientWidth > 0) ? container.clientWidth : window.innerWidth;
        const h = (container && container.clientHeight > 0) ? container.clientHeight : window.innerHeight;
        camera.aspect = (w > 0 && h > 0) ? (w / h) : (window.innerWidth / window.innerHeight);
        camera.updateProjectionMatrix();
        const pr = getOptimalPixelRatio();
        renderer.setSize(w, h);
        renderer.setPixelRatio(pr);
        composer.setSize(w, h);
        composer.setPixelRatio(pr);
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
        updateVideoScreenScale();
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
            logoGroup.visible = logoVisible && logoTransition.state !== 'hidden';
            stationLogoGroup.visible = stationLogoVisible && stationLogoTransition.state !== 'hidden';
            flyerGroup.visible = flyerVisible && flyerTransition.state !== 'hidden';
            if (index !== 3 && edisonBulbs && edisonBulbs.length > 0) {
                for (let b = 0; b < edisonBulbs.length; b++) {
                    edisonBulbs[b].light.intensity = 0.0;
                }
            }
            nightclubPass.uniforms.uAberration.value = 0.3;
            manualFlash = 0.3;
            if (index === 19) {
                vhsLastPhraseSwitchTime = clock.getElapsedTime();
                renderVhsTextCanvas(vhsCurrentPhraseIdx);
            }
            if (index === 21) {
                const now = clock.getElapsedTime();
                hauntedWeatherState = 'clear';
                hauntedWeatherTimer = 0.0;
                hauntedWeatherPhaseDuration = 14.0; // Initial dry moonlit spell (14s) before storm clouds gather
                hauntedRainAlpha = 0.0;
                hauntedCloudsAlpha = 0.0;
                hauntedWitchNextTime = now + 1.8; // Witch flies across moon within 1.8s!
                hauntedNextGustTime = now + 1.2; // Sudden rushing wind gust within 1.2s!
                hauntedFaultyTopNextTime = now + 1.0; // Top floor electrical blackout within 1.0s!
                hauntedFaultyBottomNextTime = now + 2.4; // Bottom floor electrical blackout within 2.4s!
            }
            if (index === 22) {
                if (videoRenderQuality !== 'retro') {
                    nightclubPass.uniforms.uAberration.value = 0.0;
                    nightclubPass.uniforms.uVignette.value = 0.0;
                    manualFlash = 0.0;
                }
                const curVid = (videoActiveChannel === 'A') ? videoChannelA : videoChannelB;
                curVid.play().catch(() => {});
                if (videoRenderQuality === 'direct') {
                    if (directVideoOverlay && videoCurrentUrl) {
                        directVideoOverlay.currentTime = curVid.currentTime || 0;
                        directVideoOverlay.playbackRate = videoSpeedSetting;
                        directVideoOverlay.muted = videoMutedSetting;
                        directVideoOverlay.loop = (videoLoopSetting === 'single');
                        directVideoOverlay.play().catch(() => {});
                        directVideoOverlay.style.display = 'block';
                    }
                    cinemaScreenMesh.visible = false;
                } else {
                    if (directVideoOverlay) directVideoOverlay.style.display = 'none';
                    cinemaScreenMesh.visible = true;
                }
                updateVideoScreenScale();
            } else {
                if (directVideoOverlay) {
                    directVideoOverlay.style.display = 'none';
                    directVideoOverlay.pause();
                }
            }
            const targetPR = getOptimalPixelRatio();
            if (renderer.getPixelRatio() !== targetPR) {
                renderer.setPixelRatio(targetPR);
                composer.setPixelRatio(targetPR);
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

    // Haunted Manor Cinematic Camera State & Smooth Catmull-Rom Splines
    const hauntedCamSpline = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 0.0, 16.0),     // P0: Gate resting point (default view)
        new THREE.Vector3(0.0, -0.05, 9.0),    // P1: Approaching the gate
        new THREE.Vector3(0.0, -0.15, 0.0),    // P2: Passing right through gate opening
        new THREE.Vector3(-0.65, -0.28, -4.2), // P3: Following driveway S-curve bend left
        new THREE.Vector3(0.75, -0.38, -6.8),  // P4: Following driveway curve back right toward porch
        new THREE.Vector3(2.06, -0.45, -8.5)   // P5: Right at open front door!
    ]);

    const hauntedLookAtSpline = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 0.0, -10.2),    // L0: Resting view looking down the estate
        new THREE.Vector3(0.3, -0.1, -10.2),   // L1: Beginning to track toward the manor entrance
        new THREE.Vector3(1.0, -0.25, -10.2),  // L2: Locking onto glowing doorway
        new THREE.Vector3(2.06, -0.45, -10.2), // L3: Focusing on entrance porch
        new THREE.Vector3(2.06, -0.55, -12.0), // L4: Peering inside doorway
        new THREE.Vector3(2.06, -0.55, -15.0)  // L5: Staring straight down grand hallway!
    ]);

    const hauntedCamCurrentPos = new THREE.Vector3(0.0, 0.0, 16.0);
    const hauntedCamCurrentLookAt = new THREE.Vector3(0.0, 0.0, -10.2);
    const hauntedCamTargetPos = new THREE.Vector3(0.0, 0.0, 16.0);
    const hauntedCamTargetLookAt = new THREE.Vector3(0.0, 0.0, -10.2);

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

                // 1. Sleek Cyber Studio Atmospheric Backdrop (Luminous Radial Glow + Faint Horizon Grid)
                const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.55, 30, W * 0.5, H * 0.55, W * 0.72);
                bgGrad.addColorStop(0.0, '#0a142c'); // Luminous deep indigo/cyan center aura
                bgGrad.addColorStop(0.45, '#040816');
                bgGrad.addColorStop(1.0, '#020308');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, W, H);

                // Subtle studio frequency analyzer grid lines (Faint cyan / midnight blue)
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
                ctx.lineWidth = 1;
                for (let y = H * 0.15; y < H * 0.85; y += H * 0.14) {
                    ctx.beginPath();
                    ctx.moveTo(16, y);
                    ctx.lineTo(W - 16, y);
                    ctx.stroke();
                }

                // 2. Full-Width Spectrum Bars (36 smooth rounded gradient bars rising from bottom edge)
                const barMargin = 16;
                const barSpacing = 5.5;
                const totalBarSpan = W - barMargin * 2;
                const barWidth = (totalBarSpan - (barSpacing * (STUDIO_EQ_BARS - 1))) / STUDIO_EQ_BARS;
                const maxBarHeight = H * 0.68; // Allows dynamic crests up to 68% screen height
                const baseY = H;

                for (let i = 0; i < STUDIO_EQ_BARS; i++) {
                    const binIdx = Math.min((dataArr.length || 1) - 1, Math.floor(Math.pow(i / STUDIO_EQ_BARS, 1.25) * 54) + 1);
                    // Rich undulating dual-sine wave during standby so visualizer dances visibly high above bottom HUD rack
                    const wave1 = Math.sin(elapsedTime * 2.0 + i * 0.26) * 0.5 + 0.5;
                    const wave2 = Math.cos(elapsedTime * 2.8 - i * 0.18) * 0.5 + 0.5;
                    const idleWave = 0.24 + (wave1 * 0.18 + wave2 * 0.14); // 0.24 to 0.56 normalized amplitude!
                    const rawAmp = (isAudioActive && dataArr[binIdx]) ? (dataArr[binIdx] / 255.0) : idleWave;
                    const boostAmp = rawAmp + (i < 6 ? bassPop * 0.18 : 0);
                    const barHeight = Math.max(32.0, Math.min(maxBarHeight, boostAmp * maxBarHeight));

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
                    const spawnProb = isAudioActive ? (rawAmp * 0.65) : 0.08;
                    if (Math.random() < spawnProb && studioEq2DParticles.length < MAX_STUDIO_2D_PARTICLES) {
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

            if (!deck1HasHardwareWaveform && deck1Active && !deck1Data.offline && !deck1Data.unloaded) {
                const progIdx = Math.floor(deck1Progress * 512) % 512;
                const d1Offset = progIdx * 4;
                djAudioHistoryData[d1Offset]     = Math.min(255, Math.floor(rawBass * 255));
                djAudioHistoryData[d1Offset + 1] = Math.min(255, Math.floor(rawMid * 255));
                djAudioHistoryData[d1Offset + 2] = Math.min(255, Math.floor(rawTreble * 255));
                djAudioHistoryData[d1Offset + 3] = Math.min(255, Math.floor(rawHit * 255));
                djAudioHistoryTex.needsUpdate = true;
            }
            if (!deck2HasHardwareWaveform && deck2Active && !deck2Data.offline && !deck2Data.unloaded) {
                const progIdx2 = Math.floor(deck2Progress * 512) % 512;
                const d2Offset = (512 + progIdx2) * 4;
                djAudioHistoryData[d2Offset]     = Math.min(255, Math.floor(rawBass * 255));
                djAudioHistoryData[d2Offset + 1] = Math.min(255, Math.floor(rawMid * 255));
                djAudioHistoryData[d2Offset + 2] = Math.min(255, Math.floor(rawTreble * 255));
                djAudioHistoryData[d2Offset + 3] = Math.min(255, Math.floor(rawHit * 255));
                djAudioHistoryTex.needsUpdate = true;
            }

            const isAudioActive = (rawBass > 0.04 || (audio.smoothedMid || 0) > 0.04 || (audio.smoothedTreble || 0) > 0.04 || (audio.overall || 0) > 0.03);

            // Sample live wire audio slice from deck waveform with fractional bilinear interpolation & temporal smoothing
            let wireAmpBands = null;
            const activeWaveformDeck = (primaryDeck === 2 && deck2HasHardwareWaveform) ? 2 : (deck1HasHardwareWaveform ? 1 : (deck2HasHardwareWaveform ? 2 : null));
            if (activeWaveformDeck) {
                const progToSample = (activeWaveformDeck === 2) ? deck2Progress : deck1Progress;
                const offset = (activeWaveformDeck === 2) ? 512 : 0;
                const floatIdx = (progToSample * 512) % 512;
                const i0 = Math.floor(floatIdx);
                const i1 = (i0 + 1) % 512;
                const f = floatIdx - i0;

                const rawR = (djAudioHistoryData[(offset + i0) * 4] * (1.0 - f) + djAudioHistoryData[(offset + i1) * 4] * f) / 255.0;
                const rawG = (djAudioHistoryData[(offset + i0) * 4 + 1] * (1.0 - f) + djAudioHistoryData[(offset + i1) * 4 + 1] * f) / 255.0;
                const rawB = (djAudioHistoryData[(offset + i0) * 4 + 2] * (1.0 - f) + djAudioHistoryData[(offset + i1) * 4 + 2] * f) / 255.0;
                const rawHit = (djAudioHistoryData[(offset + i0) * 4 + 3] * (1.0 - f) + djAudioHistoryData[(offset + i1) * 4 + 3] * f) / 255.0;

                // Organic exponential decay smoothing (prevents abrupt jumping between discrete buckets)
                wireSmoothBass += (rawR - wireSmoothBass) * 0.16;
                wireSmoothMid += (rawG - wireSmoothMid) * 0.16;
                wireSmoothTreble += (rawB - wireSmoothTreble) * 0.16;
                wireSmoothHit += (rawHit - wireSmoothHit) * 0.22;

                wireAmpBands = { 
                    wR: wireSmoothBass, 
                    wG: wireSmoothMid, 
                    wB: wireSmoothTreble, 
                    wHit: wireSmoothHit 
                };
            }

            const beatSecFX = 60.0 / Math.max(60, currentBPM || 128);
            const timeSecFX = performance.now() / 1000.0;
            const bPhaseFX = (timeSecFX / beatSecFX) % 1.0;
            const kickPulse = Math.exp(-bPhaseFX * 6.5);
            const snarePulse = (((timeSecFX / beatSecFX) % 2.0) >= 1.0) ? Math.exp(-bPhaseFX * 8.0) * 0.7 : 0.0;
            const hatPulse = Math.exp(-Math.abs(bPhaseFX - 0.5) * 8.0) * 0.6;
            const combinedBeatPulse = Math.max(beatTriggerPulse, kickPulse);

            updateSynthesizedDeckSpectrum();

            // 3. 🔥 Animate Audio-Reactive Flame Spectrum
            // Update 64 frequency band amplitudes into the flame texture
            for (let b = 0; b < specBands; b++) {
                let rawAmp = 0.0;
                // If real live audio FFT is available (from audio interface / line-in), USE REAL AUDIO!
                const hasRealAudio = audio && audio.sourceType === 'audio_interface' && (audio.overall > 0.005 || audio.bass > 0.005 || (audio.peakDb && audio.peakDb > -58));
                if (hasRealAudio && dataArr && dataArr.length > 0) {
                    const binIdx = Math.min((dataArr.length || 1) - 1, Math.floor(Math.pow(b / specBands, 1.3) * 56) + 1);
                    rawAmp = (dataArr[binIdx] / 255.0);
                } else if (deck1HasHardwareWaveform || wireAmpBands) {
                    const specIdx = Math.min(127, Math.floor((b / specBands) * 115));
                    const kickBoost = (b < 18) ? (beatTriggerPulse * 0.40) : 0.0;
                    rawAmp = Math.min(1.0, (wireSmoothBins[specIdx] / 255.0) * 1.15 + kickBoost);
                } else {
                    const binIdx = Math.min((dataArr.length || 1) - 1, Math.floor(Math.pow(b / specBands, 1.3) * 56) + 1);
                    rawAmp = (isAudioActive && dataArr[binIdx]) ? (dataArr[binIdx] / 255.0) : 0.0;
                }

                // Dynamic flame reactivity: fast leaping attack, natural turbulent decay
                if (rawAmp > specSmoothBands[b]) {
                    specSmoothBands[b] = THREE.MathUtils.lerp(specSmoothBands[b], rawAmp, 0.52);
                } else {
                    specSmoothBands[b] = Math.max(0.0, specSmoothBands[b] - delta * 2.4);
                }

                // Write into 64x1 flame texture
                const val = Math.min(255, Math.floor(specSmoothBands[b] * 255));
                specFlameData[b * 4]     = val;
                specFlameData[b * 4 + 1] = val;
                specFlameData[b * 4 + 2] = val;
                specFlameData[b * 4 + 3] = 255;
            }
            specFlameTex.needsUpdate = true;

            if (flameMat) {
                flameMat.uniforms.uTime.value = elapsedTime;
                flameMat.uniforms.uBass.value = audio.bass || 0;
                flameMat.uniforms.uTransient.value = audio.transient || 0;
            }

            // Animate Rising Fiery Embers & Cinders
            if (flameEmberMat && flameEmberMat.uniforms) {
                flameEmberMat.uniforms.uTime.value = elapsedTime;
                flameEmberMat.uniforms.uBass.value = audio ? (audio.bass || 0) : 0;
                flameEmberMat.uniforms.uTransient.value = audio ? (audio.transientImpulse || audio.transient || 0) : 0;
            }

            if (flameEmberGeo) {
                const ePos = flameEmberGeo.attributes.position.array;
                const draftSpeed = 1.0 + (audio.bass || 0) * 0.8 + (audio.transient || 0) * 0.6;
                for (let i = 0; i < flameEmberCount; i++) {
                    const seed = flameEmberSeed[i];
                    // Upward buoyant convective ascent
                    ePos[i * 3 + 1] += delta * flameEmberSpeed[i] * draftSpeed * 1.8;
                    // Horizontal thermal eddy swirl
                    ePos[i * 3] += Math.sin(elapsedTime * 2.2 + seed) * (0.018 * flameEmberSpeed[i]) + Math.cos(elapsedTime * 0.9 + seed * 1.7) * 0.010;

                    // Respawn when rising completely off the top of the screen (y > 9.8)
                    if (ePos[i * 3 + 1] > 9.8) {
                        ePos[i * 3 + 1] = -8.8 - Math.random() * 0.8;
                        ePos[i * 3]     = (Math.random() - 0.5) * 36.0;
                    }
                }
                flameEmberGeo.attributes.position.needsUpdate = true;
            }

            // 1. Dynamic on-air deck determination based on mixer faders, play states, and motion
            const nowTime = performance.now();
            const d1IsMoving = !deck1Stationary && (deck1Playing || (nowTime - deck1LastBeatTime < 500));
            const d2IsMoving = !deck2Stationary && (deck2Playing || (nowTime - deck2LastBeatTime < 500));

            let w1 = 0.0;
            let w2 = 0.0;
            let onAirDeck = 1;

            if (manualPrimaryDeck === 1) {
                w1 = 1.0;
                w2 = 0.0;
                onAirDeck = 1;
            } else if (manualPrimaryDeck === 2) {
                w1 = 0.0;
                w2 = 1.0;
                onAirDeck = 2;
            } else {
                const f1 = (deck1Fader !== null && deck1Fader !== undefined) ? deck1Fader : (deck1Playing ? 1.0 : (d1IsMoving ? 1.0 : 0.0));
                const f2 = (deck2Fader !== null && deck2Fader !== undefined) ? deck2Fader : (deck2Playing ? 1.0 : (d2IsMoving ? 1.0 : 0.0));

                const fader1Up = f1 > 0.02;
                const fader2Up = f2 > 0.02;

                const hasD1 = !!(deck1Data && deck1Data.title && deck1Data.title.trim() !== '' && deck1Data.title !== 'No Track Loaded' && deck1Data.title !== '—' && !deck1Data.unloaded && !deck1Data.offline);
                const hasD2 = !!(deck2Data && deck2Data.title && deck2Data.title.trim() !== '' && deck2Data.title !== 'No Track Loaded' && deck2Data.title !== '—' && !deck2Data.unloaded && !deck2Data.offline);

                // --- 1. Handover Decision (Lead / On-Air Deck on Top Rail) ---
                // Deck 1 remains primary until Deck 2 fader crosses faderHandoverThreshold (default 0.85 / 85%) or Deck 1 is pulled down
                let nextPrimary = primaryDeck || 1;
                if (!hasD1 && hasD2) {
                    nextPrimary = 2;
                } else if (!hasD2 && hasD1) {
                    nextPrimary = 1;
                } else if (hasD1 && hasD2) {
                    if (primaryDeck === 1) {
                        if (f2 >= faderHandoverThreshold || (!fader1Up && fader2Up)) {
                            nextPrimary = 2;
                        }
                    } else if (primaryDeck === 2) {
                        if (f1 >= faderHandoverThreshold || (!fader2Up && fader1Up)) {
                            nextPrimary = 1;
                        }
                    }
                }
                onAirDeck = nextPrimary;

                // --- 2. True Dual-Deck Crossover Blend (3D Moving Waveform Weights) ---
                if (fader1Up && fader2Up) {
                    w1 = Math.min(1.0, f1);
                    w2 = Math.min(1.0, f2);
                } else if (fader1Up && !fader2Up) {
                    w1 = Math.min(1.0, f1);
                    w2 = 0.0;
                } else if (!fader1Up && fader2Up) {
                    w1 = 0.0;
                    w2 = Math.min(1.0, f2);
                } else {
                    if (d1IsMoving && !d2IsMoving) {
                        w1 = 1.0;
                        w2 = 0.0;
                    } else if (d2IsMoving && !d1IsMoving) {
                        w1 = 0.0;
                        w2 = 1.0;
                    } else if (deck1Playing && !deck2Playing) {
                        w1 = 1.0;
                        w2 = 0.0;
                    } else if (deck2Playing && !deck1Playing) {
                        w1 = 0.0;
                        w2 = 1.0;
                    } else if (hasD1 && hasD2) {
                        w1 = (onAirDeck === 1) ? 1.0 : 0.35;
                        w2 = (onAirDeck === 2) ? 1.0 : 0.35;
                    } else if (hasD1) {
                        w1 = 1.0;
                        w2 = 0.0;
                    } else if (hasD2) {
                        w1 = 0.0;
                        w2 = 1.0;
                    } else {
                        w1 = 0.0;
                        w2 = 0.0;
                    }
                }
            }

            deck1Weight = w1;
            deck2Weight = w2;
            primaryDeck = onAirDeck;

            // Advance track progress: directly locked to hardware deck wire telemetry
            const trackSec1 = deck1Data.duration || 364;
            const progressDelta1 = delta / trackSec1;
            const hasRecentWire1 = (nowTime - lastDeck1WireTime < 1500) && (deck1WireProgress !== undefined && !isNaN(deck1WireProgress));
            if (hasRecentWire1) {
                const diff1 = deck1WireProgress - deck1Progress;
                // If DJ seeks / drops needle / cues / loops (large jump > 0.015), snap instantly
                if (Math.abs(diff1) > 0.015) {
                    deck1Progress = deck1WireProgress;
                } else {
                    // Smoothly follow wire progress while advancing forward at native frame rate
                    deck1Progress += progressDelta1 + diff1 * Math.min(1.0, delta * 12.0);
                }
            } else if (deck1Playing || d1IsMoving || w1 > 0.01) {
                deck1Progress = (deck1Progress + progressDelta1) % 1.0;
            }

            const trackSec2 = deck2Data.duration || 360;
            const progressDelta2 = delta / trackSec2;
            const hasRecentWire2 = (nowTime - lastDeck2WireTime < 1500) && (deck2WireProgress !== undefined && !isNaN(deck2WireProgress));
            if (hasRecentWire2) {
                const diff2 = deck2WireProgress - deck2Progress;
                if (Math.abs(diff2) > 0.015) {
                    deck2Progress = deck2WireProgress;
                } else {
                    deck2Progress += progressDelta2 + diff2 * Math.min(1.0, delta * 12.0);
                }
            } else if (deck2Playing || d2IsMoving || w2 > 0.01) {
                deck2Progress = (deck2Progress + progressDelta2) % 1.0;
            }

            const primaryProg = (primaryDeck === 2) ? deck2Progress : deck1Progress;
            const primaryBpm = (primaryDeck === 2) ? (deck2Data.bpm || currentBPM) : (deck1Data.bpm || currentBPM);
            const primaryTotalBeats = (primaryDeck === 2) ? (deck2Data.totalBeats || 756.0) : (deck1Data.totalBeats || 776.1085);
            const beatPhaseVal = (elapsedTime * (primaryBpm / 60.0)) % 1.0;

            // Smooth smoke phase-out for inactive decks
            // A deck is in play when actively playing/moving or loaded and its mixer weight is up
            const d1InPlay = (deck1Active || deck1Playing || d1IsMoving || deck1HasHardwareWaveform) && (w1 > 0.02);
            const d2InPlay = (deck2Active || deck2Playing || d2IsMoving || deck2HasHardwareWaveform) && (w2 > 0.02);

            const targetD1Smoke = d1InPlay ? 0.0 : 1.0;
            const targetD2Smoke = d2InPlay ? 0.0 : 1.0;

            smoothDeck1SmokePhase = THREE.MathUtils.damp(smoothDeck1SmokePhase, targetD1Smoke, 3.2, delta);
            smoothDeck2SmokePhase = THREE.MathUtils.damp(smoothDeck2SmokePhase, targetD2Smoke, 3.2, delta);

            // Feed live audio or StageLinQ beat pulses & hardware track slices to shader
            const effectiveBass = Math.max(audio ? (audio.smoothedBass || audio.bass || 0) : 0, (wireSmoothBass || 0) * 0.85 + (combinedBeatPulse || 0) * 0.40);
            const effectiveMid = Math.max(audio ? (audio.smoothedMid || audio.mid || 0) : 0, (wireSmoothMid || 0) * 0.80);
            const effectiveTreble = Math.max(audio ? (audio.smoothedTreble || audio.treble || 0) : 0, (wireSmoothTreble || 0) * 0.80);
            const effectiveTransient = Math.max(audio ? (audio.transientImpulse || 0) : 0, (combinedBeatPulse || 0) * 0.70 + (wireSmoothHit || 0) * 0.50);

            // Update Shader Uniforms: dynamic routing to active on-air deck
            djWaveMat.uniforms.uTime.value = elapsedTime;
            djWaveMat.uniforms.uHeadPos.value = primaryProg;
            djWaveMat.uniforms.uTrackProgress.value = primaryProg;
            djWaveMat.uniforms.uDeck1Progress.value = deck1Progress;
            djWaveMat.uniforms.uDeck2Progress.value = deck2Progress;
            djWaveMat.uniforms.uDeck1Weight.value = w1;
            djWaveMat.uniforms.uDeck2Weight.value = w2;
            djWaveMat.uniforms.uDeck1SmokePhase.value = smoothDeck1SmokePhase;
            djWaveMat.uniforms.uDeck2SmokePhase.value = smoothDeck2SmokePhase;
            djWaveMat.uniforms.uPrimaryDeck.value = primaryDeck;
            djWaveMat.uniforms.uDeck2Active.value = w2;

            if (waveSmokeMat) {
                waveSmokeMat.uniforms.uTime.value = elapsedTime;
                waveSmokeMat.uniforms.uTrackProgress.value = (primaryDeck === 2) ? deck2Progress : deck1Progress;
                waveSmokeMat.uniforms.uDeck1Progress.value = deck1Progress;
                waveSmokeMat.uniforms.uDeck2Progress.value = deck2Progress;
                waveSmokeMat.uniforms.uDeck1Weight.value = w1;
                waveSmokeMat.uniforms.uDeck2Weight.value = w2;
                waveSmokeMat.uniforms.uDeck1SmokePhase.value = smoothDeck1SmokePhase;
                waveSmokeMat.uniforms.uDeck2SmokePhase.value = smoothDeck2SmokePhase;
                waveSmokeMat.uniforms.uPrimaryDeck.value = primaryDeck;
                waveSmokeMat.uniforms.uZoom.value = 0.08;
                waveSmokeMat.uniforms.uBass.value = effectiveBass;
                waveSmokeMat.uniforms.uTransient.value = effectiveTransient;
            }

            // Visibility of 3D Hellfire Waveform & Smoke
            const hasAnyTrack = Boolean((deck1Data.title && !deck1Data.unloaded && !deck1Data.offline) || (deck2Data.title && !deck2Data.unloaded && !deck2Data.offline));
            const show3DWaveforms = Boolean((d1InPlay || d2InPlay) && (w1 > 0.02 || w2 > 0.02) && hasAnyTrack);
            if (djWaveMesh) djWaveMesh.visible = show3DWaveforms;
            if (waveSmokeMesh) waveSmokeMesh.visible = show3DWaveforms;

            djWaveMat.uniforms.uTotalBeats.value = primaryTotalBeats;
            djWaveMat.uniforms.uDeck1TotalBeats.value = deck1Data.totalBeats || 776.1085;
            djWaveMat.uniforms.uDeck2TotalBeats.value = deck2Data.totalBeats || 756.0;
            djWaveMat.uniforms.uBPM.value = primaryBpm;
            djWaveMat.uniforms.uDeck2BPM.value = deck2Data.bpm || currentBPM;
            djWaveMat.uniforms.uBeatPhase.value = beatPhaseVal;
            if (djWaveMat.uniforms.uTransient) {
                djWaveMat.uniforms.uTransient.value = effectiveTransient;
            }
            if (djWaveMat.uniforms.uBass) {
                djWaveMat.uniforms.uBass.value = effectiveBass;
            }
            if (djWaveMat.uniforms.uMid) {
                djWaveMat.uniforms.uMid.value = effectiveMid;
            }
            if (djWaveMat.uniforms.uTreble) {
                djWaveMat.uniforms.uTreble.value = effectiveTreble;
            }

            const activeLoop = (primaryDeck === 2) ? (deck2Data.loopActive || false) : deck1LoopActive;
            const activeLoopStart = (primaryDeck === 2) ? (deck2Data.loopStart || 0.0) : deck1LoopStart;
            const activeLoopEnd = (primaryDeck === 2) ? (deck2Data.loopEnd || 0.0) : deck1LoopEnd;

            djWaveMat.uniforms.uLoopActive.value = activeLoop ? 1.0 : 0.0;
            djWaveMat.uniforms.uLoopStart.value = activeLoopStart;
            djWaveMat.uniforms.uLoopEnd.value = activeLoopEnd;

            deck1Data.loopActive = deck1LoopActive;
            deck1Data.loopStart = deck1LoopStart;
            deck1Data.loopEnd = deck1LoopEnd;

            // Update HUD Canvas texture every frame for ultra-smooth beat grid, needle & time readouts
            renderDJDeckHUD(
                djHudCtx, 2048, 1024, 
                deck1Data, deck2Data, 
                primaryBpm, beatPhaseVal, 
                audio.transientImpulse || 0, 
                deck1Progress, deck2Progress, 
                w1, w2, primaryDeck, 
                audio
            );
            djHudTex.needsUpdate = true;

            // 💡 3D Woven Wicker Basket Lanterns - Pirates of the Caribbean / Castaway Candlelight
            if (edisonBulbs && edisonBulbs.length > 0) {
                const audioBreathing = ((audio.smoothedBass || audio.bass || 0) * 0.45 + (audio.overall || 0) * 0.20);
                const audioKickFlicker = (audio.transientImpulse || 0) * 0.35;

                for (let b = 0; b < edisonBulbs.length; b++) {
                    const bulb = edisonBulbs[b];

                    // 1. Caribbean Sea Breeze Nautical Rope Lantern Sway
                    const omega = bulb.omega * 0.88;
                    const swayZ = Math.sin(elapsedTime * omega + bulb.seed * 3.1) * 0.034 + Math.sin(elapsedTime * 0.5 + bulb.seed) * 0.012;
                    const swayX = Math.cos(elapsedTime * (omega * 0.82) + bulb.seed * 1.8) * 0.026 + Math.cos(elapsedTime * 0.7) * 0.008;
                    bulb.pivot.rotation.z = swayZ;
                    bulb.pivot.rotation.x = swayX;

                    // 2. Authentic Pirates Candlelight Multi-Frequency Flutter & Guttering
                    const candleFlicker = getPiratesCandleFlicker(elapsedTime, bulb.seed);
                    // Combine candle draft physics with sound wave air pulses from the DJ subwoofers
                    const heat = Math.max(0.10, Math.min(1.45, candleFlicker * 0.72 + audioBreathing * 0.35 + audioKickFlicker));

                    // 3. Flame Spatial Dancing Jitter inside the wicker basket
                    // A real candle flame tip flutters horizontally and licks vertically, casting shifting shadows
                    const jitterX = (Math.sin(elapsedTime * 19.3 + bulb.seed * 4.7) * 0.06 + Math.sin(elapsedTime * 33.1) * 0.035);
                    const jitterY = (Math.sin(elapsedTime * 24.5 + bulb.seed * 3.2) * 0.07 + Math.abs(Math.sin(elapsedTime * 12.8)) * 0.05);
                    const jitterZ = (Math.cos(elapsedTime * 21.2 + bulb.seed * 5.1) * 0.06 + Math.cos(elapsedTime * 29.4) * 0.03);

                    const basePos = bulb.origLightPos || new THREE.Vector3(0, -1.40, 0);
                    bulb.light.position.set(basePos.x + jitterX, basePos.y + jitterY, basePos.z + jitterZ);
                    bulb.glowSprite.position.set(basePos.x + jitterX * 0.5, basePos.y + jitterY * 0.5, basePos.z + jitterZ * 0.5);

                    // 4. Pirates of the Caribbean Tavern Candlelight Palette
                    // Guttering ember (1600K blood-orange) -> Warm tallow flame (2000K honey amber) -> Flare wick (2400K golden yellow)
                    let r, g, bl;
                    if (heat < 0.45) {
                        const u = heat / 0.45;
                        r = 255;
                        g = Math.round(75 + u * 60); // 75 -> 135
                        bl = Math.round(5 + u * 15);  // 5 -> 20
                    } else if (heat < 0.90) {
                        const u = (heat - 0.45) / 0.45;
                        r = 255;
                        g = Math.round(135 + u * 45); // 135 -> 180
                        bl = Math.round(20 + u * 25); // 20 -> 45
                    } else {
                        const u = Math.min(1.0, (heat - 0.90) / 0.55);
                        r = 255;
                        g = Math.round(180 + u * 40); // 180 -> 220
                        bl = Math.round(45 + u * 40);  // 45 -> 85
                    }

                    bulb.filamentMat.color.setRGB(r / 255, g / 255, bl / 255);

                    // Dynamic candle flame bloom
                    const targetGlowOpacity = 0.20 + heat * 0.42;
                    bulb.glowSprite.material.opacity = targetGlowOpacity;
                    const spriteScale = 2.2 + heat * 0.95;
                    bulb.glowSprite.scale.set(spriteScale, spriteScale, 1.0);

                    // Point Light: deep warm candle illumination with dynamic sea breeze flicker
                    const lightInt = 0.25 + heat * 0.85; // Drops on guttering, leaps on flares
                    bulb.light.intensity = lightInt;
                    bulb.light.color.setRGB(r / 255, Math.min(1.0, (g / 255) * 1.05), Math.max(0.04, bl / 255));
                }
            }

            // Animate Ambient Floating Embers gently drifting through the light
            if (edisonDustGeo) {
                const dPos = edisonDustGeo.attributes.position.array;
                for (let i = 0; i < edisonDustCount; i++) {
                    dPos[i * 3 + 1] += delta * edisonDustSpeeds[i] * 0.7; // Slower, tranquil float
                    dPos[i * 3] += Math.sin(elapsedTime * 0.5 + i) * (delta * 0.08);
                    if (dPos[i * 3 + 1] > 10.5) {
                        dPos[i * 3 + 1] = -7.5;
                        dPos[i * 3] = (Math.random() - 0.5) * 36.0;
                    }
                }
                edisonDustGeo.attributes.position.needsUpdate = true;
            }
        }
        // ---------------------------------------------------------------------
        // FX 4: 🪩 Authentic Nightclub Mirror Ball Rig [Top Pinspots & Floor Reflections]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 4) {
            // Constant, graceful ball rotation (100% decoupled from music & BPM)
            dBallMesh.rotation.y += 0.32 * delta;

            // 🌀 Very subtle organic suspension wobble & pendulum sway on the chain
            const wobbleTime = elapsedTime * 0.75;
            const wobbleX = Math.sin(wobbleTime) * 0.16 + Math.sin(wobbleTime * 1.6 + 0.9) * 0.05;
            const wobbleZ = Math.cos(wobbleTime * 0.85) * 0.14 + Math.cos(wobbleTime * 1.3 + 1.2) * 0.04;
            dBallMesh.position.x = wobbleX;
            dBallMesh.position.z = wobbleZ;

            // Physical tilt coupling: pendulum tilt from suspension point + delicate micro-precession wobble
            dBallMesh.rotation.z = -(wobbleX / 13.2) * 1.1 + Math.sin(wobbleTime * 1.8 + 0.4) * 0.022;
            dBallMesh.rotation.x = (wobbleZ / 13.2) * 1.1 + Math.cos(wobbleTime * 1.5 + 0.7) * 0.018;

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

                // Natural catenary suspension sag & subtle chain sway
                const sagFactor = Math.sin(t0 * Math.PI) * 0.10;
                linkPos.x += Math.sin(ballRotY * 0.25 + t0 * 1.5) * sagFactor;
                linkPos.z += Math.cos(ballRotY * 0.25 + t0 * 1.5) * sagFactor;
                link.position.copy(linkPos);

                // Alternating link angles aligned to hanging chain
                const baseRotY = (l % 2 === 0) ? (ballRotY * 0.15) : (ballRotY * 0.15 + Math.PI / 2);
                link.rotation.set(
                    dBallMesh.rotation.x * (1.0 - t0) + Math.sin(wobbleTime + l * 0.15) * 0.012,
                    baseRotY,
                    dBallMesh.rotation.z * (1.0 - t0) + Math.cos(wobbleTime + l * 0.15) * 0.012
                );
            }

            // Steady, elegant pure white & silver studio illumination (zero colored lights)
            dBallKeyLight.intensity = 2.8;
            dBallPinLeft.intensity = 2.6;
            dBallPinTop.intensity = 2.2;
            dBallRimLight.intensity = 1.4;
            dBallFillLight.intensity = 1.2;
            dBallPointSilver.intensity = 4.2;
            dBallPointSilver.position.set(wobbleX, 4.5, 7.5 + wobbleZ * 0.5);

            // Subtle sparkling white & silver background stars (steady drift, zero music reaction)
            glintMat.uniforms.uTime.value = elapsedTime;
            glintSystem.position.set(0, 0, 0);
            glintSystem.rotation.y += 0.05 * delta;
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


            // 2. Motorized Disco Spin (Y-axis) with Organic Suspension Wobble & Pendulum Sway
            // Smooth, graceful rotation speed matching the authentic spinning disco ball
            const spinVelocity = 0.28 * (currentBPM / 126.0);
            pumpkinPivot.rotation.y += delta * spinVelocity;

            // 🌀 Very subtle organic suspension wobble & pendulum sway on the chain (matching FX 4 spinning disco ball)
            const wobbleTime = elapsedTime * 0.75;
            const wobbleX = Math.sin(wobbleTime) * 0.16 + Math.sin(wobbleTime * 1.6 + 0.9) * 0.05;
            const wobbleZ = Math.cos(wobbleTime * 0.85) * 0.14 + Math.cos(wobbleTime * 1.3 + 1.2) * 0.04;
            pumpkinPivot.position.x = wobbleX;
            pumpkinPivot.position.z = wobbleZ;
            pumpkinPivot.position.y = 0.0;

            // Coupled tilt: pendulum tilt from ceiling suspension point (13.2) + gyroscopic spin tilt + delicate micro-precession wobble
            const rotY = pumpkinPivot.rotation.y;
            const spinTilt = 0.038;
            pumpkinPivot.rotation.z = -(wobbleX / 13.2) * 1.1 + Math.sin(rotY) * spinTilt + Math.sin(wobbleTime * 1.8 + 0.4) * 0.018;
            pumpkinPivot.rotation.x = (wobbleZ / 13.2) * 1.1 + Math.cos(rotY) * spinTilt * 0.85 + Math.cos(wobbleTime * 1.5 + 0.7) * 0.015;

            // 3. Steady Physical Pumpkin Geometry (NO pulsing with beat - solid authentic mirror disco ball)
            pumpkinMesh.scale.set(1.0, 1.0, 1.0);
            if (pumpkinStem) {
                pumpkinStem.scale.set(1.0, 1.0, 1.0);
            }

            // 🔗 100% Attached Hanging Chain Dynamic Physics:
            // Calculate exact world position of the stalk top eyelet ring (nestled on authentic 0.94 round pumpkin crown)
            const stalkTipLocal = new THREE.Vector3(0.04, 6.26, 0.03);
            const stalkTipWorld = stalkTipLocal.clone().applyEuler(pumpkinPivot.rotation).add(pumpkinPivot.position);
            const ceilingAnchor = new THREE.Vector3(0, 13.2, 0);

            // Interpolate all chain links between the stalk eyelet and the ceiling mount
            const totalLinks = pumpkinChainLinks.length;
            for (let l = 0; l < totalLinks; l++) {
                const link = pumpkinChainLinks[l];
                const t0 = l / (totalLinks - 1);
                // Position interpolated from stalk tip (l=0) to ceiling (l=15)
                const linkPos = new THREE.Vector3().lerpVectors(stalkTipWorld, ceilingAnchor, t0);
                
                // Natural catenary suspension sag & organic chain sway
                const sagFactor = Math.sin(t0 * Math.PI) * 0.12;
                linkPos.x += Math.sin(rotY * 0.25 + t0 * 1.5) * sagFactor;
                linkPos.z += Math.cos(rotY * 0.25 + t0 * 1.5) * sagFactor;
                link.position.copy(linkPos);

                // Alternating link angles aligned to the hanging chain direction with subtle sway
                const baseRotY = (l % 2 === 0) ? (pumpkinPivot.rotation.y * 0.18) : (pumpkinPivot.rotation.y * 0.18 + Math.PI / 2);
                link.rotation.set(
                    pumpkinPivot.rotation.x * (1.0 - t0) + Math.sin(wobbleTime + l * 0.15) * 0.012,
                    baseRotY,
                    pumpkinPivot.rotation.z * (1.0 - t0) + Math.cos(wobbleTime + l * 0.15) * 0.012
                );
            }

            // 4. Dynamic Rotating Head Sweeping Targets strictly on the FRONT convex surface of the round pumpkin (0.94 ratio)
            const tL = elapsedTime * 0.55;
            const txL = -1.0 + Math.sin(tL * 0.85) * 2.3; // -3.3 to +1.3
            const tyL = Math.cos(tL * 0.65) * 2.25;      // spans 0.94 height round pumpkin
            const rSqL = (txL * txL) + ((tyL / 0.94) * (tyL / 0.94));
            const tzL = Math.sqrt(Math.max(4.0, 27.0 - rSqL)); // Front surface of pumpkin
            const targetLeftPos = new THREE.Vector3(txL, tyL, tzL).add(pumpkinPivot.position);
            pLeftTargetObj.position.copy(targetLeftPos);

            const tR = elapsedTime * 0.55 + Math.PI * 0.72;
            const txR = 1.0 + Math.cos(tR * 0.82) * 2.3;  // -1.3 to +3.3
            const tyR = Math.sin(tR * 0.68) * 2.25;
            const rSqR = (txR * txR) + ((tyR / 0.94) * (tyR / 0.94));
            const tzR = Math.sqrt(Math.max(4.0, 27.0 - rSqR)); // Front surface of pumpkin
            const targetRightPos = new THREE.Vector3(txR, tyR, tzR).add(pumpkinPivot.position);
            pRightTargetObj.position.copy(targetRightPos);

            // Update Rotating Moving-Head Fixture Orientations (Motorized Pan / Tilt tracking)
            const leftHeadPivotPos = pLeftFixturePos.clone().add(new THREE.Vector3(0, 1.25, 0));
            const leftFixtureDir = targetLeftPos.clone().sub(leftHeadPivotPos);
            const leftPan = Math.atan2(leftFixtureDir.x, leftFixtureDir.z);
            const leftHorizDist = Math.sqrt(leftFixtureDir.x * leftFixtureDir.x + leftFixtureDir.z * leftFixtureDir.z);
            const leftTilt = -Math.atan2(leftFixtureDir.y, leftHorizDist);

            pLeftFixture.yokeGroup.rotation.y = leftPan;
            pLeftFixture.headGroup.rotation.set(leftTilt, 0, 0);
            pLeftFixture.fixtureGroup.updateMatrixWorld(true);

            // Calculate exact world position of the optical glass lens center
            const leftLensWorldPos = new THREE.Vector3();
            pLeftFixture.lensMesh.getWorldPosition(leftLensWorldPos);

            // Vector from center of lens to target on pumpkin
            const leftBeamVector = targetLeftPos.clone().sub(leftLensWorldPos);
            const leftBeamDist = leftBeamVector.length();
            const leftBeamDirNorm = leftBeamVector.clone().normalize();

            // Align volumetric beams and inner cores to originate bang in the center of the lens
            const upVec = new THREE.Vector3(0, -1, 0);
            pLeftBeamMesh.position.copy(leftLensWorldPos);
            pLeftCoreBeamMesh.position.copy(leftLensWorldPos);
            pBottomLeftSpot.position.copy(leftLensWorldPos);

            pLeftBeamMesh.quaternion.setFromUnitVectors(upVec, leftBeamDirNorm);
            pLeftCoreBeamMesh.quaternion.setFromUnitVectors(upVec, leftBeamDirNorm);
            pLeftBeamMesh.scale.set(1.0, leftBeamDist / 22.0, 1.0);
            pLeftCoreBeamMesh.scale.set(1.0, leftBeamDist / 22.0, 1.0);

            // Right moving-head fixture orientation
            const rightHeadPivotPos = pRightFixturePos.clone().add(new THREE.Vector3(0, 1.25, 0));
            const rightFixtureDir = targetRightPos.clone().sub(rightHeadPivotPos);
            const rightPan = Math.atan2(rightFixtureDir.x, rightFixtureDir.z);
            const rightHorizDist = Math.sqrt(rightFixtureDir.x * rightFixtureDir.x + rightFixtureDir.z * rightFixtureDir.z);
            const rightTilt = -Math.atan2(rightFixtureDir.y, rightHorizDist);

            pRightFixture.yokeGroup.rotation.y = rightPan;
            pRightFixture.headGroup.rotation.set(rightTilt, 0, 0);
            pRightFixture.fixtureGroup.updateMatrixWorld(true);

            // Calculate exact world position of the right optical glass lens center
            const rightLensWorldPos = new THREE.Vector3();
            pRightFixture.lensMesh.getWorldPosition(rightLensWorldPos);

            // Vector from center of lens to target on pumpkin
            const rightBeamVector = targetRightPos.clone().sub(rightLensWorldPos);
            const rightBeamDist = rightBeamVector.length();
            const rightBeamDirNorm = rightBeamVector.clone().normalize();

            pRightBeamMesh.position.copy(rightLensWorldPos);
            pRightCoreBeamMesh.position.copy(rightLensWorldPos);
            pBottomRightSpot.position.copy(rightLensWorldPos);

            pRightBeamMesh.quaternion.setFromUnitVectors(upVec, rightBeamDirNorm);
            pRightCoreBeamMesh.quaternion.setFromUnitVectors(upVec, rightBeamDirNorm);
            pRightBeamMesh.scale.set(1.0, rightBeamDist / 22.0, 1.0);
            pRightCoreBeamMesh.scale.set(1.0, rightBeamDist / 22.0, 1.0);

            // 4b. Five Compact Center-Bottom Spotlights Sweeping Across Underneath Front
            // Musical 4-beat cycle: complete sweep every 2 beats, in sync with the bar
            const sweepBaseBps = currentBPM / 60.0;
            pumpkinMiniSweepPhase += delta * sweepBaseBps * (Math.PI * 0.50);

            // Group A: Inner Left & Right Fixtures (-2.4 and +2.4) - Crossing 'X' sweep
            const sweep1 = pumpkinMiniSweepPhase;
            const txMini1 = Math.sin(sweep1) * 4.4;
            const tyMini1 = -2.35 + Math.cos(sweep1 * 0.8) * 0.52;
            const rSqMini1 = (txMini1 * txMini1) + ((tyMini1 / 0.94) * (tyMini1 / 0.94));
            const tzMini1 = Math.sqrt(Math.max(1.0, 27.04 - Math.min(26.0, rSqMini1)));
            const targetMini1Pos = new THREE.Vector3(txMini1, tyMini1, tzMini1).add(pumpkinPivot.position);

            const sweep2 = -pumpkinMiniSweepPhase;
            const txMini2 = Math.sin(sweep2) * 4.4;
            const tyMini2 = -2.35 + Math.cos(sweep2 * 0.8 + Math.PI) * 0.52;
            const rSqMini2 = (txMini2 * txMini2) + ((tyMini2 / 0.94) * (tyMini2 / 0.94));
            const tzMini2 = Math.sqrt(Math.max(1.0, 27.04 - Math.min(26.0, rSqMini2)));
            const targetMini2Pos = new THREE.Vector3(txMini2, tyMini2, tzMini2).add(pumpkinPivot.position);

            // Group B: Center, Far-Left, Far-Right Fixtures (-4.8, 0.0, +4.8) - 3-beam converging fan
            // Center fixture sweeps upward across the middle front
            const sweepC = pumpkinMiniSweepPhase * 1.25;
            const txCenter = Math.sin(sweepC) * 2.8;
            const tyCenter = -2.15 + Math.cos(sweepC * 0.7) * 0.55;
            const rSqCenter = (txCenter * txCenter) + ((tyCenter / 0.94) * (tyCenter / 0.94));
            const tzCenter = Math.sqrt(Math.max(1.0, 27.04 - Math.min(26.0, rSqCenter)));
            const targetCenterPos = new THREE.Vector3(txCenter, tyCenter, tzCenter).add(pumpkinPivot.position);

            // Far Left fixture sweeps inward towards center
            const sweepFL = pumpkinMiniSweepPhase + Math.PI * 0.5;
            const txFarLeft = -1.2 + Math.sin(sweepFL) * 3.6;
            const tyFarLeft = -2.35 + Math.cos(sweepFL * 0.85) * 0.52;
            const rSqFarLeft = (txFarLeft * txFarLeft) + ((tyFarLeft / 0.94) * (tyFarLeft / 0.94));
            const tzFarLeft = Math.sqrt(Math.max(1.0, 27.04 - Math.min(26.0, rSqFarLeft)));
            const targetFarLeftPos = new THREE.Vector3(txFarLeft, tyFarLeft, tzFarLeft).add(pumpkinPivot.position);

            // Far Right fixture sweeps inward towards center (symmetrically opposite)
            const sweepFR = -pumpkinMiniSweepPhase - Math.PI * 0.5;
            const txFarRight = 1.2 + Math.sin(sweepFR) * 3.6;
            const tyFarRight = -2.35 + Math.cos(sweepFR * 0.85 + Math.PI) * 0.52;
            const rSqFarRight = (txFarRight * txFarRight) + ((tyFarRight / 0.94) * (tyFarRight / 0.94));
            const tzFarRight = Math.sqrt(Math.max(1.0, 27.04 - Math.min(26.0, rSqFarRight)));
            const targetFarRightPos = new THREE.Vector3(txFarRight, tyFarRight, tzFarRight).add(pumpkinPivot.position);

            // Gradual specular sun-glare geometry:
            // "a gradual intensity like the sun glaring through a window hitting your face temporarily as you move past it"
            // Front-facing sweet spot on convex pumpkin facing the viewer/camera (centered around x=0, y=0, z=5.2)
            const leftDistFromFrontCenter = Math.sqrt(txL * txL + (tyL * 1.25) * (tyL * 1.25));
            // Raised-cosine window (smooth entry, gentle crest, smooth exit with zero pop)
            const leftSunGlare = leftDistFromFrontCenter < 2.6
                ? (0.5 + 0.5 * Math.cos((leftDistFromFrontCenter / 2.6) * Math.PI))
                : 0.0;

            const rightDistFromFrontCenter = Math.sqrt(txR * txR + (tyR * 1.25) * (tyR * 1.25));
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
            pumpkinHaloMesh.position.copy(pumpkinPivot.position);
            pumpkinHaloMesh.rotation.x = pumpkinPivot.rotation.x;
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
        // ---------------------------------------------------------------------
        // FX 21: 🏚️ Haunted Manor & Moonlit Forest [Flying Bats & Thunderstorm]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 21) {
            const rawBass = audio.bass || 0;
            const bassImpact = audio.bassImpact || 0;
            const bassPop = audio.smoothedBass || 0;
            const transient = audio.transientImpulse || (audio.isOnset ? 0.8 : 0.0);

            // 1. Slow, atmospheric moonlit cloud drift
            hauntedCloudMesh1.position.x = Math.sin(elapsedTime * 0.08) * 3.5;

            // 1b. Sudden & Random Wind Gust Simulation
            // The eerie night is calm and still, broken periodically by sudden rushing gusts of wind!
            if (!hauntedGustActive && elapsedTime > hauntedNextGustTime) {
                hauntedGustActive = true;
                hauntedGustStartTime = elapsedTime;
                hauntedGustDuration = 2.0 + Math.random() * 2.2; // 2.0s to 4.2s gust duration
                hauntedGustStrength = 0.32 + Math.random() * 0.38 + (bassImpact * 0.35); // Gust peak strength
                hauntedNextGustTime = elapsedTime + 4.5 + Math.random() * 7.5; // Next gust in 4.5s to 12s
            }

            let currentGust = 0.0;
            if (hauntedGustActive) {
                const gProgress = (elapsedTime - hauntedGustStartTime) / hauntedGustDuration;
                if (gProgress >= 1.0) {
                    hauntedGustActive = false;
                } else {
                    // Sudden steep rise in first 20%, peaking with shivering air rush, then slow relaxation
                    if (gProgress < 0.20) {
                        currentGust = hauntedGustStrength * Math.sin((gProgress / 0.20) * Math.PI * 0.5);
                    } else {
                        const relax = (1.0 - gProgress) / 0.80;
                        currentGust = hauntedGustStrength * (relax * relax);
                    }
                    currentGust *= (1.0 + Math.sin(elapsedTime * 14.0) * 0.14);
                }
            }

            // Gates creaking and swinging wide open inward into the curving driveway
            const calmSway = Math.sin(elapsedTime * 0.35) * 0.04;
            hauntedLeftGatePivot.rotation.y = -1.18 - (currentGust * 0.35) + calmSway;
            hauntedRightGatePivot.rotation.y = 1.18 + (currentGust * 0.35) - calmSway;


            // 2. Independent Faulty Electricity Wiring for Right Wing Windows (Top and Bottom Floors Flicker Independently)
            if (!hauntedFaultyTopActive && elapsedTime > hauntedFaultyTopNextTime) {
                hauntedFaultyTopActive = true;
                hauntedFaultyTopStartTime = elapsedTime;
                hauntedFaultyTopDuration = 0.35 + Math.random() * 0.90; // 0.35s to 1.25s blackout/stutter
                hauntedFaultyTopNextTime = elapsedTime + 3.0 + Math.random() * 6.0;
            }
            let topFaultyFactor = 1.0;
            if (hauntedFaultyTopActive) {
                const fProgress = (elapsedTime - hauntedFaultyTopStartTime) / hauntedFaultyTopDuration;
                if (fProgress >= 1.0) {
                    hauntedFaultyTopActive = false;
                    topFaultyFactor = 1.0;
                } else {
                    const arcNoise = Math.sin(elapsedTime * 68.0) * Math.cos(elapsedTime * 47.0);
                    if (arcNoise > 0.45) topFaultyFactor = 0.35;
                    else if (arcNoise > 0.30) topFaultyFactor = 0.85;
                    else topFaultyFactor = 0.0; // PITCH BLACK!
                }
            }

            if (!hauntedFaultyBottomActive && elapsedTime > hauntedFaultyBottomNextTime) {
                hauntedFaultyBottomActive = true;
                hauntedFaultyBottomStartTime = elapsedTime;
                hauntedFaultyBottomDuration = 0.40 + Math.random() * 0.95; // 0.40s to 1.35s blackout/stutter
                hauntedFaultyBottomNextTime = elapsedTime + 4.0 + Math.random() * 7.0;
            }
            let bottomFaultyFactor = 1.0;
            if (hauntedFaultyBottomActive) {
                const fProgress = (elapsedTime - hauntedFaultyBottomStartTime) / hauntedFaultyBottomDuration;
                if (fProgress >= 1.0) {
                    hauntedFaultyBottomActive = false;
                    bottomFaultyFactor = 1.0;
                } else {
                    const arcNoise = Math.sin(elapsedTime * 60.0) * Math.cos(elapsedTime * 52.0);
                    if (arcNoise > 0.45) bottomFaultyFactor = 0.35;
                    else if (arcNoise > 0.30) bottomFaultyFactor = 0.85;
                    else bottomFaultyFactor = 0.0; // PITCH BLACK!
                }
            }

            const faultyState = {
                topFactor: topFaultyFactor,
                bottomFactor: bottomFaultyFactor
            };

            // Render Dynamic Windows Canvas: Blade Blood Rave, Scanning Lasers, Music-Animated Zombies, Independent Floor Flickers
            renderHauntedManorWindows(hauntedWindowsCtx, elapsedTime, audio, faultyState);
            hauntedWindowsTex.needsUpdate = true;

            // Atmospheric Candle & Interior Lights
            const gentleSway = Math.sin(elapsedTime * 3.2) * 0.07 + Math.cos(elapsedTime * 4.8) * 0.04;
            const candleIntensity = 2.4 * (1.0 + gentleSway) + (audio.smoothedTreble || 0) * 0.35;
            hauntedCandleLight.intensity = Math.max(0.08, candleIntensity * Math.min(topFaultyFactor, bottomFaultyFactor));

            // Grand Entrance Porch Hanging Carriage Lantern: Pendulum Swing in Wind & Flickering Candle
            const lanternWindSwing = Math.sin(elapsedTime * 1.8) * 0.12 + (currentGust * 0.28);
            const lanternPitch = Math.cos(elapsedTime * 1.4) * 0.05;
            hauntedPorchLanternGroup.rotation.z = lanternWindSwing;
            hauntedPorchLanternGroup.rotation.x = lanternPitch;

            // Organic candle flicker inside the hanging lantern
            const candleFlicker = 1.0 + Math.sin(elapsedTime * 15.0) * 0.18 + Math.cos(elapsedTime * 32.0) * 0.12 + (Math.random() - 0.5) * 0.14;
            hauntedLanternLight.position.set(2.06 + Math.sin(lanternWindSwing) * 0.45, 1.07, -9.95);
            hauntedLanternLight.intensity = Math.max(0.2, (1.8 + candleFlicker * 0.8) * (candleIntensity / 2.4));

            // 2b. Wicked Flying Witch Flight Simulation (Pass 1: Left to Right across moon; Pass 2: Right to Left in front of manor, larger)
            hauntedWitchThrustMat.uniforms.uTime.value = elapsedTime;
            hauntedWitchThrustMat.uniforms.uIntensity.value = 1.0 + bassImpact * 0.6;

            if (hauntedWitchState === 'idle') {
                hauntedWitchGroup.visible = false;
                if (elapsedTime > hauntedWitchNextTime) {
                    hauntedWitchState = 'pass1_background';
                    hauntedWitchX = -32.0;
                    hauntedWitchGroup.visible = true;
                    // Pass 1: In front of moon (z = -17.5) and BEHIND manor (z = -10.2)
                    hauntedWitchGroup.position.z = -15.5;
                    hauntedWitchGroup.scale.set(1.1, 1.1, 1.1); // Facing right (+X)
                }
            } else if (hauntedWitchState === 'pass1_background') {
                hauntedWitchGroup.visible = true;
                hauntedWitchX += 11.5 * delta; // Flies LEFT TO RIGHT
                // High soaring flight across sky, silhouettes cleanly across full moon!
                const witchY = 5.6 + Math.sin(hauntedWitchX * 0.18) * 0.45;
                hauntedWitchGroup.position.set(hauntedWitchX, witchY, -15.5);
                hauntedWitchGroup.rotation.z = Math.cos(hauntedWitchX * 0.18) * 0.08;

                if (hauntedWitchX > 32.0) {
                    hauntedWitchState = 'between_passes';
                    hauntedWitchGroup.visible = false;
                    hauntedWitchBetweenTimer = 2.8; // Short pause before return pass
                }
            } else if (hauntedWitchState === 'between_passes') {
                hauntedWitchGroup.visible = false;
                hauntedWitchBetweenTimer -= delta;
                if (hauntedWitchBetweenTimer <= 0) {
                    hauntedWitchState = 'pass2_foreground';
                    hauntedWitchX = 28.0; // STARTS ON THE RIGHT!
                    hauntedWitchGroup.visible = true;
                    // Pass 2: In FRONT of manor (z = -10.2) at z = -5.5, scaled LARGER (2.4x scale)
                    hauntedWitchGroup.position.z = -5.5;
                    hauntedWitchGroup.scale.set(-2.4, 2.4, 2.4); // Flips X so she faces LEFT in flight direction!
                }
            } else if (hauntedWitchState === 'pass2_foreground') {
                hauntedWitchGroup.visible = true;
                hauntedWitchX -= 12.5 * delta; // Flies RIGHT TO LEFT!
                // Dynamic swooping trajectory in front of the illuminated manor windows and entrance portico
                const witchY = 2.4 + Math.sin(hauntedWitchX * 0.22) * 0.85;
                hauntedWitchGroup.position.set(hauntedWitchX, witchY, -5.5);
                hauntedWitchGroup.rotation.z = -Math.cos(hauntedWitchX * 0.22) * 0.12;

                if (hauntedWitchX < -28.0) {
                    hauntedWitchState = 'idle';
                    hauntedWitchGroup.visible = false;
                    // Next appearance: every 24s to 38s
                    hauntedWitchNextTime = elapsedTime + 24.0 + Math.random() * 14.0;
                }
            }



            // 3. Flocks of 3D Articulated Flying Vampire Bats (Flying in and out of the scene)
            const batScatterBoost = (audio.isOnset && bassImpact > 0.35) ? 1.25 : 1.0;
            hauntedBats.forEach((b) => {
                // Advance position along screen-traversing velocity vector
                b.pos.x += b.velocity.x * batScatterBoost * delta;
                b.pos.y += (b.velocity.y + Math.sin(elapsedTime * 4.2 + b.phase) * 1.6) * delta;
                b.pos.z += b.velocity.z * batScatterBoost * delta;

                b.batRoot.position.copy(b.pos);

                // Rotate to orient smoothly towards velocity trajectory
                const headingY = Math.atan2(b.velocity.x, b.velocity.z);
                b.batRoot.rotation.y = headingY;
                b.batRoot.rotation.z = -Math.sign(b.velocity.x) * 0.28 + Math.sin(elapsedTime * 4.2 + b.phase) * 0.14;
                b.batRoot.rotation.x = 0.16 - (b.velocity.y / 15.0) * 0.35;

                // Biological articulated wing flapping biomechanics
                const flapPhase = elapsedTime * (b.flapSpeed * batScatterBoost) + b.phase;
                const flapSin = Math.sin(flapPhase);
                const wingFlapAngle = flapSin * 0.82;
                const wingFoldBack = Math.max(0, -flapSin) * 0.44;
                const wingDihedral = Math.sin(flapPhase + 0.3) * 0.22;

                b.leftWingPivot.rotation.z = wingFlapAngle;
                b.leftWingPivot.rotation.y = wingFoldBack;
                b.leftWingPivot.rotation.x = wingDihedral;

                b.rightWingPivot.rotation.z = -wingFlapAngle;
                b.rightWingPivot.rotation.y = -wingFoldBack;
                b.rightWingPivot.rotation.x = wingDihedral;

                // Body vertical counter-bob
                b.bodyMesh.position.y = -flapSin * 0.05;

                // Check screen bounds: when flown out of the scene, respawn on a new incoming flight vector!
                if (Math.abs(b.pos.x) > 38.0 || b.pos.y < -9.5 || b.pos.y > 18.0 || b.pos.z > 6.0 || b.pos.z < -24.0) {
                    respawnHauntedBat(b, false);
                }
            });

            // 3b. Wind Gust Blowing Cemetery Wild Grass at the Fence
            hauntedGrassTufts.forEach((gt) => {
                const idleSway = Math.sin(elapsedTime * gt.idleSpeed + gt.phase) * 0.04;
                const gustBend = currentGust * gt.windFactor;
                const totalBend = gt.baseRot + idleSway + gustBend + (bassImpact * 0.15);
                gt.mesh.rotation.z = totalBend;
                gt.mesh.scale.x = gt.baseScaleX * (1.0 + Math.abs(gustBend) * 0.25);
                gt.mesh.scale.y = gt.baseScaleY * (1.0 - Math.abs(gustBend) * 0.15);
            });

            // 3c. Dark Autumn Dead Leaves Blowing Across the Estate Grounds in the Wind Gusts (Same direction as grass)
            const leafGustSpeed = 0.8 + currentGust * 24.0 + (bassImpact * 4.0);
            hauntedLeaves.forEach((leaf) => {
                // Blow across in the same direction as the grass bend (towards -X)
                leaf.mesh.position.x -= leafGustSpeed * leaf.speedFactor * delta;

                // Fluttering vertical lift and buoyant eddy currents during gust
                const lift = Math.sin(elapsedTime * 4.5 + leaf.phase) * (0.35 + currentGust * 2.2) * leaf.liftFactor;
                leaf.mesh.position.y = leaf.baseY + lift;

                // Aerodynamic tumbling rotation on 3 axes
                const tumbleSpeed = 1.0 + currentGust * 7.5;
                leaf.mesh.rotation.x += leaf.rotSpeedX * tumbleSpeed * delta;
                leaf.mesh.rotation.y += leaf.rotSpeedY * tumbleSpeed * delta;
                leaf.mesh.rotation.z += leaf.rotSpeedZ * tumbleSpeed * delta;

                // Wrap-around: when blown off-screen to the left (-28.0), re-enter from right (+28.0)
                if (leaf.mesh.position.x < -28.0) {
                    leaf.mesh.position.x = 28.0 + Math.random() * 4.0;
                    leaf.baseY = -6.8 + Math.random() * 6.5;
                    leaf.mesh.position.y = leaf.baseY;
                }
            });

            // 4. Edge-to-edge rolling ground fog ocean spreading to the sides of the path across from one side of the screen to the other
            const lateralWindDrift = Math.sin(elapsedTime * 0.35) * 2.2;
            hauntedPathFogPuffs.forEach((fp) => {
                fp.progress += fp.speed * delta;
                if (fp.progress > 1.0) fp.progress -= 1.0;

                const p = fp.progress;
                // Z position moves continuously forward from deep terrain (z = -18.0) through gates (z = 0.0) to foreground (z = +5.0)
                const pZ = -18.0 + p * 23.0;

                let pX = 0.0;
                if (fp.isWideBlanket) {
                    pX = fp.xCenter + fp.xSpread + Math.sin(p * 3.5 + fp.phase) * 1.8 + (fp.driftSpeed * elapsedTime * 0.5) % 8.0 + lateralWindDrift;
                    if (pX > 26.0) pX = -26.0 + (pX - 26.0);
                    if (pX < -26.0) pX = 26.0 - (-26.0 - pX);
                } else {
                    // Path and gate stream: curves from driveway into gate, then fans out across entire screen floor
                    if (pZ < 0.0) {
                        const approachT = (pZ - (-18.0)) / (0.0 - (-18.0));
                        pX = (2.2 * (1.0 - approachT)) + fp.xSpread * 0.6;
                        if (pZ > -3.0) pX *= 0.55; // Channel through gate opening
                    } else {
                        // Spilling through gates into immediate foreground: billows wide across bottom of screen
                        const spillT = pZ / 5.0;
                        pX = (fp.xSpread * (1.2 + spillT * 3.2)) + Math.sin(p * 4.0 + fp.phase) * (2.2 * spillT) + lateralWindDrift;
                    }
                }

                // Y position hugs the sloping ground terrain with breathing undulation
                const pY = -7.2 + p * 0.55 + Math.sin(elapsedTime * 1.4 + fp.phase) * 0.12;

                fp.mesh.position.set(pX, pY, pZ);
                fp.mesh.rotation.z += fp.rotSpeed * delta;

                // Opacity curve: wide smooth bell curve
                let alpha = 0.35;
                if (p < 0.10) {
                    alpha = 0.35 * (p / 0.10);
                } else if (p > 0.85) {
                    alpha = 0.35 * ((1.0 - p) / 0.15);
                }

                // Lightning flash surge: edge-to-edge ocean of fog lights up radiantly in silver-white
                if (hauntedLightningTimer > 0.0) {
                    alpha = Math.min(0.88, alpha * 2.5);
                }
                fp.mesh.material.opacity = alpha;
            });

            // Ambient background graveyard lawn mist drift
            const mistPosAttr = hauntedMistGeo.attributes.position;
            const mistCount = hauntedMistPos.length / 3;
            for (let m = 0; m < mistCount; m++) {
                let mx = mistPosAttr.getX(m);
                mx += (0.35 + (m % 3) * 0.12) * delta;
                if (mx > 24.0) mx = -24.0;
                mistPosAttr.setX(m, mx);
            }
            mistPosAttr.needsUpdate = true;

            // 5. ⛈️ Intermittent Dynamic Weather System ('clear' -> 'gathering' -> 'storm' -> 'clearing' -> 'clear')
            hauntedWeatherTimer += delta;
            if (hauntedWeatherState === 'clear') {
                // Clear, dry moonlit night: rain and clouds completely disappear
                hauntedCloudsAlpha = Math.max(0.0, THREE.MathUtils.lerp(hauntedCloudsAlpha, 0.0, delta * 0.45));
                hauntedRainAlpha = Math.max(0.0, THREE.MathUtils.lerp(hauntedRainAlpha, 0.0, delta * 0.55));

                if (hauntedWeatherTimer >= hauntedWeatherPhaseDuration) {
                    hauntedWeatherState = 'gathering';
                    hauntedWeatherTimer = 0.0;
                    hauntedWeatherPhaseDuration = 10.0 + Math.random() * 4.0; // 10s - 14s gathering clouds
                }
            } else if (hauntedWeatherState === 'gathering') {
                // Dark brooding storm clouds roll heavily across upper sky, sprinkles begin in latter half
                const gatherProg = Math.min(1.0, hauntedWeatherTimer / hauntedWeatherPhaseDuration);
                hauntedCloudsAlpha = THREE.MathUtils.lerp(0.0, 0.90, gatherProg);
                hauntedRainAlpha = gatherProg > 0.5 ? THREE.MathUtils.lerp(0.0, 0.35, (gatherProg - 0.5) * 2.0) : 0.0;

                if (hauntedWeatherTimer >= hauntedWeatherPhaseDuration) {
                    hauntedWeatherState = 'storm';
                    hauntedWeatherTimer = 0.0;
                    hauntedWeatherPhaseDuration = 18.0 + Math.random() * 8.0; // 18s - 26s storm
                    hauntedNextStormLightningTime = 2.0 + Math.random() * 3.0;
                }
            } else if (hauntedWeatherState === 'storm') {
                // Violent thunderstorm: dark clouds, driving white sheets of rain, forked lightning bolts
                hauntedCloudsAlpha = 0.96;
                hauntedRainAlpha = Math.min(0.95, 0.65 + (hauntedWeatherTimer / hauntedWeatherPhaseDuration) * 0.30);

                // Random forked lightning strikes during the storm
                if (hauntedWeatherTimer >= hauntedNextStormLightningTime && hauntedForkedLightningTimer <= 0.0) {
                    // Trigger a dramatic forked lightning bolt!
                    const forkSeedX = 140 + Math.random() * 230;
                    const forkEndX = forkSeedX + (Math.random() - 0.5) * 160;
                    renderProceduralForkedLightning(hauntedForkedLightningCanvas, forkSeedX, forkEndX);
                    hauntedForkedLightningTex.needsUpdate = true;

                    // Place forked lightning bolt across upper sky
                    const boltSkyX = -12.0 + Math.random() * 24.0;
                    hauntedForkedLightningMesh.position.set(boltSkyX, 5.2, -15.4);
                    hauntedForkedLightningMesh.scale.set(Math.random() > 0.5 ? 1.0 : -1.0, 1.0, 1.0);

                    hauntedForkedLightningTimer = 0.42;
                    hauntedNextStormLightningTime = hauntedWeatherTimer + 4.0 + Math.random() * 5.0;
                }

                if (hauntedWeatherTimer >= hauntedWeatherPhaseDuration) {
                    hauntedWeatherState = 'clearing';
                    hauntedWeatherTimer = 0.0;
                    hauntedWeatherPhaseDuration = 9.0 + Math.random() * 3.0; // 9s - 12s clearing
                }
            } else if (hauntedWeatherState === 'clearing') {
                // Storm passes: driving rain tapers off to zero, clouds disperse back to clear sky
                const clearProg = Math.min(1.0, hauntedWeatherTimer / hauntedWeatherPhaseDuration);
                hauntedRainAlpha = THREE.MathUtils.lerp(0.60, 0.0, clearProg);
                hauntedCloudsAlpha = THREE.MathUtils.lerp(0.85, 0.0, clearProg);

                if (hauntedWeatherTimer >= hauntedWeatherPhaseDuration) {
                    hauntedWeatherState = 'clear';
                    hauntedWeatherTimer = 0.0;
                    hauntedWeatherPhaseDuration = 22.0 + Math.random() * 12.0; // 22s - 34s dry, moonlit night!
                }
            }

            // Animate Brooding Storm Clouds (floating across top of sky with slow ominous drift)
            hauntedStormCloudMeshes.forEach((cm, i) => {
                cm.material.opacity = hauntedCloudsAlpha;
                // Brooding downward drift when bad weather gathers
                const floatY = 12.8 - (hauntedCloudsAlpha * 2.2) + Math.sin(elapsedTime * 0.12 + i) * 0.45;
                const floatX = cloudOffsets[i] + Math.sin(elapsedTime * 0.06 + i * 0.8) * 1.8 - (hauntedCloudsAlpha * 2.0);
                cm.position.set(floatX, floatY, -15.8 + i * 0.1);
            });

            // Animate Forked Lightning Bolt Mesh & Atmospheric Full-Sky Flash (Computed first so rain can reflect lightning illumination)
            let stormFlashPower = 0.0;
            if (hauntedForkedLightningTimer > 0.0) {
                hauntedForkedLightningTimer -= delta;
                const lt = Math.max(0.0, hauntedForkedLightningTimer / 0.42);

                // Multi-stroke electrical ionization profile with blinding peak burst
                if (lt > 0.72) {
                    // Stroke 1: Sharp leader strike
                    stormFlashPower = 0.85 * ((lt - 0.72) / 0.28);
                    hauntedForkedLightningMat.opacity = stormFlashPower;
                } else if (lt > 0.58) {
                    // Restrike gap (brief dip)
                    stormFlashPower = 0.35;
                    hauntedForkedLightningMat.opacity = 0.45;
                } else if (lt > 0.18) {
                    // Stroke 2: BLINDING MAIN RETURN STROKE (100% full blinding output)
                    stormFlashPower = 1.0;
                    hauntedForkedLightningMat.opacity = 1.0;
                } else {
                    // Atmospheric plasma afterglow fade
                    stormFlashPower = 0.55 * (lt / 0.18);
                    hauntedForkedLightningMat.opacity = stormFlashPower * 0.8;
                }
            } else {
                hauntedForkedLightningMat.opacity = 0.0;
            }

            // Audio-triggered kick lightning or storm forked lightning
            const audioFlash = (audio.isOnset && (rawBass > 0.38 || bassImpact > 0.40) && (elapsedTime - hauntedLastLightningTime > 1.8)) ? 0.95 : 0.0;
            if (audioFlash > 0.0) {
                hauntedLightningTimer = 0.38;
                hauntedLastLightningTime = elapsedTime;
            }
            if (hauntedLightningTimer > 0.0) {
                hauntedLightningTimer -= delta;
                const alt = Math.max(0.0, hauntedLightningTimer / 0.38);
                stormFlashPower = Math.max(stormFlashPower, alt * 1.0);
            }

            // Full-Sky Atmospheric Flash Plane (illuminates the entire night sky in brilliant electric cyan-white)
            hauntedSkyFlashMat.opacity = stormFlashPower * 0.85;

            // Ultra-Vivid Lightning Rig Illumination: Blinding bursts across the estate grounds
            const baseMoonPower = (hauntedWeatherState === 'storm' || hauntedWeatherState === 'gathering') ? 0.75 : 1.8;
            hauntedMoonLight.intensity = baseMoonPower + stormFlashPower * 12.0;
            hauntedLightningLight.intensity = stormFlashPower * 18.0; // Truly blinding lightning flash!
            hauntedLanternLight.intensity = Math.max(0.2, (1.8 + candleFlicker * 0.8) * (candleIntensity / 2.4)) + stormFlashPower * 1.5;

            // Fog ocean lights up radiantly under the blinding electric flash
            if (stormFlashPower > 0.05) {
                hauntedPathFogPuffs.forEach(fp => {
                    fp.mesh.material.opacity = Math.min(0.92, fp.mesh.material.opacity * (1.0 + stormFlashPower * 2.4));
                });
            }

            // Animate Realistic Multi-Layered Driving Rain (Crisp Pure White Streaks with Directional Motion Blur)
            const windShift = -0.42 - (currentGust * 1.5);

            if (hauntedRainAlpha > 0.008) {
                // Pure white streaks at all times (never blue/cyan sticks)
                hauntedForeRainMat.color.setHex(0xffffff);
                hauntedForeRainMat.opacity = Math.min(1.0, hauntedRainAlpha * (0.85 + stormFlashPower * 0.70));

                const forePosAttr = hauntedForeRainGeo.attributes.position;
                for (let r = 0; r < hauntedForeRainCount; r++) {
                    let topY = forePosAttr.getY(r * 2);
                    let topX = forePosAttr.getX(r * 2);
                    let topZ = forePosAttr.getZ(r * 2);

                    const fallSpeed = hauntedForeRainVel[r];
                    topY -= fallSpeed * delta;
                    topX += windShift * fallSpeed * 0.32 * delta;

                    // Wrap around when falling past bottom
                    if (topY < -8.8) {
                        topY = 16.5 + Math.random() * 4.5;
                        topX = (Math.random() - 0.5) * 60.0;
                    }

                    // Directionally aligned white line streak matching velocity vector
                    const dropLen = hauntedForeRainLen[r] || 1.3;
                    const botX = topX + windShift * 0.32 * dropLen;
                    const botY = topY - dropLen;

                    forePosAttr.setXYZ(r * 2, topX, topY, topZ);
                    forePosAttr.setXYZ(r * 2 + 1, botX, botY, topZ);
                }
                forePosAttr.needsUpdate = true;

                // Layer 2: Deep Atmospheric Driving Rain (Finer, softer pure white streaks over estate & manor)
                hauntedMidRainMat.color.setHex(0xffffff);
                hauntedMidRainMat.opacity = Math.min(0.90, hauntedRainAlpha * (0.75 + stormFlashPower * 0.55));

                const midPosAttr = hauntedMidRainGeo.attributes.position;
                for (let r = 0; r < hauntedMidRainCount; r++) {
                    let topY = midPosAttr.getY(r * 2);
                    let topX = midPosAttr.getX(r * 2);
                    let topZ = midPosAttr.getZ(r * 2);

                    const fallSpeed = hauntedMidRainVel[r];
                    topY -= fallSpeed * delta;
                    topX += windShift * fallSpeed * 0.30 * delta;

                    if (topY < -8.8) {
                        topY = 16.5 + Math.random() * 4.5;
                        topX = (Math.random() - 0.5) * 64.0;
                    }

                    const dropLen = hauntedMidRainLen[r] || 0.7;
                    const botX = topX + windShift * 0.30 * dropLen;
                    const botY = topY - dropLen;

                    midPosAttr.setXYZ(r * 2, topX, topY, topZ);
                    midPosAttr.setXYZ(r * 2 + 1, botX, botY, topZ);
                }
                midPosAttr.needsUpdate = true;
            } else {
                // Completely invisible during dry, clear spells
                hauntedForeRainMat.opacity = 0.0;
                hauntedMidRainMat.opacity = 0.0;
            }

            // =========================================================================
            // Dynamic Audio Animation for 5 Middle Ground Elements
            // =========================================================================

            // 1. Haunted Graveyard & Floating Will-o'-the-Wisps (Spirit Orbs) - Wide 3D Lissajous Orbits
            const wispBassFlare = Math.min(2.4, 1.0 + bassPop * 1.8 + bassImpact * 1.2);
            hauntedWispMeshes.forEach((wm, i) => {
                const wd = hauntedWispData[i];
                const t = elapsedTime * wd.speedX + wd.phase;
                // Wide, dynamic 3D Lissajous flight path looping above the graveyard and lawn
                const floatX = wd.bx + Math.sin(t * 1.4) * 3.6 + Math.cos(t * 0.7) * 1.5;
                const floatY = wd.by + Math.sin(elapsedTime * wd.speedY + wd.phase) * 1.8 + (bassPop * 0.9);
                const floatZ = wd.bz + Math.cos(t * 1.1) * 2.2;
                wm.position.set(floatX, floatY, floatZ);
                wm.scale.setScalar(wispBassFlare * (0.92 + Math.sin(elapsedTime * 5.0 + i * 1.4) * 0.22));
                wm.material.opacity = Math.min(1.0, 0.65 + bassPop * 0.40);
            });
            hauntedWispLight.intensity = (1.4 + bassPop * 3.2 + bassImpact * 1.8) * (0.85 + Math.sin(elapsedTime * 4.5) * 0.15);
            // Move tracking point light with central flying spirit orb
            if (hauntedWispMeshes[2]) {
                hauntedWispLight.position.set(
                    hauntedWispMeshes[2].position.x,
                    hauntedWispMeshes[2].position.y,
                    hauntedWispMeshes[2].position.z
                );
            }

            // 2. Spectral Wandering Apparition / Phantom Wraith
            const specterDriftX = 9.2 + Math.sin(elapsedTime * 0.35) * 2.4;
            const specterDriftY = -2.4 + Math.sin(elapsedTime * 0.70) * 0.45 + Math.cos(elapsedTime * 0.35) * 0.25;
            const specterDriftZ = -6.2 + Math.cos(elapsedTime * 0.35) * 0.8;
            hauntedSpecterMesh.position.set(specterDriftX, specterDriftY, specterDriftZ);
            hauntedSpecterMesh.rotation.z = Math.sin(elapsedTime * 0.5) * 0.05;
            const audioMidSurge = audio.smoothedMid || 0;
            const specterAlpha = Math.min(0.95, 0.28 + (audio.overall || 0) * 0.55 + audioMidSurge * 0.45 + transient * 0.35);
            hauntedSpecterMat.opacity = specterAlpha;

            // 2b. Floating Purple / Amethyst Will-o'-the-Wisps (Right Lawn & Gnarled Trees)
            const purpleWispBassFlare = Math.min(2.4, 1.0 + bassPop * 1.8 + bassImpact * 1.2);
            hauntedPurpleWispMeshes.forEach((pwm, i) => {
                const wd = hauntedPurpleWispData[i];
                const t = elapsedTime * wd.speedX + wd.phase;
                const floatX = wd.bx + Math.sin(t * 1.3) * 3.4 + Math.cos(t * 0.6) * 1.5;
                const floatY = wd.by + Math.sin(elapsedTime * wd.speedY + wd.phase) * 1.7 + (bassPop * 0.9);
                const floatZ = wd.bz + Math.cos(t * 1.0) * 2.0;
                pwm.position.set(floatX, floatY, floatZ);
                pwm.scale.setScalar(purpleWispBassFlare * (0.92 + Math.sin(elapsedTime * 5.2 + i * 1.3) * 0.22));
                pwm.material.opacity = Math.min(1.0, 0.65 + bassPop * 0.40);
            });
            hauntedPurpleWispLight.intensity = (1.4 + bassPop * 3.2 + bassImpact * 1.8) * (0.85 + Math.sin(elapsedTime * 4.8) * 0.15);
            if (hauntedPurpleWispMeshes[1]) {
                hauntedPurpleWispLight.position.set(
                    hauntedPurpleWispMeshes[1].position.x,
                    hauntedPurpleWispMeshes[1].position.y,
                    hauntedPurpleWispMeshes[1].position.z
                );
            }

            // 3. Gothic Watcher Gargoyles with Glowing Cursed Eyes (Flanking Front of Manor)
            const gargoyleEyeSurge = Math.min(2.5, 0.65 + bassPop * 1.5 + transient * 1.2);
            hauntedGargoyleEyeLeft.scale.setScalar(gargoyleEyeSurge);
            hauntedGargoyleEyeRight.scale.setScalar(gargoyleEyeSurge);
            cursedEyeMat.opacity = Math.min(1.0, 0.70 + bassPop * 0.35);

            // 4. Jack-O'-Lantern Pathway Guardians with Disco Beat-Reactive Mouth Lights
            const discoPalette = [0x00ff88, 0xff007f, 0x00e5ff, 0xba14ff, 0xffaa00, 0xff1438, 0xffee00, 0x00f0ff];
            const pumpkinFlicker = 1.0 + Math.sin(elapsedTime * 24.0) * 0.22 + Math.cos(elapsedTime * 48.0) * 0.16;
            // Explosive beat strobe up to 6.5 intensity on bass drops and audio transients
            const pumpkinDiscoStrobe = Math.min(6.5, (pumpkinFlicker + bassPop * 4.5 + bassImpact * 3.2 + (audio.isOnset ? 2.5 : 0.0)));
            const beatStep = Math.floor(elapsedTime * 4.0 + (audio.energy || 0) * 3.0);

            hauntedPumpkinLights.forEach((pLight, idx) => {
                pLight.intensity = 1.6 * pumpkinDiscoStrobe * (0.80 + Math.sin(elapsedTime * 20.0 + idx * 1.5) * 0.20);
                // When music hits, flash through vibrant disco colors in the mouth
                if (audio.isOnset || bassPop > 0.35) {
                    const discoHex = discoPalette[(idx + beatStep) % discoPalette.length];
                    pLight.color.setHex(discoHex);
                } else {
                    // Smoothly blend back to pumpkin's signature color
                    const baseHex = pumpkinConfigs[idx].lightHex;
                    pLight.color.lerp(new THREE.Color(baseHex), 0.15);
                }
            });
            const pumpkinJitter = (audio.isOnset && bassImpact > 0.35) ? Math.sin(elapsedTime * 60.0) * 0.04 : 0.0;
            hauntedPumpkinMeshes.forEach((pm, i) => {
                pm.scale.setScalar(pumpkinConfigs[i].scale * (1.0 + bassPop * 0.22 + (audio.isOnset ? 0.08 : 0.0)));
                pm.position.y = pumpkinConfigs[i].y + pumpkinJitter;
            });

            // 5. Possessed Gnarled Trees with Watching Eyes (Subtle Glow + Periodic Prominent Stare)
            const treeBassSway = Math.sin(elapsedTime * 0.8) * 0.015 + (bassPop * 0.02);
            hauntedGnarledTreeLeft.rotation.z = treeBassSway;
            hauntedGnarledTreeRight.rotation.z = -treeBassSway;

            const treblePulse = audio.smoothedTreble || 0;
            const blinkCycle = Math.sin(elapsedTime * 1.6);
            const isBlinking = blinkCycle > 0.95;

            // Periodic Prominent Eye Stare: Every 14 seconds, hollow tree eyes dilate and flare aggressively
            const stareCycle = (elapsedTime % 14.0);
            const isStareProminent = stareCycle < 4.2;
            const stareFactor = isStareProminent ? Math.sin((stareCycle / 4.2) * Math.PI) : 0.0;
            const eyeScaleMultiplier = 1.0 + stareFactor * 1.65;
            const eyeOpacityBoost = stareFactor * 0.65;

            const eyeOpenScale = isBlinking ? 0.05 : Math.min(2.5, (0.85 + treblePulse * 0.8) * eyeScaleMultiplier);
            const eyeGlow = 0.28 + Math.sin(elapsedTime * 2.2) * 0.08 + (treblePulse * 0.32) + (transient * 0.18) + eyeOpacityBoost;
            hauntedTreeEyeMeshes.forEach((tem, idx) => {
                tem.scale.y = eyeOpenScale;
                tem.scale.x = (isBlinking ? 0.5 : 1.0) * eyeScaleMultiplier;
                tem.material.opacity = isBlinking ? 0.0 : Math.min(1.0, eyeGlow + (idx % 2 === 0 ? 0.05 : -0.05));
            });

            // =========================================================================
            // 6. Manor Front Door Open (OUTWARDS), Hallway Shader Glow, Pathway Spline Zoom,
            //    Scream Ghostface Jumpscare & Reset Sequence (Runs every ~3 minutes!)
            // =========================================================================
            // Cycle period: 180 seconds (3 full minutes). Initial preview triggers at t = 20s
            const hauntedCyclePeriod = 180.0;
            const hauntedPreviewOffset = 160.0; // At t = 20s, (20 + 160) % 180 = 0
            const seqTime = (elapsedTime + hauntedPreviewOffset) % hauntedCyclePeriod;

            // Update procedural hallway shaders
            hauntedHallwayMats.forEach(m => {
                m.uniforms.uTime.value = elapsedTime;
                m.uniforms.uBass.value = bassPop;
            });

            if (seqTime < 4.0) {
                // Phase 1: Manor Front Doors Creak Open OUTWARDS onto the Porch
                const p = seqTime / 4.0;
                const pSmooth = p * p * (3.0 - 2.0 * p);

                // Both doors swing OUTWARDS toward the porch (+Z, towards camera)
                hauntedLeftDoorPivot.rotation.y = -1.55 * pSmooth;
                hauntedRightDoorPivot.rotation.y = 1.55 * pSmooth;

                const greenGlow = pSmooth * (1.2 + Math.sin(elapsedTime * 6.0) * 0.15 + bassPop * 0.6);
                hauntedHallwayMats.forEach(m => m.uniforms.uGreenGlow.value = greenGlow);
                hauntedHallwayLight.intensity = pSmooth * 4.0;
                hauntedHallwayRedLight.intensity = pSmooth * (3.5 + Math.sin(elapsedTime * 8.0) * 0.8 + bassPop * 2.5);

                hauntedJumpSpookMat.opacity = 0.0;
                hauntedJumpSpookMesh.position.set(2.06, -0.55, -10.3);
                hauntedJumpSpookMesh.scale.set(0.1, 0.1, 0.1);

                // Camera rests at gate
                hauntedCamTargetPos.copy(hauntedCamSpline.getPoint(0.0));
                hauntedCamTargetLookAt.copy(hauntedLookAtSpline.getPoint(0.0));
            } else if (seqTime >= 4.0 && seqTime < 20.0) {
                // Phase 2: Silky-Smooth Cinematic Camera Travel Along the Catmull-Rom Spline
                const tTravel = (seqTime - 4.0) / 16.0;
                // Quintic smoothstep easing (zero velocity & zero acceleration at both ends - completely glitch-free!)
                const u = tTravel * tTravel * tTravel * (tTravel * (tTravel * 6.0 - 15.0) + 10.0);

                hauntedLeftDoorPivot.rotation.y = -1.55;
                hauntedRightDoorPivot.rotation.y = 1.55;

                const greenGlow = 1.2 + 0.6 * u + bassPop * 0.8;
                hauntedHallwayMats.forEach(m => m.uniforms.uGreenGlow.value = greenGlow);
                hauntedHallwayLight.intensity = 4.0 + 2.5 * u + bassPop * 1.5;
                hauntedHallwayRedLight.intensity = (3.5 + 4.5 * u) * (0.85 + Math.sin(elapsedTime * 12.0) * 0.15) + bassPop * 3.5;

                hauntedJumpSpookMat.opacity = 0.0;

                // Sample mathematical continuous spline
                hauntedCamTargetPos.copy(hauntedCamSpline.getPoint(u));
                hauntedCamTargetLookAt.copy(hauntedLookAtSpline.getPoint(u));
            } else if (seqTime >= 20.0 && seqTime < 26.0) {
                // Phase 3: Arrived Right at Doorstep - Scream Ghostface Leaps Out Brandishing Knife!
                hauntedLeftDoorPivot.rotation.y = -1.55;
                hauntedRightDoorPivot.rotation.y = 1.55;

                const jTime = seqTime - 20.0;
                const horrorShakeDecay = Math.max(0.0, 1.0 - jTime / 3.0);
                const horrorShakeX = Math.sin(elapsedTime * 65.0) * 0.07 * horrorShakeDecay;
                const horrorShakeY = Math.cos(elapsedTime * 52.0) * 0.07 * horrorShakeDecay;

                hauntedCamTargetPos.copy(hauntedCamSpline.getPoint(1.0)).add(new THREE.Vector3(horrorShakeX, horrorShakeY, 0));
                hauntedCamTargetLookAt.copy(hauntedLookAtSpline.getPoint(1.0));

                if (jTime < 1.4) {
                    // Explosive forward burst through the open doorway right into camera
                    const lungeP = jTime / 1.4;
                    const lungeSmooth = Math.sin(lungeP * Math.PI * 0.5);
                    hauntedJumpSpookMesh.position.z = THREE.MathUtils.lerp(-10.3, -7.95, lungeSmooth);
                    hauntedJumpSpookMesh.scale.setScalar(THREE.MathUtils.lerp(0.2, 2.7, lungeSmooth));
                    hauntedJumpSpookMat.opacity = Math.min(1.0, lungeP * 4.0);
                    hauntedHallwayLight.intensity = 10.0 * (0.8 + Math.sin(elapsedTime * 45.0) * 0.2);
                    hauntedHallwayRedLight.intensity = 15.0 * (0.8 + Math.cos(elapsedTime * 48.0) * 0.2);
                    if (jTime < 0.18) manualFlash = Math.max(manualFlash, 0.9);
                } else {
                    // Scream Ghostface writhes and fades into green spectral mist
                    const fadeP = (jTime - 1.4) / 4.6;
                    hauntedJumpSpookMesh.position.z = -7.95 + Math.sin(elapsedTime * 14.0) * 0.08;
                    hauntedJumpSpookMesh.scale.setScalar(2.7 + Math.sin(elapsedTime * 12.0) * 0.12);
                    hauntedJumpSpookMat.opacity = Math.max(0.0, (1.0 - fadeP) * 1.0);
                    hauntedHallwayLight.intensity = Math.max(0.0, 6.0 * (1.0 - fadeP));
                    hauntedHallwayRedLight.intensity = Math.max(0.0, 8.5 * (1.0 - fadeP));
                }

                hauntedJumpSpookMesh.position.x = 2.06 + Math.sin(elapsedTime * 48.0) * 0.07;
                hauntedJumpSpookMesh.position.y = -0.55 + Math.cos(elapsedTime * 38.0) * 0.07;
                hauntedJumpSpookMesh.rotation.z = Math.sin(elapsedTime * 28.0) * 0.12;
            } else if (seqTime >= 26.0 && seqTime < 36.0) {
                // Phase 4: Silky-Smooth Cinematic Reverse Glide Back Along Spline to the Gates
                const tReturn = (seqTime - 26.0) / 10.0;
                const v = tReturn * tReturn * tReturn * (tReturn * (tReturn * 6.0 - 15.0) + 10.0);
                const u = 1.0 - v;

                hauntedJumpSpookMat.opacity = 0.0;

                // Doors smoothly creak shut as camera retreats
                hauntedLeftDoorPivot.rotation.y = -1.55 * (1.0 - v);
                hauntedRightDoorPivot.rotation.y = 1.55 * (1.0 - v);

                const greenGlow = 1.2 * (1.0 - v);
                hauntedHallwayMats.forEach(m => m.uniforms.uGreenGlow.value = greenGlow);
                hauntedHallwayLight.intensity = Math.max(0.0, 3.5 * (1.0 - v));
                hauntedHallwayRedLight.intensity = Math.max(0.0, 3.5 * (1.0 - v));

                hauntedCamTargetPos.copy(hauntedCamSpline.getPoint(u));
                hauntedCamTargetLookAt.copy(hauntedLookAtSpline.getPoint(u));
            } else {
                // Phase 5: Resting Tranquilly at Front Gate (for 144 seconds = 2.4 minutes!)
                hauntedLeftDoorPivot.rotation.y = 0.0;
                hauntedRightDoorPivot.rotation.y = 0.0;
                hauntedHallwayMats.forEach(m => m.uniforms.uGreenGlow.value = 0.0);
                hauntedHallwayLight.intensity = 0.0;
                hauntedHallwayRedLight.intensity = 0.0;
                hauntedJumpSpookMat.opacity = 0.0;

                hauntedCamTargetPos.copy(hauntedCamSpline.getPoint(0.0));
                hauntedCamTargetLookAt.copy(hauntedLookAtSpline.getPoint(0.0));
            }
        }
        // ---------------------------------------------------------------------
        // FX 22: 🎬 Cyber Cinema Video Playback [Seamless Dual-Channel Video Arena]
        // ---------------------------------------------------------------------
        else if (currentFXIndex === 22) {
            const rawBass = audio.bass || 0;
            const bassImpact = audio.bassImpact || 0;
            const transient = audio.transientImpulse || (audio.isOnset ? 0.8 : 0.0);

            // 1. Advance transition timer if active
            if (videoTransitionActive) {
                const elapsedTrans = elapsedTime - videoTransitionStartTime;
                const mixProgress = Math.min(1.0, Math.max(0.0, elapsedTrans / videoTransitionDuration));
                
                // If transitioning to B, mix goes 0 -> 1. If to A, mix goes 1 -> 0
                cinemaScreenShaderMat.uniforms.uMix.value = (videoActiveChannel === 'B') ? mixProgress : (1.0 - mixProgress);

                if (mixProgress >= 1.0) {
                    videoTransitionActive = false;
                    // Outgoing video can pause to preserve CPU/GPU
                    if (videoActiveChannel === 'B') {
                        videoChannelA.pause();
                    } else {
                        videoChannelB.pause();
                    }
                }
            }

            // 2. Uniforms & Audio Reactive Pulse
            if (videoChannelA && videoChannelA.readyState >= 2) {
                videoTexA.needsUpdate = true;
            }
            if (videoChannelB && videoChannelB.readyState >= 2) {
                videoTexB.needsUpdate = true;
            }
            cinemaScreenShaderMat.uniforms.uTime.value = elapsedTime;
            cinemaScreenShaderMat.uniforms.uBass.value = bassImpact;
            updateVideoScreenScale();
        }
        } catch (err) {
            console.error('[VFX Frame Animation Error]', err);
        }
        // Camera Recoil: strictly disabled for FX 3 (Hellfire Waveforms), FX 4 (Disco Ball) and FX 16-22
        if (audio.isOnset && currentFXIndex !== 3 && currentFXIndex !== 4 && currentFXIndex !== 21 && currentFXIndex !== 22 && (currentFXIndex < 16 || currentFXIndex > 22)) {
            camRecoilZ = -0.32 * audio.bassImpact;
            camRecoilY = (Math.random() - 0.5) * 0.12 * audio.bassImpact;
            camRecoilX = (Math.random() - 0.5) * 0.12 * audio.bassImpact;
        } else if (currentFXIndex === 3 || currentFXIndex === 4 || currentFXIndex === 21 || currentFXIndex === 22 || (currentFXIndex >= 16 && currentFXIndex <= 22)) {
            camRecoilX = 0;
            camRecoilY = 0;
            camRecoilZ = 0;
        }
        camRecoilX *= 0.88;
        camRecoilY *= 0.88;
        camRecoilZ *= 0.88;

        if (currentFXIndex === 21) {
            // Haunted Manor: Exponentially smoothed camera position & orientation
            hauntedCamCurrentPos.lerp(hauntedCamTargetPos, 0.15);
            hauntedCamCurrentLookAt.lerp(hauntedCamTargetLookAt, 0.15);
            camera.position.copy(hauntedCamCurrentPos);
            camera.lookAt(hauntedCamCurrentLookAt);
        } else {
            camera.rotation.set(0, 0, 0);
            camera.position.x = THREE.MathUtils.lerp(camera.position.x, camRecoilX, 0.25);
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, camRecoilY, 0.25);
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, 16.0 + camRecoilZ, 0.2);
        }

        // 4. Post-Processing: Crisp Neon Bloom & Transient Glitch
        const fxBloomBoost = (currentFXIndex === 3 || currentFXIndex === 4 || currentFXIndex === 21 || currentFXIndex === 22) ? 0.0 : ((currentFXIndex >= 16 && currentFXIndex <= 20) ? (bassPop * 0.12 + transient * 0.08) : (bassPop * 0.18));
        const targetBloom = (currentFXIndex === 3 || currentFXIndex === 4 || currentFXIndex === 21 || currentFXIndex === 22)
            ? ((currentFXIndex === 22 && videoRenderQuality !== 'retro') ? 0.0 : 0.18 * bloomMultiplier)
            : Math.min(0.70, (0.20 + fxBloomBoost + (manualFlash * 0.45)) * bloomMultiplier);
        bloomPass.strength = bloomMultiplier <= 0.05 ? 0.0 : THREE.MathUtils.lerp(bloomPass.strength, targetBloom, 0.15);

        const targetAberration = (currentFXIndex === 3 || currentFXIndex === 4 || currentFXIndex === 21 || currentFXIndex === 22 || (currentFXIndex >= 16 && currentFXIndex <= 22)) ? 0.0 : ((transient > 0.7 ? 0.12 : 0.0) + (manualFlash * 0.4));
        nightclubPass.uniforms.uAberration.value = THREE.MathUtils.lerp(nightclubPass.uniforms.uAberration.value, targetAberration, 0.18);

        const targetGlitch = (currentFXIndex === 3 || currentFXIndex === 4 || currentFXIndex === 21 || currentFXIndex === 22 || (currentFXIndex >= 16 && currentFXIndex <= 22)) ? 0.0 : ((transient > 0.85) ? (transient * 0.20) : 0.0);
        nightclubPass.uniforms.uGlitch.value = THREE.MathUtils.lerp(nightclubPass.uniforms.uGlitch.value, targetGlitch, 0.20);

        nightclubPass.uniforms.uFlash.value = manualFlash;
        if (manualFlash > 0.01) manualFlash *= 0.82;
        else manualFlash = 0.0;

        if (beatTriggerPulse > 0.01) beatTriggerPulse *= 0.8;
        else beatTriggerPulse = 0.0;

        nightclubPass.uniforms.uTime.value = elapsedTime;

        // Global Scene Lights: Disabled for FX 3 (DJ Deck), FX 4, FX 21 & FX 22
        if (currentFXIndex === 3 || currentFXIndex === 4 || currentFXIndex === 21 || currentFXIndex === 22) {
            lightCyan.intensity = 0.0;
            lightMagenta.intensity = 0.0;
        } else {
            lightCyan.position.x = Math.sin(elapsedTime * 1.5) * 9;
            lightCyan.position.y = Math.cos(elapsedTime * 1.2) * 7;
            lightCyan.intensity = Math.min(1.5, (0.7 + bassPop * 0.5) * (bloomMultiplier + 0.5));

            lightMagenta.position.x = -Math.sin(elapsedTime * 1.3) * 9;
            lightMagenta.position.y = -Math.cos(elapsedTime * 1.1) * 7;
            lightMagenta.intensity = Math.min(1.5, (0.7 + (audio.smoothedMid || 0) * 0.5) * (bloomMultiplier + 0.5));
        }

        if (currentFXIndex === 22) {
            if (videoRenderQuality === 'direct') {
                if (directVideoOverlay) {
                    if (directVideoOverlay.style.display !== 'block') {
                        directVideoOverlay.style.display = 'block';
                    }
                    const curVid = (videoActiveChannel === 'A') ? videoChannelA : videoChannelB;
                    if (videoCurrentUrl && directVideoOverlay.src !== videoCurrentUrl) {
                        directVideoOverlay.src = videoCurrentUrl;
                    }
                    if (!curVid.paused && directVideoOverlay.paused) {
                        directVideoOverlay.play().catch(() => {});
                    } else if (curVid.paused && !directVideoOverlay.paused) {
                        directVideoOverlay.pause();
                    }
                    if (Math.abs(directVideoOverlay.currentTime - curVid.currentTime) > 0.35) {
                        directVideoOverlay.currentTime = curVid.currentTime;
                    }
                }
                cinemaScreenMesh.visible = false;
                renderer.setClearColor(0x000000, 0.0);
                renderer.render(scene, camera);
            } else if (videoRenderQuality === 'ultra') {
                if (directVideoOverlay) directVideoOverlay.style.display = 'none';
                cinemaScreenMesh.visible = true;
                cinemaScreenShaderMat.uniforms.uLinearOutput.value = 0.0;
                renderer.setClearColor(0x000000, 1.0);
                renderer.toneMapping = THREE.NoToneMapping;
                renderer.render(scene, camera);
            } else {
                // retro mode
                if (directVideoOverlay) directVideoOverlay.style.display = 'none';
                cinemaScreenMesh.visible = true;
                cinemaScreenShaderMat.uniforms.uLinearOutput.value = 1.0;
                nightclubPass.uniforms.uVignette.value = 0.85;
                nightclubPass.enabled = true;
                bloomPass.enabled = true;
                renderer.setClearColor(0x000000, 1.0);
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                composer.render();
            }
        } else {
            if (directVideoOverlay) directVideoOverlay.style.display = 'none';
            nightclubPass.uniforms.uVignette.value = 1.0;
            nightclubPass.enabled = true;
            bloomPass.enabled = true;
            renderer.setClearColor(0x000000, 1.0);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            composer.render();
        }
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
            const dNum = Number(data.deck);
            let targetDeck = null;
            if (dNum === 1 || data.deck === '1' || data.deck === 'A') {
                targetDeck = 1;
            } else if (dNum === 2 || data.deck === '2' || data.deck === 'B') {
                targetDeck = 2;
            } else if (dNum === 3 || data.deck === '3' || data.deck === 'C') {
                if (data.play || (data.fader !== undefined && Number(data.fader) > 0.05)) targetDeck = 1;
            } else if (dNum === 4 || data.deck === '4' || data.deck === 'D') {
                if (data.play || (data.fader !== undefined && Number(data.fader) > 0.05)) targetDeck = 2;
            }
            if (!targetDeck) return;

            // Handle Track Unload / Standby reset
            if (data.unloaded || data.title === '' || data.title === 'No Track Loaded' || data.title === '—') {
                if (targetDeck === 1) {
                    deck1Data.title = '';
                    deck1Data.artist = '';
                    deck1Data.bpm = null;
                    deck1Data.key = '';
                    deck1Data.duration = 0;
                    deck1Data.totalBeats = 0;
                    deck1Data.cues = [];
                    deck1Data.loops = [];
                    deck1Data.artworkUrl = '';
                    deck1Data.artworkImg = null;
                    deck1Data._artRequested = false;
                    deck1Data.samples = null;
                    deck1Data.loopActive = false;
                    deck1Progress = 0;
                    deck1WireProgress = 0;
                    deck1Playing = false;
                    deck1HasHardwareWaveform = false;
                    deck1Active = false;
                } else {
                    deck2Data.title = '';
                    deck2Data.artist = '';
                    deck2Data.bpm = null;
                    deck2Data.key = '';
                    deck2Data.duration = 0;
                    deck2Data.totalBeats = 0;
                    deck2Data.cues = [];
                    deck2Data.loops = [];
                    deck2Data.artworkUrl = '';
                    deck2Data.artworkImg = null;
                    deck2Data._artRequested = false;
                    deck2Data.samples = null;
                    deck2Data.loopActive = false;
                    deck2Progress = 0;
                    deck2WireProgress = 0;
                    deck2Playing = false;
                    deck2HasHardwareWaveform = false;
                    deck2Active = false;
                }
                return;
            }

            if (targetDeck === 1) {
                if (data.fader !== undefined) {
                    deck1Fader = Number(data.fader);
                }
                if (data.play !== undefined) {
                    deck1Playing = Boolean(data.play);
                }
                if (data.title) {
                    const cleanT = String(data.title).trim();
                    if (cleanT && cleanT !== '—' && cleanT !== 'No Track Loaded' && cleanT !== 'Live Track') {
                        if (deck1Data.title !== data.title) {
                            deck1Data.artworkImg = null;
                            deck1Data.artworkUrl = '';
                            deck1Data._artRequested = false;
                        }
                        deck1Data.title = data.title;
                        deck1Data.unloaded = false;
                        deck1Data.offline = false;
                    }
                }
                if (data.artist) deck1Data.artist = data.artist;
                if (data.bpm) deck1Data.bpm = data.bpm;
                if (data.key) deck1Data.key = data.key;
                if (data.artworkUrl) {
                    deck1Data.artworkUrl = data.artworkUrl;
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => { deck1Data.artworkImg = img; };
                    img.src = data.artworkUrl;
                } else if (deck1Data.title && !deck1Data._artRequested) {
                    deck1Data._artRequested = true;
                    loadDeckArtwork(deck1Data.title, deck1Data.artist, deck1Data);
                }
                if (data.duration) deck1Data.duration = Number(data.duration);
                if (data.totalBeats) deck1Data.totalBeats = Number(data.totalBeats);
                if (data.beat !== undefined) {
                    const b = Number(data.beat);
                    if (deck1LastBeat !== undefined && Math.abs(b - deck1LastBeat) > 0.0001) {
                        deck1Stationary = false;
                        deck1LastBeatTime = performance.now();
                    } else if (deck1LastBeat !== undefined && (performance.now() - deck1LastBeatTime > 400)) {
                        deck1Stationary = true;
                    }
                    deck1LastBeat = b;
                    deck1Data.beat = b;
                    deck1BeatInBar = ((Math.floor(b) % 4) + 4) % 4 + 1;
                } else if (data.count !== undefined) {
                    deck1BeatInBar = data.count;
                }
                if (data.loopActive !== undefined) {
                    deck1LoopActive = Boolean(data.loopActive);
                    deck1Data.loopActive = deck1LoopActive;
                    if (data.loopStart !== undefined && data.loopStart > 0) {
                        deck1LoopStart = Number(data.loopStart);
                        deck1Data.loopStart = Number(data.loopStart);
                    }
                    if (data.loopEnd !== undefined && data.loopEnd > 0) {
                        deck1LoopEnd = Number(data.loopEnd);
                        deck1Data.loopEnd = Number(data.loopEnd);
                    }
                }
                if (data.sync !== undefined) deck1Data.sync = Boolean(data.sync);
                if (data.cues && Array.isArray(data.cues) && data.cues.length > 0) deck1Data.cues = data.cues;
                if (data.loops && Array.isArray(data.loops) && data.loops.length > 0) deck1Data.loops = data.loops;
                if (data.samples && Array.isArray(data.samples)) deck1Data.samples = data.samples;

                if (data.progress !== undefined) {
                    const newProg = Number(data.progress);
                    if (Math.abs(newProg - deck1Progress) > 0.015) {
                        deck1Progress = newProg;
                    }
                    deck1WireProgress = newProg;
                    lastDeck1WireTime = performance.now();
                }

                const hasValidTrack1 = !!(deck1Data.title && deck1Data.title !== 'No Track Loaded' && deck1Data.title !== '—');
                deck1Active = hasValidTrack1;
            } else {
                if (data.fader !== undefined) {
                    deck2Fader = Number(data.fader);
                }
                if (data.play !== undefined) {
                    deck2Playing = Boolean(data.play);
                }
                if (data.title) {
                    const cleanT = String(data.title).trim();
                    if (cleanT && cleanT !== '—' && cleanT !== 'No Track Loaded' && cleanT !== 'Live Track') {
                        if (deck2Data.title !== data.title) {
                            deck2Data.artworkImg = null;
                            deck2Data.artworkUrl = '';
                            deck2Data._artRequested = false;
                        }
                        deck2Data.title = data.title;
                        deck2Data.unloaded = false;
                        deck2Data.offline = false;
                    }
                }
                if (data.artist) deck2Data.artist = data.artist;
                if (data.bpm) deck2Data.bpm = data.bpm;
                if (data.key) deck2Data.key = data.key;
                if (data.artworkUrl) {
                    deck2Data.artworkUrl = data.artworkUrl;
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => { deck2Data.artworkImg = img; };
                    img.src = data.artworkUrl;
                } else if (deck2Data.title && !deck2Data._artRequested) {
                    deck2Data._artRequested = true;
                    loadDeckArtwork(deck2Data.title, deck2Data.artist, deck2Data);
                }
                if (data.duration) deck2Data.duration = Number(data.duration);
                if (data.totalBeats) deck2Data.totalBeats = Number(data.totalBeats);
                if (data.beat !== undefined) {
                    const b2 = Number(data.beat);
                    if (deck2LastBeat !== undefined && Math.abs(b2 - deck2LastBeat) > 0.0001) {
                        deck2Stationary = false;
                        deck2LastBeatTime = performance.now();
                    } else if (deck2LastBeat !== undefined && (performance.now() - deck2LastBeatTime > 400)) {
                        deck2Stationary = true;
                    }
                    deck2LastBeat = b2;
                    deck2Data.beat = b2;
                }
                if (data.loopActive !== undefined) {
                    deck2Data.loopActive = Boolean(data.loopActive);
                    if (data.loopStart !== undefined && data.loopStart > 0) {
                        deck2Data.loopStart = Number(data.loopStart);
                    }
                    if (data.loopEnd !== undefined && data.loopEnd > 0) {
                        deck2Data.loopEnd = Number(data.loopEnd);
                    }
                }
                if (data.sync !== undefined) deck2Data.sync = Boolean(data.sync);
                if (data.cues && Array.isArray(data.cues) && data.cues.length > 0) deck2Data.cues = data.cues;
                if (data.loops && Array.isArray(data.loops) && data.loops.length > 0) deck2Data.loops = data.loops;
                if (data.samples && Array.isArray(data.samples)) deck2Data.samples = data.samples;

                if (data.progress !== undefined) {
                    const newProg2 = Number(data.progress);
                    if (Math.abs(newProg2 - deck2Progress) > 0.015) {
                        deck2Progress = newProg2;
                    }
                    deck2WireProgress = newProg2;
                    lastDeck2WireTime = performance.now();
                }

                // Deck 2 is active whenever Track 2 is loaded in the player
                const hasValidTrack = !!(deck2Data.title && deck2Data.title !== 'No Track Loaded' && deck2Data.title !== '—');
                deck2Active = hasValidTrack;
            }
        },
        unloadDeck: (deckNum) => {
            const d = (deckNum === 2 || deckNum === 4 || deckNum === '2' || deckNum === '4' || deckNum === 'B' || deckNum === 'D') ? 2 : 1;
            if (d === 1) {
                deck1Data.title = '';
                deck1Data.artist = '';
                deck1Data.bpm = null;
                deck1Data.key = '';
                deck1Data.duration = 0;
                deck1Data.totalBeats = 0;
                deck1Data.cues = [];
                deck1Data.loops = [];
                deck1Data.artworkUrl = '';
                deck1Data.artworkImg = null;
                deck1Data._artRequested = false;
                deck1Data.samples = null;
                deck1Data.loopActive = false;
                deck1Data.unloaded = true;
                deck1Progress = 0;
                deck1WireProgress = 0;
                deck1Playing = false;
                deck1HasHardwareWaveform = false;
                deck1Active = false;
            } else {
                deck2Data.title = '';
                deck2Data.artist = '';
                deck2Data.bpm = null;
                deck2Data.key = '';
                deck2Data.duration = 0;
                deck2Data.totalBeats = 0;
                deck2Data.cues = [];
                deck2Data.loops = [];
                deck2Data.artworkUrl = '';
                deck2Data.artworkImg = null;
                deck2Data._artRequested = false;
                deck2Data.samples = null;
                deck2Data.loopActive = false;
                deck2Data.unloaded = true;
                deck2Progress = 0;
                deck2WireProgress = 0;
                deck2Playing = false;
                deck2HasHardwareWaveform = false;
                deck2Active = false;
            }
        },
        resetAllDecks: () => {
            // Unload Deck 1
            deck1Data.title = '';
            deck1Data.artist = '';
            deck1Data.bpm = null;
            deck1Data.key = '';
            deck1Data.duration = 0;
            deck1Data.totalBeats = 0;
            deck1Data.cues = [];
            deck1Data.loops = [];
            deck1Data.artworkUrl = '';
            deck1Data.artworkImg = null;
            deck1Data._artRequested = false;
            deck1Data.samples = null;
            deck1Data.loopActive = false;
            deck1Data.unloaded = true;
            deck1Data.offline = true;
            deck1Progress = 0;
            deck1WireProgress = 0;
            deck1Playing = false;
            deck1HasHardwareWaveform = false;
            deck1Active = false;

            // Unload Deck 2
            deck2Data.title = '';
            deck2Data.artist = '';
            deck2Data.bpm = null;
            deck2Data.key = '';
            deck2Data.duration = 0;
            deck2Data.totalBeats = 0;
            deck2Data.cues = [];
            deck2Data.loops = [];
            deck2Data.artworkUrl = '';
            deck2Data.artworkImg = null;
            deck2Data._artRequested = false;
            deck2Data.samples = null;
            deck2Data.loopActive = false;
            deck2Data.unloaded = true;
            deck2Data.offline = true;
            deck2Progress = 0;
            deck2WireProgress = 0;
            deck2Playing = false;
            deck2HasHardwareWaveform = false;
            deck2Active = false;

            // Immediately dissolve 3D moving Hellfire waveform
            deck1Weight = 0.0;
            deck2Weight = 0.0;
            smoothDeck1SmokePhase = 1.0;
            smoothDeck2SmokePhase = 1.0;
            if (djWaveMat && djWaveMat.uniforms) {
                djWaveMat.uniforms.uDeck1Weight.value = 0.0;
                djWaveMat.uniforms.uDeck2Weight.value = 0.0;
                djWaveMat.uniforms.uDeck1SmokePhase.value = 1.0;
                djWaveMat.uniforms.uDeck2SmokePhase.value = 1.0;
            }
            if (waveSmokeMat && waveSmokeMat.uniforms) {
                waveSmokeMat.uniforms.uDeck1SmokePhase.value = 1.0;
                waveSmokeMat.uniforms.uDeck2SmokePhase.value = 1.0;
            }
            if (djWaveMesh) djWaveMesh.visible = false;
            if (waveSmokeMesh) waveSmokeMesh.visible = false;
            if (djAudioHistoryData) {
                djAudioHistoryData.fill(0);
                if (djAudioHistoryTex) djAudioHistoryTex.needsUpdate = true;
            }
            primaryDeck = 1;
            manualPrimaryDeck = 1;
        },
        getDeckData: (deckNum) => (deckNum === 2 ? deck2Data : deck1Data),
        getPrimaryDeck: () => primaryDeck,
        getDeckStatus: () => ({
            deck1Fader,
            deck2Fader,
            deck1Playing,
            deck2Playing,
            deck1Stationary,
            deck2Stationary,
            deck1LastBeatTime,
            deck2LastBeatTime,
            primaryDeck,
            deck1Weight,
            deck2Weight
        }),
        setActiveDeck: (deckNum) => {
            const d = (deckNum === 2 || deckNum === 4 || deckNum === '2' || deckNum === '4' || deckNum === 'B' || deckNum === 'D') ? 2 : 1;
            manualPrimaryDeck = d;
            primaryDeck = d;
            if (d === 2) {
                deck1Fader = 0.0;
                deck2Fader = 1.0;
                deck1Weight = 0.0;
                deck2Weight = 1.0;
                deck2Active = true;
            } else {
                deck1Fader = 1.0;
                deck2Fader = 0.0;
                deck1Weight = 1.0;
                deck2Weight = 0.0;
                deck1Active = true;
            }
        },
        setPrimaryDeck: (deckNum) => {
            const d = (deckNum === 2 || deckNum === 4 || deckNum === '2' || deckNum === '4' || deckNum === 'B' || deckNum === 'D') ? 2 : 1;
            manualPrimaryDeck = d;
            primaryDeck = d;
            if (d === 2) {
                deck1Fader = 0.0;
                deck2Fader = 1.0;
                deck1Weight = 0.0;
                deck2Weight = 1.0;
                deck2Active = true;
            } else {
                deck1Fader = 1.0;
                deck2Fader = 0.0;
                deck1Weight = 1.0;
                deck2Weight = 0.0;
                deck1Active = true;
            }
        },
        setHandoverThreshold: (val) => {
            const num = parseFloat(val);
            if (!isNaN(num) && num >= 0.40 && num <= 0.99) {
                faderHandoverThreshold = num;
                try { localStorage.setItem('dj_vfx_handover_threshold', String(num)); } catch (e) {}
            }
        },
        getHandoverThreshold: () => faderHandoverThreshold,
        setCrossfader: (xfVal) => {
            const val = Math.max(0.0, Math.min(1.0, Number(xfVal)));
            // val: 0.0 = Deck 1, 1.0 = Deck 2, 0.5 = center blend
            if (val > 0.65) {
                manualPrimaryDeck = 2;
                primaryDeck = 2;
                deck1Weight = Math.max(0.0, (1.0 - val) * 2.0);
                deck2Weight = 1.0;
            } else if (val < 0.35) {
                manualPrimaryDeck = 1;
                primaryDeck = 1;
                deck1Weight = 1.0;
                deck2Weight = Math.max(0.0, val * 2.0);
            } else {
                manualPrimaryDeck = null;
                deck1Weight = (1.0 - val) * 1.5;
                deck2Weight = val * 1.5;
            }
        },
        setDeckWaveform: (waveformPacket) => {
            setDeckWaveform(waveformPacket);
        },
        getLiveDeckAudioData: () => {
            if (!deck1HasHardwareWaveform && !deck1Active) return null;

            updateSynthesizedDeckSpectrum();

            const kickPulse = beatTriggerPulse;
            const liveBass = wireSmoothBins[4] / 255.0;
            const liveMid = wireSmoothBins[32] / 255.0;
            const liveTreble = wireSmoothBins[90] / 255.0;
            const overall = Math.min(1.0, liveBass * 0.60 + liveMid * 0.35 + liveTreble * 0.20);

            const synthArray = new Uint8Array(128);
            for (let i = 0; i < 128; i++) {
                synthArray[i] = Math.min(255, Math.max(0, Math.floor(wireSmoothBins[i])));
            }

            const peakDb = -0.5 + kickPulse * 0.4;
            const lufs = -8.5 + liveBass * 3.0;

            return {
                bass: liveBass,
                smoothedBass: liveBass,
                bassImpact: kickPulse > 0.4 ? 0.95 : (liveBass * 0.7),
                transientImpulse: Math.min(1.0, kickPulse * 0.9 + wireSmoothHit * 0.3),
                mid: liveMid,
                smoothedMid: liveMid,
                treble: liveTreble,
                smoothedTreble: liveTreble,
                overall: overall,
                isOnset: kickPulse > 0.55,
                dataArray: synthArray,
                peakDb: peakDb,
                peakHoldDb: 0.0,
                lufs: lufs,
                headroomDb: 0.5,
                vuPercent: Math.min(100, Math.round(overall * 100)),
                vuRmsPercent: Math.min(100, Math.round((liveBass * 0.6 + liveMid * 0.4) * 85)),
                vuPeakHoldPercent: Math.min(100, Math.round(overall * 100)),
                isClipping: false
            };
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
                20: ['#0044ff', '#ff4400', '#00e5ff', '#00ff22', '#9400d3', '#ff007f'], // Pumpkin Disco Ball
                21: ['#0b1626', '#cce0ff', '#ff9922', '#7a33ff', '#44ffbb', '#ffffff'], // Haunted Manor & Moonlit Forest
                22: ['#00e5ff', '#ff007f', '#00ffaa', '#ffaa00', '#7a33ff', '#ffffff'], // Cyber Cinema Video Playback
            };
            return SCENE_PALETTES[currentFXIndex] || ['#00ffff', '#ff007f', '#ffaa00', '#00ff66', '#9900ff', '#ff0033'];
        },
        getCurrentSceneColor: () => {
            const time = clock.getElapsedTime();
            const bps = currentBPM / 60.0;
            const beatStep = Math.floor(time * bps);

            // FX 22: 🎬 Cyber Cinema Video Playback -> Electric Cyan, Hot Magenta & Neon Mint
            if (currentFXIndex === 22) {
                const cinemaPalette = ['#00e5ff', '#ff007f', '#00ffaa', '#ffaa00', '#7a33ff', '#ffffff'];
                return cinemaPalette[beatStep % cinemaPalette.length];
            }
            // FX 20: 🎃 Pumpkin Disco Ball -> Sapphire Blue, Flame Orange & Electric Cyan
            if (currentFXIndex === 20) {
                const pumpkinPalette = ['#0044ff', '#ff4400', '#00e5ff', '#00ff22', '#9400d3', '#ff007f'];
                return pumpkinPalette[beatStep % pumpkinPalette.length];
            }
            // FX 21: 🏚️ Haunted Manor & Moonlit Forest -> Deep midnight blue, glowing moonlight silver & warm candle amber
            if (currentFXIndex === 21) {
                const hauntedPalette = ['#cce0ff', '#ff9922', '#0b1626', '#ffffff', '#7a33ff', '#44ffbb'];
                return hauntedPalette[beatStep % hauntedPalette.length];
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
                3: ['#ffaa00', '#ff4500', '#ff2200', '#ff6600', '#ff8800', '#e63900'],
                4: ['#ffd700', '#ff00ff', '#00ffff', '#ff0055', '#00ffaa', '#9900ff'],
                5: ['#ff007f', '#00ffff', '#ffee00', '#00ff66', '#ff00aa', '#0088ff']
            };
            const pal = defaultPalettes[currentFXIndex] || ['#00ffff', '#ff007f', '#ffaa00', '#00ff66', '#9900ff', '#ffffff'];
            const idx = Math.floor((time * bps) % pal.length);
            return pal[idx] || '#00ffff';
        },
        // Scene 22: Cyber Cinema Video Playback Control Methods
        playVideoInScene: (url, title, options = {}) => {
            if (!url) {
                if (cinemaScreenShaderMat && cinemaScreenShaderMat.uniforms.uHasVideo) {
                    cinemaScreenShaderMat.uniforms.uHasVideo.value = 0.0;
                }
                return;
            }
            videoCurrentUrl = url;
            videoCurrentTitle = title || url.split('/').pop().replace(/[-_]/g, ' ');
            const targetVid = (videoActiveChannel === 'A') ? videoChannelA : videoChannelB;
            if (url.startsWith('blob:')) {
                targetVid.removeAttribute('crossorigin');
            } else if (url.startsWith('http://') || url.startsWith('https://')) {
                targetVid.crossOrigin = 'anonymous';
            } else {
                targetVid.removeAttribute('crossorigin');
            }
            targetVid.src = url;
            targetVid.playbackRate = videoSpeedSetting;
            targetVid.muted = videoMutedSetting;
            targetVid.play().catch(err => {
                console.warn('[Cyber Cinema 3D] playVideoInScene notice:', err?.message || err);
            });
            cinemaScreenShaderMat.uniforms.uMix.value = (videoActiveChannel === 'A') ? 0.0 : 1.0;
            if (cinemaScreenShaderMat.uniforms.uHasVideo) {
                cinemaScreenShaderMat.uniforms.uHasVideo.value = 1.0;
            }
            videoTransitionActive = false;

            if (directVideoOverlay) {
                if (url.startsWith('blob:') || !url.startsWith('http')) {
                    directVideoOverlay.removeAttribute('crossorigin');
                } else {
                    directVideoOverlay.crossOrigin = 'anonymous';
                }
                if (directVideoOverlay.src !== url) {
                    directVideoOverlay.src = url;
                }
                directVideoOverlay.playbackRate = videoSpeedSetting;
                directVideoOverlay.muted = videoMutedSetting;
                directVideoOverlay.loop = (videoLoopSetting === 'single');
                if (currentFXIndex === 22 && videoRenderQuality === 'direct') {
                    directVideoOverlay.style.display = 'block';
                    directVideoOverlay.play().catch(() => {});
                }
            }
        },
        transitionToVideo: (url, title, transType = 0, durSec = 1.0) => {
            if (!url) {
                if (cinemaScreenShaderMat && cinemaScreenShaderMat.uniforms.uHasVideo) {
                    cinemaScreenShaderMat.uniforms.uHasVideo.value = 0.0;
                }
                if (directVideoOverlay) {
                    directVideoOverlay.style.display = 'none';
                    directVideoOverlay.src = '';
                }
                return;
            }
            const nextChannel = (videoActiveChannel === 'A') ? 'B' : 'A';
            const incomingVid = (nextChannel === 'B') ? videoChannelB : videoChannelA;

            if (url.startsWith('blob:')) {
                incomingVid.removeAttribute('crossorigin');
            } else if (url.startsWith('http://') || url.startsWith('https://')) {
                incomingVid.crossOrigin = 'anonymous';
            } else {
                incomingVid.removeAttribute('crossorigin');
            }
            incomingVid.src = url;
            incomingVid.playbackRate = videoSpeedSetting;
            incomingVid.muted = videoMutedSetting;
            incomingVid.currentTime = 0;
            incomingVid.play().catch(err => {
                console.warn('[Cyber Cinema 3D] transitionToVideo notice:', err?.message || err);
            });

            videoActiveChannel = nextChannel;
            videoCurrentUrl = url;
            videoCurrentTitle = title || url.split('/').pop().replace(/[-_]/g, ' ');

            const transMap = { crossfade: 0, glitch: 1, zoom: 2, strobe: 3, cut: 4 };
            videoTransitionType = typeof transType === 'number' ? transType : (transMap[transType] ?? 0);
            cinemaScreenShaderMat.uniforms.uTransitionType.value = videoTransitionType;
            cinemaScreenShaderMat.uniforms.uMix.value = (nextChannel === 'B') ? 0.0 : 1.0;
            if (cinemaScreenShaderMat.uniforms.uHasVideo) {
                cinemaScreenShaderMat.uniforms.uHasVideo.value = 1.0;
            }
            videoTransitionDuration = Math.max(0.1, Number(durSec) || 1.0);
            videoTransitionStartTime = clock.getElapsedTime();
            videoTransitionActive = true;

            if (directVideoOverlay) {
                if (url.startsWith('blob:') || !url.startsWith('http')) {
                    directVideoOverlay.removeAttribute('crossorigin');
                } else {
                    directVideoOverlay.crossOrigin = 'anonymous';
                }
                directVideoOverlay.src = url;
                directVideoOverlay.playbackRate = videoSpeedSetting;
                directVideoOverlay.muted = videoMutedSetting;
                directVideoOverlay.currentTime = 0;
                directVideoOverlay.loop = (videoLoopSetting === 'single');
                if (currentFXIndex === 22 && videoRenderQuality === 'direct') {
                    directVideoOverlay.style.display = 'block';
                    directVideoOverlay.play().catch(() => {});
                }
            }
        },
        clearVideoFromScene: () => {
            videoCurrentUrl = '';
            videoCurrentTitle = 'No Video Selected';
            if (cinemaScreenShaderMat && cinemaScreenShaderMat.uniforms.uHasVideo) {
                cinemaScreenShaderMat.uniforms.uHasVideo.value = 0.0;
            }
            videoChannelA.pause();
            videoChannelB.pause();
            if (directVideoOverlay) {
                directVideoOverlay.style.display = 'none';
                directVideoOverlay.pause();
                directVideoOverlay.src = '';
            }
        },
        pauseVideoInScene: () => {
            videoChannelA.pause();
            videoChannelB.pause();
            if (directVideoOverlay) directVideoOverlay.pause();
        },
        resumeVideoInScene: () => {
            const curVid = (videoActiveChannel === 'A') ? videoChannelA : videoChannelB;
            curVid.play().catch(() => {});
            if (directVideoOverlay && directVideoOverlay.src) {
                directVideoOverlay.play().catch(() => {});
            }
        },
        setVideoHasSource: (hasVideo) => {
            if (cinemaScreenShaderMat && cinemaScreenShaderMat.uniforms.uHasVideo) {
                cinemaScreenShaderMat.uniforms.uHasVideo.value = hasVideo ? 1.0 : 0.0;
            }
        },
        setVideoSpeed: (speed) => {
            videoSpeedSetting = Math.max(0.2, Math.min(3.0, Number(speed) || 1.0));
            videoChannelA.playbackRate = videoSpeedSetting;
            videoChannelB.playbackRate = videoSpeedSetting;
            if (directVideoOverlay) directVideoOverlay.playbackRate = videoSpeedSetting;
        },
        setVideoMute: (muted) => {
            videoMutedSetting = !!muted;
            videoChannelA.muted = videoMutedSetting;
            videoChannelB.muted = videoMutedSetting;
            if (directVideoOverlay) directVideoOverlay.muted = videoMutedSetting;
        },
        setVideoLoop: (mode) => {
            videoLoopSetting = mode;
            videoChannelA.loop = (mode === 'single');
            videoChannelB.loop = (mode === 'single');
            if (directVideoOverlay) directVideoOverlay.loop = (mode === 'single');
        },
        getVideoPlaybackState: () => {
            const activeVid = (videoRenderQuality === 'direct' && directVideoOverlay && directVideoOverlay.src)
                ? directVideoOverlay
                : ((videoActiveChannel === 'A') ? videoChannelA : videoChannelB);
            return {
                url: videoCurrentUrl,
                title: videoCurrentTitle,
                currentTime: activeVid.currentTime || 0,
                duration: activeVid.duration || 0,
                paused: activeVid.paused,
                speed: videoSpeedSetting,
                muted: videoMutedSetting,
                loopMode: videoLoopSetting,
                channel: videoActiveChannel,
                renderQuality: videoRenderQuality
            };
        },
        getVideoState: () => {
            const activeVid = (videoRenderQuality === 'direct' && directVideoOverlay && directVideoOverlay.src)
                ? directVideoOverlay
                : ((videoActiveChannel === 'A') ? videoChannelA : videoChannelB);
            return {
                url: videoCurrentUrl,
                title: videoCurrentTitle,
                currentTime: activeVid.currentTime || 0,
                duration: activeVid.duration || 0,
                paused: activeVid.paused,
                speed: videoSpeedSetting,
                muted: videoMutedSetting,
                loopMode: videoLoopSetting,
                channel: videoActiveChannel,
                renderQuality: videoRenderQuality
            };
        },
        setVideoRenderQuality: (quality) => {
            videoRenderQuality = (quality === 'direct' || quality === 'retro') ? quality : 'ultra';
            const curVid = (videoActiveChannel === 'A') ? videoChannelA : videoChannelB;
            if (currentFXIndex === 22) {
                if (videoRenderQuality === 'direct') {
                    if (directVideoOverlay) {
                        if (videoCurrentUrl && directVideoOverlay.src !== videoCurrentUrl) {
                            directVideoOverlay.src = videoCurrentUrl;
                        }
                        directVideoOverlay.currentTime = curVid.currentTime || 0;
                        directVideoOverlay.playbackRate = videoSpeedSetting;
                        directVideoOverlay.muted = videoMutedSetting;
                        directVideoOverlay.loop = (videoLoopSetting === 'single');
                        if (!curVid.paused) {
                            directVideoOverlay.play().catch(() => {});
                        }
                        directVideoOverlay.style.display = 'block';
                    }
                    cinemaScreenMesh.visible = false;
                } else {
                    if (directVideoOverlay) {
                        directVideoOverlay.style.display = 'none';
                    }
                    cinemaScreenMesh.visible = true;
                    if (!curVid.paused) {
                        curVid.play().catch(() => {});
                    }
                }
            }
            onResize();
        },
        getVideoRenderQuality: () => videoRenderQuality
    };
}
