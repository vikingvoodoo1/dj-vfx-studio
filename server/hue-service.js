import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, 'hue-config.json');

// Color Utilities: Hex/RGB to Philips Hue CIE 1931 (Gamut C)
export function rgbToCIE(r, g, b) {
    // Normalize to 0-1
    let red = r / 255;
    let green = g / 255;
    let blue = b / 255;

    // Apply gamma correction
    red = (red > 0.04045) ? Math.pow((red + 0.055) / (1.0 + 0.055), 2.4) : (red / 12.92);
    green = (green > 0.04045) ? Math.pow((green + 0.055) / (1.0 + 0.055), 2.4) : (green / 12.92);
    blue = (blue > 0.04045) ? Math.pow((blue + 0.055) / (1.0 + 0.055), 2.4) : (blue / 12.92);

    // Wide gamut D65 conversion matrix
    const X = red * 0.664511 + green * 0.154324 + blue * 0.162028;
    const Y = red * 0.283881 + green * 0.668433 + blue * 0.047685;
    const Z = red * 0.000088 + green * 0.072310 + blue * 0.986039;

    const sum = X + Y + Z;
    if (sum === 0) return [0.3127, 0.3290]; // D65 White point

    const x = +(X / sum).toFixed(4);
    const y = +(Y / sum).toFixed(4);
    return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
}

export function hexToCIE(hex) {
    if (!hex) return [0.3127, 0.3290];
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return rgbToCIE(r, g, b);
}

// 100% Saturated HSV to RGB (Pure Primary / Secondary / Tertiary Gamut Extremes)
export function hsvToRGB(h, s = 1.0, v = 1.0) {
    const normH = ((h % 360) + 360) % 360;
    const c = v * s;
    const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;

    if (normH < 60) {
        r = c; g = x; b = 0;
    } else if (normH < 120) {
        r = x; g = c; b = 0;
    } else if (normH < 180) {
        r = 0; g = c; b = x;
    } else if (normH < 240) {
        r = 0; g = x; b = c;
    } else if (normH < 300) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}

export function hsvToCIE(h, s = 1.0, v = 1.0) {
    const [r, g, b] = hsvToRGB(h, s, v);
    return rgbToCIE(r, g, b);
}

// Curated high-impact club & festival palettes
const BASS_FLASH_PALETTE = [
    [0.7006, 0.2993], // Electric Crimson Red
    [0.1530, 0.1980], // High-Voltage Cyan
    [0.1724, 0.7468], // Acid Neon Lime
    [0.3800, 0.1500], // Hot Magenta / Pink
    [0.4430, 0.5150], // Pure Gold
    [0.1355, 0.0399]  // Deep Royal Cobalt
];

export class PhilipsHueService {
    constructor() {
        this.config = {
            bridgeIp: null,
            username: null,
            clientkey: null,
            enabled: false,
            targetGroup: 'all', // group ID or 'all'
            mode: 'scene_sync', // 'scene_sync', 'bass_flash', 'rainbow_cycle', 'strobe_only'
            intensity: 1.0,     // 0.0 - 1.0
            minBrightness: 0.05, // minimum resting brightness (5% for high dynamic range)
            sceneColor: '#00ffff',
            kickStrobeEnabled: false
        };

        this.rooms = [];
        this.isDispatching = false;
        this.queuedPayload = null;
        this.decayTimer = null;
        this.lastKickTime = 0;
        this.kickCount = 0;
        this.lastSentXY = null;
        this.lastSentBri = -1;
        this.colorCycleAngle = 0;
        this.lastHeartbeatTime = 0;

        // Adaptive Dynamic Energy Envelope Tracker (Auto-Gain Calibration)
        this.bassEma = 0.15;
        this.bassMin = 0.04;
        this.bassMax = 0.60;
    }

