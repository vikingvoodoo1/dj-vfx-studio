import * as THREE from 'three';

// =========================================================================
// EERIE HALLOWEEN HAUNTED MANOR PROCEDURAL TEXTURE & SHADER GENERATORS (FX 21)
// =========================================================================


// Procedural Single Realistic Dead Autumn Leaf Texture (256x256 - One Single Leaf Per Mesh)
export function createSingleHauntedLeafTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    ctx.save();
    ctx.translate(128, 128);

    if (type === 0) {
        // Detailed Withered Oak Leaf (Rounded lobes, sinuses, petiole stem & lateral veins)
        ctx.fillStyle = '#1c0f0a';
        ctx.beginPath();
        ctx.moveTo(0, -95);
        ctx.bezierCurveTo(40, -80, 52, -50, 26, -30);
        ctx.bezierCurveTo(58, -12, 62, 22, 28, 42);
        ctx.bezierCurveTo(46, 62, 32, 85, 0, 95);
        ctx.bezierCurveTo(-32, 85, -46, 62, -28, 42);
        ctx.bezierCurveTo(-62, 22, -58, -12, -26, -30);
        ctx.bezierCurveTo(-52, -50, -40, -80, 0, -95);
        ctx.closePath();
        ctx.fill();

        // Veins
        ctx.strokeStyle = '#090503';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -90); ctx.lineTo(0, 105);
        ctx.stroke();

        ctx.lineWidth = 1.2;
        for (let v = -60; v <= 60; v += 30) {
            ctx.beginPath();
            ctx.moveTo(0, v); ctx.lineTo(32, v - 15);
            ctx.moveTo(0, v); ctx.lineTo(-32, v - 15);
            ctx.stroke();
        }
    } else if (type === 1) {
        // Detailed Curled Maple Leaf (5 pointed serrated lobes, radial palmate veins, petiole)
        ctx.fillStyle = '#220b08';
        ctx.beginPath();
        ctx.moveTo(0, -96);
        ctx.lineTo(22, -55); ctx.lineTo(68, -65); ctx.lineTo(38, -16);
        ctx.lineTo(75, 12); ctx.lineTo(36, 32); ctx.lineTo(44, 76);
        ctx.lineTo(0, 52);
        ctx.lineTo(-44, 76); ctx.lineTo(-36, 32); ctx.lineTo(-75, 12);
        ctx.lineTo(-38, -16); ctx.lineTo(-68, -65); ctx.lineTo(-22, -55);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#0a0302';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, 102); ctx.lineTo(0, -90);
        ctx.moveTo(0, 30); ctx.lineTo(60, -60);
        ctx.moveTo(0, 30); ctx.lineTo(-60, -60);
        ctx.moveTo(0, 30); ctx.lineTo(65, 12);
        ctx.moveTo(0, 30); ctx.lineTo(-65, 12);
        ctx.stroke();
    } else {
        // Detailed Curled Dry Dead Elm Leaf (Slender curved blade, arched midrib, dried curl)
        ctx.fillStyle = '#140c06';
        ctx.beginPath();
        ctx.moveTo(0, -100);
        ctx.bezierCurveTo(46, -50, 42, 42, 0, 96);
        ctx.bezierCurveTo(-38, 45, -42, -45, 0, -100);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#080502';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -95);
        ctx.quadraticCurveTo(8, 0, 0, 106);
        ctx.stroke();

        ctx.lineWidth = 1.0;
        for (let v = -70; v <= 60; v += 22) {
            ctx.beginPath();
            ctx.moveTo(0, v); ctx.lineTo(24, v - 12);
            ctx.moveTo(0, v); ctx.lineTo(-24, v - 12);
            ctx.stroke();
        }
    }

    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Procedural Swinging Porch Carriage Lantern with Candle (128x256)
export function createHauntedPorchLanternTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 256);

    // Hanging chain from top
    ctx.strokeStyle = '#182030';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(64, 0); ctx.lineTo(64, 42);
    ctx.stroke();

    // Lantern top iron cap
    ctx.fillStyle = '#0a0d16';
    ctx.beginPath();
    ctx.moveTo(64, 40);
    ctx.lineTo(96, 70);
    ctx.lineTo(32, 70);
    ctx.closePath();
    ctx.fill();

    // Glass cage background
    ctx.fillStyle = 'rgba(15, 25, 40, 0.65)';
    ctx.fillRect(36, 70, 56, 92);

    // Wrought-iron frame struts
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 70, 56, 92);
    ctx.beginPath();
    ctx.moveTo(64, 70); ctx.lineTo(64, 162);
    ctx.stroke();

    // Candle stick inside
    ctx.fillStyle = '#e8d8c0';
    ctx.fillRect(60, 115, 8, 42);

    // Candle flame (incandescent core with warm amber glow)
    const flameGrad = ctx.createRadialGradient(64, 108, 2, 64, 108, 22);
    flameGrad.addColorStop(0.0, '#ffffff');
    flameGrad.addColorStop(0.3, '#ffdd66');
    flameGrad.addColorStop(0.7, '#ff7700');
    flameGrad.addColorStop(1.0, 'transparent');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.arc(64, 108, 22, 0, Math.PI * 2);
    ctx.fill();

    // Iron bottom base & finial
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(32, 162, 64, 10);
    ctx.beginPath();
    ctx.moveTo(64, 185); ctx.lineTo(60, 172); ctx.lineTo(68, 172); ctx.closePath();
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

// 1. High-Resolution Glowing Full Moon & Atmospheric Corona (1024x1024)
export function createHauntedMoonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const cx = 512, cy = 512;

    // Atmospheric Lunar Corona / Radial Glow
    const coronaGrad = ctx.createRadialGradient(cx, cy, 210, cx, cy, 510);
    coronaGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    coronaGrad.addColorStop(0.40, 'rgba(235, 245, 255, 0.95)');
    coronaGrad.addColorStop(0.55, 'rgba(180, 215, 255, 0.55)');
    coronaGrad.addColorStop(0.72, 'rgba(120, 170, 240, 0.25)');
    coronaGrad.addColorStop(0.88, 'rgba(60, 100, 180, 0.08)');
    coronaGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 510, 0, Math.PI * 2);
    ctx.fill();

    // Solid Full Moon Disc with clipping mask for surface details
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 230, 0, Math.PI * 2);
    ctx.clip();

    // Luminous lunar base surface gradient
    const moonBase = ctx.createRadialGradient(cx - 50, cy - 60, 20, cx, cy, 240);
    moonBase.addColorStop(0.0, '#ffffff');
    moonBase.addColorStop(0.50, '#f5f8fc');
    moonBase.addColorStop(0.85, '#e4ecf7');
    moonBase.addColorStop(1.0, '#c8d6e8');
    ctx.fillStyle = moonBase;
    ctx.fill();

    // Authentic Lunar Maria (Dark Basaltic Plains) & Crater Formations
    const maria = [
        { x: cx - 75, y: cy - 70, rx: 110, ry: 85, rot: -0.2, col: 'rgba(155, 175, 200, 0.40)' },
        { x: cx - 90, y: cy - 40, rx: 75, ry: 60, rot: 0.1, col: 'rgba(135, 160, 190, 0.45)' },
        { x: cx + 60, y: cy - 55, rx: 65, ry: 50, rot: -0.15, col: 'rgba(145, 170, 200, 0.42)' },
        { x: cx + 85, y: cy + 15, rx: 70, ry: 55, rot: 0.3, col: 'rgba(140, 165, 195, 0.40)' },
        { x: cx - 45, y: cy + 85, rx: 80, ry: 60, rot: 0.1, col: 'rgba(150, 172, 200, 0.38)' },
        { x: cx + 35, y: cy + 105, rx: 65, ry: 50, rot: -0.2, col: 'rgba(155, 180, 205, 0.36)' }
    ];

    maria.forEach(m => {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, m.rx, m.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = m.col;
        ctx.fill();
        ctx.restore();
    });

    // Bright crater rim highlights (Tycho & Copernicus crater ray hubs)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(cx + 55, cy + 130, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 40, cy - 10, 14, 0, Math.PI * 2);
    ctx.fill();

    // Thin moonlit cloud streaks crossing lower lunar face
    ctx.fillStyle = 'rgba(14, 24, 42, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx - 40, cy + 85, 165, 28, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 80, cy - 90, 135, 22, 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// 2. Gothic Stormy Night Sky & Moonlit Cloud Masses (1024x1024)
export function createHauntedSkyCloudsTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Deep Gothic Night Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    skyGrad.addColorStop(0.0, '#010307');
    skyGrad.addColorStop(0.35, '#050b18');
    skyGrad.addColorStop(0.70, '#0a1526');
    skyGrad.addColorStop(1.0, '#03060c');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Moonlight back-scatter cloud illumination centered at upper-left (360, 360)
    const moonGlow = ctx.createRadialGradient(360, 360, 40, 360, 360, 560);
    moonGlow.addColorStop(0.0, 'rgba(195, 225, 255, 0.40)');
    moonGlow.addColorStop(0.35, 'rgba(125, 165, 215, 0.24)');
    moonGlow.addColorStop(0.70, 'rgba(40, 75, 120, 0.10)');
    moonGlow.addColorStop(1.0, 'transparent');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(0, 0, 1024, 1024);

    // Billowing storm cloud clusters
    const clouds = [
        { x: 300, y: 280, r: 190, col: 'rgba(14, 26, 46, 0.55)' },
        { x: 480, y: 340, r: 220, col: 'rgba(18, 32, 54, 0.50)' },
        { x: 220, y: 440, r: 200, col: 'rgba(12, 22, 38, 0.60)' },
        { x: 740, y: 260, r: 250, col: 'rgba(8, 16, 30, 0.68)' },
        { x: 860, y: 450, r: 230, col: 'rgba(10, 20, 35, 0.72)' },
        { x: 120, y: 200, r: 230, col: 'rgba(7, 14, 26, 0.75)' },
        { x: 500, y: 650, r: 310, col: 'rgba(11, 20, 36, 0.78)' },
        { x: 850, y: 750, r: 290, col: 'rgba(6, 12, 22, 0.82)' },
        { x: 150, y: 800, r: 310, col: 'rgba(5, 10, 18, 0.85)' }
    ];

    clouds.forEach(c => {
        const cg = ctx.createRadialGradient(c.x, c.y, 20, c.x, c.y, c.r);
        cg.addColorStop(0, c.col);
        cg.addColorStop(0.65, c.col);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Procedural Brooding Storm Clouds Texture (2048x1024) - Realistic Volumetric Shading & Organic Edges
export function createBroodingStormCloudsTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 2048, 1024);

    // 1. Soft Atmospheric Storm Sky Wash (smooth gradient from deep navy thunderhead down to misty haze)
    const baseGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    baseGrad.addColorStop(0.0, 'rgba(8, 13, 22, 0.96)');
    baseGrad.addColorStop(0.35, 'rgba(12, 18, 30, 0.88)');
    baseGrad.addColorStop(0.65, 'rgba(16, 24, 38, 0.55)');
    baseGrad.addColorStop(0.95, 'rgba(12, 17, 28, 0.0)');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // 2. Stratified Roll Cloud Banks (Dense horizontal masses with dark bruised underbellies)
    const stormBanks = [
        { x: 350, y: 180, rx: 550, ry: 210, rot: -0.04 },
        { x: 950, y: 150, rx: 620, ry: 230, rot: 0.03 },
        { x: 1650, y: 190, rx: 580, ry: 220, rot: -0.02 },
        { x: 600, y: 320, rx: 500, ry: 180, rot: 0.05 },
        { x: 1350, y: 340, rx: 560, ry: 190, rot: -0.03 },
        { x: 1850, y: 310, rx: 460, ry: 170, rot: 0.02 }
    ];

    stormBanks.forEach(b => {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        const bGrad = ctx.createRadialGradient(0, -b.ry * 0.45, b.rx * 0.15, 0, b.ry * 0.1, b.rx);
        bGrad.addColorStop(0.0, 'rgba(40, 58, 88, 0.60)'); // Silver-slate lunar scatter
        bGrad.addColorStop(0.40, 'rgba(14, 21, 35, 0.85)'); // Dense stormy indigo
        bGrad.addColorStop(0.75, 'rgba(5, 8, 16, 0.95)'); // Bruised underbelly
        bGrad.addColorStop(1.0, 'rgba(5, 8, 16, 0.0)'); // Feathered boundary
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, b.rx, b.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // 3. Volumetric Organic Cumulus Puffs (65 layered soft-edged billows avoiding all hard circles)
    // Deterministic pseudo-random distribution for consistent, organic stormy billow clusters
    function seededPuff(px, py, pr, pMoonFactor) {
        const grad = ctx.createRadialGradient(
            px - pr * 0.25, py - pr * 0.38, pr * 0.08, // Offset towards upper-left moonlight
            px, py, pr
        );
        const rimCol = pMoonFactor > 0.5 ? 'rgba(75, 105, 150, 0.50)' : 'rgba(50, 72, 108, 0.42)';
        grad.addColorStop(0.0, rimCol); // Upper lunar highlight
        grad.addColorStop(0.28, 'rgba(18, 27, 44, 0.82)');
        grad.addColorStop(0.68, 'rgba(8, 12, 22, 0.94)'); // Deep shadow core
        grad.addColorStop(0.90, 'rgba(4, 7, 14, 0.70)');
        grad.addColorStop(1.0, 'rgba(4, 7, 14, 0.0)'); // Ultra-soft zero-opacity perimeter

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
    }

    // Cluster 1: Left sky heavy thunderhead
    const leftCluster = [
        [180, 160, 220, 0.8], [320, 130, 260, 0.9], [460, 180, 240, 0.7],
        [120, 280, 190, 0.4], [260, 260, 230, 0.5], [420, 290, 250, 0.6],
        [200, 390, 170, 0.3], [340, 380, 200, 0.4], [480, 410, 180, 0.3]
    ];
    leftCluster.forEach(p => seededPuff(p[0], p[1], p[2], p[3]));

    // Cluster 2: Central sky brooding shelf
    const centerCluster = [
        [680, 140, 270, 0.9], [860, 110, 290, 1.0], [1050, 150, 280, 0.8],
        [640, 260, 240, 0.5], [820, 250, 260, 0.6], [1020, 270, 250, 0.5],
        [720, 370, 210, 0.3], [910, 380, 220, 0.4], [1100, 390, 200, 0.3]
    ];
    centerCluster.forEach(p => seededPuff(p[0], p[1], p[2], p[3]));

    // Cluster 3: Right sky swirling tempest
    const rightCluster = [
        [1280, 130, 260, 0.8], [1480, 160, 280, 0.9], [1720, 140, 270, 0.7], [1920, 170, 230, 0.6],
        [1240, 270, 230, 0.5], [1440, 280, 260, 0.6], [1660, 260, 250, 0.5], [1860, 280, 220, 0.4],
        [1320, 390, 190, 0.3], [1520, 410, 210, 0.3], [1740, 380, 190, 0.3]
    ];
    rightCluster.forEach(p => seededPuff(p[0], p[1], p[2], p[3]));

    // 4. Fine Wispy Fracto-Cumulus Tendrils (80 small feathered organic tufts breaking up all silhouettes)
    for (let f = 0; f < 85; f++) {
        const fx = 80 + (f * 23) % 1900 + ((f * 37) % 60);
        const fy = 200 + ((f * 17) % 360);
        const fr = 45 + ((f * 13) % 85);
        const fGrad = ctx.createRadialGradient(fx - fr * 0.2, fy - fr * 0.2, fr * 0.1, fx, fy, fr);
        fGrad.addColorStop(0.0, 'rgba(35, 52, 80, 0.38)');
        fGrad.addColorStop(0.5, 'rgba(12, 18, 30, 0.55)');
        fGrad.addColorStop(1.0, 'rgba(8, 12, 20, 0.0)');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
    }

    // 5. Feathered Edge Mask (Guarantees zero sharp borders, box lines, or clipping seams)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    const maskGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    maskGrad.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
    maskGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.95)');
    maskGrad.addColorStop(0.80, 'rgba(0, 0, 0, 0.55)');
    maskGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)'); // Bottom fades smoothly to zero
    ctx.fillStyle = maskGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Left and right edge soft vignetting
    const horizMask = ctx.createLinearGradient(0, 0, 2048, 0);
    horizMask.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    horizMask.addColorStop(0.08, 'rgba(0, 0, 0, 1.0)');
    horizMask.addColorStop(0.92, 'rgba(0, 0, 0, 1.0)');
    horizMask.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = horizMask;
    ctx.fillRect(0, 0, 2048, 1024);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Procedural Blinding Forked Lightning Texture (512x1024)
export function renderProceduralForkedLightning(canvas, startX = 256, endX = 256) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 1024);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';

    const branchNodes = [];

    function drawBranch(x1, y1, x2, y2, depth, maxDepth) {
        const segs = 12 + Math.floor(Math.random() * 8);
        const dx = (x2 - x1) / segs;
        const dy = (y2 - y1) / segs;
        const points = [[x1, y1]];
        let curX = x1;
        let curY = y1;

        for (let i = 1; i <= segs; i++) {
            const jitter = (34.0 / (depth + 1.0)) * (1.0 - (i / segs) * 0.35);
            const nx = (i === segs) ? x2 : (x1 + dx * i + (Math.random() - 0.5) * jitter * 2.6);
            const ny = (i === segs) ? y2 : (y1 + dy * i + (Math.random() - 0.25) * 7.5);
            points.push([nx, ny]);

            // Branching acute forks
            if (depth < maxDepth && Math.random() < (0.42 - depth * 0.08) && i >= 2 && i <= segs - 2) {
                const angle = (Math.random() > 0.5 ? 1 : -1) * (0.32 + Math.random() * 0.48);
                const len = (1024 - ny) * (0.35 + Math.random() * 0.45);
                const bx = nx + Math.sin(angle) * len;
                const by = ny + Math.cos(angle) * len;
                branchNodes.push({ x: nx, y: ny, r: Math.max(3.0, 10.0 - depth * 2.5) });
                drawBranch(nx, ny, bx, by, depth + 1, maxDepth);
            }
            curX = nx;
            curY = ny;
        }

        const baseW = Math.max(1.8, 7.5 - depth * 1.8);

        // Pass 1: Ultra-wide deep atmospheric blue/violet ionized plasma halo
        ctx.strokeStyle = 'rgba(80, 140, 255, 0.45)';
        ctx.lineWidth = baseW * 8.5;
        ctx.beginPath();
        points.forEach((p, idx) => { if (idx === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
        ctx.stroke();

        // Pass 2: Vivid neon electric cyan discharge sheath
        ctx.strokeStyle = 'rgba(120, 225, 255, 0.85)';
        ctx.lineWidth = baseW * 4.2;
        ctx.beginPath();
        points.forEach((p, idx) => { if (idx === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
        ctx.stroke();

        // Pass 3: Brilliant electric ice-blue core
        ctx.strokeStyle = 'rgba(215, 250, 255, 0.96)';
        ctx.lineWidth = baseW * 2.0;
        ctx.beginPath();
        points.forEach((p, idx) => { if (idx === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
        ctx.stroke();

        // Pass 4: Incandescent pure white-hot lightning filament
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = baseW * 1.1;
        ctx.beginPath();
        points.forEach((p, idx) => { if (idx === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
        ctx.stroke();
    }

    // Main primary lightning trunk
    drawBranch(startX, 10, endX + (Math.random() - 0.5) * 90, 990, 0, 3);

    // Secondary parallel discharge branch (adds authentic multi-bolt complexity)
    if (Math.random() > 0.3) {
        const sideStartX = startX + (Math.random() > 0.5 ? 1 : -1) * (45 + Math.random() * 60);
        drawBranch(sideStartX, 10, endX + (Math.random() - 0.5) * 140, 780 + Math.random() * 180, 1, 3);
    }

    // Pass 5: Blinding electrical burst nodes at branch junction points
    branchNodes.forEach(node => {
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.r * 2.2);
        glow.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
        glow.addColorStop(0.35, 'rgba(160, 240, 255, 0.85)');
        glow.addColorStop(0.75, 'rgba(80, 160, 255, 0.40)');
        glow.addColorStop(1.0, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * 2.2, 0, Math.PI * 2);
        ctx.fill();
    });
}

// 3. Victorian Gothic Haunted Mansion Silhouette with Candlelit Windows (1024x1024)
export function createHauntedManorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 1024, 1024);

    const manorDark = '#090e18';
    const manorMid = '#141d2c';
    const roofDark = '#060910';
    const stoneHighlight = '#223045';

    // Ground floor & 2nd floor main walls
    ctx.fillStyle = manorMid;
    ctx.fillRect(140, 460, 740, 350);

    // Weathered stone block banding & foundation trim
    ctx.fillStyle = stoneHighlight;
    ctx.fillRect(120, 808, 780, 10); // Main terrace corniced stringcourse
    ctx.fillRect(140, 630, 740, 6);  // Second-floor decorative stone stringcourse
    ctx.fillRect(140, 460, 740, 8);  // Roofline architrave frieze

    // Grand Raised Stone Foundation Terrace & Balustrade
    ctx.fillStyle = manorDark;
    ctx.fillRect(120, 816, 780, 208); // Tall rusticated ashlar plinth

    // Classical Gothic Balustrade along Terrace (above ground level)
    ctx.fillStyle = stoneHighlight;
    ctx.fillRect(120, 794, 780, 8); // Balustrade top rail
    for (let bx = 135; bx < 880; bx += 22) {
        if (bx < 290 || bx > 530) { // Leave gap for grand entrance staircase
            ctx.fillStyle = '#0e1622';
            ctx.fillRect(bx, 802, 10, 14); // Carved baluster uprights
        }
    }

    // Grand Cascading Double Stone Staircase leading down to estate grounds
    for (let st = 0; st < 9; st++) {
        const stepY = 816 + st * 18;
        const stepW = 240 + st * 28;
        const stepX = 410 - stepW / 2;
        ctx.fillStyle = st % 2 === 0 ? '#101a28' : '#182436';
        ctx.fillRect(stepX, stepY, stepW, 16);
        ctx.fillStyle = stoneHighlight;
        ctx.fillRect(stepX, stepY, stepW, 4); // Step nosing highlight
    }
    // Flanking Carved Stone Newel Piers & Ball Finials at Stair Foot
    ctx.fillStyle = manorDark;
    ctx.fillRect(235, 920, 36, 104);
    ctx.fillRect(550, 920, 36, 104);
    ctx.fillStyle = stoneHighlight;
    ctx.fillRect(231, 914, 44, 8);
    ctx.fillRect(546, 914, 44, 8);
    ctx.beginPath();
    ctx.arc(253, 902, 12, 0, Math.PI * 2);
    ctx.arc(568, 902, 12, 0, Math.PI * 2);
    ctx.fill();

    // Arched Basement Cellar Windows with Heavy Iron Grates along Plinth
    function drawCellarGrate(cx, cy) {
        ctx.fillStyle = '#030508';
        ctx.beginPath();
        ctx.arc(cx, cy, 26, Math.PI, 0);
        ctx.fillRect(cx - 26, cy, 52, 28);
        ctx.fill();
        ctx.strokeStyle = '#1a2434';
        ctx.lineWidth = 3;
        for (let gx = cx - 18; gx <= cx + 18; gx += 9) {
            ctx.beginPath(); ctx.moveTo(gx, cy - 18); ctx.lineTo(gx, cy + 28); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(cx - 26, cy + 6); ctx.lineTo(cx + 26, cy + 6); ctx.stroke();
    }
    drawCellarGrate(190, 890);
    drawCellarGrate(730, 890);
    drawCellarGrate(820, 890);

    // =========================================================================
    // Authentic Victorian Gothic Chimney Stacks (Drawn BEHIND roofs for clean architectural alignment)
    // =========================================================================
    function drawGothicChimneyStack(x, topY, bottomY, width, potsCount = 2) {
        const halfW = width / 2;
        // Brick stack body: moonlit face on left, shadowed face on right
        ctx.fillStyle = '#1c283a';
        ctx.fillRect(x, topY + 18, halfW, bottomY - (topY + 18));
        ctx.fillStyle = '#0a101a';
        ctx.fillRect(x + halfW, topY + 18, halfW, bottomY - (topY + 18));

        // Decorative stone string course & corbel band
        ctx.fillStyle = stoneHighlight;
        ctx.fillRect(x - 2, topY + 38, width + 4, 4);
        ctx.fillRect(x - 3, topY + 18, width + 6, 6); // Stone neck moulding

        // Overhanging carved stone cornice cap
        ctx.fillStyle = stoneHighlight;
        ctx.fillRect(x - 5, topY + 7, width + 10, 8);
        ctx.fillStyle = '#223246';
        ctx.fillRect(x - 3, topY, width + 6, 7);

        // Flared Victorian terracotta chimney pots
        const potSpacing = width / (potsCount + 1);
        for (let p = 1; p <= potsCount; p++) {
            const potX = x + potSpacing * p - 7;
            const potY = topY - 24;
            // Pot body with highlight
            ctx.fillStyle = '#221510';
            ctx.fillRect(potX, potY + 4, 14, 20);
            ctx.fillStyle = '#3a241b';
            ctx.fillRect(potX, potY + 4, 6, 20);
            // Flared terracotta rim
            ctx.fillStyle = '#150c08';
            ctx.fillRect(potX - 2, potY, 18, 5);
            // Soot cavity
            ctx.fillStyle = '#020305';
            ctx.beginPath();
            ctx.ellipse(potX + 7, potY + 1, 5, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 1. Left Wing Primary Chimney Stack (Tall exterior gable stack, x = 175)
    drawGothicChimneyStack(175, 160, 460, 48, 2);

    // 2. Right Wing Primary Chimney Stack (Symmetrically balanced with left wing, x = 815)
    drawGothicChimneyStack(815, 160, 460, 48, 2);

    // 3. Central Hall & Tower Flanking Chimney Stacks (Rising gracefully behind main roof ridges)
    drawGothicChimneyStack(385, 185, 460, 38, 2);
    drawGothicChimneyStack(655, 185, 460, 38, 2);

    // Left Wing: Balanced Victorian Gothic Gable Roof (Sitting squarely atop roofline cornice at y = 460)
    // Left slope (Moonlit faceted slate)
    ctx.fillStyle = '#141f30';
    ctx.beginPath();
    ctx.moveTo(126, 460);
    ctx.lineTo(286, 290); // Gable peak
    ctx.lineTo(286, 460);
    ctx.closePath();
    ctx.fill();

    // Right slope (Shadowed faceted slate)
    ctx.fillStyle = roofDark;
    ctx.beginPath();
    ctx.moveTo(286, 290);
    ctx.lineTo(446, 460);
    ctx.lineTo(286, 460);
    ctx.closePath();
    ctx.fill();

    // Stone verge coping & eave moulding
    ctx.strokeStyle = stoneHighlight;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(124, 462); ctx.lineTo(286, 290); ctx.lineTo(448, 462);
    ctx.stroke();
    ctx.fillStyle = stoneHighlight;
    ctx.fillRect(124, 458, 324, 6); // Carved cornice eave

    // Left Wing Gothic Dormer Gable Window
    ctx.fillStyle = manorDark;
    ctx.beginPath();
    ctx.moveTo(250, 440); ctx.lineTo(286, 385); ctx.lineTo(322, 440);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = stoneHighlight;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Dormer arched window opening
    ctx.fillStyle = '#050810';
    ctx.beginPath();
    ctx.arc(286, 412, 12, Math.PI, 0);
    ctx.fillRect(274, 412, 24, 22);
    ctx.fill();
    // Peak iron finial
    ctx.strokeStyle = '#05070c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(286, 290); ctx.lineTo(286, 262);
    ctx.moveTo(280, 272); ctx.lineTo(292, 272);
    ctx.stroke();

    // Central Victorian 3-Story Mansard Tower
    // Tower walls
    ctx.fillStyle = manorDark;
    ctx.fillRect(440, 290, 170, 200);

    // Tower cornices
    ctx.fillStyle = stoneHighlight;
    ctx.fillRect(430, 285, 190, 8);

    // Tower Mansard Roof
    ctx.fillStyle = roofDark;
    ctx.beginPath();
    ctx.moveTo(430, 285);
    ctx.lineTo(460, 200);
    ctx.lineTo(590, 200);
    ctx.lineTo(620, 285);
    ctx.closePath();
    ctx.fill();

    // Tower Steep Spire & Widow's Walk Peak
    ctx.beginPath();
    ctx.moveTo(480, 200);
    ctx.lineTo(525, 70); // High tower apex!
    ctx.lineTo(570, 200);
    ctx.closePath();
    ctx.fill();

    // Spire Finial / Weather Vane Rod
    ctx.strokeStyle = '#05070c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(525, 70); ctx.lineTo(525, 30);
    ctx.moveTo(515, 45); ctx.lineTo(535, 45);
    ctx.stroke();

    // Widow's walk rooftop cresting / iron railings
    ctx.lineWidth = 2;
    for (let rx = 465; rx <= 585; rx += 12) {
        ctx.beginPath();
        ctx.moveTo(rx, 200); ctx.lineTo(rx, 188);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(465, 188); ctx.lineTo(585, 188);
    ctx.stroke();

    // Right Wing Roof (Symmetrical, balanced Gothic Gable sitting squarely atop roofline cornice at y = 460)
    // Left slope (Moonlit faceted slate)
    ctx.fillStyle = '#141f30';
    ctx.beginPath();
    ctx.moveTo(604, 460);
    ctx.lineTo(745, 290); // Matching gable peak
    ctx.lineTo(745, 460);
    ctx.closePath();
    ctx.fill();

    // Right slope (Shadowed faceted slate)
    ctx.fillStyle = roofDark;
    ctx.beginPath();
    ctx.moveTo(745, 290);
    ctx.lineTo(886, 460);
    ctx.lineTo(745, 460);
    ctx.closePath();
    ctx.fill();

    // Stone verge coping & eave moulding
    ctx.strokeStyle = stoneHighlight;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(602, 462); ctx.lineTo(745, 290); ctx.lineTo(888, 462);
    ctx.stroke();
    ctx.fillStyle = stoneHighlight;
    ctx.fillRect(602, 458, 286, 6); // Carved cornice eave

    // Right Wing Gothic Dormer Gable Window
    ctx.fillStyle = manorDark;
    ctx.beginPath();
    ctx.moveTo(709, 440); ctx.lineTo(745, 385); ctx.lineTo(781, 440);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = stoneHighlight;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Dormer arched window opening
    ctx.fillStyle = '#050810';
    ctx.beginPath();
    ctx.arc(745, 412, 12, Math.PI, 0);
    ctx.fillRect(733, 412, 24, 22);
    ctx.fill();
    // Peak iron finial
    ctx.strokeStyle = '#05070c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(745, 290); ctx.lineTo(745, 262);
    ctx.moveTo(739, 272); ctx.lineTo(751, 272);
    ctx.stroke();

    // Grand Entrance Portico / Porch with Flanking Stone Columns & Carriage Lantern
    ctx.fillStyle = manorDark;
    ctx.fillRect(300, 600, 220, 200);

    // Grand Entrance Portal Recess (Completely unobstructed so 3D opening doors & green staircase hallway are visible)
    ctx.clearRect(355, 646, 110, 154);
    ctx.strokeStyle = '#020306';
    ctx.lineWidth = 6;
    ctx.strokeRect(353, 644, 114, 158);
    ctx.strokeStyle = stoneHighlight;
    ctx.lineWidth = 3;
    ctx.strokeRect(351, 642, 118, 162);

    // Carved Stone Architrave Header & Stepped Threshold below door
    ctx.fillStyle = stoneHighlight;
    ctx.fillRect(345, 638, 130, 8); // Header lintel
    ctx.fillRect(340, 796, 140, 10); // Entrance threshold sill
    ctx.fillStyle = '#060910';
    ctx.fillRect(348, 802, 124, 4);

    // Iron Portico Lantern Hanging Bracket Hook (Dead center above doorway at x = 410)
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(410, 595); ctx.lineTo(410, 612);
    ctx.stroke();

    // Portico Pediment with sculpted gothic relief
    ctx.fillStyle = manorMid;
    ctx.beginPath();
    ctx.moveTo(290, 600);
    ctx.lineTo(410, 526);
    ctx.lineTo(530, 600);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = stoneHighlight;
    ctx.fillRect(290, 596, 240, 8);

    // Fluted Classical Porch Columns (Flanking outer edges of porch ONLY - doorway completely clear!)
    function drawPorchColumn(cx, w) {
        // Capital
        ctx.fillStyle = stoneHighlight;
        ctx.fillRect(cx - 3, 600, w + 6, 8);
        ctx.fillRect(cx - 1, 608, w + 2, 4);
        // Column shaft
        ctx.fillStyle = '#1e2b3e';
        ctx.fillRect(cx, 612, w, 180);
        // Fluting lines
        ctx.strokeStyle = '#0e1622';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 4, 612); ctx.lineTo(cx + 4, 792);
        ctx.moveTo(cx + w / 2, 612); ctx.lineTo(cx + w / 2, 792);
        ctx.moveTo(cx + w - 4, 612); ctx.lineTo(cx + w - 4, 792);
        ctx.stroke();
        // Highlight edge
        ctx.strokeStyle = stoneHighlight;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + 1, 612); ctx.lineTo(cx + 1, 792);
        ctx.stroke();
        // Plinth base
        ctx.fillStyle = stoneHighlight;
        ctx.fillRect(cx - 2, 792, w + 4, 5);
        ctx.fillRect(cx - 4, 797, w + 8, 8);
    }

    drawPorchColumn(312, 22); // Outer Left Column (safely outside x = 355 doorway!)
    drawPorchColumn(486, 22); // Outer Right Column (safely outside x = 465 doorway!)

    // =========================================================================
    // Base Manor Window Openings (Dark Recesses with Stone Frames & Tracery)
    // =========================================================================
    function drawArchedWindow(x, y, w, h) {
        ctx.save();
        // Stone frame shadow
        ctx.fillStyle = '#05070c';
        ctx.beginPath();
        ctx.moveTo(x - 4, y + h + 4);
        ctx.lineTo(x - 4, y + w / 2);
        ctx.arc(x + w / 2, y + w / 2, w / 2 + 4, Math.PI, 0);
        ctx.lineTo(x + w + 4, y + h + 4);
        ctx.closePath();
        ctx.fill();

        // Dark interior recess
        ctx.fillStyle = '#030509';
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x, y + w / 2);
        ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();

        // Dark gothic window mullions / crossbars
        ctx.strokeStyle = '#080c14';
        ctx.lineWidth = 3;
        // Vertical mullion
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
        ctx.stroke();
        // Horizontal transoms
        ctx.beginPath();
        ctx.moveTo(x, y + h * 0.45); ctx.lineTo(x + w, y + h * 0.45);
        ctx.moveTo(x, y + h * 0.75); ctx.lineTo(x + w, y + h * 0.75);
        ctx.stroke();

        ctx.restore();
    }

    // Ground Floor Windows
    drawArchedWindow(200, 650, 48, 85);
    drawArchedWindow(260, 650, 48, 85);
    drawArchedWindow(530, 650, 48, 85);
    drawArchedWindow(620, 650, 48, 85);
    drawArchedWindow(700, 650, 48, 85);
    drawArchedWindow(780, 650, 48, 85);

    // Second Floor Windows
    drawArchedWindow(200, 510, 44, 75);
    drawArchedWindow(260, 510, 44, 75);
    drawArchedWindow(340, 510, 44, 75);
    drawArchedWindow(630, 510, 44, 75);
    drawArchedWindow(710, 510, 44, 75);
    drawArchedWindow(790, 510, 44, 75);

    // Tower Windows (High Dormers & Attic Window)
    drawArchedWindow(490, 390, 36, 65);
    drawArchedWindow(535, 390, 36, 65);
    drawArchedWindow(510, 230, 32, 55);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// 3b. Victorian Gothic Carved Wooden Door Wing Texture (256x512)
export function createHauntedFrontDoorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Weathered black oak wood planks
    ctx.fillStyle = '#0c0806';
    ctx.fillRect(0, 0, 256, 512);

    // Vertical plank grooves
    const plankW = 256 / 4;
    for (let p = 0; p < 4; p++) {
        const px = p * plankW;
        const plankGrad = ctx.createLinearGradient(px, 0, px + plankW, 0);
        plankGrad.addColorStop(0.0, '#1a110a');
        plankGrad.addColorStop(0.3, '#26180e');
        plankGrad.addColorStop(0.8, '#1e130c');
        plankGrad.addColorStop(1.0, '#0a0604');
        ctx.fillStyle = plankGrad;
        ctx.fillRect(px + 1, 0, plankW - 2, 512);

        // Wood grain streaks
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineWidth = 1.5;
        for (let g = 0; g < 14; g++) {
            const gx = px + 4 + Math.random() * (plankW - 8);
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx + (Math.random() - 0.5) * 4, 512);
            ctx.stroke();
        }
    }

    // Heavy carved gothic panels
    ctx.fillStyle = '#080503';
    ctx.strokeStyle = '#322014';
    ctx.lineWidth = 5;
    // Top panel
    ctx.fillRect(16, 24, 224, 210);
    ctx.strokeRect(16, 24, 224, 210);
    // Bottom panel
    ctx.fillRect(16, 260, 224, 228);
    ctx.strokeRect(16, 260, 224, 228);

    // Inner relief mouldings
    ctx.strokeStyle = '#120a06';
    ctx.lineWidth = 3;
    ctx.strokeRect(26, 34, 204, 190);
    ctx.strokeRect(26, 270, 204, 208);

    // Wrought-iron strap hinges
    ctx.fillStyle = '#0a0d14';
    ctx.strokeStyle = '#1e2638';
    ctx.lineWidth = 2;
    [60, 240, 440].forEach(hy => {
        ctx.fillRect(0, hy, 180, 20);
        ctx.strokeRect(0, hy, 180, 20);
        // Spearhead finial
        ctx.beginPath();
        ctx.moveTo(180, hy - 4);
        ctx.lineTo(210, hy + 10);
        ctx.lineTo(180, hy + 24);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // Heavy iron rivets
        [30, 80, 130, 175].forEach(rx => {
            ctx.fillStyle = '#2a354a';
            ctx.beginPath();
            ctx.arc(rx, hy + 10, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    });

    // Wrought-iron ring door knocker (on top panel)
    ctx.strokeStyle = '#3a4b66';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(128, 140, 32, 0, Math.PI * 2);
    ctx.stroke();
    // Knocker boss
    ctx.fillStyle = '#1c2432';
    ctx.beginPath();
    ctx.arc(128, 108, 14, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

// 3c. Grand Victorian Gothic Staircase Hallway with Spooky Green Lighting (512x512)
export function createHauntedStaircaseTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep shadowy hallway recess
    ctx.fillStyle = '#020603';
    ctx.fillRect(0, 0, 512, 512);

    // Spooky emerald / toxic green ambient glow pouring from upstairs
    const greenGlow = ctx.createRadialGradient(256, 180, 20, 256, 256, 320);
    greenGlow.addColorStop(0.0, 'rgba(57, 255, 20, 0.95)');
    greenGlow.addColorStop(0.25, 'rgba(0, 230, 100, 0.70)');
    greenGlow.addColorStop(0.60, 'rgba(0, 120, 50, 0.35)');
    greenGlow.addColorStop(1.0, 'rgba(2, 20, 8, 0.0)');
    ctx.fillStyle = greenGlow;
    ctx.fillRect(0, 0, 512, 512);

    // Vaulted gothic arched hallway ceiling beams in perspective
    ctx.strokeStyle = '#051108';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(160, 120);
    ctx.moveTo(512, 0); ctx.lineTo(352, 120);
    ctx.moveTo(160, 120); ctx.lineTo(352, 120);
    ctx.stroke();

    // Dark wood paneling with antique sinister portraits on side walls
    ctx.fillStyle = '#08140a';
    ctx.fillRect(0, 80, 120, 360);
    ctx.fillRect(392, 80, 120, 360);
    // Portrait frame on left
    ctx.strokeStyle = '#1e3816';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 140, 70, 110);
    ctx.fillStyle = '#020603';
    ctx.fillRect(22, 142, 66, 106);
    // Eerie glowing eyes in portrait
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(48, 175, 4, 3);
    ctx.fillRect(60, 175, 4, 3);

    // Portrait frame on right
    ctx.strokeRect(422, 140, 70, 110);
    ctx.fillStyle = '#020603';
    ctx.fillRect(424, 142, 66, 106);
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(450, 175, 4, 3);
    ctx.fillRect(462, 175, 4, 3);

    // Grand sweeping gothic staircase (Rising up from center foreground into green upper landing)
    const numSteps = 16;
    for (let s = numSteps; s >= 0; s--) {
        const prog = s / numSteps;
        const stepY = 220 + prog * 260; // 220 at top landing, 480 at bottom
        const stepW = 120 + (1.0 - prog) * 220; // 120 wide at top, 340 wide at bottom
        const stepX = 256 - stepW / 2;
        const stepH = 16 + (1.0 - prog) * 8;

        // Dark carved oak / stone tread
        ctx.fillStyle = s % 2 === 0 ? '#0a1a0e' : '#0e2414';
        ctx.fillRect(stepX, stepY, stepW, stepH);

        // Toxic green moonlight edge highlight on each tread nose
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(stepX, stepY); ctx.lineTo(stepX + stepW, stepY);
        ctx.stroke();

        // Blood-red / velvet runner carpet cascading down the center
        const carpetW = stepW * 0.44;
        const carpetX = 256 - carpetW / 2;
        ctx.fillStyle = '#2a0408';
        ctx.fillRect(carpetX, stepY, carpetW, stepH);
        // Gold / green embroidered edge trim on carpet
        ctx.strokeStyle = 'rgba(57, 255, 80, 0.55)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(carpetX, stepY); ctx.lineTo(carpetX, stepY + stepH);
        ctx.moveTo(carpetX + carpetW, stepY); ctx.lineTo(carpetX + carpetW, stepY + stepH);
        ctx.stroke();
    }

    // Carved gothic staircase balustrades & ornate banister posts
    ctx.strokeStyle = '#051208';
    ctx.lineWidth = 6;
    // Left banister rail
    ctx.beginPath();
    ctx.moveTo(256 - 60, 200); ctx.lineTo(256 - 175, 470);
    ctx.stroke();
    // Right banister rail
    ctx.beginPath();
    ctx.moveTo(256 + 60, 200); ctx.lineTo(256 + 175, 470);
    ctx.stroke();

    // Heavy carved newel posts at bottom of staircase
    ctx.fillStyle = '#061609';
    ctx.fillRect(256 - 188, 440, 22, 65);
    ctx.fillRect(256 + 166, 440, 22, 65);
    // Green glowing finial orbs atop newel posts
    const orbGrad = ctx.createRadialGradient(256 - 177, 435, 2, 256 - 177, 435, 14);
    orbGrad.addColorStop(0.0, '#ffffff');
    orbGrad.addColorStop(0.4, '#39ff14');
    orbGrad.addColorStop(1.0, 'transparent');
    ctx.fillStyle = orbGrad;
    ctx.beginPath(); ctx.arc(256 - 177, 435, 14, 0, Math.PI * 2); ctx.fill();
    const orbGradR = ctx.createRadialGradient(256 + 177, 435, 2, 256 + 177, 435, 14);
    orbGradR.addColorStop(0.0, '#ffffff');
    orbGradR.addColorStop(0.4, '#39ff14');
    orbGradR.addColorStop(1.0, 'transparent');
    ctx.fillStyle = orbGradR;
    ctx.beginPath(); ctx.arc(256 + 177, 435, 14, 0, Math.PI * 2); ctx.fill();

    // Swirling ground green mist at base of staircase
    const mistGrad = ctx.createLinearGradient(0, 420, 0, 512);
    mistGrad.addColorStop(0.0, 'rgba(57, 255, 20, 0.0)');
    mistGrad.addColorStop(0.5, 'rgba(57, 255, 20, 0.35)');
    mistGrad.addColorStop(1.0, 'rgba(20, 180, 50, 0.65)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, 420, 512, 92);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

// 3d. Terrifying Scream Ghoul / Ghostface Jumpscare Apparition (1024x1024)
export function createScreamGhoulTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 1024);

    const cx = 512, cy = 460;

    // 1. Ghostly Eerie Green-White Backlight / Volumetric Horror Aura
    const aura = ctx.createRadialGradient(cx, cy, 60, cx, cy, 480);
    aura.addColorStop(0.0, 'rgba(57, 255, 120, 0.65)');
    aura.addColorStop(0.35, 'rgba(0, 200, 100, 0.35)');
    aura.addColorStop(0.70, 'rgba(0, 60, 40, 0.15)');
    aura.addColorStop(1.0, 'transparent');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, 480, 0, Math.PI * 2);
    ctx.fill();

    // 2. Flowing Ragged Jet-Black Cowl & Robe (Scream Hood)
    ctx.fillStyle = '#06080d';
    ctx.beginPath();
    // Peak of the pointed cowl
    ctx.moveTo(cx, cy - 390);
    // Left cowl drape
    ctx.bezierCurveTo(cx - 240, cy - 350, cx - 360, cy - 120, cx - 380, cy + 180);
    ctx.bezierCurveTo(cx - 400, cy + 360, cx - 300, cy + 500, cx - 220, cy + 520);
    // Shredded bottom hem
    ctx.bezierCurveTo(cx - 100, cy + 440, cx, cy + 500, cx + 100, cy + 440);
    // Right cowl drape
    ctx.bezierCurveTo(cx + 220, cy + 520, cx + 300, cy + 500, cx + 380, cy + 180);
    ctx.bezierCurveTo(cx + 360, cy - 120, cx + 240, cy - 350, cx, cy - 390);
    ctx.closePath();
    ctx.fill();

    // Cowl fabric fold shadows and moonlit green rim highlights
    ctx.strokeStyle = '#18242c';
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(120, 255, 180, 0.35)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Deep Inner Hood Shadow (Pure pitch black wrapping tightly around the mask)
    ctx.fillStyle = '#020306';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 50, 210, 280, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. The Iconic Elongated Scream Ghostface Mask
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 280); // Forehead top
    ctx.bezierCurveTo(cx + 175, cy - 270, cx + 185, cy - 80, cx + 145, cy + 60); // Right cheekbone
    ctx.bezierCurveTo(cx + 115, cy + 180, cx + 70, cy + 240, cx, cy + 260); // Right jaw to pointed chin
    ctx.bezierCurveTo(cx - 70, cy + 240, cx - 115, cy + 180, cx - 145, cy + 60); // Chin to left jaw
    ctx.bezierCurveTo(cx - 185, cy - 80, cx - 175, cy - 270, cx, cy - 280); // Left cheekbone to forehead
    ctx.closePath();

    // Mask porcelain white gradient with subtle cold eerie green moonlit shading
    const maskGrad = ctx.createRadialGradient(cx - 40, cy - 100, 30, cx, cy, 260);
    maskGrad.addColorStop(0.0, '#ffffff');
    maskGrad.addColorStop(0.60, '#f0f5f5');
    maskGrad.addColorStop(0.88, '#d2e2dc');
    maskGrad.addColorStop(1.0, '#98aba4');
    ctx.fillStyle = maskGrad;
    ctx.fill();

    // Ambient occlusion shadow along outer mask edge
    ctx.strokeStyle = '#2b3835';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();

    // 4. Iconic Weeping Brow Line & Eye Hollow Creases
    ctx.strokeStyle = '#758882';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 115, cy - 165);
    ctx.quadraticCurveTo(cx - 50, cy - 195, cx, cy - 175);
    ctx.quadraticCurveTo(cx + 50, cy - 195, cx + 115, cy - 165);
    ctx.stroke();

    // 5. Sunken Abyssal Black Screaming Eye Sockets (Iconic drooping teardrop ovals)
    function drawScreamEye(ex, ey, isLeft) {
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(isLeft ? -0.22 : 0.22);

        // Outer socket shadow bevel
        ctx.fillStyle = '#3a4a45';
        ctx.beginPath();
        ctx.ellipse(0, 0, 48, 68, 0, 0, Math.PI * 2);
        ctx.fill();

        // Deep abyss interior
        ctx.fillStyle = '#010204';
        ctx.beginPath();
        ctx.ellipse(0, 0, 42, 60, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle eerie spectral green specular glint in the abyss
        ctx.fillStyle = 'rgba(57, 255, 120, 0.45)';
        ctx.beginPath();
        ctx.ellipse(isLeft ? 8 : -8, -12, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    drawScreamEye(cx - 65, cy - 105, true);
    drawScreamEye(cx + 65, cy - 105, false);

    // 6. Iconic Nostril Slits
    ctx.fillStyle = '#010204';
    ctx.beginPath();
    ctx.ellipse(cx - 15, cy + 5, 6, 16, -0.15, 0, Math.PI * 2);
    ctx.ellipse(cx + 15, cy + 5, 6, 16, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 7. The Iconic Gaping Screaming Void Mouth ("The Scream")
    ctx.save();
    // Bevel rim of lips
    ctx.fillStyle = '#a2b5af';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 125, 54, 98, 0, 0, Math.PI * 2);
    ctx.fill();

    // Interior black void
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 125, 46, 88, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle green-tinted throat depth gradient inside the scream
    const throatGrad = ctx.createRadialGradient(cx, cy + 125, 5, cx, cy + 125, 75);
    throatGrad.addColorStop(0.0, 'rgba(57, 255, 120, 0.35)');
    throatGrad.addColorStop(0.55, 'rgba(0, 100, 60, 0.15)');
    throatGrad.addColorStop(1.0, 'transparent');
    ctx.fillStyle = throatGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 125, 46, 88, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 8. Ghostface Lunging Hand Brandishing Gleaming Buck 120 Knife!
    ctx.save();
    const hx = cx + 240, hy = cy + 220;
    ctx.translate(hx, hy);
    ctx.rotate(-0.35);

    // Gleaming Steel Blade of the Buck 120 Hunting Knife
    ctx.fillStyle = '#d0dbe2';
    ctx.beginPath();
    ctx.moveTo(-15, -40);
    ctx.lineTo(-20, -260);
    ctx.bezierCurveTo(-15, -290, 5, -315, 10, -325); // Needle-sharp knife tip
    ctx.lineTo(22, -260);
    ctx.lineTo(16, -40);
    ctx.closePath();
    ctx.fill();

    // Mirror steel blade bevel line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -40); ctx.lineTo(10, -325);
    ctx.stroke();

    // Blood groove (Fuller)
    ctx.strokeStyle = '#506068';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(3, -60); ctx.lineTo(6, -240);
    ctx.stroke();

    // Moonlit green blade reflection glint
    ctx.fillStyle = 'rgba(57, 255, 140, 0.65)';
    ctx.beginPath();
    ctx.moveTo(10, -325); ctx.lineTo(-10, -270); ctx.lineTo(15, -270);
    ctx.closePath();
    ctx.fill();

    // Brass hilt / guard
    ctx.fillStyle = '#8c7638';
    ctx.fillRect(-35, -42, 65, 14);

    // Black leather gloved hand clutching the hilt
    ctx.fillStyle = '#0a0d14';
    ctx.strokeStyle = '#22303c';
    ctx.lineWidth = 3;
    for (let f = 0; f < 4; f++) {
        ctx.beginPath();
        ctx.ellipse(-8, -25 + f * 24, 22, 14, 0.1, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
    }
    ctx.restore();

    // 9. Left Black-Gloved Hand Clawing Outward (Reaching at viewer)
    ctx.save();
    const lx = cx - 240, ly = cy + 240;
    ctx.translate(lx, ly);
    ctx.fillStyle = '#0a0d14';
    ctx.strokeStyle = '#22303c';
    ctx.lineWidth = 3;
    const clawAngles = [-0.9, -0.4, 0.1, 0.6];
    clawAngles.forEach((ang) => {
        ctx.beginPath();
        ctx.ellipse(Math.cos(ang) * 45, Math.sin(ang) * 45, 18, 12, ang, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(Math.cos(ang) * 78, Math.sin(ang) * 78, 14, 9, ang, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
    });
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}
export const createHauntedJumpSpookTexture = createScreamGhoulTexture;


// Helper: Draw Hyper-Detailed Zombie Claw Hand (Twisted Wrists, Prominent Knuckles & Long Grasping Talons)
export function drawZombieHand(ctx, wristX, wristY, armAngle, beatImpulse) {
    ctx.save();
    ctx.translate(wristX, wristY);
    ctx.rotate(armAngle);

    ctx.fillStyle = '#010204';
    ctx.strokeStyle = '#010204';

    // Protruding knobby carpal / wrist bone
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.8, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Palm / metacarpal base
    ctx.beginPath();
    ctx.moveTo(-2.2, 0);
    ctx.lineTo(2.2, 0);
    ctx.lineTo(2.8, 4.0);
    ctx.lineTo(-2.8, 4.0);
    ctx.closePath();
    ctx.fill();

    // 4 Crooked, Skeletal Fingers with Articulated Knuckles & Sharp Claw Talons
    ctx.lineWidth = 1.6;
    const twitch = Math.sin(beatImpulse * 7.0) * 0.35;

    // Finger 1 (Thumb / Spur claw)
    ctx.beginPath();
    ctx.moveTo(-2.2, 2.0);
    ctx.lineTo(-5.2, 4.0 + twitch);
    ctx.lineTo(-7.2, 2.5 + twitch * 1.5);
    ctx.stroke();

    // Finger 2 (Index Long Claw)
    ctx.beginPath();
    ctx.moveTo(-1.2, 4.0);
    ctx.lineTo(-2.2, 8.5 + twitch);
    ctx.lineTo(-1.2, 13.0 + twitch * 2.0);
    ctx.stroke();

    // Finger 3 (Middle Long Talon)
    ctx.beginPath();
    ctx.moveTo(0.8, 4.0);
    ctx.lineTo(1.8, 9.5 - twitch);
    ctx.lineTo(3.4, 14.5 - twitch * 2.0);
    ctx.stroke();

    // Finger 4 (Pinky Crooked Claw)
    ctx.beginPath();
    ctx.moveTo(2.6, 3.5);
    ctx.lineTo(5.2, 7.5 + twitch);
    ctx.lineTo(7.2, 11.0 + twitch * 1.5);
    ctx.stroke();

    ctx.restore();
}

// Helper: Draw Animated Dancing Zombie Silhouette inside Window (Animated to Music & Beat)
export function drawDancingZombie(ctx, cx, cy, type, danceTime, audio) {
    ctx.save();
    ctx.fillStyle = '#010204';
    ctx.strokeStyle = '#010204';

    const bassImpact = (audio && audio.bassImpact) ? audio.bassImpact : 0;
    const smoothedBass = (audio && audio.smoothedBass) ? audio.smoothedBass : 0;
    const beatImpulse = bassImpact * 1.6 + smoothedBass * 0.9;
    const isKick = (audio && (audio.isOnset || bassImpact > 0.3));

    // Dynamic music tempo bounce: sharp 4/4 rave bounce on each kick!
    const bounce = Math.abs(Math.sin(danceTime * 3.5)) * 3.2 + (beatImpulse * 4.0);
    const torsoY = cy - 20 + bounce * 0.6;

    if (type === 0) {
        // Zombie 1: The Blade Blood Rave Shambler (Aggressive rave bounce, pumping claw hands, neck snap)
        const sway = Math.sin(danceTime * 3.5) * 4.5;
        const torsoX = cx + sway * 0.6;

        // Solid overlapping pelvis & waist (ensures legs are permanently attached to torso)
        ctx.beginPath();
        ctx.ellipse(torsoX, torsoY + 9, 7.5, 5.0, 0, 0, Math.PI * 2);
        ctx.fill();

        // Uneven decaying legs stepping hard to the rave beat (firmly anchored inside pelvis)
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy); ctx.lineTo(torsoX - 4, torsoY + 8);
        ctx.moveTo(cx + 6 + (isKick ? 2.5 : 0), cy); ctx.lineTo(torsoX + 4, torsoY + 8);
        ctx.stroke();

        // Hunched decaying torso (curved spine pulsating with the kick)
        ctx.beginPath();
        ctx.ellipse(torsoX, torsoY, 7.5, 12, 0.15 + sway * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Decayed head snapping with the music kick
        const headBob = Math.sin(danceTime * 3.5) * 0.35 + (isKick ? 0.45 : 0);
        ctx.save();
        ctx.translate(torsoX - 2, torsoY - 17);
        ctx.rotate(headBob);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.8, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-2, 4, 4, 3);
        ctx.restore();

        // Pumping skeletal arms with detailed zombie claw hands
        ctx.lineWidth = 2.4;
        const armPump = Math.sin(danceTime * 3.5) * 7.0 + (beatImpulse * 5.0);

        // Left arm pumping
        ctx.beginPath();
        ctx.moveTo(torsoX - 5, torsoY - 6);
        ctx.lineTo(torsoX - 16, torsoY - 2 - armPump * 0.5);
        ctx.stroke();
        drawZombieHand(ctx, torsoX - 16, torsoY - 2 - armPump * 0.5, -0.4 - armPump * 0.06, beatImpulse);

        // Right arm pumping forward
        ctx.beginPath();
        ctx.moveTo(torsoX + 4, torsoY - 6);
        ctx.lineTo(torsoX + 15, torsoY - 4 + armPump * 0.5);
        ctx.stroke();
        drawZombieHand(ctx, torsoX + 15, torsoY - 4 + armPump * 0.5, 0.4 + armPump * 0.06, beatImpulse);
    } else if (type === 1) {
        // Zombie 2: The Blood Bath Rave Worshiper (Both arms raised high towards ceiling, pulsing with rave strobes)
        const sway = Math.sin(danceTime * 2.8) * 5.0;
        const torsoX = cx + sway * 0.5;

        // Solid overlapping pelvis & waist
        ctx.beginPath();
        ctx.ellipse(torsoX, torsoY + 9, 7.8, 5.0, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.moveTo(cx - 5 + sway * 0.3, cy); ctx.lineTo(torsoX - 4, torsoY + 8);
        ctx.moveTo(cx + 6 - sway * 0.3, cy); ctx.lineTo(torsoX + 4, torsoY + 8);
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(torsoX, torsoY, 7.8, 12.5, -sway * 0.04, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(torsoX + 1, torsoY - 17);
        ctx.rotate(-0.20 + Math.sin(danceTime * 2.8) * 0.2);
        ctx.beginPath();
        ctx.arc(0, 0, 6.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const waveL = Math.sin(danceTime * 3.5) * 6.0 + (beatImpulse * 4.0);
        const waveR = Math.cos(danceTime * 3.5) * 6.0 + (beatImpulse * 4.0);

        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(torsoX - 5, torsoY - 6);
        ctx.lineTo(torsoX - 14, torsoY - 18 + waveL * 0.3);
        ctx.stroke();
        drawZombieHand(ctx, torsoX - 14, torsoY - 18 + waveL * 0.3, -2.4 + waveL * 0.08, beatImpulse);

        ctx.beginPath();
        ctx.moveTo(torsoX + 5, torsoY - 6);
        ctx.lineTo(torsoX + 14, torsoY - 18 + waveR * 0.3);
        ctx.stroke();
        drawZombieHand(ctx, torsoX + 14, torsoY - 18 + waveR * 0.3, 2.4 - waveR * 0.08, beatImpulse);
    } else {
        // Zombie 3: The Hardcore Headbanger (Torso snapping forward, violent headbang to 4/4 kick drum)
        const bang = Math.sin(danceTime * 4.2) * 1.5 + (isKick ? 1.8 : 0);
        const torsoX = cx + Math.cos(danceTime * 2.0) * 2.0;

        // Solid overlapping pelvis & waist
        ctx.beginPath();
        ctx.ellipse(torsoX, torsoY + 9, 7.5, 5.0, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy); ctx.lineTo(torsoX - 3, torsoY + 8);
        ctx.moveTo(cx + 6, cy); ctx.lineTo(torsoX + 3, torsoY + 8);
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(torsoX, torsoY, 7.2, 12, bang * 0.22, 0, Math.PI * 2);
        ctx.fill();

        const skullY = torsoY - 16 + bang * 4.5;
        ctx.beginPath();
        ctx.arc(torsoX + bang * 2.2, skullY, 6.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 2.4;
        const armSwing = Math.sin(danceTime * 4.2) * 8.0 + (beatImpulse * 5.0);

        ctx.beginPath();
        ctx.moveTo(torsoX - 5, torsoY - 6);
        ctx.lineTo(torsoX - 12 - armSwing * 0.5, torsoY + 8 + bang * 3.0);
        ctx.stroke();
        drawZombieHand(ctx, torsoX - 12 - armSwing * 0.5, torsoY + 8 + bang * 3.0, 1.2 + bang * 0.2, beatImpulse);

        ctx.beginPath();
        ctx.moveTo(torsoX + 5, torsoY - 6);
        ctx.lineTo(torsoX + 12 + armSwing * 0.5, torsoY + 8 + bang * 3.0);
        ctx.stroke();
        drawZombieHand(ctx, torsoX + 12 + armSwing * 0.5, torsoY + 8 + bang * 3.0, -1.2 - bang * 0.2, beatImpulse);
    }

    ctx.restore();
}

// Render Dynamic Haunted Manor Windows (Blade Blood Rave, Scanning Lasers, Music-Animated Zombies, Independent Floor Flickers)
export function renderHauntedManorWindows(ctx, elapsedTime, audio, faultyState) {
    ctx.clearRect(0, 0, 1024, 1024);

    const bassImpact = (audio && audio.bassImpact) ? audio.bassImpact : 0;
    const isKick = (audio && (audio.isOnset || bassImpact > 0.35));
    const raveTime = elapsedTime * 2.2;

    // Helper: Draw Arched Window Aperture
    function fillArchedPath(x, y, w, h) {
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x, y + w / 2);
        ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
    }

    // Helper: Draw Gothic Mullions / Transoms
    function drawMullions(x, y, w, h) {
        ctx.strokeStyle = '#020306';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
        ctx.moveTo(x, y + h * 0.45); ctx.lineTo(x + w, y + h * 0.45);
        ctx.moveTo(x, y + h * 0.75); ctx.lineTo(x + w, y + h * 0.75);
        ctx.stroke();
    }

    // 1. LEFT UPSTAIRS WINDOWS: CONCERT RAVE ROOM (REACTS LIKE PUMPKIN DISCO 5 MINI LIGHTS)
    const discoWindows = [
        { x: 200, y: 510, w: 44, h: 75, zombie: 0, group: 'A' }, // Group A (Outer left)
        { x: 260, y: 510, w: 44, h: 75, zombie: 1, group: 'B' }, // Group B (Center)
        { x: 340, y: 510, w: 44, h: 75, zombie: 2, group: 'A' }  // Group A (Outer right)
    ];

    // Musical Beat Timing & Pulse Envelopes (Matching Pumpkin Disco 5 Mini Lights Engine)
    const bpm = (audio && audio.currentBPM) ? audio.currentBPM : 126.0;
    const beatDur = 60.0 / bpm;
    const totalBeat = elapsedTime / beatDur;
    const beatFraction = totalBeat % 1.0;
    const beatNumber = Math.floor(totalBeat) % 4; // 0, 1, 2, 3

    // Group A (Inner/Outer Pair): Crisp ~130ms Xenon Strobe Snap on Even Beats 0 & 2
    let strobeFactorA = 0.0;
    if (beatNumber === 0 || beatNumber === 2) {
        const timeInBeat = beatFraction * beatDur;
        if (timeInBeat < 0.14) {
            strobeFactorA = 1.0; // Crisp 100% ON
        } else if (timeInBeat < 0.18) {
            strobeFactorA = 1.0 - (timeInBeat - 0.14) / 0.04; // Fast shutter close
        }
    }

    // Group B (Center Fixture): Wide Atmospheric Color Swell with Long Fade-out on Odd Beats 1 & 3
    let washFactorB = 0.0;
    if (beatNumber === 1 || beatNumber === 3) {
        if (beatFraction < 0.35) {
            washFactorB = 0.5 - 0.5 * Math.cos((beatFraction / 0.35) * Math.PI); // Smooth swell in
        } else {
            washFactorB = 0.5 + 0.5 * Math.cos(((beatFraction - 0.35) / 0.65) * Math.PI); // Long fade tail
        }
    }

    // Heavy Bass Kick Thump & Audio Surge (Intensifies on deep drops & onsets)
    const kickPunch = isKick ? (0.75 + bassImpact * 0.45) : (bassImpact * 0.35);
    const trebleSparkle = (audio && audio.smoothedTreble) ? audio.smoothedTreble : 0.0;

    // Vibrant Stage Colors Palette (Electric Cyan, Acid Neon Green, Shocking Violet, Blood Ruby, Amber Gold)
    const raveHues = [
        { r: 255, g: 0, b: 60, name: 'Ruby Blood' },      // Beat 0
        { r: 0, g: 240, b: 255, name: 'Electric Cyan' },  // Beat 1
        { r: 160, g: 0, b: 255, name: 'Witch Violet' },   // Beat 2
        { r: 0, g: 255, b: 70, name: 'Acid Green' }       // Beat 3
    ];
    const currentHue = raveHues[beatNumber];
    const nextHue = raveHues[(beatNumber + 1) % 4];
    const blendHue = {
        r: Math.floor(currentHue.r * (1 - beatFraction) + nextHue.r * beatFraction),
        g: Math.floor(currentHue.g * (1 - beatFraction) + nextHue.g * beatFraction),
        b: Math.floor(currentHue.b * (1 - beatFraction) + nextHue.b * beatFraction)
    };

    // Tempo-Locked Slicing Moving-Head Concert Lasers
    const laserSpeed = (bpm / 126.0) * 3.4;
    const greenLaserAngle = Math.sin(elapsedTime * laserSpeed) * 0.52;
    const greenLaserY = 545 + Math.sin(elapsedTime * laserSpeed * 1.25) * 22;

    const redLaserAngle = -Math.cos(elapsedTime * laserSpeed * 0.9) * 0.46;
    const redLaserY = 552 + Math.cos(elapsedTime * laserSpeed * 1.15) * 18;

    const cyanLaserAngle = Math.sin(elapsedTime * laserSpeed * 1.4 + 1.2) * 0.40;
    const cyanLaserY = 540 + Math.cos(elapsedTime * laserSpeed * 0.8) * 16;

    discoWindows.forEach((dw, idx) => {
        const cx = dw.x + dw.w / 2;
        const cy = dw.y + dw.h;

        // 1. Dynamic Reactive Room Wash
        // Group A windows react to Strobe A; Group B reacts to Wash B; both boosted by kickPunch
        const isGroupA = dw.group === 'A';
        const activeFactor = isGroupA ? (strobeFactorA * 0.9 + kickPunch * 0.35) : (washFactorB * 0.9 + kickPunch * 0.45);
        const washOpacity = Math.min(0.98, Math.max(0.40, 0.45 + activeFactor * 0.50));

        const roomGrad = ctx.createLinearGradient(dw.x, dw.y, dw.x, dw.y + dw.h);
        const colR = Math.min(255, Math.floor(blendHue.r * (0.6 + activeFactor * 0.5) + kickPunch * 40));
        const colG = Math.min(255, Math.floor(blendHue.g * (0.6 + activeFactor * 0.5)));
        const colB = Math.min(255, Math.floor(blendHue.b * (0.6 + activeFactor * 0.5)));

        roomGrad.addColorStop(0.0, `rgba(${colR}, ${colG}, ${colB}, ${washOpacity})`);
        roomGrad.addColorStop(0.5, `rgba(${Math.floor(colR * 0.7)}, ${Math.floor(colG * 0.7)}, ${Math.floor(colB * 0.7)}, ${washOpacity * 0.85})`);
        roomGrad.addColorStop(1.0, `rgba(${Math.floor(colR * 0.3)}, ${Math.floor(colG * 0.3)}, ${Math.floor(colB * 0.3)}, ${washOpacity * 0.75})`);

        ctx.fillStyle = roomGrad;
        fillArchedPath(dw.x, dw.y, dw.w, dw.h);
        ctx.fill();

        // 2. High-Contrast Xenon Strobe Flash (Group A triggers crisp white strobe snap; Kick triggers full unison flash)
        const xenonAlpha = isGroupA ? (strobeFactorA * 0.85 + (isKick ? kickPunch * 0.5 : 0)) : (isKick ? kickPunch * 0.65 : 0);
        if (xenonAlpha > 0.04) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.95, xenonAlpha)})`;
            fillArchedPath(dw.x, dw.y, dw.w, dw.h);
            ctx.fill();
        }

        // 3. Piercing Acid Green Concert Laser Beam
        const gLaserY = greenLaserY + (cx - 270) * Math.tan(greenLaserAngle);
        if (gLaserY >= dw.y - 12 && gLaserY <= dw.y + dw.h + 12) {
            ctx.save();
            fillArchedPath(dw.x, dw.y, dw.w, dw.h);
            ctx.clip();

            const hazePower = 0.45 + kickPunch * 0.45;
            const hazeGrad = ctx.createLinearGradient(dw.x, gLaserY - 22, dw.x, gLaserY + 22);
            hazeGrad.addColorStop(0.0, 'rgba(0, 255, 80, 0.0)');
            hazeGrad.addColorStop(0.5, `rgba(0, 255, 100, ${hazePower})`);
            hazeGrad.addColorStop(1.0, 'rgba(0, 255, 80, 0.0)');
            ctx.fillStyle = hazeGrad;
            ctx.fillRect(dw.x - 5, gLaserY - 22, dw.w + 10, 44);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.0 + kickPunch * 1.0;
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 14 + kickPunch * 8;
            ctx.beginPath();
            ctx.moveTo(dw.x, gLaserY - (dw.w / 2) * Math.tan(greenLaserAngle));
            ctx.lineTo(dw.x + dw.w, gLaserY + (dw.w / 2) * Math.tan(greenLaserAngle));
            ctx.stroke();

            ctx.restore();
        }

        // 4. Cross-Cutting Ruby Red Concert Laser Beam
        const rLaserY = redLaserY + (cx - 270) * Math.tan(redLaserAngle);
        if (rLaserY >= dw.y - 12 && rLaserY <= dw.y + dw.h + 12) {
            ctx.save();
            fillArchedPath(dw.x, dw.y, dw.w, dw.h);
            ctx.clip();

            const rHazePower = 0.40 + kickPunch * 0.40;
            const rHaze = ctx.createLinearGradient(dw.x, rLaserY - 18, dw.x, rLaserY + 18);
            rHaze.addColorStop(0.0, 'rgba(255, 0, 50, 0.0)');
            rHaze.addColorStop(0.5, `rgba(255, 20, 80, ${rHazePower})`);
            rHaze.addColorStop(1.0, 'rgba(255, 0, 50, 0.0)');
            ctx.fillStyle = rHaze;
            ctx.fillRect(dw.x - 5, rLaserY - 18, dw.w + 10, 36);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8 + kickPunch * 0.8;
            ctx.shadowColor = '#ff0033';
            ctx.shadowBlur = 12 + kickPunch * 8;
            ctx.beginPath();
            ctx.moveTo(dw.x, rLaserY - (dw.w / 2) * Math.tan(redLaserAngle));
            ctx.lineTo(dw.x + dw.w, rLaserY + (dw.w / 2) * Math.tan(redLaserAngle));
            ctx.stroke();

            ctx.restore();
        }

        // 5. High-Energy Cyan Moving-Head Laser Beam
        const cLaserY = cyanLaserY + (cx - 270) * Math.tan(cyanLaserAngle);
        if (cLaserY >= dw.y - 12 && cLaserY <= dw.y + dw.h + 12) {
            ctx.save();
            fillArchedPath(dw.x, dw.y, dw.w, dw.h);
            ctx.clip();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.6 + kickPunch * 0.6;
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 10 + kickPunch * 6;
            ctx.beginPath();
            ctx.moveTo(dw.x, cLaserY - (dw.w / 2) * Math.tan(cyanLaserAngle));
            ctx.lineTo(dw.x + dw.w, cLaserY + (dw.w / 2) * Math.tan(cyanLaserAngle));
            ctx.stroke();

            ctx.restore();
        }

        // 6. Treble Sparkle Glints (High frequency flashes on glass window panes)
        if (trebleSparkle > 0.25) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.7, trebleSparkle * 0.8)})`;
            const sparkleX = dw.x + 8 + ((idx * 13 + Math.floor(elapsedTime * 8)) % 28);
            const sparkleY = dw.y + 12 + ((idx * 19 + Math.floor(elapsedTime * 6)) % 40);
            ctx.fillRect(sparkleX, sparkleY, 2.5, 2.5);
        }

        // 7. Music-Animated Dancing Zombie Silhouettes with Hyper-Detailed Claw Hands
        drawDancingZombie(ctx, cx, cy - 2, dw.zombie, raveTime + idx * 1.8, audio);

        // 8. Gothic window mullions in front of dancers
        drawMullions(dw.x, dw.y, dw.w, dw.h);
    });

    // Helper: Draw Walking & Waving Zombie Silhouette with Outstretched Hands & Articulated Claw
    function drawWalkingZombie(ctx, zx, zy, facingRight, legCycle, isWaving = false, waveTime = 0) {
        ctx.save();
        ctx.translate(zx, zy);
        if (!facingRight) {
            ctx.scale(-1, 1);
        }

        ctx.fillStyle = '#020306';

        // Shambling Leg Stride (stationary if stopping to wave)
        const legStride = isWaving ? 0 : Math.sin(legCycle) * 6.5;
        // Solid overlapping pelvis & waist (guarantees legs are firmly attached to torso)
        ctx.beginPath();
        ctx.ellipse(0, -18, 7.5, 5.0, 0, 0, Math.PI * 2);
        ctx.fill();

        // Back leg (starts deep inside pelvis at y = -21)
        ctx.beginPath();
        ctx.moveTo(-5, -21);
        ctx.lineTo(-4 - legStride * 0.8, 0);
        ctx.lineTo(-1 - legStride * 0.8, 0);
        ctx.lineTo(-1, -21);
        ctx.closePath();
        ctx.fill();

        // Front leg (starts deep inside pelvis at y = -21)
        ctx.beginPath();
        ctx.moveTo(2, -21);
        ctx.lineTo(3 + legStride, 0);
        ctx.lineTo(6 + legStride, 0);
        ctx.lineTo(5, -21);
        ctx.closePath();
        ctx.fill();

        // Tattered hunched torso & jacket overlapping down to y = -15
        ctx.beginPath();
        ctx.moveTo(-7, -15);
        ctx.lineTo(-9, -38);
        ctx.lineTo(7, -36);
        ctx.lineTo(5, -15);
        ctx.closePath();
        ctx.fill();

        // Drooping head & slack jaw
        const headBob = isWaving ? Math.sin(waveTime * 3) * 0.8 : Math.sin(legCycle * 2) * 1.5;
        ctx.beginPath();
        ctx.ellipse(3, -44 + headBob, 5.5, 7.5, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(5, -39 + headBob, 4, 3.5);

        ctx.lineWidth = 3.2;
        ctx.strokeStyle = '#020306';
        ctx.lineCap = 'round';

        if (isWaving) {
            // Lower arm (slack forward)
            ctx.beginPath();
            ctx.moveTo(3, -34);
            ctx.lineTo(12, -26);
            ctx.lineTo(16, -22);
            ctx.stroke();

            // Raised Waving Arm (Elbow bent up high, hand waving back & forth!)
            const waveAngle = Math.sin(waveTime * 7.5) * 0.52;
            const elbowX = 6;
            const elbowY = -50;
            ctx.beginPath();
            ctx.moveTo(0, -32);
            ctx.lineTo(elbowX, elbowY);
            const handX = elbowX + Math.sin(waveAngle) * 16;
            const handY = elbowY - Math.cos(waveAngle) * 16;
            ctx.lineTo(handX, handY);
            ctx.stroke();

            // Hand / claw waving on the end
            drawZombieHand(ctx, handX, handY, waveAngle, 0.5);
        } else {
            // Arms Outstretched Forward in Front!
            // Upper arm 1
            ctx.beginPath();
            ctx.moveTo(3, -34);
            ctx.lineTo(16, -34 + Math.sin(legCycle) * 2);
            ctx.lineTo(21, -31); // Drooping claw wrist
            ctx.stroke();

            // Upper arm 2
            ctx.beginPath();
            ctx.moveTo(0, -32);
            ctx.lineTo(14, -31 - Math.sin(legCycle) * 2);
            ctx.lineTo(19, -28); // Drooping claw wrist
            ctx.stroke();
        }

        ctx.restore();
    }

    // 2. RIGHT WINDOWS: INDEPENDENT TOP FLOOR VS BOTTOM FLOOR ELECTRICAL FLICKER & BLACKOUTS
    const rightWindows = [
        { x: 630, y: 510, w: 44, h: 75, id: 0 }, // Top floor (Upstairs / Middle-Right)
        { x: 710, y: 510, w: 44, h: 75, id: 1 }, // Top floor
        { x: 790, y: 510, w: 44, h: 75, id: 2 }, // Top floor
        { x: 620, y: 650, w: 48, h: 85, id: 3 }, // Bottom floor (Downstairs)
        { x: 700, y: 650, w: 48, h: 85, id: 4 }, // Bottom floor
        { x: 780, y: 650, w: 48, h: 85, id: 5 }, // Bottom floor
        { x: 530, y: 650, w: 48, h: 85, id: 6 }  // Bottom floor
    ];

    // Right Wing Zombie State Machine: Alternates Upstairs (middle-right) windows vs Downstairs windows
    const rightZombieCyclePeriod = 44.0;
    const rCycleTime = elapsedTime % rightZombieCyclePeriod;
    let rightZombieFloor = null; // 'upstairs' or 'downstairs'
    let rightZombieActive = false;
    let rightZombieX = 0;
    let rightZombieWaving = false;
    let rightZombieFacingRight = true;
    let rightZombieLegPhase = elapsedTime * 5.0;

    if (rCycleTime < 13.5) {
        // Segment A: Upstairs / Middle-Right floor windows (y = 510, x spans 600 -> 840)
        rightZombieFloor = 'upstairs';
        rightZombieActive = true;
        if (rCycleTime < 4.8) {
            // Walking left to right towards center window
            const p = rCycleTime / 4.8;
            rightZombieX = 600 + p * 125; // 600 -> 725
            rightZombieWaving = false;
            rightZombieFacingRight = true;
        } else if (rCycleTime < 8.2) {
            // Stops in center window (x = 725), turns, and waves!
            rightZombieX = 725;
            rightZombieWaving = true;
            rightZombieFacingRight = true;
        } else {
            // Resumes walking rightwards and walks off
            const p = (rCycleTime - 8.2) / 5.3;
            rightZombieX = 725 + p * 135; // 725 -> 860
            rightZombieWaving = false;
            rightZombieFacingRight = true;
        }
    } else if (rCycleTime >= 22.0 && rCycleTime < 36.5) {
        // Segment B: Downstairs / Bottom level floor windows (y = 650, x spans 500 -> 840)
        const dTime = rCycleTime - 22.0;
        rightZombieFloor = 'downstairs';
        rightZombieActive = true;
        if (dTime < 5.2) {
            // Walking left to right across downstairs windows
            const p = dTime / 5.2;
            rightZombieX = 510 + p * 190; // 510 -> 700
            rightZombieWaving = false;
            rightZombieFacingRight = true;
        } else if (dTime < 8.8) {
            // Stops in downstairs window (x = 700), stops, and waves!
            rightZombieX = 700;
            rightZombieWaving = true;
            rightZombieFacingRight = true;
        } else {
            // Resumes walking rightwards and walks off
            const p = (dTime - 8.8) / 5.7;
            rightZombieX = 700 + p * 150; // 700 -> 850
            rightZombieWaving = false;
            rightZombieFacingRight = true;
        }
    }

    rightWindows.forEach((rw) => {
        // Top floor vs Bottom floor flicker independently!
        const isTopFloor = (rw.id < 3);
        let candleFactor = isTopFloor 
            ? ((faultyState && faultyState.topFactor !== undefined) ? faultyState.topFactor : 1.0)
            : ((faultyState && faultyState.bottomFactor !== undefined) ? faultyState.bottomFactor : 1.0);

        if (candleFactor <= 0.05) {
            // PITCH BLACK (Independent Power Cut / Electrical Blackout on this floor!)
            ctx.fillStyle = '#020306';
            fillArchedPath(rw.x, rw.y, rw.w, rw.h);
            ctx.fill();
        } else {
            // Warm Candlelight Glow (Modulated by floor's independent electrical factor)
            const cGrad = ctx.createRadialGradient(rw.x + rw.w / 2, rw.y + rw.h / 2, 2, rw.x + rw.w / 2, rw.y + rw.h / 2, Math.max(rw.w, rw.h));
            cGrad.addColorStop(0.0, `rgba(255, 255, 255, ${candleFactor})`);
            cGrad.addColorStop(0.25, `rgba(255, 220, 100, ${candleFactor})`);
            cGrad.addColorStop(0.65, `rgba(255, 136, 0, ${candleFactor * 0.85})`);
            cGrad.addColorStop(1.0, `rgba(120, 40, 0, ${candleFactor * 0.6})`);
            ctx.fillStyle = cGrad;
            fillArchedPath(rw.x, rw.y, rw.w, rw.h);
            ctx.fill();
        }

        // Draw Walking & Waving Zombie in Right Wing Windows
        if (rightZombieActive) {
            const isTargetWindow = (rightZombieFloor === 'upstairs' && rw.id < 3) ||
                                  (rightZombieFloor === 'downstairs' && rw.id >= 3);
            if (isTargetWindow && rightZombieX >= rw.x - 18 && rightZombieX <= rw.x + rw.w + 18) {
                ctx.save();
                fillArchedPath(rw.x, rw.y, rw.w, rw.h);
                ctx.clip();
                drawWalkingZombie(ctx, rightZombieX, rw.y + rw.h - 2, rightZombieFacingRight, rightZombieLegPhase, rightZombieWaving, elapsedTime);
                ctx.restore();
            }
        }

        drawMullions(rw.x, rw.y, rw.w, rw.h);
    });

    // 3. LEFT DOWNSTAIRS WINDOWS, TOWER ATTIC & TOP CENTER WINDOWS WITH WALKING ZOMBIE
    const otherWindows = [
        { x: 200, y: 650, w: 48, h: 85, isGhost: false },
        { x: 260, y: 650, w: 48, h: 85, isGhost: false },
        { x: 490, y: 390, w: 36, h: 65, isGhost: false, isCenterTop: true }, // Top center left window
        { x: 535, y: 390, w: 36, h: 65, isGhost: false, isCenterTop: true }, // Top center right window
        { x: 510, y: 230, w: 32, h: 55, isGhost: true }  // Tower attic
    ];

    // Top floor walking zombie cycle: passes left-to-right, pauses, then right-to-left
    const zombiePeriod = 20.0;
    const zombieCycleTime = elapsedTime % zombiePeriod;
    const zombieWalkDuration = 6.8;
    let zombieActive = false;
    let zombieX = 0;
    let zombieFacingRight = true;
    let zombieLegPhase = elapsedTime * 5.5;

    if (zombieCycleTime < zombieWalkDuration) {
        // Pass 1: Walking LEFT TO RIGHT across the top floor windows (460 -> 600)
        zombieActive = true;
        const prog = zombieCycleTime / zombieWalkDuration;
        zombieX = 460 + prog * 140;
        zombieFacingRight = true;
    } else if (zombieCycleTime >= 10.0 && zombieCycleTime < 10.0 + zombieWalkDuration) {
        // Pass 2: Walking RIGHT TO LEFT back across the windows (600 -> 460)
        zombieActive = true;
        const prog = (zombieCycleTime - 10.0) / zombieWalkDuration;
        zombieX = 600 - prog * 140;
        zombieFacingRight = false;
    }

    otherWindows.forEach((ow) => {
        const oGrad = ctx.createRadialGradient(ow.x + ow.w / 2, ow.y + ow.h / 2, 2, ow.x + ow.w / 2, ow.y + ow.h / 2, Math.max(ow.w, ow.h));
        if (ow.isGhost) {
            oGrad.addColorStop(0.0, '#ffffff');
            oGrad.addColorStop(0.3, '#77ffcc');
            oGrad.addColorStop(0.7, '#22aa77');
            oGrad.addColorStop(1.0, '#0a3320');
        } else {
            oGrad.addColorStop(0.0, '#ffffff');
            oGrad.addColorStop(0.25, '#ffdd66');
            oGrad.addColorStop(0.65, '#ff8800');
            oGrad.addColorStop(1.0, '#993300');
        }
        ctx.fillStyle = oGrad;
        fillArchedPath(ow.x, ow.y, ow.w, ow.h);
        ctx.fill();

        // If this is one of the top center windows and the zombie is active, draw zombie clipped inside
        if (ow.isCenterTop && zombieActive) {
            ctx.save();
            fillArchedPath(ow.x, ow.y, ow.w, ow.h);
            ctx.clip();
            drawWalkingZombie(ctx, zombieX, ow.y + ow.h - 2, zombieFacingRight, zombieLegPhase, false, 0);
            ctx.restore();
        }

        drawMullions(ow.x, ow.y, ow.w, ow.h);
    });
}

// 4. Spooky Gnarled Bare Forest Trees & Overhanging Twisted Branches (2048x1024 - Full Screen Span)
export function createHauntedForestTreesTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 2048, 1024);

    const barkDark = '#060910';
    const barkHighlight = '#121926';

    // Helper: Draw curved organic twisted tree branch segment
    function drawBranch(startX, startY, endX, endY, ctrlX, ctrlY, startW, endW) {
        ctx.beginPath();
        ctx.moveTo(startX - startW / 2, startY);
        ctx.quadraticCurveTo(ctrlX - (startW + endW) / 4, ctrlY, endX - endW / 2, endY);
        ctx.lineTo(endX + endW / 2, endY);
        ctx.quadraticCurveTo(ctrlX + (startW + endW) / 4, ctrlY, startX + startW / 2, startY);
        ctx.closePath();
        ctx.fillStyle = barkDark;
        ctx.fill();
    }

    // =========================================================================
    // GIANT TWISTED GNARLED OAK TREE ON FAR LEFT (Reaching from off-screen across upper sky)
    // =========================================================================
    // Massive base trunk growing in from far left edge
    drawBranch(80, 1024, 240, 600, 140, 800, 280, 160);
    drawBranch(240, 600, 300, 440, 260, 510, 160, 115);

    // Giant Upper Crooked Limb (Arching over to frame the moon across x: 300 -> 1400, y: 440 -> 100)
    drawBranch(300, 440, 560, 300, 380, 360, 115, 80);
    drawBranch(560, 300, 880, 210, 720, 240, 80, 55);
    drawBranch(880, 210, 1200, 150, 1040, 170, 55, 36);
    drawBranch(1200, 150, 1480, 110, 1340, 120, 36, 18);

    // Sub-branches reaching across the top canopy
    drawBranch(880, 210, 960, 120, 900, 160, 32, 14);
    drawBranch(960, 120, 1050, 60, 1000, 85, 14, 5);
    drawBranch(720, 250, 820, 150, 760, 190, 36, 15);
    drawBranch(820, 150, 860, 70, 830, 105, 15, 5);
    drawBranch(1200, 150, 1320, 80, 1250, 110, 24, 10);
    drawBranch(1320, 80, 1420, 35, 1370, 50, 10, 3);

    // Mid-level twisted reaching branch
    drawBranch(300, 440, 520, 400, 400, 420, 68, 42);
    drawBranch(520, 400, 760, 370, 640, 380, 42, 26);
    drawBranch(760, 370, 980, 340, 870, 350, 26, 14);
    drawBranch(980, 340, 1120, 300, 1050, 315, 14, 5);

    // Lower twisted branch extending across middle ground
    drawBranch(240, 600, 480, 570, 360, 590, 90, 52);
    drawBranch(480, 570, 720, 545, 600, 555, 52, 28);
    drawBranch(720, 545, 920, 520, 820, 530, 28, 12);

    // Far-left branches branching off screen edge
    drawBranch(240, 600, 60, 490, 140, 550, 75, 42);
    drawBranch(60, 490, -20, 410, 10, 440, 42, 22);
    drawBranch(300, 440, 80, 330, 180, 370, 60, 28);
    drawBranch(80, 330, -30, 220, 20, 270, 28, 12);

    // =========================================================================
    // RIGHT SIDE SPOOKY TREES (Reaching from far right edge past the screen)
    // =========================================================================
    drawBranch(1960, 1024, 1820, 610, 1900, 810, 220, 125);
    drawBranch(1820, 610, 1740, 430, 1790, 510, 125, 80);

    // Leftward reaching limbs framing the manor roof from the right
    drawBranch(1740, 430, 1560, 330, 1640, 370, 80, 48);
    drawBranch(1560, 330, 1400, 270, 1470, 290, 48, 26);
    drawBranch(1400, 270, 1280, 205, 1330, 230, 26, 12);
    drawBranch(1280, 205, 1180, 155, 1220, 175, 12, 4);

    // High upward spires on right
    drawBranch(1740, 430, 1840, 300, 1800, 360, 65, 34);
    drawBranch(1840, 300, 1900, 170, 1860, 230, 34, 15);
    drawBranch(1900, 170, 1950, 80, 1920, 120, 15, 5);

    // Overgrown dead weeds, brambles and briars spanning entire base width
    ctx.fillStyle = barkDark;
    for (let bx = 0; bx < 2048; bx += 8) {
        const h = 70 + Math.sin(bx * 0.03) * 45 + Math.cos(bx * 0.08) * 28;
        ctx.beginPath();
        ctx.moveTo(bx - 4, 1024);
        ctx.lineTo(bx + Math.sin(bx) * 8, 1024 - h);
        ctx.lineTo(bx + 4, 1024);
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// 5a. Extended Wrought-Iron Cemetery Perimeter Fencing (2048x1024 - Spans off screen edges)
export function createHauntedFenceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 2048, 1024);

    const ironDark = '#04060a';
    const ironMid = '#0d131d';
    const ironHighlight = '#1c2636';

    ctx.fillStyle = ironDark;
    ctx.strokeStyle = ironDark;

    // Bottom structural rail spanning entire width
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(0, 860); ctx.lineTo(1960, 860);
    ctx.stroke();

    // Middle structural rail
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, 580); ctx.lineTo(1960, 580);
    ctx.stroke();

    // Upper structural rail
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 360); ctx.lineTo(1960, 360);
    ctx.stroke();

    // Vertical Iron Pickets with Sharp Spear Finials Joining Upper Railing (Slight 6px gap)
    const picketSpacing = 38;
    for (let px = 18; px < 1950; px += picketSpacing) {
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(px, 920); ctx.lineTo(px, 354);
        ctx.stroke();

        // Sharp Gothic Spearhead Finial (Sitting right above top rail with 6px collar gap)
        ctx.beginPath();
        ctx.moveTo(px, 310);
        ctx.lineTo(px - 7, 350);
        ctx.lineTo(px + 7, 350);
        ctx.closePath();
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px - 9, 352); ctx.lineTo(px + 9, 352);
        ctx.stroke();

        // Forged decorative iron circles between top and middle rail
        if (px + picketSpacing / 2 < 1940) {
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(px + picketSpacing / 2, 470, 14, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Terminal Wrought-Iron Gatepost on inner edge (x = 1950 to 2010)
    ctx.fillStyle = ironDark;
    ctx.fillRect(1954, 200, 38, 720);
    ctx.fillStyle = ironHighlight;
    ctx.fillRect(1956, 200, 4, 720);

    // Decorative stepped post collar caps
    ctx.fillStyle = ironDark;
    ctx.fillRect(1944, 185, 58, 20);
    ctx.fillRect(1950, 160, 46, 26);

    // Terminal Gothic Spire / Finial atop gatepost
    ctx.beginPath();
    ctx.moveTo(1973, 75);
    ctx.lineTo(1950, 160);
    ctx.lineTo(1996, 160);
    ctx.closePath();
    ctx.fill();

    // Heavy iron hinge barrels facing toward gate opening
    ctx.fillRect(1934, 340, 24, 24);
    ctx.fillRect(1934, 560, 24, 24);
    ctx.fillRect(1934, 840, 24, 24);

    // Weathered dark foundation base patina along iron rail (clean base for 3D wind-blown grass)
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 860, 1960, 164);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// 5b. Articulated Wrought-Iron Swinging Gate Wing (512x1024)
export function createHauntedGateWingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 512, 1024);

    const ironDark = '#04060a';
    const ironMid = '#0c1018';
    const ironHighlight = '#1e2838';

    ctx.fillStyle = ironDark;
    ctx.strokeStyle = ironDark;

    // Left upright hinge bar (x: 10 to 30)
    ctx.fillRect(12, 280, 20, 640);
    ctx.fillStyle = ironHighlight;
    ctx.fillRect(14, 280, 3, 640);

    // Hinge mounting straps with rivet details
    ctx.fillStyle = ironDark;
    ctx.fillRect(0, 335, 36, 24);
    ctx.fillRect(0, 555, 36, 24);
    ctx.fillRect(0, 835, 36, 24);

    // Right meeting upright bar (x: 480 to 500)
    ctx.fillRect(480, 220, 20, 700);
    ctx.fillStyle = ironHighlight;
    ctx.fillRect(482, 220, 3, 700);

    // Drop latch plate and ring handle
    ctx.fillStyle = ironDark;
    ctx.fillRect(468, 550, 36, 30);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(486, 600, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Horizontal bottom rail
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(20, 860); ctx.lineTo(490, 860);
    ctx.stroke();

    // Horizontal middle rail
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(20, 580); ctx.lineTo(490, 580);
    ctx.stroke();

    // Gracefully sweeping arched upper rail (rising toward meeting post)
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(20, 360);
    ctx.quadraticCurveTo(240, 280, 490, 240);
    ctx.stroke();

    // Diagonal structural cross brace
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(24, 860); ctx.lineTo(486, 580);
    ctx.stroke();

    // Decorative forged scrollwork curls along cross brace
    for (let sc = 0; sc < 3; sc++) {
        const scX = 140 + sc * 120;
        const scY = 780 - sc * 70;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(scX, scY, 16, 0, Math.PI * 1.6);
        ctx.stroke();
    }

    // 12 Vertical Iron Pickets with Spear Finials
    const numPickets = 12;
    for (let p = 0; p < numPickets; p++) {
        const t = (p + 0.5) / numPickets;
        const px = 28 + (480 - 28) * t;
        const archTopY = (360 + (240 - 360) * t) - Math.sin(t * Math.PI) * 28;

        // Vertical picket shaft
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(px, 880); ctx.lineTo(px, archTopY);
        ctx.stroke();

        // Sharp Spearhead Finial (Joining arched rail with slight 5px gap)
        ctx.beginPath();
        ctx.moveTo(px, archTopY - 36);
        ctx.lineTo(px - 7, archTopY - 5);
        ctx.lineTo(px + 7, archTopY - 5);
        ctx.closePath();
        ctx.fill();

        // Spear cross collar
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px - 9, archTopY - 5); ctx.lineTo(px + 9, archTopY - 5);
        ctx.stroke();
    }

    // Weathered iron bottom base
    ctx.fillStyle = ironDark;
    ctx.fillRect(16, 860, 480, 164);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// 5c. Realistic Dark Cemetery Wild Grass Clump Texture (512x512 - Organic Tapered Blades & Seed Plumes)
export function createHauntedGrassTuftTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 512, 512);

    // Helper: Draw organic tapered grass blade with graceful natural droop/curve at the tip
    function drawCurvedBlade(rootX, rootY, midX, midY, tipX, tipY, baseW, tipW, color, highlightCol = null) {
        ctx.beginPath();
        ctx.moveTo(rootX - baseW / 2, rootY);
        ctx.quadraticCurveTo(midX - baseW / 3, midY, tipX - tipW / 2, tipY);
        ctx.lineTo(tipX + tipW / 2, tipY);
        ctx.quadraticCurveTo(midX + baseW / 3, midY, rootX + baseW / 2, rootY);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        if (highlightCol) {
            ctx.beginPath();
            ctx.moveTo((rootX + midX) / 2, (rootY + midY) / 2);
            ctx.quadraticCurveTo(midX, midY, tipX, tipY);
            ctx.strokeStyle = highlightCol;
            ctx.lineWidth = 1.0;
            ctx.stroke();
        }
    }

    const cx = 256, cy = 512;

    // 1. Deep background blades (pure dark obsidian charcoal - no green)
    const bgCol = '#010203';
    // Graceful arching curves to left and right
    drawCurvedBlade(cx - 40, cy, cx - 110, cy - 180, cx - 170, cy - 250, 7, 0.8, bgCol);
    drawCurvedBlade(cx + 45, cy, cx + 115, cy - 175, cx + 180, cy - 245, 7, 0.8, bgCol);
    drawCurvedBlade(cx - 20, cy, cx - 65, cy - 220, cx - 110, cy - 310, 8, 0.8, bgCol);
    drawCurvedBlade(cx + 25, cy, cx + 70, cy - 215, cx + 120, cy - 305, 8, 0.8, bgCol);
    drawCurvedBlade(cx, cy, cx - 10, cy - 240, cx - 30, cy - 340, 8, 0.8, bgCol);

    // 2. Midground wild drooping blades (dark shadow peat/slate)
    const midCol = '#030508';
    const midHigh = 'rgba(100, 130, 160, 0.12)';
    drawCurvedBlade(cx - 60, cy, cx - 140, cy - 150, cx - 210, cy - 210, 6, 0.6, midCol, midHigh);
    drawCurvedBlade(cx + 60, cy, cx + 145, cy - 145, cx + 215, cy - 205, 6, 0.6, midCol, midHigh);
    drawCurvedBlade(cx - 30, cy, cx - 95, cy - 200, cx - 145, cy - 280, 7, 0.6, midCol, midHigh);
    drawCurvedBlade(cx + 30, cy, cx + 100, cy - 195, cx + 150, cy - 275, 7, 0.6, midCol, midHigh);
    drawCurvedBlade(cx - 10, cy, cx - 40, cy - 230, cx - 75, cy - 330, 7, 0.6, midCol, midHigh);
    drawCurvedBlade(cx + 15, cy, cx + 45, cy - 225, cx + 80, cy - 325, 7, 0.6, midCol, midHigh);

    // 3. Foreground prominent weeping blades (dark asphalt with subtle cold moonlight glaze on drooping tips)
    const foreCol = '#05080e';
    const moonGlaze = 'rgba(130, 165, 195, 0.18)';
    drawCurvedBlade(cx - 75, cy, cx - 160, cy - 120, cx - 230, cy - 160, 5, 0.5, foreCol, moonGlaze);
    drawCurvedBlade(cx + 75, cy, cx + 165, cy - 115, cx + 235, cy - 155, 5, 0.5, foreCol, moonGlaze);
    drawCurvedBlade(cx - 45, cy, cx - 120, cy - 170, cx - 175, cy - 240, 6, 0.5, foreCol, moonGlaze);
    drawCurvedBlade(cx + 40, cy, cx + 125, cy - 165, cx + 180, cy - 235, 6, 0.5, foreCol, moonGlaze);
    drawCurvedBlade(cx - 18, cy, cx - 55, cy - 210, cx - 90, cy - 300, 6, 0.5, foreCol, moonGlaze);
    drawCurvedBlade(cx + 10, cy, cx + 55, cy - 205, cx + 85, cy - 295, 6, 0.5, foreCol, moonGlaze);
    drawCurvedBlade(cx - 4, cy, cx + 15, cy - 235, cx + 35, cy - 335, 6, 0.5, foreCol, moonGlaze);

    // Wild weeping seed heads drooping with the natural arching tips
    function drawDroopingSeedHead(tx, ty, rot) {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(rot);
        ctx.fillStyle = 'rgba(80, 105, 130, 0.22)';
        for (let s = 0; s < 5; s++) {
            ctx.beginPath();
            ctx.ellipse((s % 2 === 0 ? -2.5 : 2.5), -s * 5, 1.8, 3.5, (s % 2 === 0 ? -0.35 : 0.35), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    drawDroopingSeedHead(cx - 110, cy - 310, -0.6);
    drawDroopingSeedHead(cx + 120, cy - 305, 0.6);
    drawDroopingSeedHead(cx - 75, cy - 330, -0.45);
    drawDroopingSeedHead(cx + 80, cy - 325, 0.45);
    drawDroopingSeedHead(cx + 35, cy - 335, 0.25);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// 6. Curving Gothic Carriage Road from Gates to Manor with High Visibility Cobblestones & Moonlit Puddles (2048x1024)
export function createHauntedDirtPathTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 1. Desolate overgrown midnight lawn & wild turf
    ctx.fillStyle = '#050912';
    ctx.fillRect(0, 0, 2048, 1024);

    // Subtle dark soil grain and peat variation
    for (let g = 0; g < 500; g++) {
        const gx = Math.random() * 2048;
        const gy = Math.random() * 1024;
        const gr = 2 + Math.random() * 7;
        ctx.fillStyle = Math.random() > 0.5 ? '#08111e' : '#03060c';
        ctx.beginPath();
        ctx.arc(gx, gy, gr, 0, Math.PI * 2);
        ctx.fill();
    }

    // Mathematical Driveway Curve: Perfectly connects Gates (Z=0, py=580, X=0, px=1024) to Manor Steps (Z=-10.2, py=441, X=+2.06, px=1062)
    function getDrivewayPathCenter(py) {
        if (py >= 580) {
            // Forward from gates through foreground: centered at x = 0 (px = 1024)
            return 1024;
        } else if (py <= 441) {
            // Courtyard apron / turnaround at manor porch steps: centered at X = +2.06 (px = 1062)
            return 1062;
        } else {
            // Driveway S-bend connecting gates to manor steps
            const s = (580 - py) / (580 - 441); // 0 at gate (py=580), 1 at manor steps (py=441)
            const bendX = 2.06 * (s * s) + Math.sin(s * Math.PI) * (-1.2);
            return 1024 + bendX * 18.618;
        }
    }

    function getDrivewayHalfWidth(py) {
        if (py >= 580) {
            return 52 + (py - 580) * 0.04;
        } else if (py <= 441) {
            return 64 + (441 - py) * 0.15;
        } else {
            const s = (580 - py) / (580 - 441);
            return 52 + s * 12;
        }
    }

    // 2. Curving Gothic Carriage Road Bed
    ctx.beginPath();
    // Trace left curb boundary from foreground (py = 1024) up to manor courtyard (py = 360)
    for (let py = 1024; py >= 360; py -= 4) {
        const cx = getDrivewayPathCenter(py);
        const hw = getDrivewayHalfWidth(py);
        if (py === 1024) ctx.moveTo(cx - hw, py);
        else ctx.lineTo(cx - hw, py);
    }
    // Across top at manor courtyard
    ctx.lineTo(getDrivewayPathCenter(360) + getDrivewayHalfWidth(360), 360);
    // Trace right curb boundary from top back down to foreground
    for (let py = 360; py <= 1024; py += 4) {
        const cx = getDrivewayPathCenter(py);
        const hw = getDrivewayHalfWidth(py);
        ctx.lineTo(cx + hw, py);
    }
    ctx.closePath();

    // Road Bed Fill: High contrast moonlit slate-blue granite carriageway foundation
    const roadBedGrad = ctx.createLinearGradient(0, 360, 0, 1024);
    roadBedGrad.addColorStop(0.0, '#1e2d42');
    roadBedGrad.addColorStop(0.3, '#24354d');
    roadBedGrad.addColorStop(0.7, '#2a3d58');
    roadBedGrad.addColorStop(1.0, '#324766');
    ctx.fillStyle = roadBedGrad;
    ctx.fill();

    // 3. Prominent Carved Granite Curbstones (Heavy stone borders delineating both edges of the road)
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#03060a';
    ctx.stroke();

    ctx.lineWidth = 10;
    ctx.strokeStyle = '#3a506e';
    ctx.stroke();

    ctx.lineWidth = 3.0;
    ctx.strokeStyle = '#6e92be';
    ctx.stroke();

    // 4. Textured Cobblestones and Flagstone Paving (700+ individual stones following the winding curves)
    for (let c = 0; c < 720; c++) {
        const py = 360 + Math.random() * (1024 - 360);
        const cx = getDrivewayPathCenter(py);
        const hw = getDrivewayHalfWidth(py);
        const offset = (Math.random() - 0.5) * (hw * 1.7);
        const stoneX = cx + offset;
        const stoneY = py;
        const stoneR = 3.0 + Math.random() * 7.5;

        const stonePalette = ['#2e425e', '#23344b', '#395172', '#456186', '#1c293c'];
        ctx.fillStyle = stonePalette[Math.floor(Math.random() * stonePalette.length)];
        ctx.beginPath();
        ctx.ellipse(stoneX, stoneY, stoneR * 1.3, stoneR, Math.random() * 0.4 - 0.2, 0, Math.PI * 2);
        ctx.fill();

        if (Math.random() > 0.45) {
            ctx.fillStyle = 'rgba(145, 185, 230, 0.35)';
            ctx.beginPath();
            ctx.arc(stoneX - 1, stoneY - 1, stoneR * 0.45, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 5. Weathered Carriage Wheel Ruts (Depressed iron wheel grooves compacted by heavy carriages)
    // Left Wheel Rut
    ctx.beginPath();
    for (let py = 1024; py >= 380; py -= 6) {
        const rx = getDrivewayPathCenter(py) - 22;
        if (py === 1024) ctx.moveTo(rx, py);
        else ctx.lineTo(rx, py);
    }
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#121c29';
    ctx.stroke();

    // Right Wheel Rut
    ctx.beginPath();
    for (let py = 1024; py >= 380; py -= 6) {
        const rx = getDrivewayPathCenter(py) + 22;
        if (py === 1024) ctx.moveTo(rx, py);
        else ctx.lineTo(rx, py);
    }
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#121c29';
    ctx.stroke();

    // 6. Brilliant Moonlit Rainwater Puddles (Gleaming pools reflecting the full moon and porch lantern)
    const curvingPuddles = [
        { py: 960, rx: 65, ry: 22, rot: 0.02, lantern: false },
        { py: 820, rx: 55, ry: 19, rot: -0.05, lantern: false },
        { py: 680, rx: 50, ry: 17, rot: 0.04, lantern: false },
        { py: 560, rx: 46, ry: 16, rot: -0.08, lantern: false },
        { py: 490, rx: 42, ry: 15, rot: 0.12, lantern: false },
        { py: 440, rx: 40, ry: 14, rot: 0.05, lantern: true }, // Near porch steps
        { py: 390, rx: 36, ry: 13, rot: -0.04, lantern: true }
    ];

    curvingPuddles.forEach(p => {
        const px = getDrivewayPathCenter(p.py) + (Math.sin(p.py * 0.05) * 12);
        ctx.save();
        ctx.translate(px, p.py);
        ctx.rotate(p.rot);
        const pGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, p.rx);
        if (p.lantern) {
            pGrad.addColorStop(0.0, 'rgba(255, 215, 140, 0.70)');
            pGrad.addColorStop(0.45, 'rgba(220, 160, 80, 0.35)');
            pGrad.addColorStop(0.80, 'rgba(100, 140, 190, 0.20)');
            pGrad.addColorStop(1.0, 'transparent');
        } else {
            pGrad.addColorStop(0.0, 'rgba(210, 235, 255, 0.65)');
            pGrad.addColorStop(0.40, 'rgba(135, 185, 240, 0.35)');
            pGrad.addColorStop(0.80, 'rgba(70, 110, 165, 0.18)');
            pGrad.addColorStop(1.0, 'transparent');
        }
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// 6b. Haunted Victorian Graveyard Texture with Runed Headstones & Celtic Crosses (1024x512)
export function createHauntedGraveyardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 512);

    const stoneDark = '#101722';
    const stoneMid = '#1c2838';
    const stoneHighlight = '#3d526e';
    const mossDark = '#091512';
    const runeGlow = 'rgba(50, 240, 200, 0.85)';

    function drawHeadstone(x, y, w, h, rot, label) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);

        // Ground shadow
        ctx.fillStyle = '#020408';
        ctx.beginPath();
        ctx.ellipse(0, h * 0.5 + 4, w * 0.65, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main stone slab
        ctx.fillStyle = stoneMid;
        ctx.beginPath();
        ctx.moveTo(-w / 2, h / 2);
        ctx.lineTo(-w / 2, -h / 2 + w / 2);
        ctx.arc(0, -h / 2 + w / 2, w / 2, Math.PI, 0);
        ctx.lineTo(w / 2, h / 2);
        ctx.closePath();
        ctx.fill();

        // Shadowed right face
        ctx.fillStyle = stoneDark;
        ctx.beginPath();
        ctx.moveTo(0, -h / 2);
        ctx.arc(0, -h / 2 + w / 2, w / 2, -Math.PI / 2, 0);
        ctx.lineTo(w / 2, h / 2);
        ctx.lineTo(0, h / 2);
        ctx.closePath();
        ctx.fill();

        // Moonlit left edge highlight
        ctx.strokeStyle = stoneHighlight;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-w / 2, h / 2);
        ctx.lineTo(-w / 2, -h / 2 + w / 2);
        ctx.arc(0, -h / 2 + w / 2, w / 2, Math.PI, Math.PI * 1.5);
        ctx.stroke();

        // Cracks
        ctx.strokeStyle = '#080d14';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-w * 0.2, -h * 0.1);
        ctx.lineTo(-w * 0.05, h * 0.1);
        ctx.lineTo(-w * 0.25, h * 0.3);
        ctx.stroke();

        // Moss creepers along base
        ctx.fillStyle = mossDark;
        ctx.beginPath();
        ctx.ellipse(0, h * 0.45, w * 0.45, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Carved Gothic Runes on stone face
        ctx.strokeStyle = runeGlow;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.15); ctx.lineTo(0, h * 0.15);
        ctx.moveTo(-w * 0.2, -h * 0.05); ctx.lineTo(w * 0.2, -h * 0.05);
        ctx.moveTo(-w * 0.15, h * 0.08); ctx.lineTo(w * 0.15, h * 0.08);
        ctx.stroke();

        ctx.restore();
    }

    function drawCelticCross(x, y, scale, rot) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(scale, scale);

        // Stepped base
        ctx.fillStyle = stoneDark;
        ctx.fillRect(-45, 110, 90, 25);
        ctx.fillStyle = stoneMid;
        ctx.fillRect(-35, 90, 70, 22);
        ctx.fillStyle = stoneHighlight;
        ctx.fillRect(-35, 90, 70, 4);

        // Shaft
        ctx.fillStyle = stoneMid;
        ctx.fillRect(-14, -80, 28, 175);
        ctx.fillStyle = stoneHighlight;
        ctx.fillRect(-14, -80, 7, 175);

        // Arms
        ctx.fillStyle = stoneMid;
        ctx.fillRect(-55, -35, 110, 24);
        ctx.fillStyle = stoneHighlight;
        ctx.fillRect(-55, -35, 110, 4);

        // Celtic Ring
        ctx.strokeStyle = stoneHighlight;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, -23, 36, 0, Math.PI * 2);
        ctx.stroke();

        // Glowing Celtic rune in center
        ctx.strokeStyle = runeGlow;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, -23, 14, 0, Math.PI * 2);
        ctx.moveTo(-10, -23); ctx.lineTo(10, -23);
        ctx.moveTo(0, -33); ctx.lineTo(0, -13);
        ctx.stroke();

        ctx.restore();
    }

    // Crypt / Mausoleum in background
    ctx.fillStyle = '#080d16';
    ctx.beginPath();
    ctx.moveTo(480, 460);
    ctx.lineTo(480, 240);
    ctx.lineTo(600, 160);
    ctx.lineTo(720, 240);
    ctx.lineTo(720, 460);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = stoneHighlight;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(475, 244); ctx.lineTo(600, 160); ctx.lineTo(725, 244);
    ctx.stroke();
    // Crypt portal
    ctx.fillStyle = '#020306';
    ctx.beginPath();
    ctx.arc(600, 340, 45, Math.PI, 0);
    ctx.fillRect(555, 340, 90, 120);
    ctx.fill();
    ctx.strokeStyle = '#182436';
    ctx.lineWidth = 3;
    for (let bx = 565; bx <= 635; bx += 14) {
        ctx.beginPath(); ctx.moveTo(bx, 310); ctx.lineTo(bx, 460); ctx.stroke();
    }

    // Headstones across graveyard
    drawHeadstone(140, 360, 85, 140, -0.12, 'RIP');
    drawCelticCross(310, 330, 1.15, 0.06);
    drawHeadstone(430, 380, 75, 120, -0.05, '1842');
    drawHeadstone(780, 370, 90, 150, 0.10, 'MEMENTO');
    drawCelticCross(920, 340, 0.95, -0.08);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// 6c. Will-o'-the-Wisp Spirit Orb Particle Texture (256x256)
export function createWillOTheWispTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const cx = 128, cy = 128;
    ctx.clearRect(0, 0, 256, 256);

    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 120);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.18, 'rgba(120, 255, 230, 0.95)');
    grad.addColorStop(0.45, 'rgba(40, 220, 190, 0.65)');
    grad.addColorStop(0.75, 'rgba(20, 140, 220, 0.25)');
    grad.addColorStop(1.0, 'rgba(10, 80, 180, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

// 6c-2. Purple / Amethyst Will-o'-the-Wisp Spirit Orb Particle Texture (256x256)
export function createPurpleWillOTheWispTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const cx = 128, cy = 128;
    ctx.clearRect(0, 0, 256, 256);

    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 120);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.18, 'rgba(235, 160, 255, 0.95)');
    grad.addColorStop(0.42, 'rgba(180, 50, 255, 0.70)');
    grad.addColorStop(0.72, 'rgba(110, 20, 220, 0.30)');
    grad.addColorStop(1.0, 'rgba(60, 10, 140, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

// 6d. Spectral Wandering Apparition / Phantom Wraith Texture (1024x1024)
export function createHauntedSpecterTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 1024);
    const cx = 512;

    // 1. Volumetric Ethereal Halo & Atmospheric Mist (Soft multi-stop radial glow)
    const auraGrad = ctx.createRadialGradient(cx, 440, 40, cx, 520, 420);
    auraGrad.addColorStop(0.0, 'rgba(180, 235, 255, 0.45)');
    auraGrad.addColorStop(0.35, 'rgba(110, 195, 245, 0.22)');
    auraGrad.addColorStop(0.70, 'rgba(50, 140, 215, 0.08)');
    auraGrad.addColorStop(1.0, 'rgba(20, 80, 180, 0.0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, 520, 420, 0, Math.PI * 2);
    ctx.fill();

    // 2. Dissolving Ethereal Tendrils (Curving smoke-like wisps trailing into mist - NO triangle!)
    // Tendril 1 (Far left curling wisp)
    ctx.fillStyle = 'rgba(175, 220, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(cx - 80, 480);
    ctx.bezierCurveTo(cx - 180, 620, cx - 220, 780, cx - 170, 960);
    ctx.bezierCurveTo(cx - 140, 930, cx - 110, 840, cx - 60, 720);
    ctx.closePath();
    ctx.fill();

    // Tendril 2 (Left main flowing drapery)
    ctx.fillStyle = 'rgba(195, 235, 255, 0.48)';
    ctx.beginPath();
    ctx.moveTo(cx - 60, 440);
    ctx.bezierCurveTo(cx - 140, 580, cx - 160, 750, cx - 90, 990);
    ctx.bezierCurveTo(cx - 70, 920, cx - 60, 810, cx - 20, 680);
    ctx.closePath();
    ctx.fill();

    // Tendril 3 (Center serpentine tail curving to the right)
    ctx.fillStyle = 'rgba(220, 245, 255, 0.60)';
    ctx.beginPath();
    ctx.moveTo(cx - 30, 420);
    ctx.bezierCurveTo(cx - 20, 600, cx + 40, 780, cx + 15, 1010);
    ctx.bezierCurveTo(cx + 35, 920, cx + 45, 780, cx + 30, 620);
    ctx.closePath();
    ctx.fill();

    // Tendril 4 (Right billowing train)
    ctx.fillStyle = 'rgba(195, 235, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(cx + 40, 440);
    ctx.bezierCurveTo(cx + 120, 560, cx + 190, 720, cx + 130, 980);
    ctx.bezierCurveTo(cx + 105, 910, cx + 95, 800, cx + 55, 680);
    ctx.closePath();
    ctx.fill();

    // Tendril 5 (Far right trailing wisp)
    ctx.fillStyle = 'rgba(170, 215, 255, 0.30)';
    ctx.beginPath();
    ctx.moveTo(cx + 65, 480);
    ctx.bezierCurveTo(cx + 160, 600, cx + 230, 750, cx + 210, 930);
    ctx.bezierCurveTo(cx + 175, 880, cx + 140, 780, cx + 85, 690);
    ctx.closePath();
    ctx.fill();

    // 3. Victorian Corset Bodice & Gossamer Lace Folds (Layered semi-transparent pleats)
    ctx.fillStyle = 'rgba(230, 248, 255, 0.65)';
    ctx.beginPath();
    ctx.moveTo(cx - 38, 310);
    ctx.bezierCurveTo(cx - 55, 380, cx - 45, 470, cx - 25, 540);
    ctx.bezierCurveTo(cx, 555, cx + 10, 555, cx + 25, 540);
    ctx.bezierCurveTo(cx + 45, 470, cx + 55, 380, cx + 38, 310);
    ctx.closePath();
    ctx.fill();

    // Inner glowing spine of light
    const spineGrad = ctx.createLinearGradient(cx, 260, cx, 580);
    spineGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
    spineGrad.addColorStop(0.5, 'rgba(210, 245, 255, 0.70)');
    spineGrad.addColorStop(1.0, 'rgba(140, 210, 255, 0.0)');
    ctx.fillStyle = spineGrad;
    ctx.beginPath();
    ctx.ellipse(cx, 400, 14, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Slender Reaching Skeletal Phantom Arms & Flowing Bell Sleeves
    // Left Bell Sleeve
    ctx.fillStyle = 'rgba(200, 235, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(cx - 36, 330);
    ctx.bezierCurveTo(cx - 95, 370, cx - 140, 440, cx - 165, 490);
    ctx.bezierCurveTo(cx - 135, 480, cx - 105, 430, cx - 55, 385);
    ctx.closePath();
    ctx.fill();

    // Left Arm & Delicate Reaching Fingers
    ctx.strokeStyle = 'rgba(240, 252, 255, 0.75)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 40, 345);
    ctx.quadraticCurveTo(cx - 110, 405, cx - 150, 455);
    ctx.stroke();
    // Reaching skeletal fingers
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx - 150, 455); ctx.lineTo(cx - 175, 470);
    ctx.moveTo(cx - 150, 455); ctx.lineTo(cx - 180, 460);
    ctx.moveTo(cx - 150, 455); ctx.lineTo(cx - 175, 450);
    ctx.stroke();

    // Right Bell Sleeve
    ctx.fillStyle = 'rgba(200, 235, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(cx + 36, 330);
    ctx.bezierCurveTo(cx + 95, 370, cx + 140, 440, cx + 165, 490);
    ctx.bezierCurveTo(cx + 135, 480, cx + 105, 430, cx + 55, 385);
    ctx.closePath();
    ctx.fill();

    // Right Arm & Reaching Fingers
    ctx.strokeStyle = 'rgba(240, 252, 255, 0.75)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx + 40, 345);
    ctx.quadraticCurveTo(cx + 110, 405, cx + 150, 455);
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx + 150, 455); ctx.lineTo(cx + 175, 470);
    ctx.moveTo(cx + 150, 455); ctx.lineTo(cx + 180, 460);
    ctx.moveTo(cx + 150, 455); ctx.lineTo(cx + 175, 450);
    ctx.stroke();

    // 5. Veiled Ghostly Head & Cascading Silken Shroud
    // Gossamer Hood & Veil
    ctx.fillStyle = 'rgba(215, 240, 255, 0.55)';
    ctx.beginPath();
    ctx.moveTo(cx, 160);
    ctx.bezierCurveTo(cx - 55, 175, cx - 75, 230, cx - 65, 310);
    ctx.bezierCurveTo(cx - 40, 340, cx - 25, 330, cx, 325);
    ctx.bezierCurveTo(cx + 25, 330, cx + 40, 340, cx + 65, 310);
    ctx.bezierCurveTo(cx + 75, 230, cx + 55, 175, cx, 160);
    ctx.closePath();
    ctx.fill();

    // Ghostly Face Silhouette (Delicate jaw, cheekbones)
    ctx.fillStyle = 'rgba(245, 252, 255, 0.90)';
    ctx.beginPath();
    ctx.ellipse(cx, 245, 24, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hollow, melancholic dark eye sockets
    ctx.fillStyle = '#08121f';
    ctx.beginPath();
    ctx.ellipse(cx - 9, 240, 5, 8, -0.1, 0, Math.PI * 2);
    ctx.ellipse(cx + 9, 240, 5, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Parted ethereal lips
    ctx.beginPath();
    ctx.ellipse(cx, 264, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Piercing cyan pinpoint eye embers
    ctx.fillStyle = 'rgba(90, 255, 235, 0.98)';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx - 9, 241, 2.2, 0, Math.PI * 2);
    ctx.arc(cx + 9, 241, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Strands of silken ethereal hair drifting in the wind
    ctx.strokeStyle = 'rgba(225, 245, 255, 0.40)';
    ctx.lineWidth = 1.8;
    for (let h = -25; h <= 25; h += 8) {
        ctx.beginPath();
        ctx.moveTo(cx + h, 210);
        ctx.bezierCurveTo(cx + h * 1.5, 280, cx + h * 2.2 + 20, 360, cx + h * 2.5 + 35, 440);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

// 6e. Gothic Watcher Gargoyle Statue Texture (512x512)
export function createHauntedGargoyleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);
    const cx = 256;

    const graniteDark = '#0e1520';
    const graniteMid = '#1a2636';
    const graniteHighlight = '#3c526d';

    // Stone Plinth / Pier Cap at Base
    ctx.fillStyle = graniteMid;
    ctx.fillRect(cx - 130, 420, 260, 55);
    ctx.fillStyle = graniteHighlight;
    ctx.fillRect(cx - 135, 410, 270, 14);
    ctx.fillRect(cx - 120, 470, 240, 16);

    // Weathered Gargoyle Hunched Body
    ctx.fillStyle = graniteMid;
    ctx.beginPath();
    ctx.ellipse(cx, 320, 75, 95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crouching Legs & Talons
    ctx.fillStyle = graniteDark;
    ctx.beginPath();
    ctx.ellipse(cx - 75, 370, 38, 55, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = graniteHighlight;
    ctx.fillRect(cx - 100, 405, 14, 18);
    ctx.fillRect(cx - 82, 405, 14, 18);
    ctx.fillRect(cx - 64, 405, 14, 18);

    ctx.fillStyle = graniteDark;
    ctx.beginPath();
    ctx.ellipse(cx + 75, 370, 38, 55, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = graniteHighlight;
    ctx.fillRect(cx + 50, 405, 14, 18);
    ctx.fillRect(cx + 68, 405, 14, 18);
    ctx.fillRect(cx + 86, 405, 14, 18);

    // Folded Leathery Bat Wings
    ctx.fillStyle = graniteDark;
    ctx.beginPath();
    ctx.moveTo(cx - 40, 260);
    ctx.bezierCurveTo(cx - 160, 200, cx - 210, 120, cx - 220, 60);
    ctx.bezierCurveTo(cx - 170, 140, cx - 130, 200, cx - 140, 270);
    ctx.bezierCurveTo(cx - 100, 280, cx - 70, 310, cx - 40, 320);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = graniteHighlight;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 40, 260);
    ctx.bezierCurveTo(cx + 160, 200, cx + 210, 120, cx + 220, 60);
    ctx.bezierCurveTo(cx + 170, 140, cx + 130, 200, cx + 140, 270);
    ctx.bezierCurveTo(cx + 100, 280, cx + 70, 310, cx + 40, 320);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = graniteHighlight;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Gargoyle Horned Head
    ctx.fillStyle = graniteMid;
    ctx.beginPath();
    ctx.ellipse(cx, 210, 55, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = graniteDark;
    ctx.beginPath();
    ctx.moveTo(cx - 35, 180); ctx.lineTo(cx - 65, 115); ctx.lineTo(cx - 20, 165); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 35, 180); ctx.lineTo(cx + 65, 115); ctx.lineTo(cx + 20, 165); ctx.fill();

    // Fanged Maw
    ctx.fillStyle = '#060a10';
    ctx.beginPath();
    ctx.arc(cx, 235, 24, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = graniteHighlight;
    ctx.fillRect(cx - 14, 232, 6, 12);
    ctx.fillRect(cx + 8, 232, 6, 12);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

// 6f. Authentic Gothic Jack-O'-Lantern with Deep Interior Candlelight (512x512)
export function createHauntedPumpkinTexture(lightType = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);
    const cx = 256, cy = 290;

    // 1. Natural Ground Contact Shadow
    const shadowGrad = ctx.createRadialGradient(cx, cy + 135, 20, cx, cy + 135, 180);
    shadowGrad.addColorStop(0.0, 'rgba(2, 3, 6, 0.95)');
    shadowGrad.addColorStop(0.6, 'rgba(4, 6, 12, 0.60)');
    shadowGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 135, 180, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Gnarled Twisted Woody Pumpkin Stem
    ctx.fillStyle = '#1c2612';
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - 128);
    ctx.bezierCurveTo(cx - 32, cy - 190, cx - 12, cy - 235, cx + 24, cy - 245);
    ctx.bezierCurveTo(cx + 36, cy - 240, cx + 18, cy - 190, cx + 16, cy - 128);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2d3d1e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 130);
    ctx.quadraticCurveTo(cx - 18, cy - 195, cx + 20, cy - 240);
    ctx.stroke();

    // 3. Realistic Autumn Pumpkin Lobes (Deep natural chiaroscuro, earthy organic tones)
    const lobes = [
        { x: cx - 115, rx: 70, ry: 130, col: '#8a3304', mid: '#5e2002', dark: '#240a00' },
        { x: cx + 115, rx: 70, ry: 130, col: '#8a3304', mid: '#5e2002', dark: '#240a00' },
        { x: cx - 62, rx: 80, ry: 142, col: '#9c3b06', mid: '#6e2603', dark: '#2c0d01' },
        { x: cx + 62, rx: 80, ry: 142, col: '#9c3b06', mid: '#6e2603', dark: '#2c0d01' },
        { x: cx, rx: 90, ry: 148, col: '#b8480a', mid: '#802f04', dark: '#331001' }
    ];

    lobes.forEach(l => {
        const lGrad = ctx.createRadialGradient(l.x - 20, cy - 40, 15, l.x, cy + 20, l.ry);
        lGrad.addColorStop(0.0, l.col);
        lGrad.addColorStop(0.65, l.mid);
        lGrad.addColorStop(0.92, l.dark);
        lGrad.addColorStop(1.0, '#100400');
        ctx.fillStyle = lGrad;
        ctx.beginPath();
        ctx.ellipse(l.x, cy, l.rx, l.ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle cold moonlight rim on upper lobes
        ctx.strokeStyle = 'rgba(150, 190, 220, 0.18)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.ellipse(l.x, cy - 10, l.rx * 0.92, l.ry * 0.88, 0, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
    });

    // 4. Carved Rind Thickness & Bevel Edges (Natural fibrous pumpkin meat)
    ctx.fillStyle = '#b85f0a';
    ctx.beginPath();
    ctx.moveTo(cx - 78, cy - 68); ctx.lineTo(cx - 23, cy - 47); ctx.lineTo(cx - 67, cy - 13); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 78, cy - 68); ctx.lineTo(cx + 23, cy - 47); ctx.lineTo(cx + 67, cy - 13); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 27); ctx.lineTo(cx - 20, cy + 6); ctx.lineTo(cx + 20, cy + 6); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 108, cy + 23);
    ctx.lineTo(cx - 72, cy + 63); ctx.lineTo(cx - 50, cy + 38);
    ctx.lineTo(cx - 20, cy + 71); ctx.lineTo(cx, cy + 40);
    ctx.lineTo(cx + 20, cy + 71); ctx.lineTo(cx + 50, cy + 38);
    ctx.lineTo(cx + 72, cy + 63); ctx.lineTo(cx + 108, cy + 23);
    ctx.lineTo(cx + 82, cy + 88); ctx.lineTo(cx + 45, cy + 63); ctx.lineTo(cx + 25, cy + 91);
    ctx.lineTo(cx - 25, cy + 91); ctx.lineTo(cx - 45, cy + 63); ctx.lineTo(cx - 82, cy + 88);
    ctx.closePath();
    ctx.fill();

    // 5. Deep Hollow Interior Cavity (Dark charred soot-stained opening)
    ctx.fillStyle = '#080200';
    ctx.beginPath();
    ctx.moveTo(cx - 75, cy - 65); ctx.lineTo(cx - 25, cy - 45); ctx.lineTo(cx - 65, cy - 15); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 75, cy - 65); ctx.lineTo(cx + 25, cy - 45); ctx.lineTo(cx + 65, cy - 15); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 25); ctx.lineTo(cx - 18, cy + 5); ctx.lineTo(cx + 18, cy + 5); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 105, cy + 25);
    ctx.lineTo(cx - 70, cy + 60); ctx.lineTo(cx - 50, cy + 40);
    ctx.lineTo(cx - 20, cy + 68); ctx.lineTo(cx, cy + 42);
    ctx.lineTo(cx + 20, cy + 68); ctx.lineTo(cx + 50, cy + 40);
    ctx.lineTo(cx + 70, cy + 60); ctx.lineTo(cx + 105, cy + 25);
    ctx.lineTo(cx + 80, cy + 85); ctx.lineTo(cx + 45, cy + 65); ctx.lineTo(cx + 25, cy + 88);
    ctx.lineTo(cx - 25, cy + 88); ctx.lineTo(cx - 45, cy + 65); ctx.lineTo(cx - 80, cy + 85);
    ctx.closePath();
    ctx.fill();

    // 6. Deep Internal Candle / Spectral Flame / Disco Strobe (Volumetric glow strictly INSIDE cavity)
    const flameColors = [
        { core: '#fff8db', mid: '#ff8800', rim: 'rgba(255, 100, 0, 0.45)' }, // 0: Authentic Flickering Candle Amber
        { core: '#e6ffea', mid: '#28dd55', rim: 'rgba(20, 180, 50, 0.45)' }, // 1: Spectral Will-o'-Wisp Green
        { core: '#f5e6ff', mid: '#b038f0', rim: 'rgba(130, 20, 200, 0.45)' }, // 2: Witch Amethyst Fire
        { core: '#fff2db', mid: '#ffaa11', rim: 'rgba(255, 140, 10, 0.45)' }, // 3: Harvest Ember Gold
        { core: '#e0ffff', mid: '#00e5ff', rim: 'rgba(0, 190, 255, 0.45)' },  // 4: Electric Rave Cyan
        { core: '#ffe0f0', mid: '#ff007f', rim: 'rgba(255, 0, 120, 0.45)' }   // 5: Hot Disco Magenta
    ];
    const fc = flameColors[lightType % flameColors.length];

    const mouthGlow = ctx.createRadialGradient(cx, cy + 55, 6, cx, cy + 55, 85);
    mouthGlow.addColorStop(0.0, fc.core);
    mouthGlow.addColorStop(0.35, fc.mid);
    mouthGlow.addColorStop(0.75, fc.rim);
    mouthGlow.addColorStop(1.0, 'transparent');
    ctx.fillStyle = mouthGlow;

    // Fill strictly inside the cutouts using clipping so light never spills onto outer skin as flat paint
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 75, cy - 65); ctx.lineTo(cx - 25, cy - 45); ctx.lineTo(cx - 65, cy - 15); ctx.closePath();
    ctx.moveTo(cx + 75, cy - 65); ctx.lineTo(cx + 25, cy - 45); ctx.lineTo(cx + 65, cy - 15); ctx.closePath();
    ctx.moveTo(cx, cy - 25); ctx.lineTo(cx - 18, cy + 5); ctx.lineTo(cx + 18, cy + 5); ctx.closePath();
    ctx.moveTo(cx - 105, cy + 25);
    ctx.lineTo(cx - 70, cy + 60); ctx.lineTo(cx - 50, cy + 40);
    ctx.lineTo(cx - 20, cy + 68); ctx.lineTo(cx, cy + 42);
    ctx.lineTo(cx + 20, cy + 68); ctx.lineTo(cx + 50, cy + 40);
    ctx.lineTo(cx + 70, cy + 60); ctx.lineTo(cx + 105, cy + 25);
    ctx.lineTo(cx + 80, cy + 85); ctx.lineTo(cx + 45, cy + 65); ctx.lineTo(cx + 25, cy + 88);
    ctx.lineTo(cx - 25, cy + 88); ctx.lineTo(cx - 45, cy + 65); ctx.lineTo(cx - 80, cy + 85);
    ctx.closePath();
    ctx.clip();

    ctx.fillRect(cx - 120, cy - 80, 240, 180);

    ctx.strokeStyle = 'rgba(20, 5, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

// 6g. Possessed Gnarled Bare Silhouette Tree Texture (512x1024)
export function createHauntedGnarledTreeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 1024);
    const cx = 256;

    ctx.fillStyle = '#05080e';
    ctx.strokeStyle = '#05080e';
    ctx.lineCap = 'round';

    // Trunk
    ctx.beginPath();
    ctx.moveTo(cx - 140, 1024);
    ctx.bezierCurveTo(cx - 90, 880, cx - 60, 720, cx - 45, 520);
    ctx.bezierCurveTo(cx - 35, 380, cx - 20, 260, cx, 150);
    ctx.bezierCurveTo(cx + 20, 260, cx + 35, 380, cx + 45, 520);
    ctx.bezierCurveTo(cx + 60, 720, cx + 90, 880, cx + 140, 1024);
    ctx.closePath();
    ctx.fill();

    function drawBranch(x1, y1, x2, y2, x3, y3, w) {
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x2, y2, (x2 + x3) / 2, (y2 + y3) / 2, x3, y3);
        ctx.stroke();
    }

    drawBranch(cx - 40, 550, cx - 140, 480, cx - 220, 360, 26);
    drawBranch(cx - 220, 360, cx - 260, 300, cx - 240, 200, 16);
    drawBranch(cx - 220, 360, cx - 180, 280, cx - 150, 180, 14);
    drawBranch(cx - 30, 420, cx - 120, 340, cx - 190, 260, 20);

    drawBranch(cx + 40, 530, cx + 150, 460, cx + 230, 340, 26);
    drawBranch(cx + 230, 340, cx + 270, 270, cx + 250, 180, 16);
    drawBranch(cx + 230, 340, cx + 190, 260, cx + 160, 170, 14);
    drawBranch(cx + 30, 400, cx + 110, 320, cx + 180, 240, 20);

    drawBranch(cx, 280, cx - 60, 180, cx - 80, 80, 20);
    drawBranch(cx, 220, cx + 70, 130, cx + 100, 50, 18);
    drawBranch(cx, 180, cx + 15, 90, cx + 30, 20, 14);

    // Deep Dark Hollow Knots & Natural Bark Rim Cavities
    function drawKnot(kx, ky, kw, kh) {
        // Dark interior void
        ctx.fillStyle = '#010204';
        ctx.beginPath();
        ctx.ellipse(kx, ky, kw, kh, 0, 0, Math.PI * 2);
        ctx.fill();
        // Gnarled weathered bark ring
        ctx.strokeStyle = '#0e1520';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.ellipse(kx, ky, kw + 2, kh + 3, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawKnot(cx - 15, 620, 18, 28); // Lower trunk knot
    drawKnot(cx + 14, 480, 15, 24); // Mid trunk knot
    drawKnot(cx - 10, 350, 12, 18); // Upper trunk knot

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

// 6h. Predatory Glowing Creature Eyes Sprite Texture (Vivid Piercing Nightclub Glare)
export function createHauntedEyesTexture(isRed = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);

    function drawEye(cx, cy) {
        // High-intensity radiant supernatural aura
        const auraGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 32);
        if (isRed) {
            auraGrad.addColorStop(0.0, 'rgba(255, 40, 40, 1.0)');
            auraGrad.addColorStop(0.35, 'rgba(255, 10, 30, 0.75)');
            auraGrad.addColorStop(0.70, 'rgba(180, 0, 20, 0.35)');
            auraGrad.addColorStop(1.0, 'transparent');
        } else {
            auraGrad.addColorStop(0.0, 'rgba(255, 245, 80, 1.0)');
            auraGrad.addColorStop(0.35, 'rgba(255, 180, 10, 0.75)');
            auraGrad.addColorStop(0.70, 'rgba(200, 100, 0, 0.35)');
            auraGrad.addColorStop(1.0, 'transparent');
        }
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, Math.PI * 2);
        ctx.fill();

        // Almond shaped piercing eye contour
        ctx.fillStyle = isRed ? '#ff1e1e' : '#ffee1e';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 16, 8.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner searing white hotspot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 7, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark razor predatory slit pupil
        ctx.fillStyle = '#020103';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 2.4, 7.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pinpoint glistening reflection highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 3.5, cy - 2.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }

    drawEye(84, 64);
    drawEye(172, 64);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}


export function createHauntedBatBodyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const cx = 64, cy = 128;

    ctx.clearRect(0, 0, 128, 256);
    ctx.fillStyle = '#030509';

    // Furry Torso
    ctx.beginPath();
    ctx.ellipse(cx, cy + 15, 22, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tucked Feet / Claws
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 50); ctx.lineTo(cx - 14, cy + 62); ctx.lineTo(cx - 6, cy + 56); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy + 50); ctx.lineTo(cx + 14, cy + 62); ctx.lineTo(cx + 6, cy + 56); ctx.fill();

    // Furry Neck Ruff & Head
    ctx.beginPath();
    ctx.ellipse(cx, cy - 22, 18, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Large Pointed Bat Ears
    // Left ear
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 26);
    ctx.lineTo(cx - 22, cy - 62);
    ctx.lineTo(cx - 4, cy - 36);
    ctx.closePath();
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy - 26);
    ctx.lineTo(cx + 22, cy - 62);
    ctx.lineTo(cx + 4, cy - 36);
    ctx.closePath();
    ctx.fill();

    // Inner ear ridges
    ctx.strokeStyle = '#0e1624';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 12, cy - 32); ctx.lineTo(cx - 17, cy - 54); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 12, cy - 32); ctx.lineTo(cx + 17, cy - 54); ctx.stroke();

    // Glowing Crimson Eyes
    ctx.fillStyle = '#ff2233';
    ctx.beginPath(); ctx.arc(cx - 7, cy - 22, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 7, cy - 22, 2.8, 0, Math.PI * 2); ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// 7b. Vampire Bat Single Articulated Wing (256x256 - Left Wing, Rooted at right edge)
