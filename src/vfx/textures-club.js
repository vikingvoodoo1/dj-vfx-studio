import * as THREE from 'three';

// Offscreen Round Star Texture Generator
export function createRoundStarTexture() {
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
export function createStarburstTexture() {
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
export function createAnamorphicFlareTexture() {
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
export function createDiscoNormalMap() {
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
export function createDiscoRoughnessMap() {
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
export function createDiscoMetalnessMap() {
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
export function createDiscoTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Clean neutral dark charcoal grout seam
    ctx.fillStyle = '#121316';
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
            const baseLum = Math.floor(215 + (rand - 0.5) * 55); // 187..242 (bright pure silver)

            // Pure neutral monochrome silver mirror facet (zero color cast)
            const lum = Math.min(255, baseLum);

            // Tile body
            ctx.fillStyle = `rgb(${lum}, ${lum}, ${lum})`;
            ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2);

            // Pure white specular bevel highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillRect(x + 1, y + 1, tileW - 2, 1);
            ctx.fillRect(x + 1, y + 1, 1, tileH - 2);

            // Neutral glass depth edge shadow
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

// Offscreen Jack-o'-Lantern Carved Pumpkin Face Texture for Disco Ball
export function createPumpkinJackFaceTexture() {
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
export function createClubEnvironmentMap(renderer) {
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

// Offscreen Pure Silver / Glass Mirror Studio Equirectangular Environment Map for PMREM Reflections
export function createSilverGlassEnvironmentMap(renderer) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep neutral studio ambient backdrop (pure monochrome dark slate / charcoal)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
    bgGrad.addColorStop(0, '#030406');
    bgGrad.addColorStop(0.25, '#080a0e');
    bgGrad.addColorStop(0.75, '#06070a');
    bgGrad.addColorStop(1, '#020204');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // High-contrast pure diamond white & platinum silver studio light panels & pinspots
    const silverSources = [
        { x: 180, y: 130, r: 95, col: '#ffffff', core: '#ffffff' },
        { x: 820, y: 130, r: 95, col: '#ffffff', core: '#ffffff' },
        { x: 512, y: 80, r: 120, col: '#f4f8fc', core: '#ffffff' },
        { x: 340, y: 220, r: 75, col: '#edf2f8', core: '#ffffff' },
        { x: 680, y: 220, r: 75, col: '#edf2f8', core: '#ffffff' },
        { x: 100, y: 280, r: 65, col: '#ffffff', core: '#ffffff' },
        { x: 920, y: 280, r: 65, col: '#ffffff', core: '#ffffff' },
        { x: 512, y: 290, r: 140, col: '#ffffff', core: '#ffffff' },
        { x: 260, y: 380, r: 55, col: '#e8eff6', core: '#ffffff' },
        { x: 760, y: 380, r: 55, col: '#e8eff6', core: '#ffffff' }
    ];

    silverSources.forEach(s => {
        const grad = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.r);
        grad.addColorStop(0, s.core);
        grad.addColorStop(0.25, s.col);
        grad.addColorStop(0.65, 'rgba(235, 242, 250, 0.35)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
    });

    // Overhead truss pure white studio light strip bars
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, 50); ctx.lineTo(1024, 50);
    ctx.stroke();

    ctx.strokeStyle = '#e6eff8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 110); ctx.lineTo(1024, 110);
    ctx.stroke();

    ctx.strokeStyle = '#f2f7fc';
    ctx.lineWidth = 5;
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
export function createVolumetricBeamTexture() {
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
export function createFloorTileTexture() {
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

