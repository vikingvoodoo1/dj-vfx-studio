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

    // Wide gamut D65 conversion
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

export class PhilipsHueService {
    constructor() {
        this.config = {
            bridgeIp: null,
            username: null,
            clientkey: null,
            enabled: false,
            targetGroup: 'all', // group ID or 'all'
            mode: 'scene_sync', // 'scene_sync', 'bass_flash', 'rainbow_cycle', 'strobe_only'
            intensity: 0.95,    // 0.0 - 1.0
            minBrightness: 0.15, // minimum resting brightness
            sceneColor: '#00ffff',
            kickStrobeEnabled: false
        };

        this.rooms = [];
        this.isDispatching = false;
        this.pendingPayload = null;
        this.lastDispatchTime = 0;
        this.lastSentXY = null;
        this.colorCycleAngle = 0;
        this.kickCount = 0;
        this.lastKickDetectionTime = 0;
        this.lastKickStrobeTime = 0;
        this.dispatchThrottleMs = 40; // ~25 updates per second maximum with inflight pacing
    }

    async init() {
        await this.loadConfig();
        if (this.config.bridgeIp && this.config.username) {
            console.log(`[Philips Hue] 💡 Loaded Hue config for Bridge @ ${this.config.bridgeIp}`);
            await this.fetchRooms();
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

    async discoverBridge() {
        try {
            // 1. Philips Hue N-UPnP Cloud Discovery
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
        } catch (err) {
            // N-UPnP failed or offline
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

        const bridgeUrl = `http://${targetIp || this.config.bridgeIp}/api`;
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
                            ip: targetIp, 
                            message: '👉 Press the physical link button on top of your Philips Hue Bridge, then click Pair again within 30 seconds.' 
                        };
                    }
                    return { status: 'error', message: data[0].error.description || 'Pairing error' };
                }

                if (data[0].success && data[0].success.username) {
                    this.config.bridgeIp = targetIp || this.config.bridgeIp;
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
            return { status: 'error', message: `Could not reach Hue Bridge at ${targetIp}. Check IP address.` };
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

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig().catch(() => {});
    }

    getStatus() {
        return {
            paired: !!(this.config.bridgeIp && this.config.username),
            bridgeIp: this.config.bridgeIp,
            enabled: this.config.enabled,
            targetGroup: this.config.targetGroup,
            mode: this.config.mode || 'scene_sync',
            intensity: this.config.intensity ?? 0.95,
            minBrightness: this.config.minBrightness ?? 0.15,
            kickStrobeEnabled: !!this.config.kickStrobeEnabled,
            rooms: this.rooms
        };
    }

    // High-Performance Audio-to-Light Dispatcher (Ultra-Low Latency & Punchy Snap)
    async processAudioBeat(audioData) {
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
            isDrop = false,
            isStrobe = false,
            bpm = 126
        } = audioData;

        // Periodic Kick White Strobe Burst Trigger
        const isKickHit = isOnset || transientImpulse > 0.35 || bass > 0.45;
        if (this.config.kickStrobeEnabled && isKickHit && (now - this.lastKickDetectionTime > 180)) {
            this.lastKickDetectionTime = now;
            this.kickCount++;
            // Every 4th kick (or on heavy drop after 1.8s cooldown), trigger a blinding white strobe pop (85ms burst)
            if (this.kickCount % 4 === 0 || (isDrop && (now - this.lastKickStrobeTime > 1800))) {
                this.lastKickStrobeTime = now;
                this.kickFlashUntil = now + 85;
            }
        }

        const isWhiteKickPop = !!(this.kickFlashUntil && now < this.kickFlashUntil);
        const isManualStrobe = !!isStrobe;

        let targetXY = [0.3127, 0.3290];
        let targetBri = 0;
        let transitionTime = 0; // Instant 0ms punch

        const intensity = this.config.intensity ?? 0.95;
        const minBri = Math.max(1, Math.round((this.config.minBrightness ?? 0.15) * 254));
        const briRange = 254 - minBri;

        // Expanded Transient & Beat Power
        const rawEnergy = isOnset
            ? 1.0
            : Math.max(
                transientImpulse * 1.35,
                Math.pow(bass, 0.75) * 1.45,
                Math.pow(mid, 1.2) * 0.75
            );
        const punch = Math.min(1.0, Math.max(0.0, rawEnergy));

        if (isManualStrobe || isWhiteKickPop) {
            // Pure Xenon White Strobe Pop
            targetXY = [0.3127, 0.3290];
            targetBri = 254;
            transitionTime = 0;
        } else if (this.config.mode === 'strobe_only') {
            targetXY = [0.3127, 0.3290];
            if (isDrop || isOnset || transientImpulse > 0.28 || bass > 0.40) {
                targetBri = Math.round(minBri + briRange * intensity);
                transitionTime = 0;
            } else {
                targetBri = Math.max(1, Math.round(minBri * 0.3));
                transitionTime = 1;
            }
        } else if (this.config.mode === 'bass_flash') {
            if (isDrop || isOnset || bass > 0.35 || transientImpulse > 0.28) {
                targetXY = [0.675, 0.322]; // Vivid saturated neon crimson
                targetBri = Math.round(minBri + briRange * Math.min(1.0, punch * 1.3) * intensity);
                transitionTime = 0;
            } else {
                targetXY = [0.15, 0.06];  // Deep moody nightclub royal blue
                targetBri = minBri;
                transitionTime = 1;
            }
        } else if (this.config.mode === 'rainbow_cycle') {
            this.colorCycleAngle = (this.colorCycleAngle + 0.14 * (bpm / 120)) % (Math.PI * 2);
            const r = Math.round(Math.sin(this.colorCycleAngle) * 127 + 128);
            const g = Math.round(Math.sin(this.colorCycleAngle + 2.094) * 127 + 128);
            const b = Math.round(Math.sin(this.colorCycleAngle + 4.188) * 127 + 128);
            targetXY = rgbToCIE(r, g, b);
            targetBri = Math.round(minBri + briRange * Math.pow(punch, 0.85) * intensity);
            transitionTime = punch > 0.25 ? 0 : 1;
        } else {
            // Default: 'scene_sync' (dynamically matches 3D Visualizer Color Palette)
            targetXY = hexToCIE(sceneColor);
            if (isDrop || isOnset) {
                targetBri = 254;
                transitionTime = 0;
            } else if (punch > 0.4) {
                targetBri = Math.round(minBri + briRange * Math.pow(punch, 0.8) * intensity);
                transitionTime = 0;
            } else {
                targetBri = Math.round(minBri + briRange * Math.pow(punch, 1.25) * intensity);
                transitionTime = punch > 0.15 ? 0 : 1;
            }
        }

        targetBri = Math.max(1, Math.min(254, targetBri));

        const xyKey = `${targetXY[0].toFixed(3)},${targetXY[1].toFixed(3)}`;
        const isColorChanged = (xyKey !== this.lastSentXY);
        const isPriority = isManualStrobe || isWhiteKickPop || isDrop || isOnset || isColorChanged || transientImpulse > 0.20 || bass > 0.35;

        // Rate limiting: non-priority resting frames throttled to prevent network flooding
        if (!isPriority && (now - this.lastDispatchTime < this.dispatchThrottleMs)) {
            return;
        }

        this.lastDispatchTime = now;

        const actionBody = {
            on: true,
            bri: targetBri,
            xy: targetXY,
            transitiontime: transitionTime
        };

        this.sendGroupAction(this.config.targetGroup, actionBody, xyKey);
    }

