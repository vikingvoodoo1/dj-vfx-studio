// Real-Time Multi-Band Particle Spectrum EQ 2D Canvas Engine
const EQ_BAR_COUNT = 36;
const eqPeakLevels = new Float32Array(EQ_BAR_COUNT);
const eqPeakVelocities = new Float32Array(EQ_BAR_COUNT);
const eqParticles = [];
const MAX_EQ_PARTICLES = 140;

export function renderParticleSpectrumEQ(ctx, width, height, data) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const dataArray = data.dataArray || [];
    const isAudioActive = (data.bass > 0.04 || (data.smoothedMid || data.mid || 0) > 0.04 || (data.smoothedTreble || data.treble || 0) > 0.04 || (data.overall || 0) > 0.03);

    // Background subtle logarithmic grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = height * 0.25; y < height; y += height * 0.25) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();

    const barWidth = (width / EQ_BAR_COUNT) - 2;

    for (let i = 0; i < EQ_BAR_COUNT; i++) {
        const binIdx = Math.min((dataArray.length || 1) - 1, Math.floor(Math.pow(i / EQ_BAR_COUNT, 1.25) * 54) + 1);
        const rawAmp = (isAudioActive && dataArray[binIdx]) ? (dataArray[binIdx] / 255.0) : 0.0;
        const barHeight = Math.max(1.5, rawAmp * (height - 12));

        const x = i * (barWidth + 2) + 1;
        const y = height - barHeight;

        // Harmonious spectral color gradient across audible bands:
        // 0: Cyan (Sub) -> Emerald (Bass/LowMid) -> Amber (Mid) -> Rose/Magenta (Treble/Air)
        const freqNorm = i / EQ_BAR_COUNT;
        let hue = 185 - freqNorm * 220;
        if (hue < 0) hue += 360;

        const grad = ctx.createLinearGradient(0, height, 0, y);
        grad.addColorStop(0, `hsla(${hue}, 95%, 45%, 0.22)`);
        grad.addColorStop(0.7, `hsla(${hue}, 100%, 55%, 0.85)`);
        grad.addColorStop(1, `hsla(${hue}, 100%, 75%, 1.0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        } else {
            ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();

        // Peak Hold needle with gravity physics
        if (barHeight >= eqPeakLevels[i]) {
            eqPeakLevels[i] = barHeight;
            eqPeakVelocities[i] = 0;
        } else {
            eqPeakVelocities[i] += 0.35;
            eqPeakLevels[i] = Math.max(1.5, eqPeakLevels[i] - eqPeakVelocities[i]);
        }

        const peakY = height - eqPeakLevels[i];
        ctx.fillStyle = `hsla(${hue}, 100%, 90%, 0.95)`;
        ctx.fillRect(x, peakY, barWidth, 2);

        // Spawn floating spectrum particles from active peaks
        if (isAudioActive && rawAmp > 0.25 && Math.random() < (rawAmp * 0.45) && eqParticles.length < MAX_EQ_PARTICLES) {
            eqParticles.push({
                x: x + barWidth * 0.5 + (Math.random() - 0.5) * 3,
                y: y,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -(1.0 + rawAmp * 2.5 + Math.random() * 1.5),
                life: 1.0,
                decay: 0.025 + Math.random() * 0.035,
                size: 1.2 + Math.random() * 2.2,
                hue: hue
            });
        }
    }

    // Update & Render floating spectrum particles
    for (let p = eqParticles.length - 1; p >= 0; p--) {
        const part = eqParticles[p];
        part.x += part.vx;
        part.y += part.vy;
        part.vy += 0.02; // slight drag
        part.life -= part.decay;

        if (part.life <= 0 || part.y < 0) {
            eqParticles.splice(p, 1);
            continue;
        }

        ctx.fillStyle = `hsla(${part.hue}, 100%, 75%, ${part.life * 0.9})`;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size * part.life, 0, Math.PI * 2);
        ctx.fill();
    }
}
