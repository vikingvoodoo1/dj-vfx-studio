// =========================================================================
// Procedural Live Animated Thumbnails for Scene Selection Grid (22 Scenes)
// =========================================================================
export function initSceneCardThumbnails() {
    const thumbCanvases = document.querySelectorAll('.fx-card-thumb-canvas');
    if (!thumbCanvases.length) return;

    const paneFx = document.getElementById('pane-fx');
    let frameCount = 0;
    let lastThumbDrawTime = 0;

    function renderThumbnails(timestamp) {
        requestAnimationFrame(renderThumbnails);

        // Only render when pane-fx is visible to consume 0% idle CPU
        if (paneFx && !paneFx.classList.contains('active')) {
            return;
        }

        // Throttle to ~24 FPS for maximum efficiency and cinematic motion
        if (timestamp - lastThumbDrawTime < 40) {
            return;
        }
        lastThumbDrawTime = timestamp;
        frameCount++;
        const t = frameCount * 0.05;

        thumbCanvases.forEach((canvas) => {
            // If parent card is hidden by search filter, skip drawing
            const card = canvas.closest('.fx-pane-card');
            if (card && card.style.display === 'none') return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const fxId = parseInt(canvas.getAttribute('data-fx-thumb'), 10);
            const w = canvas.width;
            const h = canvas.height;

            // Clear background
            ctx.fillStyle = '#06080d';
            ctx.fillRect(0, 0, w, h);

            switch (fxId) {
                case 0: {
                    // 📊 3D Studio EQ: 8 neon equalizer spectrum bars
                    const bars = 8;
                    const barW = (w - (bars + 1) * 3) / bars;
                    for (let i = 0; i < bars; i++) {
                        const barH = (Math.sin(t * 2.5 + i * 0.9) * 0.4 + 0.55) * (h - 8);
                        const x = 3 + i * (barW + 3);
                        const y = h - 3 - barH;
                        const grad = ctx.createLinearGradient(0, h, 0, 0);
                        grad.addColorStop(0, '#00ff88');
                        grad.addColorStop(0.6, '#00e1ff');
                        grad.addColorStop(1, '#ff0055');
                        ctx.fillStyle = grad;
                        ctx.fillRect(x, y, barW, barH);
                        // Peak dot
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(x, Math.max(2, y - 2), barW, 1.5);
                    }
                    break;
                }
                case 1: {
                    // 🎯 Circular Spectrum: Radial pulsing rings & arcs
                    const cx = w / 2, cy = h / 2;
                    for (let r = 0; r < 3; r++) {
                        const radius = 6 + r * 7 + Math.sin(t * 3 + r) * 3;
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                        ctx.strokeStyle = r === 0 ? '#00ffff' : (r === 1 ? '#00ff88' : '#ff00aa');
                        ctx.lineWidth = 1.4;
                        ctx.stroke();
                    }
                    // Center pulse
                    ctx.beginPath();
                    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    break;
                }
                case 2: {
                    // 🌊 Fluid Wave Matrix: Sine wave mesh
                    ctx.strokeStyle = '#00e5ff';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    for (let x = 0; x < w; x += 3) {
                        const y = h / 2 + Math.sin(x * 0.08 + t * 2) * 12 * Math.cos(t + x * 0.03);
                        if (x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                    // Second harmonic
                    ctx.strokeStyle = 'rgba(255, 0, 128, 0.6)';
                    ctx.lineWidth = 1.0;
                    ctx.beginPath();
                    for (let x = 0; x < w; x += 3) {
                        const y = h / 2 + Math.sin(x * 0.12 - t * 2.5) * 8;
                        if (x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                    break;
                }
                case 3: {
                    // 🔥 Hellfire Waveforms: Roaring fire waveform + center cursor + ember glow
                    const midY = h / 2;
                    for (let x = 0; x < w; x += 2) {
                        const amp = (Math.sin(x * 0.18 + t * 5) * 0.5 + 0.5) * 15;
                        const flameCol = x % 6 === 0 ? '#fffae0' : (x % 4 === 0 ? '#ffaa00' : '#ff3300');
                        ctx.fillStyle = flameCol;
                        ctx.fillRect(x, midY - amp, 1.6, amp * 2);
                    }
                    // Hellfire Playhead cursor
                    ctx.fillStyle = '#ffeedd';
                    ctx.shadowColor = '#ff6600';
                    ctx.shadowBlur = 6;
                    ctx.fillRect(w / 2 - 0.75, 2, 1.5, h - 4);
                    ctx.shadowBlur = 0;
                    break;
                }
                case 5: {
                    // ⚡ Dual Lasers: 2 emerald crossing laser beams
                    ctx.lineWidth = 1.8;
                    ctx.strokeStyle = '#00ff88';
                    ctx.shadowColor = '#00ff88';
                    ctx.shadowBlur = 6;
                    const sweep1 = Math.sin(t * 3) * (w * 0.4) + w * 0.5;
                    const sweep2 = Math.cos(t * 2.8) * (w * 0.4) + w * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(10, h - 2);
                    ctx.lineTo(sweep1, 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(w - 10, h - 2);
                    ctx.lineTo(sweep2, 2);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    break;
                }
                case 6: {
                    // 💥 Multi-Beams: Fan of concert laser beams
                    const count = 5;
                    const originX = w / 2;
                    const originY = h - 2;
                    ctx.lineWidth = 1.2;
                    for (let b = 0; b < count; b++) {
                        const angle = ((b / (count - 1)) - 0.5) * 1.6 + Math.sin(t * 2.5) * 0.3;
                        const targetX = originX + Math.sin(angle) * (w * 0.6);
                        const targetY = originY - Math.cos(angle) * (h * 0.95);
                        ctx.strokeStyle = b % 2 === 0 ? '#00ffff' : '#ffaa00';
                        ctx.beginPath();
                        ctx.moveTo(originX, originY);
                        ctx.lineTo(targetX, targetY);
                        ctx.stroke();
                    }
                    break;
                }
                case 7: {
                    // 💫 Strobe Rings: Expanding strobe ring bursts
                    const cx = w / 2, cy = h / 2;
                    for (let k = 0; k < 4; k++) {
                        const rad = ((t * 20 + k * 12) % 40) + 2;
                        const alpha = Math.max(0, 1 - rad / 40);
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    break;
                }
                case 4: {
                    // 🪩 Disco Ball: Sphere with rotating mirror sparkles
                    const cx = w / 2, cy = h / 2, r = 14;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fillStyle = '#181b24';
                    ctx.fill();
                    ctx.strokeStyle = '#4a5068';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    // Sparkles
                    for (let s = 0; s < 7; s++) {
                        const ang = t * 1.8 + s * (Math.PI * 2 / 7);
                        const sx = cx + Math.cos(ang) * (r * 0.85);
                        const sy = cy + Math.sin(ang) * (r * 0.85);
                        ctx.fillStyle = s % 2 === 0 ? '#00ffff' : '#ffdd00';
                        ctx.fillRect(sx - 1, sy - 1, 2.5, 2.5);
                    }
                    break;
                }
                case 16: {
                    // 🔦 Sweeping Godrays: Stage spotlight cone
                    const sweep = Math.sin(t * 1.5) * (w * 0.35) + w * 0.5;
                    const grad = ctx.createRadialGradient(sweep, 2, 2, sweep, h, h);
                    grad.addColorStop(0, 'rgba(0, 255, 204, 0.8)');
                    grad.addColorStop(1, 'rgba(0, 255, 204, 0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.moveTo(sweep, 2);
                    ctx.lineTo(sweep - 25, h);
                    ctx.lineTo(sweep + 25, h);
                    ctx.closePath();
                    ctx.fill();
                    break;
                }
                case 17: {
                    // ☁️ White Godrays & Fog: Vertical misty shafts
                    for (let v = 0; v < 4; v++) {
                        const vx = 20 + v * 32 + Math.sin(t + v) * 8;
                        const grad = ctx.createLinearGradient(0, 0, 0, h);
                        grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
                        grad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
                        ctx.fillStyle = grad;
                        ctx.fillRect(vx - 8, 0, 16, h);
                    }
                    break;
                }
                case 18: {
                    // 🪩 Disco Floor: Flashing checkered floor tiles
                    const cols = 6, rows = 3;
                    const tw = w / cols, th = h / rows;
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            const on = (Math.sin(t * 4 + c * 1.5 + r * 2) > 0.1);
                            ctx.fillStyle = on ? ((c + r) % 3 === 0 ? '#ff0055' : ((c + r) % 3 === 1 ? '#00ffcc' : '#ffaa00')) : '#10121a';
                            ctx.fillRect(c * tw + 1, r * th + 1, tw - 2, th - 2);
                        }
                    }
                    break;
                }
                case 20: {
                    // 🎃 Pumpkin Disco Ball: Jack-o'-lantern with radiating gold rays
                    const cx = w / 2, cy = h / 2;
                    // Orange head
                    ctx.fillStyle = '#ff7700';
                    ctx.beginPath();
                    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
                    ctx.fill();
                    // Eyes
                    ctx.fillStyle = '#0a0500';
                    ctx.beginPath();
                    ctx.moveTo(cx - 5, cy - 3);
                    ctx.lineTo(cx - 2, cy - 3);
                    ctx.lineTo(cx - 3.5, cy - 6);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(cx + 2, cy - 3);
                    ctx.lineTo(cx + 5, cy - 3);
                    ctx.lineTo(cx + 3.5, cy - 6);
                    ctx.fill();
                    // Mouth
                    ctx.fillRect(cx - 4, cy + 2, 8, 2.5);
                    // Rotating rays
                    for (let ray = 0; ray < 6; ray++) {
                        const rAngle = t * 1.5 + ray * (Math.PI / 3);
                        ctx.strokeStyle = 'rgba(255, 170, 0, 0.5)';
                        ctx.lineWidth = 1.2;
                        ctx.beginPath();
                        ctx.moveTo(cx, cy);
                        ctx.lineTo(cx + Math.cos(rAngle) * 26, cy + Math.sin(rAngle) * 20);
                        ctx.stroke();
                    }
                    break;
                }
                case 21: {
                    // 🏚️ Haunted Manor: Dark spire with green eerie mist
                    ctx.fillStyle = '#061a10';
                    ctx.fillRect(0, 0, w, h);
                    // Green mist wave
                    ctx.fillStyle = 'rgba(0, 255, 100, 0.15)';
                    ctx.beginPath();
                    ctx.arc(w / 2 + Math.sin(t) * 20, h - 2, 28, 0, Math.PI, true);
                    ctx.fill();
                    // Manor silhouette spire
                    ctx.fillStyle = '#0a0d12';
                    ctx.beginPath();
                    ctx.moveTo(w / 2, 4);
                    ctx.lineTo(w / 2 + 10, h);
                    ctx.lineTo(w / 2 - 10, h);
                    ctx.closePath();
                    ctx.fill();
                    break;
                }
                case 22: {
                    // 🎬 Cyber Cinema: Glowing 16:9 cinema screen & play badge
                    ctx.fillStyle = '#05070d';
                    ctx.fillRect(0, 0, w, h);
                    const scrW = w * 0.72;
                    const scrH = h * 0.65;
                    const scrX = (w - scrW) / 2;
                    const scrY = (h - scrH) / 2;
                    const scrGrad = ctx.createLinearGradient(scrX, scrY, scrX + scrW, scrY + scrH);
                    scrGrad.addColorStop(0, '#00e5ff');
                    scrGrad.addColorStop(0.5, '#7a33ff');
                    scrGrad.addColorStop(1, '#ff007f');
                    ctx.fillStyle = scrGrad;
                    ctx.fillRect(scrX, scrY, scrW, scrH);
                    ctx.strokeStyle = '#00ffcc';
                    ctx.lineWidth = 1.2;
                    ctx.strokeRect(scrX, scrY, scrW, scrH);
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.moveTo(w / 2 - 3, h / 2 - 4);
                    ctx.lineTo(w / 2 + 5, h / 2);
                    ctx.lineTo(w / 2 - 3, h / 2 + 4);
                    ctx.closePath();
                    ctx.fill();
                    break;
                }
                case 8: {
                    // 🌅 Synthwave Grid: Perspective rolling grid
                    const horizon = h * 0.4;
                    // Sun
                    ctx.fillStyle = '#ff0077';
                    ctx.beginPath();
                    ctx.arc(w / 2, horizon - 2, 10, Math.PI, 0, false);
                    ctx.fill();
                    // Horizontal rolling lines
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 1;
                    for (let y = 1; y <= 4; y++) {
                        const lineY = horizon + Math.pow(y / 4, 1.8) * (h - horizon);
                        ctx.beginPath();
                        ctx.moveTo(0, lineY);
                        ctx.lineTo(w, lineY);
                        ctx.stroke();
                    }
                    // Perspective lines
                    for (let p = -3; p <= 3; p++) {
                        ctx.beginPath();
                        ctx.moveTo(w / 2, horizon);
                        ctx.lineTo(w / 2 + p * (w * 0.22), h);
                        ctx.stroke();
                    }
                    break;
                }
                case 9: {
                    // 🌄 River & Sun: Sunset reflecting on wavy river
                    const sunY = h * 0.35;
                    ctx.fillStyle = '#ffaa00';
                    ctx.beginPath();
                    ctx.arc(w / 2, sunY, 11, 0, Math.PI * 2);
                    ctx.fill();
                    // Wavy river ripples
                    ctx.strokeStyle = 'rgba(255, 170, 0, 0.7)';
                    ctx.lineWidth = 1.4;
                    for (let y = sunY + 8; y < h - 2; y += 4) {
                        const offset = Math.sin(y * 0.5 + t * 3) * 6;
                        ctx.beginPath();
                        ctx.moveTo(w / 2 - 14 + offset, y);
                        ctx.lineTo(w / 2 + 14 + offset, y);
                        ctx.stroke();
                    }
                    break;
                }
                case 10: {
                    // 💻 Matrix Rain: Cascading green digital glyphs
                    const cols = 9;
                    const colW = w / cols;
                    ctx.fillStyle = '#00ff66';
                    ctx.font = '8px monospace';
                    for (let c = 0; c < cols; c++) {
                        const dropY = ((t * 30 + c * 17) % (h + 20)) - 10;
                        const char = String.fromCharCode(0x30A0 + ((c * 7 + frameCount) % 40));
                        ctx.fillText(char, c * colW + 2, dropY);
                    }
                    break;
                }
                case 11: {
                    // 👾 Arcade 80s: Retro pixel invaders
                    const invaderX = (Math.sin(t * 1.8) * 0.35 + 0.5) * (w - 20);
                    const invaderY = h / 2 - 6;
                    ctx.fillStyle = '#ff0088';
                    ctx.fillRect(invaderX + 4, invaderY, 8, 2);
                    ctx.fillRect(invaderX + 2, invaderY + 2, 12, 4);
                    ctx.fillRect(invaderX + 4, invaderY + 6, 8, 4);
                    ctx.fillRect(invaderX, invaderY + 4, 3, 6);
                    ctx.fillRect(invaderX + 13, invaderY + 4, 3, 6);
                    break;
                }
                case 15: {
                    // ⏱️ Time.is Clock: Cyber clock digits and pulsing ring
                    const cx = w / 2, cy = h / 2;
                    ctx.strokeStyle = '#00ffcc';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
                    ctx.stroke();
                    // Clock hand
                    const handAngle = t * 2;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(handAngle) * 11, cy + Math.sin(handAngle) * 11);
                    ctx.stroke();
                    // Digital readout text
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '8px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('NIST', cx, cy + 4);
                    break;
                }
                case 19: {
                    // 📼 VHS Dreamlover: Glitch scanline & chromatic split
                    ctx.fillStyle = '#220033';
                    ctx.fillRect(0, 0, w, h);
                    // Tracking distortion bar
                    const barY = (t * 25) % h;
                    ctx.fillStyle = 'rgba(255, 0, 128, 0.6)';
                    ctx.fillRect(0, barY, w, 3);
                    // Scanlines
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    for (let y = 0; y < h; y += 2) {
                        ctx.fillRect(0, y, w, 1);
                    }
                    // VHS stamp
                    ctx.fillStyle = '#00ffff';
                    ctx.font = '7px monospace';
                    ctx.fillText('PLAY ►', 6, 12);
                    break;
                }
                case 12: {
                    // 🚀 Warp Starfield: Stars accelerating from center
                    const cx = w / 2, cy = h / 2;
                    for (let s = 0; s < 16; s++) {
                        const angle = s * (Math.PI * 2 / 16);
                        const dist = ((t * 35 + s * 9) % (w * 0.55)) + 2;
                        const px = cx + Math.cos(angle) * dist;
                        const py = cy + Math.sin(angle) * dist * 0.7;
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(px, py, 1.8, 1.8);
                    }
                    break;
                }
                case 13: {
                    // 🌌 Spiral Galaxy: Two-arm cosmic swirl
                    const cx = w / 2, cy = h / 2;
                    for (let arm = 0; arm < 2; arm++) {
                        const armOffset = arm * Math.PI;
                        for (let step = 0; step < 18; step++) {
                            const theta = step * 0.35 + t * 1.5 + armOffset;
                            const rad = step * 1.3;
                            const gx = cx + Math.cos(theta) * rad * 1.6;
                            const gy = cy + Math.sin(theta) * rad;
                            ctx.fillStyle = arm === 0 ? '#ff00aa' : '#00e5ff';
                            ctx.fillRect(gx, gy, 1.6, 1.6);
                        }
                    }
                    // Galaxy core
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 14: {
                    // ✨ Particle Stream: Twisting glowing ribbon
                    ctx.strokeStyle = '#ffaa00';
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    for (let x = 0; x < w; x += 3) {
                        const py = h / 2 + Math.sin(x * 0.1 + t * 3) * 11;
                        if (x === 0) ctx.moveTo(x, py);
                        else ctx.lineTo(x, py);
                    }
                    ctx.stroke();
                    // Floating particle dots
                    for (let p = 0; p < 8; p++) {
                        const px = ((p * 18 + t * 25) % w);
                        const py = h / 2 + Math.sin(px * 0.1 + t * 3) * 11 + Math.cos(p) * 4;
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(px, py, 2, 2);
                    }
                    break;
                }
                default: {
                    // Default generic dynamic wave
                    ctx.strokeStyle = '#00ffcc';
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    for (let x = 0; x < w; x += 3) {
                        const y = h / 2 + Math.sin(x * 0.08 + t * 2) * 8;
                        if (x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                    break;
                }
            }
        });
    }

    requestAnimationFrame(renderThumbnails);
}