export function createHauntedBatWingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 256, 256);

    // Shoulder root connects at right edge (245, 128)
    const rootX = 245, rootY = 128;

    // Leathery dark membrane
    ctx.fillStyle = '#04070d';
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    // Upper arm bone leading to elbow/knuckle
    ctx.quadraticCurveTo(150, 60, 40, 95); // main wing tip apex (Digit II)
    // Scalloped trailing membrane edges between finger struts
    ctx.quadraticCurveTo(75, 125, 90, 160); // Digit III strut tip
    ctx.quadraticCurveTo(125, 150, 145, 185); // Digit IV strut tip
    ctx.quadraticCurveTo(180, 165, 205, 195); // Digit V strut tip
    ctx.quadraticCurveTo(230, 160, rootX, rootY + 45); // flank connection
    ctx.closePath();
    ctx.fill();

    // Slender finger bones radiating from knuckle (130, 80)
    ctx.strokeStyle = '#0e1624';
    ctx.lineWidth = 2.5;
    // Arm bone
    ctx.beginPath(); ctx.moveTo(rootX, rootY); ctx.quadraticCurveTo(185, 95, 130, 80); ctx.stroke();
    // Digit II (wing tip)
    ctx.beginPath(); ctx.moveTo(130, 80); ctx.quadraticCurveTo(80, 85, 40, 95); ctx.stroke();
    // Digit III
    ctx.beginPath(); ctx.moveTo(130, 80); ctx.quadraticCurveTo(105, 125, 90, 160); ctx.stroke();
    // Digit IV
    ctx.beginPath(); ctx.moveTo(130, 80); ctx.quadraticCurveTo(138, 140, 145, 185); ctx.stroke();
    // Digit V
    ctx.beginPath(); ctx.moveTo(130, 80); ctx.quadraticCurveTo(175, 150, 205, 195); ctx.stroke();

    // Subtle moonlit rim specular highlight along leading edge
    ctx.strokeStyle = 'rgba(195, 225, 255, 0.35)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(rootX, rootY - 4);
    ctx.quadraticCurveTo(150, 56, 40, 95);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// 7c. Wicked Flying Witch on Broomstick Silhouette (Clean Vector Template from User with Hat on Head)
