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

// Dynamic Overview Track Bar Animation State (realigns active on-air deck to top track bar)
let animDeck1BarY = 126.0;
let animDeck2BarY = 182.0;

export function renderDJDeckHUD(ctx, width, height, d1, d2, bpm, beatPhase, transient, prog1, prog2, d1Weight = 1.0, d2Weight = 0.0, primaryDeck = 1, audio = null) {
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
        const numBars = Math.floor(w / 2.5);
        const barW = w / numBars;
        const waveBaseY = topY + h - 5;
        const maxBarH = h - 10;
        const hasRealSamples = deckObj && Array.isArray(deckObj.samples) && deckObj.samples.length >= 6;
        const totalTriplets = hasRealSamples ? Math.floor(deckObj.samples.length / 3) : 0;

        for (let i = 0; i < numBars; i++) {
            const u = i / numBars;
            const bx = x + i * barW;

            let profile = 0.55;
            let subRatio = 0.35;
            let midRatio = 0.65;

            if (hasRealSamples) {
                const sIdx = Math.floor(u * totalTriplets) * 3;
                const r = (deckObj.samples[sIdx] || 0) / 255.0;     // Bass
                const g = (deckObj.samples[sIdx + 1] || 0) / 255.0; // Mid
                const b = (deckObj.samples[sIdx + 2] || 0) / 255.0; // High
                profile = Math.max(0.06, Math.min(1.0, r * 0.52 + g * 0.34 + b * 0.14));
                const sum = r + g + b + 0.03;
                subRatio = Math.max(0.12, Math.min(0.85, (r + 0.01) / sum));
                midRatio = Math.max(subRatio + 0.10, Math.min(0.95, (r + g + 0.01) / sum));
            } else if (profileType === 1) {
                // Deck 1 Profile
                if (u < 0.15) {
                    profile = 0.40 + Math.sin(u * 80.0) * 0.08 + Math.cos(u * 140.0) * 0.05;
                    subRatio = 0.25; midRatio = 0.55;
                } else if (u < 0.35) {
                    profile = 0.52 + Math.sin(u * 95.0) * 0.10 + Math.sin(u * 210.0) * 0.06;
                    subRatio = 0.32; midRatio = 0.68;
                } else if (u < 0.50) {
                    profile = 0.88 + Math.sin(u * 120.0) * 0.10 + Math.cos(u * 300.0) * 0.04;
                    subRatio = 0.36; midRatio = 0.72;
                } else if (u < 0.62) {
                    profile = 0.28 + Math.sin(u * 60.0) * 0.06;
                    subRatio = 0.04; midRatio = 0.60;
                } else if (u < 0.86) {
                    profile = 0.96 + Math.sin(u * 150.0) * 0.04 + Math.cos(u * 280.0) * 0.04;
                    subRatio = 0.38; midRatio = 0.74;
                } else {
                    const outFade = (1.0 - u) / 0.14;
                    profile = (0.45 + Math.sin(u * 70.0) * 0.08) * outFade;
                    subRatio = 0.25; midRatio = 0.55;
                }
            } else {
                // Deck 2 Profile (Distinct alternative arrangement)
                if (u < 0.12) {
                    profile = 0.42 + Math.sin(u * 90.0) * 0.09;
                    subRatio = 0.30; midRatio = 0.60;
                } else if (u < 0.32) {
                    profile = 0.65 + Math.sin(u * 110.0) * 0.12 + Math.cos(u * 220.0) * 0.05;
                    subRatio = 0.40; midRatio = 0.70;
                } else if (u < 0.45) {
                    profile = 0.92 + Math.sin(u * 140.0) * 0.08;
                    subRatio = 0.42; midRatio = 0.75;
                } else if (u < 0.58) {
                    profile = 0.32 + Math.sin(u * 50.0) * 0.08;
                    subRatio = 0.08; midRatio = 0.55;
                } else if (u < 0.88) {
                    profile = 0.98 + Math.sin(u * 160.0) * 0.05 + Math.cos(u * 310.0) * 0.04;
                    subRatio = 0.44; midRatio = 0.76;
                } else {
                    profile = (0.50 + Math.sin(u * 80.0) * 0.08) * ((1.0 - u) / 0.12);
                    subRatio = 0.25; midRatio = 0.55;
                }
            }

            profile = Math.max(0.06, Math.min(1.0, profile));
            const totalH = profile * maxBarH;
            const bH = totalH * subRatio;
            const mH = totalH * midRatio;

            // Base layer
            if (bH > 1.0) {
                ctx.fillStyle = colorScheme.bass;
                ctx.fillRect(bx, waveBaseY - bH, barW - 0.5, bH);
            }
            // Mid layer
            if (mH > bH) {
                ctx.fillStyle = colorScheme.mid;
                ctx.fillRect(bx, waveBaseY - mH, barW - 0.5, mH - bH);
            }
            // High peak layer
            if (totalH > mH) {
                ctx.fillStyle = colorScheme.high;
                ctx.fillRect(bx, waveBaseY - totalH, barW - 0.5, totalH - mH);
            }
        }

        // Amber/yellow warm glow wash over waveform
        const washGrad = ctx.createLinearGradient(0, topY, 0, topY + h);
        washGrad.addColorStop(0.0, colorScheme.washTop);
        washGrad.addColorStop(0.5, colorScheme.washMid);
        washGrad.addColorStop(1.0, 'rgba(255, 80, 0, 0.02)');
        ctx.fillStyle = washGrad;
        ctx.fillRect(x, topY, w, h);
    }

    // Determine dynamic on-air deck status
    const isD2OnAir = (primaryDeck === 2 && d1Weight <= 0.05);
    const isD1OnAir = (primaryDeck === 1 && d2Weight <= 0.05);
    const isDualBlend = (d1Weight > 0.05 && d2Weight > 0.05);
    const hasD2 = Boolean((d2Weight > 0.01 || (d2 && d2.title && d2.title !== 'No Track Loaded' && d2.title !== '—')));

    const d1Bpm = (d1 && d1.bpm) ? Number(d1.bpm).toFixed(1) : Number(bpm).toFixed(1);
    const d1Title = (d1 && d1.title) ? d1.title.toUpperCase() : 'FIGURE IT OUT (EXTENDED MIX)';
    const d1Artist = (d1 && d1.artist) ? d1.artist.toUpperCase() : 'LP GIOBBI, HOUSE GOSPEL CHOIR';
    const d1Key = (d1 && d1.key) ? d1.key : '9A';
    const totalSec1 = (d1 && d1.duration) ? d1.duration : 364;
    const el1 = prog1 * totalSec1;
    const rem1 = Math.max(0, totalSec1 - el1);

    const d2Bpm = (d2 && d2.bpm) ? Number(d2.bpm).toFixed(1) : Number(bpm).toFixed(1);
    const d2Title = (d2 && d2.title && d2.title !== 'No Track Loaded' && d2.title !== '—') ? d2.title.toUpperCase() : 'TRACK 2 (HOT MIX)';
    const d2Artist = (d2 && d2.artist) ? d2.artist.toUpperCase() : 'DENON PRIME LIVE';
    const d2Key = (d2 && d2.key) ? d2.key : '8A';
    const totalSec2 = (d2 && d2.duration) ? d2.duration : 360;
    const el2 = prog2 * totalSec2;
    const rem2 = Math.max(0, totalSec2 - el2);

    const totalBeats1 = (d1 && d1.totalBeats) || ((totalSec1 / 60.0) * Number(d1Bpm));
    const totalBeats2 = (d2 && d2.totalBeats) || ((totalSec2 / 60.0) * Number(d2Bpm));

    // Active deck selection for moving waveform beat grid, loops, and cues
    const hasD1Track = !!(d1 && d1.title && d1.title !== 'No Track Loaded' && d1.title !== '—');
    const hasD2Track = !!(d2 && d2.title && d2.title !== 'No Track Loaded' && d2.title !== '—');
    const pDeck = (primaryDeck === 2 && hasD2Track)
        ? 2
        : ((primaryDeck === 1 && hasD1Track)
            ? 1
            : (hasD2Track ? 2 : (hasD1Track ? 1 : primaryDeck)));

    const activeProg = (pDeck === 2) ? prog2 : prog1;
    const activeTotalBeats = (pDeck === 2) ? totalBeats2 : totalBeats1;
    const activeLoops = (pDeck === 2)
        ? ((d2 && d2.loops && d2.loops.length > 0) ? d2.loops : [
            { name: 'Loop 1', num: 1, startProgress: 0.125, endProgress: 0.150, beats: 8, color: '#ff4d2e' }
        ])
        : ((d1 && d1.loops && d1.loops.length > 0) ? d1.loops : [
            { name: 'Loop 2', num: 2, startProgress: 0.02591687, endProgress: 0.03621907, beats: 8, color: '#ef8130' },
            { name: 'Loop 7', num: 7, startProgress: 0.97371907, endProgress: 0.98402126, beats: 8, color: '#30c1b9' }
        ]);

    const activeCues = (pDeck === 2)
        ? ((d2 && d2.cues && d2.cues.length > 0) ? d2.cues : [
            { name: 'Cue 1', num: 1, progress: 0.125, color: '#ff4d2e' },
            { name: 'Cue 2', num: 2, progress: 0.500, color: '#ffaa33' }
        ])
        : ((d1 && d1.cues && d1.cues.length > 0) ? d1.cues : [
            { name: 'Cue 2', num: 2, progress: 0.02591687, color: '#ef8130' },
            { name: 'Cue 7', num: 7, progress: 0.97371907, color: '#30c1b9' }
        ]);

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
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(artX, artY, artSize, artSize, 8);
        ctx.clip();
        if (deckObj && deckObj.artworkImg && deckObj.artworkImg.complete && deckObj.artworkImg.naturalWidth > 0) {
            ctx.drawImage(deckObj.artworkImg, artX, artY, artSize, artSize);
        } else {
            if (deckObj && deckObj.artworkUrl && !deckObj.artworkImg) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => { deckObj.artworkImg = img; };
                img.src = deckObj.artworkUrl;
            } else if (deckObj && !deckObj._artRequested && deckObj.title) {
                deckObj._artRequested = true;
                loadDeckArtwork(deckObj.title, deckObj.artist, deckObj);
            }
            // Procedural Denon Vinyl Sleeve & Grooved Disc
            ctx.fillStyle = '#0f131a';
            ctx.fillRect(artX, artY, artSize, artSize);
            ctx.beginPath();
            ctx.arc(artX + artSize / 2, artY + artSize / 2, artSize * 0.44, 0, Math.PI * 2);
            ctx.fillStyle = '#06080c';
            ctx.fill();
            ctx.strokeStyle = defaultVinylColor;
            ctx.lineWidth = 1.8;
            ctx.stroke();
            // Vinyl grooves
            ctx.beginPath();
            ctx.arc(artX + artSize / 2, artY + artSize / 2, artSize * 0.28, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.stroke();
            // Spindle center
            ctx.beginPath();
            ctx.arc(artX + artSize / 2, artY + artSize / 2, artSize * 0.12, 0, Math.PI * 2);
            ctx.fillStyle = defaultVinylColor;
            ctx.fill();
        }
        ctx.restore();

        // Warm ambient shadow
        ctx.save();
        ctx.shadowColor = 'rgba(255, 160, 40, 0.28)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(artX, artY, artSize, artSize, 8);
        ctx.strokeStyle = 'rgba(255, 185, 90, 0.22)';
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();
    }

    // 1A. DECK 1 (Always on Left)
    const artSize = 76;
    ctx.save();
    if (isD2OnAir) ctx.globalAlpha = 0.40; // Dim Deck 1 when Deck 2 is on air
    drawArtwork(padX + 14, 34, artSize, d1, '#ef8130');

    const textStartX = padX + 14 + artSize + 18;
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isD2OnAir ? '#b8a692' : '#fff4e2';
    const maxTitleLen1 = hasD2 ? 28 : 46;
    ctx.fillText(d1Title.slice(0, maxTitleLen1), textStartX, 58);

    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isD2OnAir ? '#8c7d6b' : '#d9c5a5';
    ctx.fillText(d1Artist.slice(0, hasD2 ? 30 : 44), textStartX, 80);

    // Badges Line for Deck 1
    ctx.font = 'bold 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isD2OnAir ? '#9e733b' : '#ffb74d';
    ctx.fillText(`${d1Bpm} BPM`, textStartX, 103);

    // Key Pill
    const keyPillX = textStartX + 84;
    ctx.beginPath();
    ctx.roundRect(keyPillX, 92, 54, 18, 4);
    ctx.fillStyle = isD2OnAir ? 'rgba(160, 130, 80, 0.12)' : 'rgba(216, 175, 105, 0.18)';
    ctx.fill();
    ctx.fillStyle = isD2OnAir ? '#b09572' : '#f3d19e';
    ctx.textAlign = 'center';
    ctx.fillText(`${d1Key} ♪`, keyPillX + 27, 104);

    // Deck 1 Role Pill
    const d1RoleX = keyPillX + 62;
    ctx.beginPath();
    ctx.roundRect(d1RoleX, 92, 80, 18, 4);
    ctx.fillStyle = isD1OnAir ? 'rgba(255, 140, 20, 0.35)' : 'rgba(255, 140, 20, 0.15)';
    ctx.fill();
    ctx.strokeStyle = isD1OnAir ? 'rgba(255, 170, 30, 0.85)' : 'rgba(255, 170, 30, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = isD1OnAir ? '#ffe082' : (isD2OnAir ? '#a08560' : '#ffcf77');
    ctx.fillText(isD1OnAir ? 'D1 ● ON AIR' : (isD2OnAir ? 'D1 STANDBY' : 'DECK 1'), d1RoleX + 40, 104);
    ctx.restore();

    if (hasD2) {
        // ---------------------------------------------------------------------
        // DUAL DECK HEADER: Deck 2 on the Right & On-Air / Sync Badge in Center
        // ---------------------------------------------------------------------
        // Center: Dual Deck Status Pill
        const centerPillW = 210;
        const centerPillX = width / 2 - centerPillW / 2;
        ctx.beginPath();
        ctx.roundRect(centerPillX, 56, centerPillW, 32, 16);
        ctx.fillStyle = isD2OnAir ? 'rgba(255, 77, 46, 0.28)' : (isD1OnAir ? 'rgba(255, 140, 20, 0.24)' : 'rgba(255, 120, 20, 0.22)');
        ctx.fill();
        ctx.strokeStyle = isD2OnAir ? 'rgba(255, 90, 50, 0.85)' : (isD1OnAir ? 'rgba(255, 170, 30, 0.85)' : 'rgba(255, 180, 60, 0.65)');
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#fffaee';
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        if (isD2OnAir) {
            ctx.fillText('● DECK 2 ON AIR', width / 2, 72);
            ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#ffad99';
            ctx.fillText(`MASTER • ${d2Bpm} BPM • ${d2Key}`, width / 2, 84);
        } else if (isD1OnAir) {
            ctx.fillText('● DECK 1 ON AIR', width / 2, 72);
            ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#ffc266';
            ctx.fillText(`MASTER • ${d1Bpm} BPM • ${d1Key}`, width / 2, 84);
        } else {
            ctx.fillText('⮂ DUAL DECK BLEND', width / 2, 72);
            ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#ffc266';
            ctx.fillText(`BEAT SYNC • ${(Number(d1Bpm) === Number(d2Bpm)) ? 'LOCKED' : `${d1Bpm} / ${d2Bpm}`}`, width / 2, 84);
        }

        // Deck 2 Artwork & Metadata on Far Right
        ctx.save();
        if (isD1OnAir) ctx.globalAlpha = 0.40; // Dim Deck 2 when Deck 1 is on air
        const d2ArtX = rightX - artSize - 14;
        drawArtwork(d2ArtX, 34, artSize, d2, '#ff4d2e');

        const d2TextEndX = d2ArtX - 18;
        ctx.textAlign = 'right';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = isD1OnAir ? '#b8a090' : '#ffeedd';
        ctx.fillText(d2Title.slice(0, 28), d2TextEndX, 58);

        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = isD1OnAir ? '#8c7668' : '#d9bda5';
        ctx.fillText(d2Artist.slice(0, 30), d2TextEndX, 80);

        // Deck 2 Badges
        ctx.font = 'bold 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = isD1OnAir ? '#9e5040' : '#ff7a59';
        ctx.fillText(`${d2Bpm} BPM`, d2TextEndX, 103);

        const d2KeyPillX = d2TextEndX - 84 - 54;
        ctx.beginPath();
        ctx.roundRect(d2KeyPillX, 92, 54, 18, 4);
        ctx.fillStyle = isD1OnAir ? 'rgba(160, 80, 60, 0.12)' : 'rgba(255, 77, 46, 0.22)';
        ctx.fill();
        ctx.fillStyle = isD1OnAir ? '#b07062' : '#ffad99';
        ctx.textAlign = 'center';
        ctx.fillText(`${d2Key} ♪`, d2KeyPillX + 27, 104);

        const d2RoleX = d2KeyPillX - 88;
        ctx.beginPath();
        ctx.roundRect(d2RoleX, 92, 80, 18, 4);
        ctx.fillStyle = isD2OnAir ? 'rgba(255, 77, 46, 0.35)' : 'rgba(255, 77, 46, 0.15)';
        ctx.fill();
        ctx.strokeStyle = isD2OnAir ? 'rgba(255, 100, 60, 0.85)' : 'rgba(255, 100, 60, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = isD2OnAir ? '#ffbca8' : (isD1OnAir ? '#a0685c' : '#ff9980');
        ctx.fillText(isD2OnAir ? 'D2 ● ON AIR' : (isD1OnAir ? 'D2 STANDBY' : 'DECK 2'), d2RoleX + 40, 104);
        ctx.restore();

    } else {
        // SINGLE DECK HEADER: Deck 1 Large Time Readout on Right
        const timeX = padX + headerW - 28;
        ctx.textAlign = 'right';

        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffb042';
        ctx.fillText('REMAIN', timeX, 48);

        ctx.font = 'bold 28px "SF Mono", Menlo, Consolas, monospace';
        ctx.fillStyle = '#fffaee';
        ctx.shadowColor = 'rgba(255, 160, 40, 0.35)';
        ctx.shadowBlur = 8;
        const remMin = Math.floor(rem1 / 60);
        const remSec = Math.floor(rem1 % 60);
        const remHun = Math.floor((rem1 * 100) % 100);
        const remStr = `-${remMin}:${remSec.toString().padStart(2, "0")}.${remHun.toString().padStart(2, "0")}`;
        ctx.fillText(remStr, timeX, 78);
        ctx.shadowBlur = 0;

        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#b8a892';
        const elMin = Math.floor(el1 / 60);
        const elSec = Math.floor(el1 % 60);
        const elStr = `${elMin}:${elSec.toString().padStart(2, "0")}`;
        ctx.fillText(`ELAPSED  ${elStr}`, timeX, 102);
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

    if (hasD2) {
        // ---------------------------------------------------------------------
        // DUAL TRACK POSITION BARS (Dynamically Realigned on Deck Transition)
        // Active On-Air Deck smoothly realigns to the top track bar slot!
        // ---------------------------------------------------------------------
        const barH = 50;
        const topSlotY = 126;
        const botSlotY = 182;

        // Dynamic Realignment: If Deck 2 is primary/on-air, Deck 2 takes top slot (Y=126), Deck 1 takes lower slot (Y=182)
        const isDeck2Primary = (primaryDeck === 2 || (d2Weight > d1Weight && d2Weight > 0.45));
        const targetD1Y = isDeck2Primary ? botSlotY : topSlotY;
        const targetD2Y = isDeck2Primary ? topSlotY : botSlotY;

        // Smooth fluid animation lerp for seamless transition realignment
        animDeck1BarY += (targetD1Y - animDeck1BarY) * 0.18;
        animDeck2BarY += (targetD2Y - animDeck2BarY) * 0.18;

        const d1BarY = animDeck1BarY;
        const d2BarY = animDeck2BarY;

        const isTransitioning = (!isD1OnAir && !isD2OnAir && d1Weight > 0.05 && d2Weight > 0.05);

        // Strip 1 (Deck 1): If Deck 2 is exclusively on air, dim Deck 1 strip; during transition keep full clarity
        ctx.save();
        if (isD2OnAir && !isTransitioning) ctx.globalAlpha = 0.38;

        ctx.fillStyle = 'rgba(18, 12, 6, 0.45)';
        ctx.beginPath();
        ctx.roundRect(padX, d1BarY, overviewW, barH, 6);
        ctx.fill();

        drawMiniWaveform(padX, d1BarY, overviewW, barH, d1, 1, themeDeck1);

        const rail1Y = d1BarY + barH - 6;
        drawEdisonFilamentRail(padX, rail1Y, overviewW, prog1, bulbStyle1, '#ffaa18');

        // Strip 1 Active Hot Cues & Loops
        const activeLoops1 = (d1 && d1.loops && d1.loops.length > 0) ? d1.loops : [
            { name: 'Loop 2', num: 2, startProgress: 0.02591687, endProgress: 0.03621907, beats: 8, color: '#ef8130' },
            { name: 'Loop 7', num: 7, startProgress: 0.97371907, endProgress: 0.98402126, beats: 8, color: '#30c1b9' }
        ];
        activeLoops1.forEach(loop => {
            const lx1 = padX + loop.startProgress * overviewW;
            const lx2 = padX + (loop.endProgress || (loop.startProgress + 0.01)) * overviewW;
            ctx.fillStyle = hexToRgba(loop.color || '#ef8130', 0.35);
            ctx.fillRect(lx1, d1BarY + 14, Math.max(3, lx2 - lx1), barH - 20);
        });

        const activeCues1 = (d1 && d1.cues && d1.cues.length > 0) ? d1.cues : [
            { name: 'Cue 2', num: 2, progress: 0.02591687, color: '#ef8130' },
            { name: 'Cue 7', num: 7, progress: 0.97371907, color: '#30c1b9' }
        ];
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

        // Strip 1 Track Position Needle (Vintage LED Filament Tube)
        const prog1X = padX + prog1 * overviewW;
        const el1Min = Math.floor(el1 / 60);
        const el1Sec = Math.floor(el1 % 60);
        const d1Tag = isD2OnAir 
            ? 'D1 (STANDBY)' 
            : (isTransitioning 
                ? `D1 (TRANSITION)  ${el1Min}:${el1Sec.toString().padStart(2, "0")}` 
                : `D1 (ON AIR)  ${el1Min}:${el1Sec.toString().padStart(2, "0")}`);
        drawEdisonFilamentNeedle(prog1X, d1BarY + 12, barH - 18, bulbStyle1, 1, '#ffaa18', d1Tag);
        ctx.restore();

        // Strip 2 (Deck 2): If Deck 1 is exclusively on air, dim Deck 2 strip; during transition keep full clarity
        ctx.save();
        if (isD1OnAir && !isTransitioning) ctx.globalAlpha = 0.38;

        ctx.fillStyle = 'rgba(22, 10, 6, 0.45)';
        ctx.beginPath();
        ctx.roundRect(padX, d2BarY, overviewW, barH, 6);
        ctx.fill();

        drawMiniWaveform(padX, d2BarY, overviewW, barH, d2, 2, themeDeck2);

        const rail2Y = d2BarY + barH - 6;
        drawEdisonFilamentRail(padX, rail2Y, overviewW, prog2, bulbStyle2, '#ff4d2e');

        // Strip 2 Active Hot Cues & Loops
        const activeLoops2 = (d2 && d2.loops && d2.loops.length > 0) ? d2.loops : [
            { name: 'Loop 1', num: 1, startProgress: 0.125, endProgress: 0.150, beats: 8, color: '#ff4d2e' }
        ];
        activeLoops2.forEach(loop => {
            const lx1 = padX + loop.startProgress * overviewW;
            const lx2 = padX + (loop.endProgress || (loop.startProgress + 0.01)) * overviewW;
            ctx.fillStyle = hexToRgba(loop.color || '#ff4d2e', 0.35);
            ctx.fillRect(lx1, d2BarY + 14, Math.max(3, lx2 - lx1), barH - 20);
        });

        const activeCues2 = (d2 && d2.cues && d2.cues.length > 0) ? d2.cues : [
            { name: 'Cue 1', num: 1, progress: 0.125, color: '#ff4d2e' },
            { name: 'Cue 2', num: 2, progress: 0.500, color: '#ffaa33' }
        ];
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

        // Strip 2 Track Position Needle (Vintage LED Filament Tube)
        const prog2X = padX + prog2 * overviewW;
        const el2Min = Math.floor(el2 / 60);
        const el2Sec = Math.floor(el2 % 60);
        const d2Tag = isD1OnAir 
            ? 'D2 (STANDBY)' 
            : (isTransitioning 
                ? `D2 (TRANSITION)  ${el2Min}:${el2Sec.toString().padStart(2, "0")}` 
                : `D2 (ON AIR)  ${el2Min}:${el2Sec.toString().padStart(2, "0")}`);
        drawEdisonFilamentNeedle(prog2X, d2BarY + 12, barH - 18, bulbStyle2, 2, '#ff4d2e', d2Tag);
        ctx.restore();

        // Active Transition Realignment Guide & Beat Sync Bridge
        if (isTransitioning) {
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

    } else {
        // ---------------------------------------------------------------------
        // SINGLE TRACK POSITION BAR (Deck 1 Large Spacious Overview)
        // ---------------------------------------------------------------------
        const barH = 78;
        const bar1Y = 128;

        ctx.fillStyle = 'rgba(16, 11, 6, 0.42)';
        ctx.beginPath();
        ctx.roundRect(padX, bar1Y, overviewW, barH, 8);
        ctx.fill();

        drawMiniWaveform(padX, bar1Y, overviewW, barH, d1, 1, themeDeck1);

        const rail1Y = bar1Y + barH - 8;
        drawEdisonFilamentRail(padX, rail1Y, overviewW, prog1, bulbStyle1, '#ffaa18');

        // Active Hot Cues & Loops
        const activeLoops1 = (d1 && d1.loops && d1.loops.length > 0) ? d1.loops : [
            { name: 'Loop 2', num: 2, startProgress: 0.02591687, endProgress: 0.03621907, beats: 8, color: '#ef8130' },
            { name: 'Loop 7', num: 7, startProgress: 0.97371907, endProgress: 0.98402126, beats: 8, color: '#30c1b9' }
        ];
        activeLoops1.forEach(loop => {
            const lx1 = padX + loop.startProgress * overviewW;
            const lx2 = padX + (loop.endProgress || (loop.startProgress + 0.01)) * overviewW;
            ctx.fillStyle = hexToRgba(loop.color || '#ef8130', 0.35);
            ctx.fillRect(lx1, bar1Y + 18, Math.max(3, lx2 - lx1), barH - 26);
        });

        const activeCuesSingle = (d1 && d1.cues && d1.cues.length > 0) ? d1.cues : [
            { name: 'Cue 2', num: 2, progress: 0.02591687, color: '#ef8130' },
            { name: 'Cue 7', num: 7, progress: 0.97371907, color: '#30c1b9' }
        ];
        activeCuesSingle.forEach(cue => {
            const cx = padX + cue.progress * overviewW;
            ctx.fillStyle = cue.color || '#ef8130';
            ctx.fillRect(cx - 1, bar1Y + 12, 2, barH - 20);
            ctx.beginPath();
            ctx.moveTo(cx, bar1Y + 12);
            ctx.lineTo(cx - 5, bar1Y + 4);
            ctx.lineTo(cx + 5, bar1Y + 4);
            ctx.closePath();
            ctx.fill();
        });

        const prog1X = padX + prog1 * overviewW;
        const el1Min = Math.floor(el1 / 60);
        const el1Sec = Math.floor(el1 % 60);
        drawEdisonFilamentNeedle(prog1X, bar1Y + 16, barH - 24, bulbStyle1, 1, '#ffaa18', `DECK 1  ${el1Min}:${el1Sec.toString().padStart(2, "0")}`);
    }

    // =========================================================================
    // 3. MOVING WAVEFORM GRID OVERLAY (Locked to Active On-Air Deck)
    // =========================================================================
    const waveTopY = 246;
    const waveBottomY = 778;
    const waveBoxH = waveBottomY - waveTopY;
    const zoomFactor = 0.08;

    const currentCenterBeat = activeProg * activeTotalBeats;
    const visibleBeatsSpan = zoomFactor * activeTotalBeats;
    const minBeat = Math.max(0, Math.floor(currentCenterBeat - visibleBeatsSpan * 0.7));
    const maxBeat = Math.min(Math.floor(activeTotalBeats), Math.ceil(currentCenterBeat + visibleBeatsSpan * 0.7));

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
        const col = loop.color || ((primaryDeck === 2) ? '#ff4d2e' : '#ef8130');
        const startBeat = Math.round(loop.startProgress * activeTotalBeats);
        const loopBeats = loop.beats || Math.max(1, Math.round((loop.endProgress - loop.startProgress) * activeTotalBeats));
        const lInX = width * (0.5 + (startBeat / activeTotalBeats - activeProg) / zoomFactor);
        const lOutX = width * (0.5 + ((startBeat + loopBeats) / activeTotalBeats - activeProg) / zoomFactor);

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

        const cueCol = cue.color || ((primaryDeck === 2) ? '#ff5722' : '#30c1b9');
        const cueBeat = Math.round(cue.progress * activeTotalBeats);
        const cueX = width * (0.5 + (cueBeat / activeTotalBeats - activeProg) / zoomFactor);
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
        const bTexU = b / activeTotalBeats;
        const screenX = width * (0.5 + (bTexU - activeProg) / zoomFactor);
        if (screenX >= 10 && screenX <= width - 10) {
            const isBar = (b % 4 === 0);
            if (isBar) {
                // Downbeat vertical line across moving wave
                ctx.fillStyle = (primaryDeck === 2) ? 'rgba(255, 60, 40, 0.55)' : 'rgba(255, 34, 51, 0.50)';
                ctx.fillRect(screenX - 0.75, waveTopY, 1.5, waveBoxH);

                // Downbeat vertical tick mark at baseline
                ctx.fillStyle = (primaryDeck === 2) ? '#ff4020' : '#ff2233';
                ctx.fillRect(screenX - 1.5, waveBottomY - 7, 3, 14);

                // Bar Number centered directly underneath each red downbeat marker
                const barNum = Math.floor(b / 4) + 1;
                ctx.fillStyle = (primaryDeck === 2) ? '#ffccba' : '#a0aab8';
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
    const needleStyle2 = getVintageBulbStyle(getVintageBulbFlicker(nowMs2 * 0.001, (primaryDeck === 2) ? 2.4 : 1.37));

    // Broad homely candlelight ambient aura (illuminates the waveform around the playhead)
    const pAmbW = 60.0 * needleStyle2.auraSpread;
    const pAmbGrad = ctx.createLinearGradient(playX - pAmbW, 0, playX + pAmbW, 0);
    pAmbGrad.addColorStop(0, 'rgba(255, 100, 10, 0)');
    pAmbGrad.addColorStop(0.35, (primaryDeck === 2) ? 'rgba(255, 80, 30, 0.40)' : needleStyle2.auraColorOuter);
    pAmbGrad.addColorStop(0.50, (primaryDeck === 2) ? 'rgba(255, 160, 80, 0.65)' : needleStyle2.auraColorInner);
    pAmbGrad.addColorStop(0.65, (primaryDeck === 2) ? 'rgba(255, 80, 30, 0.40)' : needleStyle2.auraColorOuter);
    pAmbGrad.addColorStop(1, 'rgba(255, 100, 10, 0)');
    ctx.fillStyle = pAmbGrad;
    ctx.fillRect(playX - pAmbW, waveTopY - 6, pAmbW * 2, waveBoxH + 12);

    // Vintage Edison glass tube cylinder enclosure
    const pTubeW = 14.0;
    ctx.beginPath();
    ctx.roundRect(playX - pTubeW / 2, waveTopY, pTubeW, waveBoxH, 7.0);
    const pTubeGrad = ctx.createLinearGradient(playX - pTubeW / 2, 0, playX + pTubeW / 2, 0);
    pTubeGrad.addColorStop(0, `rgba(255, 140, 20, ${0.28 * needleStyle2.flicker})`);
    pTubeGrad.addColorStop(0.5, (primaryDeck === 2) ? `rgba(255, 200, 140, ${0.44 * needleStyle2.flicker})` : `rgba(255, 225, 120, ${0.42 * needleStyle2.flicker})`);
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
    pAuraGrad.addColorStop(0.30, (primaryDeck === 2) ? 'rgba(255, 90, 40, 0.45)' : needleStyle2.auraColorOuter);
    pAuraGrad.addColorStop(0.50, (primaryDeck === 2) ? 'rgba(255, 190, 90, 0.70)' : needleStyle2.auraColorInner);
    pAuraGrad.addColorStop(0.70, (primaryDeck === 2) ? 'rgba(255, 90, 40, 0.45)' : needleStyle2.auraColorOuter);
    pAuraGrad.addColorStop(1, 'rgba(255, 120, 10, 0)');
    ctx.fillStyle = pAuraGrad;
    ctx.fillRect(playX - pAuraW, waveTopY, pAuraW * 2, waveBoxH);

    // Brilliant white-hot or ember filament core with dynamic blackbody thermal shift
    ctx.shadowColor = (primaryDeck === 2) ? '#ff5722' : needleStyle2.shadowColor;
    ctx.shadowBlur = (24 + (transient || 0) * 8) * needleStyle2.shadowSpread;
    ctx.fillStyle = (primaryDeck === 2 && needleStyle2.coreColor !== '#ffffff') ? '#ffddb8' : needleStyle2.coreColor;
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
}