    async init() {
        await this.loadConfig();
        if (this.config.bridgeIp && this.config.username) {
            console.log(`[Philips Hue] 💡 Loaded Hue config for Bridge @ ${this.config.bridgeIp}`);
            const rooms = await this.fetchRooms();
            if (!rooms || rooms.length === 0) {
                console.log('[Philips Hue] ⚠️ Configured IP unreachable. Auto-discovering Hue Bridge on local LAN...');
                const disc = await this.discoverBridge();
                if (disc.success && disc.ip && disc.ip !== this.config.bridgeIp) {
                    console.log(`[Philips Hue] 🔄 Discovered bridge @ ${disc.ip}. Testing saved credentials...`);
                    const verified = await this.testCredentials(disc.ip, this.config.username);
                    if (verified) {
                        this.config.bridgeIp = disc.ip;
                        await this.saveConfig();
                        console.log(`[Philips Hue] ✅ Automatically re-verified Bridge on new IP: ${disc.ip}`);
                        await this.fetchRooms();
                    }
                }
            }
        } else {
            console.log('[Philips Hue] 💡 Initializing auto-discovery for local Hue Bridge...');
            this.discoverBridge().catch(() => {});
        }
    }

    async loadConfig() {
        try {
            const data = await fs.readFile(CONFIG_FILE, 'utf-8');
            this.config = { ...this.config, ...JSON.parse(data) };
        } catch (e) {
            // Config file doesn't exist yet, default settings used
        }
    }

    async saveConfig() {
        try {
            await fs.writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
        } catch (e) {
            console.error('[Philips Hue] Failed to save config:', e);
        }
    }

    async testCredentials(ip, username) {
        if (!ip || !username) return false;
        try {
            const url = `http://${ip}/api/${username}/config`;
            const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
            if (res.ok) {
                const data = await res.json();
                if (data && data.name && !data.error && !Array.isArray(data)) {
                    return true;
                }
            }
        } catch (e) {}
        return false;
    }