export function createHauntedWitchTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 404;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, 512, 404);
        ctx.drawImage(img, 0, 0, 512, 404);
        tex.needsUpdate = true;
    };
    img.src = '/images/witch_silhouette_tight.png';
    return tex;
}

// 8. Soft Volumetric Graveyard Fog / Mist Particle Puff (512x512 - Ultra-Soft Feathered Falloff)
export function createHauntedMistPuffTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const cx = 256, cy = 256;

    // Multi-layered soft Gaussian radial gradient
    const radGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 240);
    radGrad.addColorStop(0.0, 'rgba(225, 240, 255, 0.75)');
    radGrad.addColorStop(0.25, 'rgba(180, 215, 250, 0.45)');
    radGrad.addColorStop(0.55, 'rgba(110, 155, 210, 0.20)');
    radGrad.addColorStop(0.80, 'rgba(60, 95, 145, 0.06)');
    radGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 240, 0, Math.PI * 2);
    ctx.fill();

    // Wispy organic noise puffs inside for natural smoke texture
    for (let p = 0; p < 14; p++) {
        const px = cx + (Math.random() - 0.5) * 140;
        const py = cy + (Math.random() - 0.5) * 80;
        const pr = 45 + Math.random() * 85;
        const pGrad = ctx.createRadialGradient(px, py, 4, px, py, pr);
        pGrad.addColorStop(0.0, 'rgba(215, 238, 255, 0.28)');
        pGrad.addColorStop(0.5, 'rgba(150, 195, 240, 0.12)');
        pGrad.addColorStop(1.0, 'transparent');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

// Offscreen High-Resolution Matrix Katakana & Cypher Glyph Atlas Generator (1024x1024)
export function createMatrixGlyphTexture() {
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