    async sendGroupAction(groupId, body, xyKey = null) {
        if (!this.config.bridgeIp || !this.config.username) return;

        // If a request is currently inflight, hold the latest target payload
        if (this.isDispatching) {
            this.pendingPayload = { groupId, body, xyKey };
            return;
        }

        this.isDispatching = true;
        const target = (groupId === 'all' || !groupId) ? '0' : groupId;
        const url = `http://${this.config.bridgeIp}/api/${this.config.username}/groups/${target}/action`;

        try {
            if (xyKey) this.lastSentXY = xyKey;
            await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(800)
            });
        } catch (e) {
            // Drop late frames
        } finally {
            if (this.pendingPayload) {
                const next = this.pendingPayload;
                this.pendingPayload = null;
                // Dispatch queued latest frame with a tight 20ms safety gap to maintain max responsiveness
                setTimeout(async () => {
                    const nextTarget = (next.groupId === 'all' || !next.groupId) ? '0' : next.groupId;
                    const nextUrl = `http://${this.config.bridgeIp}/api/${this.config.username}/groups/${nextTarget}/action`;
                    try {
                        if (next.xyKey) this.lastSentXY = next.xyKey;
                        await fetch(nextUrl, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(next.body),
                            signal: AbortSignal.timeout(800)
                        });
                    } catch (e) {
                    } finally {
                        this.isDispatching = false;
                    }
                }, 20);
            } else {
                this.isDispatching = false;
            }
        }
    }
}