    async discoverBridge() {
        try {
            const res = await fetch('https://discovery.meethue.com', { signal: AbortSignal.timeout(4000) });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0 && data[0].internalipaddress) {
                    const discoveredIp = data[0].internalipaddress;
                    console.log(`[Philips Hue] 🔍 Discovered Hue Bridge on LAN @ ${discoveredIp}`);
                    this.config.bridgeIp = discoveredIp;
                    await this.saveConfig();
                    return { success: true, ip: discoveredIp };
                }
            }
        } catch (err) {}

        const fallbackHosts = ['philips-hue.local', 'hue-bridge.local'];
        for (const host of fallbackHosts) {
            try {
                const res = await fetch(`http://${host}/api/config`, { signal: AbortSignal.timeout(2000) });
                if (res.ok) {
                    const cfg = await res.json();
                    if (cfg && (cfg.ipaddress || cfg.name)) {
                        const targetIp = cfg.ipaddress || host;
                        console.log(`[Philips Hue] 🔍 Discovered Hue Bridge via mDNS @ ${targetIp}`);
                        this.config.bridgeIp = targetIp;
                        await this.saveConfig();
                        return { success: true, ip: targetIp };
                    }
                }
            } catch (e) {}
        }

        return { success: false, ip: this.config.bridgeIp || null };
    }

    async pairBridge(ip) {
        const targetIp = ip || this.config.bridgeIp;
        if (!targetIp) {
            const discovered = await this.discoverBridge();
            if (!discovered.ip) {
                return { status: 'error', message: 'No Philips Hue Bridge found on local network. Enter Bridge IP manually.' };
            }
        }

        const currentIp = targetIp || this.config.bridgeIp;

        if (this.config.username) {
            const alreadyValid = await this.testCredentials(currentIp, this.config.username);
            if (alreadyValid) {
                this.config.bridgeIp = currentIp;
                await this.saveConfig();
                await this.fetchRooms();
                console.log(`[Philips Hue] 🎉 Existing paired credentials re-verified on Bridge @ ${currentIp}`);
                return {
                    status: 'paired',
                    ip: currentIp,
                    username: this.config.username,
                    rooms: this.rooms,
                    message: 'Connected & Paired Successfully (Auto-Verified)!'
                };
            }
        }

        const bridgeUrl = `http://${currentIp}/api`;
        try {
            const res = await fetch(bridgeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    devicetype: 'dj_vfx#master_console',
                    generateclientkey: true
                }),
                signal: AbortSignal.timeout(5000)
            });

            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                if (data[0].error) {
                    if (data[0].error.type === 101) {
                        return { 
                            status: 'press_button', 
                            ip: currentIp, 
                            message: '👉 Press the physical link button on top of your Philips Hue Bridge, then click Pair again within 30 seconds.' 
                        };
                    }
                    return { status: 'error', message: data[0].error.description || 'Pairing error' };
                }

                if (data[0].success && data[0].success.username) {
                    this.config.bridgeIp = currentIp;
                    this.config.username = data[0].success.username;
                    this.config.clientkey = data[0].success.clientkey || null;
                    await this.saveConfig();
                    console.log(`[Philips Hue] 🎉 Successfully paired with Hue Bridge! Username: ${this.config.username}`);
                    await this.fetchRooms();
                    return { 
                        status: 'paired', 
                        ip: this.config.bridgeIp, 
                        username: this.config.username,
                        rooms: this.rooms,
                        message: 'Connected & Paired Successfully!' 
                    };
                }
            }
            return { status: 'error', message: 'Unexpected response from Hue Bridge.' };
        } catch (err) {
            return { status: 'error', message: `Could not reach Hue Bridge at ${currentIp}. Check IP address.` };
        }
    }

    async fetchRooms() {
        if (!this.config.bridgeIp || !this.config.username) return [];
        try {
            const url = `http://${this.config.bridgeIp}/api/${this.config.username}/groups`;
            const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
            if (res.ok) {
                const groups = await res.json();
                const roomList = [
                    { id: 'all', name: '⚡ All Configured Lights', type: 'All', lightCount: 'All' }
                ];

                for (const [id, grp] of Object.entries(groups)) {
                    roomList.push({
                        id: String(id),
                        name: grp.name || `Room ${id}`,
                        type: grp.type || 'Room',
                        class: grp.class || 'Other',
                        lightCount: Array.isArray(grp.lights) ? grp.lights.length : 0
                    });
                }
                this.rooms = roomList;
                return this.rooms;
            }
        } catch (err) {
            console.error('[Philips Hue] Error fetching rooms:', err.message);
        }
        return this.rooms;
    }

    async turnOffLights(groupId = null) {
        this.config.enabled = false;
        await this.saveConfig().catch(() => {});
        if (this.decayTimer) {
            clearTimeout(this.decayTimer);
            this.decayTimer = null;
        }
        this.queuedPayload = null;
        this.lastSentBri = 0;
        this.lastSentXY = null;
        const target = (groupId === 'all' || !groupId) ? '0' : String(groupId);
        console.log(`[Philips Hue] 🌑 Turning OFF physical lights for Group ${target}...`);
        await this.sendAction(target, { on: false, transitiontime: 2 }, true);
        if (target === '0' && Array.isArray(this.rooms)) {
            for (const room of this.rooms) {
                if (room.id && room.id !== 'all' && room.id !== '0') {
                    await this.sendAction(room.id, { on: false, transitiontime: 2 }, true);
                }
            }
        }
    }

    async turnOnLights(groupId = null) {
        this.config.enabled = true;
        await this.saveConfig().catch(() => {});
        const target = (groupId === 'all' || !groupId) ? '0' : String(groupId);
        console.log(`[Philips Hue] 💡 Turning ON physical lights for Group ${target}...`);
        const targetBri = Math.max(15, Math.round((this.config.minBrightness || 0.10) * 254));
        await this.sendAction(target, { on: true, bri: targetBri, transitiontime: 2 }, true);
    }

    updateConfig(newConfig) {
        const wasEnabled = this.config.enabled;
        this.config = { ...this.config, ...newConfig };
        this.saveConfig().catch(() => {});

        if (newConfig.enabled === false && wasEnabled) {
            this.turnOffLights(this.config.targetGroup).catch(() => {});
        } else if (newConfig.enabled === true && !wasEnabled) {
            this.turnOnLights(this.config.targetGroup).catch(() => {});
        }
    }

    getStatus() {
        return {
            paired: !!(this.config.bridgeIp && this.config.username),
            bridgeIp: this.config.bridgeIp,
            enabled: this.config.enabled,
            targetGroup: this.config.targetGroup,
            mode: this.config.mode || 'scene_sync',
            intensity: this.config.intensity ?? 1.0,
            minBrightness: this.config.minBrightness ?? 0.05,
            kickStrobeEnabled: !!this.config.kickStrobeEnabled,
            rooms: this.rooms
        };
    }

    // High-Impact Rhythmic Audio Envelope Engine (Instant 0ms Attack + Smooth 200ms Decay)
    processAudioBeat(audioData) {
        if (!this.config.enabled || !this.config.bridgeIp || !this.config.username) return;

        const now = performance.now();
        const {
            bass = 0,
            smoothedBass = 0,
            transientImpulse = 0,
            isOnset = false,
            mid = 0,
            treble = 0,
            overall = 0,
            sceneColor = '#00ffff',
            scenePalette = [],
            isDrop = false,
            isStrobe = false,
            bpm = 126
        } = audioData;

        const intensity = this.config.intensity ?? 1.0;
        const minBri = Math.max(1, Math.round((this.config.minBrightness ?? 0.05) * 254));
        const maxBri = Math.max(minBri + 20, Math.round(254 * intensity));

        // 1. Manual Strobe Flash (Spacebar or HUD Button)
        if (isStrobe) {
            if (this.decayTimer) clearTimeout(this.decayTimer);
            this.sendAction(this.config.targetGroup, {
                on: true,
                bri: 254,
                xy: [0.3127, 0.3290], // Pure Xenon White
                transitiontime: 0
            }, true);

            this.decayTimer = setTimeout(() => {
                this.sendRestingState(sceneColor, minBri, scenePalette);
            }, 140);
            return;
        }

        // 2. Adaptive Bass Tracking (Catches every kick drum regardless of master volume level)
        this.bassEma = this.bassEma * 0.88 + bass * 0.12;
        this.bassMax = Math.max(bass, this.bassMax * 0.99);
        this.bassMin = Math.min(bass, this.bassMin * 1.01);
        const dynamicSpread = Math.max(0.08, this.bassMax - this.bassMin);
        const relativeBass = (bass - this.bassMin) / dynamicSpread;

        // Minimum time spacing prevents zigbee congestion while allowing fast beats & roll drops
        const minSpacingMs = Math.max(160, (60000 / Math.max(60, Math.min(200, bpm))) * 0.45);
        const isKickHit = isOnset ||
                          transientImpulse > 0.10 ||
                          (bass > (this.bassEma * 1.06) && bass > 0.04) ||
                          relativeBass > 0.45 ||
                          isDrop;

        if (isKickHit && (now - this.lastKickTime > minSpacingMs)) {
            this.lastKickTime = now;
            this.kickCount++;

            if (this.decayTimer) clearTimeout(this.decayTimer);

            let flashXY = [0.1530, 0.1980];
            let flashBri = maxBri;

            // Check if Kick White Strobe is active (bursts ONLY on rare heavy drops or explicit strobe mode)
            const isWhitePop = (this.config.mode === 'strobe_only') || 
                               (this.config.kickStrobeEnabled && isDrop && (this.kickCount % 8 === 0));

            if (isWhitePop) {
                flashXY = [0.3127, 0.3290]; // Pure Xenon White Strobe
                flashBri = 254;
            } else if (this.config.mode === 'bass_flash') {
                // Saturated high-contrast club color flip on every kick
                flashXY = BASS_FLASH_PALETTE[this.kickCount % BASS_FLASH_PALETTE.length];
                flashBri = maxBri;
            } else if (this.config.mode === 'rainbow_cycle') {
                // Jumps 60 degrees through 100% saturated color spectrum on each beat
                this.colorCycleAngle = (this.colorCycleAngle + 60) % 360;
                flashXY = hsvToCIE(this.colorCycleAngle, 1.0, 1.0);
                flashBri = maxBri;
            } else {
                // 'scene_sync': Step through the active scene's harmonic palette on every beat!
                const palette = Array.isArray(scenePalette) && scenePalette.length > 0 
                    ? scenePalette 
                    : ['#00ffff', '#ff007f', '#00ff66', '#ffaa00', '#9900ff', '#ffffff'];
                const hexColor = palette[this.kickCount % palette.length] || sceneColor;
                flashXY = hexToCIE(hexColor);
                flashBri = maxBri;
            }

            // Attack: Instant snap (0ms transition)
            this.sendAction(this.config.targetGroup, {
                on: true,
                bri: flashBri,
                xy: flashXY,
                transitiontime: 0
            }, true);

            // Decay: Smooth exponential release back to resting floor
            const holdDurationMs = isWhitePop ? 80 : 110;
            this.decayTimer = setTimeout(() => {
                this.sendRestingState(sceneColor, minBri, scenePalette);
            }, holdDurationMs);

            return;
        }

        // 3. Resting State / Ambient Heartbeat (Paced updates when no kicks are firing)
        if (now - this.lastKickTime > 350 && (now - this.lastHeartbeatTime > 400)) {
            this.lastHeartbeatTime = now;
            this.sendRestingState(sceneColor, minBri, scenePalette);
        }
    }

    sendRestingState(sceneColor, minBri, scenePalette = []) {
        if (!this.config.enabled) return;
        let restingXY = hexToCIE(sceneColor);
        if (this.config.mode === 'bass_flash') {
            restingXY = [0.1355, 0.0399]; // Deep moody royal blue / indigo
        } else if (this.config.mode === 'strobe_only') {
            restingXY = [0.3127, 0.3290];
        } else if (this.config.mode === 'rainbow_cycle') {
            restingXY = hsvToCIE(this.colorCycleAngle, 1.0, 1.0);
        }

        const xyKey = `${restingXY[0].toFixed(3)},${restingXY[1].toFixed(3)}`;
        if (xyKey !== this.lastSentXY || this.lastSentBri !== minBri) {
            this.sendAction(this.config.targetGroup, {
                on: true,
                bri: minBri,
                xy: restingXY,
                transitiontime: 2 // 200ms smooth fade down to resting level
            }, false);
        }
    }

    async sendAction(groupId, body, isPriority = false) {
        if (!this.config.bridgeIp || !this.config.username) return;

        if (this.isDispatching) {
            // Priority events (kick flashes, manual strobes) preempt pending payloads
            if (isPriority || !this.queuedPayload || !this.queuedPayload.isPriority) {
                this.queuedPayload = { groupId, body, isPriority };
            }
            return;
        }

        this.isDispatching = true;
        const target = (groupId === 'all' || !groupId) ? '0' : groupId;
        const url = `http://${this.config.bridgeIp}/api/${this.config.username}/groups/${target}/action`;

        try {
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(1200)
            });
            if (body.xy) this.lastSentXY = `${body.xy[0].toFixed(3)},${body.xy[1].toFixed(3)}`;
            if (body.bri !== undefined) this.lastSentBri = body.bri;
            if (isPriority) {
                console.log(`[Philips Hue] 💥 Beat Flash #${this.kickCount} -> Group ${target} (bri: ${body.bri}, xy: [${body.xy ? body.xy.join(',') : ''}])`);
            }
        } catch (e) {
            console.error(`[Philips Hue] ⚠️ Action error on Group ${target}:`, e.message);
        } finally {
            this.isDispatching = false;
            // If another event was queued during dispatch, execute immediately
            if (this.queuedPayload) {
                const next = this.queuedPayload;
                this.queuedPayload = null;
                this.sendAction(next.groupId, next.body, next.isPriority);
            }
        }
    }
}
