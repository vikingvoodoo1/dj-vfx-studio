// DJ Deck Time Formatter (MM:SS.ms)
export function formatDeckTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const ms = Math.floor((totalSeconds - s) * 10);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`;
}

// 2D High-Resolution DJ Deck HUD Overlay Renderer (Deck 1 / Master, Deck 2 / Sync & Center Phase Meter)
// Universal Album Artwork Loader for DJ Deck HUD
export function loadDeckArtwork(title, artist, targetDeck = null) {
    if (!title && !artist) return;
    const cleanT = (title || "").trim();
    const cleanA = (artist || "").trim();
    const q = cleanA ? `${cleanA} ${cleanT}` : cleanT;

    fetch(`/api/artwork?title=${encodeURIComponent(cleanT)}&artist=${encodeURIComponent(cleanA)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (data && data.success && data.coverart) {
                return data.coverart;
            }
            return fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=1`)
                .then(r => r.ok ? r.json() : null)
                .then(itData => {
                    if (itData && itData.results && itData.results[0] && itData.results[0].artworkUrl100) {
                        return itData.results[0].artworkUrl100.replace(/\/\d+x\d+bb\.jpg/i, "/600x600bb.jpg");
                    }
                    return null;
                });
        })
        .then(artUrl => {
            if (artUrl && targetDeck) {
                targetDeck.artworkUrl = artUrl;
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    targetDeck.artworkImg = img;
                };
                img.src = artUrl;
            }
        })
        .catch(() => {});
}

// Authentic incandescent vintage light bulb flicker model extracted from stock footage webm
// Simulates dynamic thermal sags (cooling down to burnt red ember wire) and surges (white-hot golden flares)
// with continuous thermal inertia, 50Hz/60Hz AC mains vibration, and non-repeating analog wander
export function getVintageBulbFlicker(timeSec, seedOffset = 0) {
    const time = timeSec + seedOffset;
    const cycle = (time * 0.217) % 1.0;
    
    let sag = 0.0;
    // Sag 1: 00:02 dip to ember (phase 0.12 - 0.20)
    if (cycle > 0.12 && cycle < 0.20) {
        const p = (cycle - 0.12) / 0.08;
        sag -= 0.52 * Math.sin(p * Math.PI);
    }
    // Surge 1: 00:03 flare (phase 0.20 - 0.28)
    else if (cycle >= 0.20 && cycle < 0.28) {
        const p = (cycle - 0.20) / 0.08;
        sag += 0.22 * Math.sin(p * Math.PI);
    }
    // Sag 2: 00:04 deep ember dip (phase 0.38 - 0.48)
    else if (cycle > 0.38 && cycle < 0.48) {
        const p = (cycle - 0.38) / 0.10;
        sag -= 0.68 * Math.sin(p * Math.PI);
    }
    // Surge 2: 00:05 massive white-hot flare (phase 0.48 - 0.58)
    else if (cycle >= 0.48 && cycle < 0.58) {
        const p = (cycle - 0.48) / 0.10;
        sag += 0.28 * Math.sin(p * Math.PI);
    }
    // Sag 3: 00:09 gentle dip (phase 0.72 - 0.80)
    else if (cycle > 0.72 && cycle < 0.80) {
        const p = (cycle - 0.72) / 0.08;
        sag -= 0.45 * Math.sin(p * Math.PI);
    }

    // High-speed 50Hz/60Hz AC filament vibration
    const hum = Math.sin(time * 314.16) * 0.035 + Math.sin(time * 628.3) * 0.02;
    // Organic multi-harmonic wander
    const wander = Math.sin(time * 7.3) * 0.04 + Math.sin(time * 19.1) * 0.025;

    return Math.max(0.25, Math.min(1.32, 0.96 + sag + hum + wander));
}

export function getVintageBulbStyle(flickerVal) {
    const heat = Math.max(0.0, Math.min(1.0, (flickerVal - 0.25) / 1.05));
    let rCore, gCore, bCore;
    if (heat < 0.5) {
        const u = heat / 0.5;
        rCore = Math.round(220 + u * (255 - 220));
        gCore = Math.round(55 + u * (195 - 55));
        bCore = Math.round(10 + u * (45 - 10));
    } else {
        const u = (heat - 0.5) / 0.5;
        rCore = 255;
        gCore = Math.round(195 + u * (255 - 195));
        bCore = Math.round(45 + u * (245 - 45));
    }
    const auraAlpha = 0.10 + heat * 0.75;
    const auraSpread = 0.35 + heat * 0.65;
    const shadowSpread = 0.30 + heat * 0.70;

    return {
        flicker: flickerVal,
        heat,
        coreColor: `rgb(${rCore}, ${gCore}, ${bCore})`,
        specularColor: (heat > 0.55) ? `rgba(255, 255, 255, ${(heat - 0.55) / 0.45 * 0.95})` : 'transparent',
        auraColorInner: `rgba(255, ${Math.round(140 + heat * 75)}, ${Math.round(20 + heat * 60)}, ${auraAlpha * 0.85})`,
        auraColorOuter: `rgba(255, ${Math.round(100 + heat * 35)}, 10, ${auraAlpha * 0.35})`,
        shadowColor: `rgba(255, ${Math.round(120 + heat * 45)}, 20, 0.95)`,
        auraSpread,
        shadowSpread
    };
}

// Authentic Caribbean / Pirates of the Caribbean Tavern Candlelight Model
// Simulates a tallow candle burning inside an open wicker basket lantern:
// rapid micro-flutters from drafts, irregular deep guttering dips, oxygen flare-ups, and natural flame dance
export function getPiratesCandleFlicker(timeSec, seedOffset = 0) {
    const t = timeSec * 1.45 + seedOffset;
    
    // 1. High-frequency chaotic flutter (drafts catching the flame: 10Hz - 24Hz)
    const flutter = Math.sin(t * 78.5) * 0.10 
                  + Math.sin(t * 123.4) * 0.07 
                  + Math.sin(t * 189.2) * 0.05;
                  
    // 2. Medium speed turbulence (flame licking & air eddies: 2Hz - 7Hz)
    const turbulence = Math.sin(t * 14.3) * 0.13 
                     + Math.cos(t * 23.7) * 0.09 
                     + Math.sin(t * 37.1) * 0.06;

    // 3. Low-frequency natural flame breathing & draft wander
    const wander = Math.sin(t * 2.8) * 0.15 + Math.cos(t * 5.1) * 0.10;

    // 4. Irregular Guttering (Sudden sea breeze gust blowing into wicker lattice)
    // and Sudden Flare (flame leaps up with fresh oxygen)
    const gustCycle = (t * 0.19) % 1.0;
    let gust = 0.0;
    // Gust 1: sudden deep drop into ember guttering (phase 0.14 - 0.22)
    if (gustCycle > 0.14 && gustCycle < 0.22) {
        const p = (gustCycle - 0.14) / 0.08;
        gust -= 0.65 * Math.sin(p * Math.PI);
    }
    // Flare 1: explosive flare-up recovery right after guttering (phase 0.22 - 0.28)
    else if (gustCycle >= 0.22 && gustCycle < 0.28) {
        const p = (gustCycle - 0.22) / 0.06;
        gust += 0.44 * Math.sin(p * Math.PI);
    }
    // Gust 2: sharp flicker stutter (phase 0.45 - 0.52)
    else if (gustCycle > 0.45 && gustCycle < 0.52) {
        const p = (gustCycle - 0.45) / 0.07;
        gust -= 0.50 * Math.sin(p * Math.PI);
    }
    // Flare 2: bright lick (phase 0.52 - 0.57)
    else if (gustCycle >= 0.52 && gustCycle < 0.57) {
        const p = (gustCycle - 0.52) / 0.05;
        gust += 0.38 * Math.sin(p * Math.PI);
    }
    // Gust 3: gentle gutter (phase 0.78 - 0.85)
    else if (gustCycle > 0.78 && gustCycle < 0.85) {
        const p = (gustCycle - 0.78) / 0.07;
        gust -= 0.42 * Math.sin(p * Math.PI);
    }

    const raw = 0.88 + flutter + turbulence + wander + gust;
    return Math.max(0.12, Math.min(1.65, raw));
}

// -------------------------------------------------------------------------
// PROCEDURAL BURNING VINYL RECORD ON FIRE (ARMED - READY STANDBY ARTWORK)
// -------------------------------------------------------------------------
export function drawFlameRing(ctx, cx, cy, r, animTime, scale = 1.0, isBack = false) {
    const numTongues = 16;
    ctx.shadowColor = 'rgba(255, 80, 0, 0.75)';
    ctx.shadowBlur = 8;

    for (let i = 0; i < numTongues; i++) {
        const angle = (i / numTongues) * Math.PI * 2;
        const isUpper = Math.sin(angle) < 0.2;
        if (isBack && !isUpper) continue;
        if (!isBack && isUpper && Math.abs(Math.cos(angle)) < 0.5) continue;

        // Upward buoyancy factor (convection points flames upward toward -Y)
        const upwardBias = Math.max(0.2, (0.5 - Math.sin(angle) * 0.7));
        const flick1 = Math.sin(animTime * 12.0 + i * 2.3) * 3.5;
        const flick2 = Math.cos(animTime * 9.0 + i * 1.7) * 2.2;
        const flameHeight = (10 + flick1 + flick2) * upwardBias * scale;

        const baseX = cx + Math.cos(angle) * r;
        const baseY = cy + Math.sin(angle) * r;

        // Tip of flame stretches upward with lateral thermal curl
        const tipX = baseX + Math.cos(angle) * (flameHeight * 0.4) + Math.sin(animTime * 7.0 + i) * 2.5;
        const tipY = baseY - flameHeight;

        // Outer Orange/Crimson flame envelope
        ctx.beginPath();
        ctx.moveTo(baseX - 3.5, baseY);
        ctx.quadraticCurveTo(baseX - 4, baseY - flameHeight * 0.5, tipX, tipY);
        ctx.quadraticCurveTo(baseX + 4, baseY - flameHeight * 0.5, baseX + 3.5, baseY);
        ctx.closePath();
        ctx.fillStyle = isBack ? 'rgba(255, 60, 0, 0.65)' : 'rgba(255, 110, 0, 0.85)';
        ctx.fill();

        // Inner Yellow/White thermal core
        if (flameHeight > 7) {
            ctx.beginPath();
            ctx.moveTo(baseX - 1.8, baseY);
            ctx.quadraticCurveTo(baseX - 1.5, baseY - flameHeight * 0.4, tipX, tipY + 2.5);
            ctx.quadraticCurveTo(baseX + 1.5, baseY - flameHeight * 0.4, baseX + 1.8, baseY);
            ctx.closePath();
            ctx.fillStyle = isBack ? 'rgba(255, 190, 50, 0.75)' : 'rgba(255, 245, 150, 0.95)';
            ctx.fill();
        }
    }
}

export function drawBurningRecord(ctx, artX, artY, artSize, defaultColor = '#ff6600') {
    const cx = artX + artSize / 2;
    const cy = artY + artSize / 2;
    const r = artSize * 0.44;
    const animTime = performance.now() * 0.001;
    const rot = animTime * 0.8;

    // 1. Charcoal & Soot Burnt Sleeve Bed
    const bgGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, artSize * 0.72);
    bgGrad.addColorStop(0, '#1c100a');
    bgGrad.addColorStop(0.65, '#0d0705');
    bgGrad.addColorStop(1, '#050302');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(artX, artY, artSize, artSize);

    // 2. Base Fiery Aura / Convection Heat Haze
    ctx.save();
    const auraGrad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy - 6, r * 1.35);
    auraGrad.addColorStop(0, 'rgba(255, 90, 0, 0.45)');
    auraGrad.addColorStop(0.5, 'rgba(255, 50, 0, 0.22)');
    auraGrad.addColorStop(1, 'rgba(180, 20, 0, 0.0)');
    ctx.fillStyle = auraGrad;
    ctx.fillRect(artX, artY, artSize, artSize);
    ctx.restore();

    // 3. Flame Tongues (Behind the Vinyl - Leaping upwards from back rim)
    ctx.save();
    drawFlameRing(ctx, cx, cy, r, animTime, 0.95, true);
    ctx.restore();

    // 4. Burnt Grooved Vinyl Record
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    // Main charred disc body
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const discGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    discGrad.addColorStop(0, '#1c1410');
    discGrad.addColorStop(0.4, '#120d0a');
    discGrad.addColorStop(0.85, '#0a0705');
    discGrad.addColorStop(1, '#1a0802');
    ctx.fillStyle = discGrad;
    ctx.fill();
    ctx.strokeStyle = '#3d1c08';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Concentric Micro-Grooves with Dynamic Light Sheen
    const grooveRadii = [r * 0.90, r * 0.82, r * 0.74, r * 0.66, r * 0.58, r * 0.50, r * 0.42];
    ctx.lineWidth = 0.65;
    for (let i = 0; i < grooveRadii.length; i++) {
        const gr = grooveRadii[i];
        ctx.beginPath();
        ctx.arc(0, 0, gr, 0, Math.PI * 2);
        ctx.strokeStyle = (i % 2 === 0) ? 'rgba(255, 170, 70, 0.16)' : 'rgba(255, 120, 40, 0.09)';
        ctx.stroke();
    }

    // Anisotropic Vinyl Light Refraction Wedges
    const wedgeGrad = ctx.createLinearGradient(-r, -r, r, r);
    wedgeGrad.addColorStop(0, 'rgba(255, 180, 80, 0.12)');
    wedgeGrad.addColorStop(0.5, 'transparent');
    wedgeGrad.addColorStop(1, 'rgba(255, 180, 80, 0.12)');
    ctx.fillStyle = wedgeGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, -0.4, 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, Math.PI - 0.4, Math.PI + 0.4);
    ctx.closePath();
    ctx.fill();

    // 5. Molten Solar/Lava Spindle Label
    const labelR = r * 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, labelR, 0, Math.PI * 2);
    const labelGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, labelR);
    labelGrad.addColorStop(0, '#fff4b8');
    labelGrad.addColorStop(0.35, '#ff9900');
    labelGrad.addColorStop(0.8, '#d83600');
    labelGrad.addColorStop(1, '#661400');
    ctx.fillStyle = labelGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffa200';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Spindle Hole
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = '#060302';
    ctx.fill();
    ctx.strokeStyle = '#ffe082';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore(); // Restore disc rotation

    // 6. Foreground Fiery Tongues (Licking over the front rim & sides)
    ctx.save();
    drawFlameRing(ctx, cx, cy, r, animTime, 1.0, false);
    ctx.restore();

    // 7. Rising Micro-Embers & Sparks
    ctx.save();
    for (let k = 0; k < 9; k++) {
        const seed = k * 1.371;
        const emberCycle = (animTime * 0.65 + k * 0.113) % 1.0;
        const emberY = (cy + r * 0.3) - emberCycle * (artSize * 0.82);
        const emberX = cx + Math.sin(animTime * 4.0 + seed) * (r * 0.72) + (Math.cos(seed * 3.1) * (r * 0.3));
        const emberAlpha = Math.sin(emberCycle * Math.PI);
        const emberR = 0.8 + (k % 3) * 0.45;

        ctx.fillStyle = (k % 2 === 0) 
            ? `rgba(255, 230, 120, ${emberAlpha.toFixed(2)})` 
            : `rgba(255, 120, 30, ${emberAlpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(emberX, emberY, emberR, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Dynamic Overview Track Bar Animation State (realigns active on-air deck to top track bar)
let animDeck1BarY = 126.0;
let animDeck2BarY = 182.0;
let animDeck1Smoke = 0.0;
let animDeck2Smoke = 0.0;

/**
 * Procedural Hellfire Convective Smoke Plumes
 * Billows realistic rising convective smoke curls and glowing embers off the outgoing overview waveform rail
 */
export function drawRailSmoke(ctx, railX, railY, railW, railH, intensity, animTime) {
    if (intensity < 0.01) return;

    ctx.save();

    // 1. Smoldering Ember Thermal Edge along top rim of rail
    const rimH = 16;
    const rimGrad = ctx.createLinearGradient(railX, railY - rimH, railX, railY + 4);
    rimGrad.addColorStop(0, 'rgba(255, 60, 0, 0.0)');
    rimGrad.addColorStop(0.60, `rgba(255, 110, 20, ${0.45 * intensity})`);
    rimGrad.addColorStop(0.88, `rgba(255, 180, 40, ${0.80 * intensity})`);
    rimGrad.addColorStop(1, `rgba(255, 80, 10, ${0.35 * intensity})`);
    ctx.fillStyle = rimGrad;
    ctx.fillRect(railX, railY - rimH, railW, rimH + 4);

    // 2. Charred Soot Overlay on the rail itself to indicate smoldering/dissolution
    ctx.fillStyle = `rgba(12, 6, 4, ${0.45 * intensity})`;
    ctx.beginPath();
    ctx.roundRect(railX, railY, railW, railH, 6);
    ctx.fill();

    // 3. Volumetric Convective Smoke Plumes (rising 85px upwards off the rail towards the top)
    const puffCount = 16;
    for (let i = 0; i < puffCount; i++) {
        const seed = i * 1.371;
        const speed = 0.35 + (i % 5) * 0.09;
        const phase = (i * 0.29 + seed) % 1.0;
        const prog = (animTime * speed + phase) % 1.0;

        // Base X distributed across rail with turbulent jitter
        const baseX = railX + 16 + ((i + 0.5) / puffCount) * (railW - 32);
        const curlX = Math.sin(animTime * 2.8 + seed * 3.1 + prog * 4.5) * (18.0 * prog);
        const px = baseX + curlX;

        // Rises upwards from railY
        const riseH = 85.0 * prog;
        const py = railY - riseH + 6;

        // Radius expands with height (from 9px near rail to 36px high up)
        const pr = 9.0 + prog * 28.0;

        // Alpha envelope: quick rise, lingers, disperses near apex
        const alpha = intensity * Math.sin(prog * Math.PI) * 0.52;
        if (alpha <= 0.01) continue;

        // Radial smoke puff gradient (hot smoldering core -> charcoal body -> transparent plume)
        const pGrad = ctx.createRadialGradient(px - pr * 0.15, py + pr * 0.1, pr * 0.08, px, py, pr);
        pGrad.addColorStop(0.0, `rgba(65, 42, 32, ${alpha * 0.85})`);
        pGrad.addColorStop(0.30, `rgba(42, 28, 22, ${alpha * 0.65})`);
        pGrad.addColorStop(0.70, `rgba(24, 18, 15, ${alpha * 0.38})`);
        pGrad.addColorStop(1.0, 'rgba(12, 8, 6, 0.0)');

        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
    }

    // 4. Floating Micro-Embers / Sparks rising with thermal draft (direct Skia rasterization without GPU blur stalls)
    const sparkCount = 16;
    for (let s = 0; s < sparkCount; s++) {
        const sSeed = s * 2.73;
        const sSpeed = 0.70 + (s % 4) * 0.22;
        const sProg = (animTime * sSpeed + s * 0.39) % 1.0;
        const sx = railX + 20 + ((s * 97 + 13) % (railW - 40)) + Math.sin(animTime * 4.2 + sSeed) * 16.0;
        const sy = railY - (sProg * 95.0);
        const sAlpha = intensity * (1.0 - sProg) * (0.55 + 0.45 * Math.sin(animTime * 22.0 + s * 4.7));

        if (sAlpha <= 0.02) continue;

        const sparkR = 1.2 + (s % 3) * 0.6;
        // Corona
        ctx.fillStyle = (s % 2 === 0) ? `rgba(255, 140, 20, ${sAlpha * 0.45})` : `rgba(255, 80, 0, ${sAlpha * 0.45})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sparkR * 2.0, 0, Math.PI * 2);
        ctx.fill();
        // Core
        ctx.fillStyle = (s % 2 === 0) ? `rgba(255, 245, 180, ${sAlpha})` : `rgba(255, 180, 70, ${sAlpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sparkR, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Persistent module-level cache for static mini waveform overview rails
const _railWaveformCache = new Map();

export function renderDJDeckHUD(ctx, width, height, d1, d2, bpm, beatPhase, transient, prog1, prog2, d1Weight = 1.0, d2Weight = 0.0, primaryDeck = 1, audio = null, d1VisibleInScene = null, d2VisibleInScene = null) {
    if (typeof d1Weight === 'boolean') {
        const wasActive = d1Weight;
        d1Weight = wasActive ? 0.0 : 1.0;
        d2Weight = wasActive ? 1.0 : 0.0;
        primaryDeck = wasActive ? 2 : 1;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    const padX = 70;
    const rightX = width - padX;

    function drawGlassPanel(x, y, w, h, radius, bgCol, borderCol) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.fillStyle = bgCol;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = borderCol;
        ctx.stroke();
    }

    function hexToRgba(hex, alpha = 1.0) {
        let clean = (hex || '#ef8130').replace('#', '');
        if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
        const r = parseInt(clean.substring(0, 2), 16) || 239;
        const g = parseInt(clean.substring(2, 4), 16) || 129;
        const b = parseInt(clean.substring(4, 6), 16) || 48;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function darkenHex(hex, factor = 0.25) {
        let clean = (hex || '#ef8130').replace('#', '');
        if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
        let r = Math.max(0, Math.floor((parseInt(clean.substring(0, 2), 16) || 239) * (1 - factor)));
        let g = Math.max(0, Math.floor((parseInt(clean.substring(2, 4), 16) || 129) * (1 - factor)));
        let b = Math.max(0, Math.floor((parseInt(clean.substring(4, 6), 16) || 48) * (1 - factor)));
        return `rgb(${r}, ${g}, ${b})`;
    }

    function lightenHex(hex, factor = 0.20) {
        let clean = (hex || '#ef8130').replace('#', '');
        if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
        let r = Math.min(255, Math.floor((parseInt(clean.substring(0, 2), 16) || 239) + (255 - (parseInt(clean.substring(0, 2), 16) || 239)) * factor));
        let g = Math.min(255, Math.floor((parseInt(clean.substring(2, 4), 16) || 129) + (255 - (parseInt(clean.substring(2, 4), 16) || 129)) * factor));
        let b = Math.min(255, Math.floor((parseInt(clean.substring(4, 6), 16) || 48) + (255 - (parseInt(clean.substring(4, 6), 16) || 48)) * factor));
        return `rgb(${r}, ${g}, ${b})`;
    }

    // -------------------------------------------------------------------------
    // VINTAGE EDISON LED FILAMENT DRAWING UTILITIES
    // -------------------------------------------------------------------------
    function drawEdisonFilamentNeedle(needleX, topY, height, bulbStyle, deckNum, deckColor, label = '') {
        ctx.save();
        const botY = topY + height;

        // 1. Broad Candlelight Plasma Aura
        const ambW = 34.0 * bulbStyle.auraSpread;
        const ambGrad = ctx.createLinearGradient(needleX - ambW, 0, needleX + ambW, 0);
        ambGrad.addColorStop(0, 'rgba(255, 100, 10, 0)');
        ambGrad.addColorStop(0.35, bulbStyle.auraColorOuter);
        ambGrad.addColorStop(0.50, bulbStyle.auraColorInner);
        ambGrad.addColorStop(0.65, bulbStyle.auraColorOuter);
        ambGrad.addColorStop(1, 'rgba(255, 100, 10, 0)');
        ctx.fillStyle = ambGrad;
        ctx.fillRect(needleX - ambW, topY - 3, ambW * 2, height + 6);

        // 2. Vintage Edison Tubular Glass Envelope (Cylinder Capsule)
        const tubeW = 10.0;
        ctx.beginPath();
        ctx.roundRect(needleX - tubeW / 2, topY, tubeW, height, 5.0);
        const tubeGrad = ctx.createLinearGradient(needleX - tubeW / 2, 0, needleX + tubeW / 2, 0);
        tubeGrad.addColorStop(0, `rgba(255, 140, 20, ${0.28 * bulbStyle.flicker})`);
        tubeGrad.addColorStop(0.5, `rgba(255, 220, 120, ${0.40 * bulbStyle.flicker})`);
        tubeGrad.addColorStop(1, `rgba(255, 140, 20, ${0.28 * bulbStyle.flicker})`);
        ctx.fillStyle = tubeGrad;
        ctx.fill();
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = `rgba(255, 235, 160, ${0.55 * bulbStyle.flicker})`;
        ctx.stroke();

        // Glass specular sheen along left side
        ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * bulbStyle.flicker})`;
        ctx.fillRect(needleX - 3.2, topY + 4, 1.2, height - 8);

        // 3. Radiant Phosphor Jacket Aura
        const auraW = 15.0 * bulbStyle.auraSpread;
        const auraGrad = ctx.createLinearGradient(needleX - auraW, 0, needleX + auraW, 0);
        auraGrad.addColorStop(0, 'rgba(255, 120, 10, 0)');
        auraGrad.addColorStop(0.35, bulbStyle.auraColorOuter);
        auraGrad.addColorStop(0.50, bulbStyle.auraColorInner);
        auraGrad.addColorStop(0.65, bulbStyle.auraColorOuter);
        auraGrad.addColorStop(1, 'rgba(255, 120, 10, 0)');
        ctx.fillStyle = auraGrad;
        ctx.fillRect(needleX - auraW, topY, auraW * 2, height);

        // 4. Glowing Internal LED Filament Wire with Phosphor Micro-Beads
        ctx.shadowColor = bulbStyle.shadowColor;
        ctx.shadowBlur = (14 + (transient || 0) * 6) * bulbStyle.shadowSpread;
        ctx.fillStyle = bulbStyle.coreColor;
        ctx.fillRect(needleX - 1.8, topY + 3, 3.6, height - 6);

        // Luminous micro-beads along the coiled filament (the tiny LED filament chips)
        const beadSpacing = 6.0;
        const numBeads = Math.floor((height - 12) / beadSpacing);
        for (let b = 0; b <= numBeads; b++) {
            const by = topY + 6 + b * beadSpacing;
            ctx.beginPath();
            ctx.arc(needleX, by, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = '#fffce8';
            ctx.fill();
        }

        // Specular ultra-white micro-core thread
        if (bulbStyle.specularColor !== 'transparent') {
            ctx.shadowBlur = 0;
            ctx.fillStyle = bulbStyle.specularColor;
            ctx.fillRect(needleX - 0.75, topY + 4, 1.5, height - 8);
        }

        // 5. Turned Brass / Copper End Caps
        const capGrad = ctx.createLinearGradient(needleX - 6, 0, needleX + 6, 0);
        capGrad.addColorStop(0, '#5c3a02');
        capGrad.addColorStop(0.4, '#ffe590');
        capGrad.addColorStop(0.8, '#c99318');
        capGrad.addColorStop(1, '#5c3a02');

        // Top brass cap
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(needleX, topY + 2, 4.8, 0, Math.PI * 2);
        ctx.fillStyle = capGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 240, 180, 0.85)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Bottom brass cap
        ctx.beginPath();
        ctx.arc(needleX, botY - 2, 4.8, 0, Math.PI * 2);
        ctx.fillStyle = capGrad;
        ctx.fill();
        ctx.stroke();

        // 6. Deck Tag Pill above needle (e.g. "D1" or "D2")
        const tagText = label || `D${deckNum}`;
        ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const tagW = ctx.measureText(tagText).width + 8;
        ctx.beginPath();
        ctx.roundRect(needleX - tagW / 2, topY - 14, tagW, 13, 3);
        ctx.fillStyle = deckColor === '#ff4d2e' ? 'rgba(255, 77, 46, 0.35)' : 'rgba(255, 170, 20, 0.35)';
        ctx.fill();
        ctx.strokeStyle = deckColor;
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(tagText, needleX, topY - 4);

        // Bottom diamond anchor
        ctx.beginPath();
        ctx.moveTo(needleX, botY + 1);
        ctx.lineTo(needleX - 3.5, botY + 5);
        ctx.lineTo(needleX, botY + 9);
        ctx.lineTo(needleX + 3.5, botY + 5);
        ctx.closePath();
        ctx.fillStyle = deckColor;
        ctx.fill();

        ctx.restore();
    }

    function drawEdisonFilamentRail(startX, railY, railW, progress, bulbStyle, activeColor = '#ffaa18') {
        ctx.save();
        const activeW = Math.max(0, Math.min(railW, progress * railW));

        // 1. Ambient warm glow along active track
        if (activeW > 2) {
            const hAmbGrad = ctx.createLinearGradient(0, railY - 8, 0, railY + 8);
            hAmbGrad.addColorStop(0, 'transparent');
            hAmbGrad.addColorStop(0.5, bulbStyle.auraColorOuter);
            hAmbGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = hAmbGrad;
            ctx.fillRect(startX, railY - 8, activeW, 16);
        }

        // 2. Full Glass Tube Rail
        ctx.fillStyle = 'rgba(255, 190, 80, 0.16)';
        ctx.fillRect(startX, railY - 1.8, railW, 3.6);

        // 3. Glowing Active Filament Core (played portion)
        if (activeW > 1) {
            ctx.shadowColor = bulbStyle.shadowColor;
            ctx.shadowBlur = 8 * bulbStyle.shadowSpread;
            ctx.fillStyle = bulbStyle.coreColor;
            ctx.fillRect(startX, railY - 1.0, activeW, 2.0);
            if (bulbStyle.specularColor !== 'transparent') {
                ctx.shadowBlur = 0;
                ctx.fillStyle = bulbStyle.specularColor;
                ctx.fillRect(startX, railY - 0.45, activeW, 0.9);
            }
        }
        ctx.shadowBlur = 0;

        // 4. Brass end caps
        const bCap = ctx.createLinearGradient(startX - 3, 0, startX + 3, 0);
        bCap.addColorStop(0, '#7a5105'); bCap.addColorStop(0.5, '#ffe590'); bCap.addColorStop(1, '#5c3a02');
        ctx.beginPath(); ctx.arc(startX, railY, 2.8, 0, Math.PI * 2); ctx.fillStyle = bCap; ctx.fill();
        ctx.beginPath(); ctx.arc(startX + railW, railY, 2.8, 0, Math.PI * 2); ctx.fillStyle = bCap; ctx.fill();
        ctx.restore();
    }

    function drawMiniWaveform(x, topY, w, h, deckObj, profileType, colorScheme) {
        const hasTrack = Boolean(deckObj && deckObj.title && deckObj.title.trim() !== '' && deckObj.title !== 'No Track Loaded' && deckObj.title !== '—' && !deckObj.unloaded && !deckObj.offline);
        const hasRealSamples = Boolean(hasTrack && Array.isArray(deckObj.samples) && deckObj.samples.length >= 6);

        if (!hasRealSamples) {
            // Track is not loaded or has not been mapped out yet: render sleek standby guide rail without synthetic wave bars
            const deckLabel = (profileType === 2) ? 'DECK 2' : 'DECK 1';
            const midRailY = topY + h * 0.52;

            ctx.save();
            // Subtle brushed track groove slot
            ctx.fillStyle = 'rgba(10, 6, 4, 0.35)';
            ctx.beginPath();
            ctx.roundRect(x + 2, topY + 4, w - 4, h - 8, 4);
            ctx.fill();

            // Dashed standby alignment guide
            ctx.strokeStyle = (profileType === 2) ? 'rgba(255, 77, 46, 0.22)' : 'rgba(255, 170, 0, 0.22)';
            ctx.lineWidth = 1.0;
            ctx.setLineDash([6, 8]);
            ctx.beginPath();
            ctx.moveTo(x + 14, midRailY);
            ctx.lineTo(x + w - 14, midRailY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Standby indicator readout
            ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = (profileType === 2) ? 'rgba(255, 120, 80, 0.38)' : 'rgba(255, 190, 80, 0.38)';
            const standbyText = (deckObj && deckObj.offline)
                ? `[ ${deckLabel} OFFLINE — AWAITING HARDWARE LINK ]`
                : `[ ${deckLabel} ARMED — WAITING FOR TRACK ON ENGINE OS ]`;
            ctx.fillText(standbyText, x + w / 2, midRailY - 6);
            ctx.restore();
            return;
        }

        // Cache waveform bars onto an offscreen canvas: renders 2,160 fillRect calls ONCE per track instead of every frame
        const cacheKey = `${profileType}_${deckObj.title || ''}_${deckObj.samples.length}_${Math.round(w)}_${Math.round(h)}`;
        let cachedCanvas = _railWaveformCache.get(cacheKey);

        if (!cachedCanvas && typeof document !== 'undefined') {
            cachedCanvas = document.createElement('canvas');
            cachedCanvas.width = Math.round(w);
            cachedCanvas.height = Math.round(h);
            const cCtx = cachedCanvas.getContext('2d');

            const numBars = Math.floor(w / 2.5);
            const barW = w / numBars;
            const waveBaseY = h - 5;
            const maxBarH = h - 10;
            const totalTriplets = Math.floor(deckObj.samples.length / 3);

            for (let i = 0; i < numBars; i++) {
                const u = i / numBars;
                const bx = i * barW;

                const sIdx = Math.floor(u * totalTriplets) * 3;
                const r = (deckObj.samples[sIdx] || 0) / 255.0;     // Bass
                const g = (deckObj.samples[sIdx + 1] || 0) / 255.0; // Mid
                const b = (deckObj.samples[sIdx + 2] || 0) / 255.0; // High
                const profile = Math.max(0.06, Math.min(1.0, r * 0.52 + g * 0.34 + b * 0.14));
                const sum = r + g + b + 0.03;
                const subRatio = Math.max(0.12, Math.min(0.85, (r + 0.01) / sum));
                const midRatio = Math.max(subRatio + 0.10, Math.min(0.95, (r + g + 0.01) / sum));

                const totalH = profile * maxBarH;
                const bH = totalH * subRatio;
                const mH = totalH * midRatio;

                // Base layer
                if (bH > 1.0) {
                    cCtx.fillStyle = colorScheme.bass;
                    cCtx.fillRect(bx, waveBaseY - bH, barW - 0.5, bH);
                }
                // Mid layer
                if (mH > bH) {
                    cCtx.fillStyle = colorScheme.mid;
                    cCtx.fillRect(bx, waveBaseY - mH, barW - 0.5, mH - bH);
                }
                // High peak layer
                if (totalH > mH) {
                    cCtx.fillStyle = colorScheme.high;
                    cCtx.fillRect(bx, waveBaseY - totalH, barW - 0.5, totalH - mH);
                }
            }

            // Amber/yellow warm glow wash over waveform
            const washGrad = cCtx.createLinearGradient(0, 0, 0, h);
            washGrad.addColorStop(0.0, colorScheme.washTop);
            washGrad.addColorStop(0.5, colorScheme.washMid);
            washGrad.addColorStop(1.0, 'rgba(255, 80, 0, 0.02)');
            cCtx.fillStyle = washGrad;
            cCtx.fillRect(0, 0, w, h);

            if (_railWaveformCache.size > 8) {
                _railWaveformCache.delete(_railWaveformCache.keys().next().value);
            }
            _railWaveformCache.set(cacheKey, cachedCanvas);
        }

        if (cachedCanvas) {
            ctx.drawImage(cachedCanvas, x, topY);
        }
    }

    // Determine dynamic on-air deck status and track loaded validity
    const hasD1Track = !!(d1 && d1.title && d1.title.trim() !== '' && d1.title !== 'No Track Loaded' && d1.title !== '—' && !d1.unloaded && !d1.offline);
    const hasD2Track = !!(d2 && d2.title && d2.title.trim() !== '' && d2.title !== 'No Track Loaded' && d2.title !== '—' && !d2.unloaded && !d2.offline);
    const hasD2 = Boolean(d2 !== undefined && d2 !== null);

    // Fader scene visibility: if explicitly provided, respect it; otherwise fallback to weight > 0.05
    const d1Visible = (d1VisibleInScene !== null)
        ? Boolean(d1VisibleInScene && hasD1Track)
        : Boolean(hasD1Track && (d1Weight > 0.05 || (d1 && d1.fader > 0.05)));

    const d2Visible = (d2VisibleInScene !== null)
        ? Boolean(d2VisibleInScene && hasD2Track)
        : Boolean(hasD2Track && (d2Weight > 0.05 || (d2 && d2.fader > 0.05)));

    const isDualBlend = d1Visible && d2Visible;

    const d1Bpm = (d1 && d1.bpm && !d1.offline) ? Number(d1.bpm).toFixed(1) : (hasD1Track ? Number(bpm).toFixed(1) : '--.-');
    const d1Title = hasD1Track ? d1.title.toUpperCase() : (d1 && d1.offline ? 'STANDBY — OFFLINE' : 'ARMED - READY');
    const d1Artist = hasD1Track ? (d1.artist || 'LIVE').toUpperCase() : (d1 && d1.offline ? 'DECK 1 OFFLINE • CONNECT HARDWARE' : 'DECK 1 STANDBY • LOAD TRACK ON ENGINE OS');
    const d1Key = hasD1Track ? (d1.key || '9A') : 'STANDBY';
    const totalSec1 = (d1 && d1.duration) ? d1.duration : 364;
    const el1 = prog1 * totalSec1;
    const rem1 = Math.max(0, totalSec1 - el1);

    const d2Bpm = (d2 && d2.bpm && !d2.offline) ? Number(d2.bpm).toFixed(1) : (hasD2Track ? Number(bpm).toFixed(1) : '--.-');
    const d2Title = hasD2Track ? d2.title.toUpperCase() : (d2 && d2.offline ? 'STANDBY — OFFLINE' : 'ARMED - READY');
    const d2Artist = hasD2Track ? (d2.artist || 'LIVE').toUpperCase() : (d2 && d2.offline ? 'DECK 2 OFFLINE • CONNECT HARDWARE' : 'DECK 2 STANDBY • LOAD TRACK ON ENGINE OS');
    const d2Key = hasD2Track ? (d2.key || '8A') : 'STANDBY';
    const totalSec2 = (d2 && d2.duration) ? d2.duration : 360;
    const el2 = prog2 * totalSec2;
    const rem2 = Math.max(0, totalSec2 - el2);

    const totalBeats1 = (d1 && d1.totalBeats) || ((totalSec1 / 60.0) * (Number(d1Bpm) || 126.0));
    const totalBeats2 = (d2 && d2.totalBeats) || ((totalSec2 / 60.0) * (Number(d2Bpm) || 126.0));

    // Active deck selection for moving waveform beat grid, loops, and cues
    let pDeck = 1;
    if (d1Visible && !d2Visible) {
        pDeck = 1;
    } else if (d2Visible && !d1Visible) {
        pDeck = 2;
    } else if (d1Visible && d2Visible) {
        // Both tracks visible in mix: moving waveform follows the on-air primary deck
        pDeck = (primaryDeck === 2) ? 2 : 1;
    } else {
        // Standby / cueing: follow primaryDeck if loaded, or whichever deck has a valid track loaded
        pDeck = (primaryDeck === 2 && hasD2Track) ? 2 : (hasD1Track ? 1 : (hasD2Track ? 2 : 1));
    }
    const pObj = (pDeck === 2) ? d2 : d1;

    const activeProg = (pDeck === 2) ? prog2 : prog1;
    const activeTotalBeats = (pDeck === 2) ? totalBeats2 : totalBeats1;
    const activeLoops = (pDeck === 2)
        ? ((hasD2Track && d2 && d2.loops && d2.loops.length > 0) ? d2.loops : [])
        : ((hasD1Track && d1 && d1.loops && d1.loops.length > 0) ? d1.loops : []);

    const activeCues = (pDeck === 2)
        ? ((hasD2Track && d2 && d2.cues && d2.cues.length > 0) ? d2.cues : [])
        : ((hasD1Track && d1 && d1.cues && d1.cues.length > 0) ? d1.cues : []);

    // =========================================================================
    // 1. DUAL / SINGLE DECK HEADER & TRACK METADATA
    // =========================================================================
    const headerW = width - (padX * 2);
    // Soothing ambient wash
    const headerGrad = ctx.createLinearGradient(padX, 24, padX, 122);
    headerGrad.addColorStop(0.0, 'rgba(14, 10, 6, 0.48)');
    headerGrad.addColorStop(1.0, 'rgba(14, 10, 6, 0.0)');
    ctx.fillStyle = headerGrad;
    ctx.beginPath();
    ctx.roundRect(padX, 24, headerW, 98, 12);
    ctx.fill();

    function drawArtwork(artX, artY, artSize, deckObj, defaultVinylColor = '#ff7700') {
        const hasTrack = Boolean(deckObj && deckObj.title && deckObj.title.trim() !== '' && deckObj.title !== 'No Track Loaded' && deckObj.title !== '—' && !deckObj.unloaded && !deckObj.offline);

        if (hasTrack && deckObj._artTrackTitle !== deckObj.title) {
            deckObj._artTrackTitle = deckObj.title;
            deckObj.artworkImg = null;
            if (deckObj.title && !deckObj.offline && !deckObj.unloaded) {
                loadDeckArtwork(deckObj.title, deckObj.artist, deckObj);
            }
        }

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(artX, artY, artSize, artSize, 8);
        ctx.clip();

        if (hasTrack && deckObj.artworkImg && deckObj.artworkImg.complete && deckObj.artworkImg.naturalWidth > 0) {
            ctx.drawImage(deckObj.artworkImg, artX, artY, artSize, artSize);
        } else if (hasTrack && deckObj.artworkUrl) {
            if (!deckObj.artworkImg) {
                const img = new Image();
                deckObj.artworkImg = img;
                img.crossOrigin = 'anonymous';
                img.src = deckObj.artworkUrl;
            }
            drawBurningRecord(ctx, artX, artY, artSize, defaultVinylColor);
        } else {
            // Deck has NO track loaded yet (or track was unloaded):
            // Replace album art with requested procedural burning record on fire!
            drawBurningRecord(ctx, artX, artY, artSize, defaultVinylColor);
        }
        ctx.restore();

        // Warm ambient shadow / fiery perimeter rim
        ctx.save();
        ctx.shadowColor = hasTrack ? 'rgba(255, 160, 40, 0.28)' : 'rgba(255, 80, 0, 0.65)';
        ctx.shadowBlur = hasTrack ? 8 : 14;
        ctx.beginPath();
        ctx.roundRect(artX, artY, artSize, artSize, 8);
        ctx.strokeStyle = hasTrack ? 'rgba(255, 185, 90, 0.22)' : 'rgba(255, 110, 30, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
    }

    // 1A. DECK 1 TRACK HEADER (Always on Left - Strictly mirrors Deck 1 Track Wave directly below it!)
    const artSize = 76;
    if (d1Visible) {
        ctx.save();
        drawArtwork(padX + 14, 34, artSize, d1, '#ef8130');

        const textStartX = padX + 14 + artSize + 18;
        ctx.textAlign = 'left';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#fff4e2';
        const maxTitleLen1 = hasD2 ? 28 : 46;
        ctx.fillText(d1Title.slice(0, maxTitleLen1), textStartX, 58);

        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#d9c5a5';
        ctx.fillText(d1Artist.slice(0, hasD2 ? 30 : 44), textStartX, 80);

        // Badges Line for Deck 1
        ctx.font = 'bold 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffb74d';
        ctx.fillText(`${d1Bpm} BPM`, textStartX, 103);

        // Key Pill
        const keyPillX = textStartX + 84;
        ctx.beginPath();
        ctx.roundRect(keyPillX, 92, 54, 18, 4);
        ctx.fillStyle = 'rgba(216, 175, 105, 0.18)';
        ctx.fill();
        ctx.fillStyle = '#f3d19e';
        ctx.textAlign = 'center';
        ctx.fillText(`${d1Key} ♪`, keyPillX + 27, 104);

        // Deck 1 Role Pill
        const leadRoleX = keyPillX + 62;
        ctx.beginPath();
        ctx.roundRect(leadRoleX, 92, 104, 18, 4);
        ctx.fillStyle = 'rgba(255, 140, 20, 0.35)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 170, 30, 0.85)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = '#ffe082';
        const d1RoleTag = hasD1Track ? `🔥 D1 ● ON AIR` : (d1 && d1.offline ? `D1 OFFLINE` : `D1 STANDBY`);
        ctx.fillText(d1RoleTag, leadRoleX + 52, 104);
        ctx.restore();
    }

    // 1B. CENTER STATUS PILL (Dual Deck Blend or Active On-Air Deck)
    const centerPillW = 210;
    const centerPillX = width / 2 - centerPillW / 2;
    ctx.beginPath();
    ctx.roundRect(centerPillX, 56, centerPillW, 32, 16);
    ctx.fillStyle = (d2Visible && !d1Visible) ? 'rgba(255, 77, 46, 0.28)' : 'rgba(255, 140, 20, 0.24)';
    ctx.fill();
    ctx.strokeStyle = (d2Visible && !d1Visible) ? 'rgba(255, 90, 50, 0.85)' : 'rgba(255, 170, 30, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#fffaee';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';

    if (d1Visible && d2Visible) {
        if (Math.abs(d1Weight - d2Weight) < 0.25) {
            ctx.fillText('⮂ DUAL DECK BLEND', width / 2, 72);
            ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#ffc266';
            ctx.fillText(`BEAT SYNC • ${(Number(d1Bpm) === Number(d2Bpm)) ? 'LOCKED' : `${d1Bpm} / ${d2Bpm}`}`, width / 2, 84);
        } else if (d1Weight >= d2Weight) {
            ctx.fillText('● DECK 1 ON AIR', width / 2, 72);
            ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#ffc266';
            ctx.fillText(`MASTER • ${d1Bpm} BPM • ${d1Key}`, width / 2, 84);
        } else {
            ctx.fillText('● DECK 2 ON AIR', width / 2, 72);
            ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#ffad99';
            ctx.fillText(`MASTER • ${d2Bpm} BPM • ${d2Key}`, width / 2, 84);
        }
    } else if (d1Visible) {
        ctx.fillText('● DECK 1 ON AIR', width / 2, 72);
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffc266';
        ctx.fillText(`MASTER • ${d1Bpm} BPM • ${d1Key}`, width / 2, 84);
    } else if (d2Visible) {
        ctx.fillText('● DECK 2 ON AIR', width / 2, 72);
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffad99';
        ctx.fillText(`MASTER • ${d2Bpm} BPM • ${d2Key}`, width / 2, 84);
    } else {
        const isAnyOffline = Boolean((d1 && d1.offline) || (d2 && d2.offline));
        ctx.fillText(isAnyOffline ? 'HARDWARE DECKS OFFLINE' : 'ARMED — READY', width / 2, 72);
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffb042';
        ctx.fillText(isAnyOffline ? 'CONNECT HARDWARE • ENGINE OS / PRO DJ LINK' : 'STANDBY • LOAD TRACK & RAISE FADER', width / 2, 84);
    }

    // 1C. DECK 2 TRACK HEADER (Always on Right - Strictly mirrors Deck 2 Track Wave underneath Deck 1!)
    if (d2Visible) {
        ctx.save();
        const d2ArtX = rightX - artSize - 14;
        drawArtwork(d2ArtX, 34, artSize, d2, '#ff4d2e');

        const d2TextEndX = d2ArtX - 18;
        ctx.textAlign = 'right';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffeedd';
        ctx.fillText(d2Title.slice(0, 28), d2TextEndX, 58);

        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#d9bda5';
        ctx.fillText(d2Artist.slice(0, 30), d2TextEndX, 80);

        // Deck 2 Badges
        ctx.font = 'bold 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ff7a59';
        ctx.fillText(`${d2Bpm} BPM`, d2TextEndX, 103);

        const d2KeyPillX = d2TextEndX - 84 - 54;
        ctx.beginPath();
        ctx.roundRect(d2KeyPillX, 92, 54, 18, 4);
        ctx.fillStyle = 'rgba(255, 77, 46, 0.22)';
        ctx.fill();
        ctx.fillStyle = '#ffad99';
        ctx.textAlign = 'center';
        ctx.fillText(`${d2Key} ♪`, d2KeyPillX + 27, 104);

        const d2RoleX = d2KeyPillX - 108;
        ctx.beginPath();
        ctx.roundRect(d2RoleX, 92, 100, 18, 4);
        ctx.fillStyle = 'rgba(255, 77, 46, 0.35)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 100, 60, 0.85)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = '#ffbca8';
        const d2RoleTag = hasD2Track ? '🔥 D2 ● ON AIR' : (d2 && d2.offline ? 'D2 OFFLINE' : 'D2 STANDBY');
        ctx.fillText(d2RoleTag, d2RoleX + 50, 104);
        ctx.restore();
    }

    // =========================================================================
    // 2. VINTAGE EDISON LED FILAMENT TRACK POSITION BARS & OVERVIEW WAVEFORMS
    // =========================================================================
    const nowMsHUD = performance.now();
    const bulbStyle1 = getVintageBulbStyle(getVintageBulbFlicker(nowMsHUD * 0.001, 0.0));
    const bulbStyle2 = getVintageBulbStyle(getVintageBulbFlicker(nowMsHUD * 0.001, 1.4));

    const overviewW = width - (padX * 2);

    const themeDeck1 = {
        bass: '#d95800',
        mid: '#ffaa14',
        high: '#fff6d4',
        washTop: 'rgba(255, 215, 75, 0.28)',
        washMid: 'rgba(255, 155, 30, 0.14)',
        needleCore: '#ffeedd',
        needlePhosphor: '#ffaa18',
        tagColor: '#ffaa18'
    };

    const themeDeck2 = {
        bass: '#d63010',
        mid: '#ff6a20',
        high: '#ffe2a0',
        washTop: 'rgba(255, 120, 60, 0.28)',
        washMid: 'rgba(255, 70, 20, 0.14)',
        needleCore: '#fff0ee',
        needlePhosphor: '#ff4d2e',
        tagColor: '#ff4d2e'
    };

    // -------------------------------------------------------------------------
    // 2. FIXED TRACK POSITION BARS (Deck 1 Top Rail, Deck 2 Bottom Rail Underneath)
    // Deck 1 is strictly on top rail (Y=126) directly below Deck 1 track info
    // Deck 2 is strictly underneath Track 1's wave (Y=182) directly below Deck 2 info
    // Fader down to 0 removes that track completely from the scene!
    // -------------------------------------------------------------------------
    const barH = 50;
    const d1BarY = 126;
    const d2BarY = 182;

    const prog1X = padX + prog1 * overviewW;
    const prog2X = padX + prog2 * overviewW;

    // Track 1 Waveform Rail (Directly below Deck 1 info on the left)
    if (d1Visible) {
        ctx.save();
        ctx.fillStyle = 'rgba(18, 12, 6, 0.45)';
        ctx.beginPath();
        ctx.roundRect(padX, d1BarY, overviewW, barH, 6);
        ctx.fill();

        drawMiniWaveform(padX, d1BarY, overviewW, barH, d1, 1, themeDeck1);

        if (hasD1Track) {
            const rail1Y = d1BarY + barH - 6;
            drawEdisonFilamentRail(padX, rail1Y, overviewW, prog1, bulbStyle1, '#ffaa18');

            const activeLoops1 = (d1 && Array.isArray(d1.loops)) ? d1.loops : [];
            activeLoops1.forEach(loop => {
                const lx1 = padX + loop.startProgress * overviewW;
                const lx2 = padX + (loop.endProgress || (loop.startProgress + 0.01)) * overviewW;
                ctx.fillStyle = hexToRgba(loop.color || '#ef8130', 0.35);
                ctx.fillRect(lx1, d1BarY + 14, Math.max(3, lx2 - lx1), barH - 20);
            });

            const activeCues1 = (d1 && Array.isArray(d1.cues)) ? d1.cues : [];
            activeCues1.forEach(cue => {
                const cx = padX + cue.progress * overviewW;
                ctx.fillStyle = cue.color || '#ef8130';
                ctx.fillRect(cx - 1, d1BarY + 8, 2, barH - 14);
                ctx.beginPath();
                ctx.moveTo(cx, d1BarY + 8);
                ctx.lineTo(cx - 4, d1BarY + 2);
                ctx.lineTo(cx + 4, d1BarY + 2);
                ctx.closePath();
                ctx.fill();
            });

            const el1Min = Math.floor(el1 / 60);
            const el1Sec = Math.floor(el1 % 60);
            const d1Tag = `D1 (ON AIR)  ${el1Min}:${el1Sec.toString().padStart(2, "0")}`;
            drawEdisonFilamentNeedle(prog1X, d1BarY + 12, barH - 18, bulbStyle1, 1, '#ffaa18', d1Tag);
        }
        ctx.restore();

        if (animDeck1Smoke > 0.01) {
            drawRailSmoke(ctx, padX, d1BarY, overviewW, barH, animDeck1Smoke, nowMsHUD * 0.001);
        }
    }

    // Track 2 Waveform Rail (Directly underneath Track 1's wave)
    if (d2Visible) {
        ctx.save();
        ctx.fillStyle = 'rgba(22, 10, 6, 0.45)';
        ctx.beginPath();
        ctx.roundRect(padX, d2BarY, overviewW, barH, 6);
        ctx.fill();

        drawMiniWaveform(padX, d2BarY, overviewW, barH, d2, 2, themeDeck2);

        if (hasD2Track) {
            const rail2Y = d2BarY + barH - 6;
            drawEdisonFilamentRail(padX, rail2Y, overviewW, prog2, bulbStyle2, '#ff4d2e');

            const activeLoops2 = (d2 && Array.isArray(d2.loops)) ? d2.loops : [];
            activeLoops2.forEach(loop => {
                const lx1 = padX + loop.startProgress * overviewW;
                const lx2 = padX + (loop.endProgress || (loop.startProgress + 0.01)) * overviewW;
                ctx.fillStyle = hexToRgba(loop.color || '#ff4d2e', 0.35);
                ctx.fillRect(lx1, d2BarY + 14, Math.max(3, lx2 - lx1), barH - 20);
            });

            const activeCues2 = (d2 && Array.isArray(d2.cues)) ? d2.cues : [];
            activeCues2.forEach(cue => {
                const cx = padX + cue.progress * overviewW;
                ctx.fillStyle = cue.color || '#ff4d2e';
                ctx.fillRect(cx - 1, d2BarY + 8, 2, barH - 14);
                ctx.beginPath();
                ctx.moveTo(cx, d2BarY + 8);
                ctx.lineTo(cx - 4, d2BarY + 2);
                ctx.lineTo(cx + 4, d2BarY + 2);
                ctx.closePath();
                ctx.fill();
            });

            const el2Min = Math.floor(el2 / 60);
            const el2Sec = Math.floor(el2 % 60);
            const d2Tag = `D2 (ON AIR)  ${el2Min}:${el2Sec.toString().padStart(2, "0")}`;
            drawEdisonFilamentNeedle(prog2X, d2BarY + 12, barH - 18, bulbStyle2, 2, '#ff4d2e', d2Tag);
        }
        ctx.restore();

        if (animDeck2Smoke > 0.01) {
            drawRailSmoke(ctx, padX, d2BarY, overviewW, barH, animDeck2Smoke, nowMsHUD * 0.001);
        }
    }

    // Active Transition Alignment Guide & Beat Sync Bridge (rendered when both decks are visible)
    if (d1Visible && d2Visible) {
        ctx.save();
        ctx.lineWidth = 1.5;
        const alignGrad = ctx.createLinearGradient(prog1X, d1BarY, prog2X, d2BarY);
        alignGrad.addColorStop(0, 'rgba(255, 170, 24, 0.75)');
        alignGrad.addColorStop(0.5, 'rgba(255, 240, 160, 0.95)');
        alignGrad.addColorStop(1, 'rgba(255, 77, 46, 0.75)');
        ctx.strokeStyle = alignGrad;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(prog1X, d1BarY + barH / 2);
        ctx.lineTo(prog2X, d2BarY + barH / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Alignment Sync Indicator Bead at the midpoint
        const midX = (prog1X + prog2X) / 2;
        const midY = (d1BarY + d2BarY) / 2 + barH / 2;
        ctx.beginPath();
        ctx.arc(midX, midY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffaa18';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
    }

    // =========================================================================
    // 3. MOVING WAVEFORM GRID OVERLAY (Locked to Active On-Air Deck)
    // =========================================================================
    // If neither deck is loaded or neither is visible in scene, suppress moving waveform
    if ((!hasD1Track && !hasD2Track) || (!d1Visible && !d2Visible)) {
        return;
    }
    const waveTopY = 246;
    const waveBottomY = 778;
    const waveBoxH = waveBottomY - waveTopY;
    const visibleBeats = 32.0; // Fixed 8-bar moving waveform window matching Denon Prime 4 display

    // Hardware-locked center beat directly from StageLinQ telemetry.beat
    const currentCenterBeat = (pObj && pObj.beat !== undefined) 
        ? Number(pObj.beat) 
        : (activeProg * activeTotalBeats);

    const minBeat = Math.max(0, Math.floor(currentCenterBeat - visibleBeats * 0.55));
    const maxBeat = Math.min(Math.floor(activeTotalBeats), Math.ceil(currentCenterBeat + visibleBeats * 0.55));

    // Top Horizontal Rail: Soothing Warm Ambient Thread
    const topAmbGrad = ctx.createLinearGradient(0, waveTopY - 12, 0, waveTopY + 12);
    topAmbGrad.addColorStop(0, 'transparent');
    topAmbGrad.addColorStop(0.5, 'rgba(255, 170, 50, 0.16)');
    topAmbGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = topAmbGrad;
    ctx.fillRect(padX, waveTopY - 12, overviewW, 24);

    ctx.strokeStyle = 'rgba(255, 190, 80, 0.25)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(padX, waveTopY);
    ctx.lineTo(rightX, waveTopY);
    ctx.stroke();

    // 3.0 Moving Waveform Viewport: Clear central window for WebGL procedural "on-fire" shader (DJDeckWaveformShader)

    // 3A. Persistent Loops on Moving Wave: Locked to Active Deck
    activeLoops.forEach(loop => {
        const col = loop.color || ((pDeck === 2) ? '#ff4d2e' : '#ef8130');
        const startBeat = (loop.startBeat !== undefined) ? Number(loop.startBeat) : Math.round(loop.startProgress * activeTotalBeats);
        const loopBeats = (loop.beats !== undefined) ? Number(loop.beats) : Math.max(1, Math.round((loop.endProgress - loop.startProgress) * activeTotalBeats));
        const endBeat = startBeat + loopBeats;
        const lInX = width * 0.5 + (startBeat - currentCenterBeat) * (width / visibleBeats);
        const lOutX = width * 0.5 + (endBeat - currentCenterBeat) * (width / visibleBeats);

        if (lOutX > -100 && lInX < width + 100) {
            const inX = lInX - 0.75;
            const outX = lOutX - 0.75;
            const clampedIn = Math.max(0, inX);
            const clampedOut = Math.min(width, outX);
            const blockW = Math.max(2, clampedOut - clampedIn);

            ctx.fillStyle = hexToRgba(col, 0.38);
            ctx.fillRect(clampedIn, waveTopY, blockW, waveBoxH);

            const headerH = 32;
            ctx.fillStyle = col;
            ctx.fillRect(clampedIn, waveTopY, blockW, headerH);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'left';
            const labelX = Math.max(clampedIn + 14, inX + 14);
            if (labelX < clampedOut - 50) {
                ctx.fillText(loop.name || `Loop ${loop.num}`, labelX, waveTopY + 22);
            }

            const notchW = 68;
            if (inX >= notchW && inX < width) {
                ctx.fillStyle = darkenHex(col, 0.28);
                ctx.fillRect(inX - notchW, waveTopY, notchW, headerH);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`Cue ${loop.num}`, inX - notchW / 2, waveTopY + 22);
            }

            ctx.fillStyle = col;
            ctx.fillRect(inX, waveTopY, 1.5, waveBoxH);
            ctx.fillRect(outX, waveTopY, 1.5, waveBoxH);

            ctx.fillStyle = lightenHex(col, 0.30);
            ctx.fillRect(inX, waveTopY, 10, 3.5);
            ctx.fillRect(inX, waveBottomY - 3.5, 10, 3.5);
            ctx.fillRect(outX - 8.5, waveTopY, 10, 3.5);
            ctx.fillRect(outX - 8.5, waveBottomY - 3.5, 10, 3.5);
        }
    });

    // 3B. Standalone Hot Cues on Moving Wave: Locked to Active Deck
    activeCues.forEach(cue => {
        const hasMatchingLoop = activeLoops.some(l => l.num === cue.num);
        if (hasMatchingLoop) return;

        const cueCol = cue.color || ((pDeck === 2) ? '#ff5722' : '#30c1b9');
        const cueBeat = (cue.beat !== undefined) ? Number(cue.beat) : Math.round(cue.progress * activeTotalBeats);
        const cueX = width * 0.5 + (cueBeat - currentCenterBeat) * (width / visibleBeats);
        const inX = cueX - 0.75;

        if (cueX >= -70 && cueX <= width + 70) {
            ctx.fillStyle = cueCol;
            ctx.fillRect(inX, waveTopY, 1.5, waveBoxH);

            const notchW = 68;
            const headerH = 32;
            if (inX >= notchW && inX < width) {
                ctx.fillStyle = darkenHex(cueCol, 0.28);
                ctx.fillRect(inX - notchW, waveTopY, notchW, headerH);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(cue.name || `Cue ${cue.num}`, inX - notchW / 2, waveTopY + 22);
            }
        }
    });

    // 3C. Bottom Beat Grid Baseline: Soothing Warm Amber Thread
    const botAmbGrad = ctx.createLinearGradient(0, waveBottomY - 12, 0, waveBottomY + 12);
    botAmbGrad.addColorStop(0, 'transparent');
    botAmbGrad.addColorStop(0.5, 'rgba(255, 170, 50, 0.16)');
    botAmbGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = botAmbGrad;
    ctx.fillRect(0, waveBottomY - 12, width, 24);

    ctx.strokeStyle = 'rgba(255, 190, 80, 0.25)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, waveBottomY);
    ctx.lineTo(width, waveBottomY);
    ctx.stroke();

    for (let b = minBeat; b <= maxBeat; b++) {
        const screenX = width * 0.5 + (b - currentCenterBeat) * (width / visibleBeats);
        if (screenX >= 10 && screenX <= width - 10) {
            const isBar = (b % 4 === 0);
            if (isBar) {
                // Downbeat vertical line across moving wave
                ctx.fillStyle = (pDeck === 2) ? 'rgba(255, 60, 40, 0.55)' : 'rgba(255, 34, 51, 0.50)';
                ctx.fillRect(screenX - 0.75, waveTopY, 1.5, waveBoxH);

                // Downbeat vertical tick mark at baseline
                ctx.fillStyle = (pDeck === 2) ? '#ff4020' : '#ff2233';
                ctx.fillRect(screenX - 1.5, waveBottomY - 7, 3, 14);

                // Bar Number centered directly underneath each red downbeat marker (Denon Prime 4 locked)
                const barNum = Math.floor(b / 4) + 1;
                ctx.fillStyle = (pDeck === 2) ? '#ffccba' : '#a0aab8';
                ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(barNum, screenX, waveBottomY + 22);
            } else {
                ctx.fillStyle = 'rgba(160, 165, 180, 0.40)';
                ctx.fillRect(screenX - 0.75, waveBottomY - 5, 1.5, 8);
            }
        }
    }

    // 3C. Center Moving Waveform Playhead: Warm & Homely Vintage Edison Filament Tube
    ctx.save();
    const playX = width / 2;
    const nowMs2 = performance.now();
    const needleStyle2 = getVintageBulbStyle(getVintageBulbFlicker(nowMs2 * 0.001, (pDeck === 2) ? 2.4 : 1.37));

    // Broad homely candlelight ambient aura (illuminates the waveform around the playhead)
    const pAmbW = 60.0 * needleStyle2.auraSpread;
    const pAmbGrad = ctx.createLinearGradient(playX - pAmbW, 0, playX + pAmbW, 0);
    pAmbGrad.addColorStop(0, 'rgba(255, 100, 10, 0)');
    pAmbGrad.addColorStop(0.35, (pDeck === 2) ? 'rgba(255, 80, 30, 0.40)' : needleStyle2.auraColorOuter);
    pAmbGrad.addColorStop(0.50, (pDeck === 2) ? 'rgba(255, 160, 80, 0.65)' : needleStyle2.auraColorInner);
    pAmbGrad.addColorStop(0.65, (pDeck === 2) ? 'rgba(255, 80, 30, 0.40)' : needleStyle2.auraColorOuter);
    pAmbGrad.addColorStop(1, 'rgba(255, 100, 10, 0)');
    ctx.fillStyle = pAmbGrad;
    ctx.fillRect(playX - pAmbW, waveTopY - 6, pAmbW * 2, waveBoxH + 12);

    // Vintage Edison glass tube cylinder enclosure
    const pTubeW = 14.0;
    ctx.beginPath();
    ctx.roundRect(playX - pTubeW / 2, waveTopY, pTubeW, waveBoxH, 7.0);
    const pTubeGrad = ctx.createLinearGradient(playX - pTubeW / 2, 0, playX + pTubeW / 2, 0);
    pTubeGrad.addColorStop(0, `rgba(255, 140, 20, ${0.28 * needleStyle2.flicker})`);
    pTubeGrad.addColorStop(0.5, (pDeck === 2) ? `rgba(255, 200, 140, ${0.44 * needleStyle2.flicker})` : `rgba(255, 225, 120, ${0.42 * needleStyle2.flicker})`);
    pTubeGrad.addColorStop(1, `rgba(255, 140, 20, ${0.28 * needleStyle2.flicker})`);
    ctx.fillStyle = pTubeGrad;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(255, 238, 170, ${0.60 * needleStyle2.flicker})`;
    ctx.stroke();

    // Radiant plasma glow
    const pAuraW = 22.0 * needleStyle2.auraSpread;
    const pAuraGrad = ctx.createLinearGradient(playX - pAuraW, 0, playX + pAuraW, 0);
    pAuraGrad.addColorStop(0, 'rgba(255, 120, 10, 0)');
    pAuraGrad.addColorStop(0.30, (pDeck === 2) ? 'rgba(255, 90, 40, 0.45)' : needleStyle2.auraColorOuter);
    pAuraGrad.addColorStop(0.50, (pDeck === 2) ? 'rgba(255, 190, 90, 0.70)' : needleStyle2.auraColorInner);
    pAuraGrad.addColorStop(0.70, (pDeck === 2) ? 'rgba(255, 90, 40, 0.45)' : needleStyle2.auraColorOuter);
    pAuraGrad.addColorStop(1, 'rgba(255, 120, 10, 0)');
    ctx.fillStyle = pAuraGrad;
    ctx.fillRect(playX - pAuraW, waveTopY, pAuraW * 2, waveBoxH);

    // Brilliant white-hot or ember filament core with dynamic blackbody thermal shift
    ctx.shadowColor = (pDeck === 2) ? '#ff5722' : needleStyle2.shadowColor;
    ctx.shadowBlur = (24 + (transient || 0) * 8) * needleStyle2.shadowSpread;
    ctx.fillStyle = (pDeck === 2 && needleStyle2.coreColor !== '#ffffff') ? '#ffddb8' : needleStyle2.coreColor;
    ctx.fillRect(playX - 2.75, waveTopY + 3, 5.5, waveBoxH - 6);

        // Luminous micro-beads along the coiled filament (the tiny LED filament chips)
        const beadSpacingP = 9.0;
        const numBeadsP = Math.floor((waveBoxH - 24) / beadSpacingP);
        for (let b = 0; b <= numBeadsP; b++) {
            const by = waveTopY + 12 + b * beadSpacingP;
            ctx.beginPath();
            ctx.arc(playX, by, 2.4, 0, Math.PI * 2);
            ctx.fillStyle = '#fffce8';
            ctx.fill();
        }

        // Specular ultra-white micro-core thread during hot surges
        if (needleStyle2.specularColor !== 'transparent') {
            ctx.shadowBlur = 0;
            ctx.fillStyle = needleStyle2.specularColor;
            ctx.fillRect(playX - 1.2, waveTopY + 5, 2.4, waveBoxH - 10);
        }

    // 5. Vintage Edison brass / golden end caps
    const pCapGrad = ctx.createLinearGradient(playX - 7, 0, playX + 7, 0);
    pCapGrad.addColorStop(0, '#7a5105');
    pCapGrad.addColorStop(0.4, '#ffe590');
    pCapGrad.addColorStop(0.8, '#c99318');
    pCapGrad.addColorStop(1, '#5c3a02');

    // Top brass cap
    ctx.beginPath();
    ctx.arc(playX, waveTopY + 3, 7.0, 0, Math.PI * 2);
    ctx.fillStyle = pCapGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 240, 180, 0.85)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Bottom brass cap
    ctx.beginPath();
    ctx.arc(playX, waveBottomY - 3, 7.0, 0, Math.PI * 2);
    ctx.fillStyle = pCapGrad;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 6. Center-Screen Overlay when Decks are Not Detected
    const bothDecksOffline = Boolean((!d1 || d1.offline) && (!d2 || d2.offline) && !hasD1Track && !hasD2Track);
    if (bothDecksOffline) {
        ctx.save();
        const boxW = 920;
        const boxH = 175;
        const boxX = (W - boxW) * 0.5;
        const boxY = (H - boxH) * 0.5 + 30;
        const pulse = 0.78 + 0.22 * Math.sin(nowMsHUD * 0.004);

        ctx.shadowColor = `rgba(255, 72, 0, ${0.65 * pulse})`;
        ctx.shadowBlur = 36;
        const bgGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
        bgGrad.addColorStop(0, 'rgba(22, 8, 4, 0.94)');
        bgGrad.addColorStop(0.5, 'rgba(38, 12, 5, 0.96)');
        bgGrad.addColorStop(1, 'rgba(18, 6, 3, 0.94)');
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 16);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = `rgba(255, 115, 25, ${0.6 + 0.35 * pulse})`;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 32px "Orbitron", "Inter", system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(255, 90, 0, 0.9)';
        ctx.shadowBlur = 18;
        ctx.fillText('🔥 TURN ON DECKS TO ACTIVATE THIS SCENE', W * 0.5, boxY + 68);

        ctx.shadowBlur = 0;
        ctx.font = '700 15px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffaa44';
        ctx.fillText('AWAITING DENON STAGELINQ / PIONEER PRO DJ LINK HARDWARE CONNECTION', W * 0.5, boxY + 122);
        ctx.restore();
    }
}

