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
            intensity: 0.85,    // 0.0 - 1.0
            minBrightness: 0.15, // minimum resting brightness
            sceneColor: '#00ffff'
        };

        this.rooms = [];
        this.isDispatching = false;
        this.lastDispatchTime = 0;
        this.colorCycleAngle = 0;
        this.dispatchThrottleMs = 90; // ~11 updates per second REST rate limit safe
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
            mode: this.config.mode,
            intensity: this.config.intensity,
            minBrightness: this.config.minBrightness,
            rooms: this.rooms
        };
    }

    // Real-Time Audio-to-Light Dispatcher
    async processAudioBeat(audioData) {
        if (!this.config.enabled || !this.config.bridgeIp || !this.config.username) return;

        const now = performance.now();
        const isPriority = !!audioData.isStrobe || !!audioData.isDrop;

        // Throttle non-priority frames to protect Hue Bridge CPU
        if (!isPriority && (now - this.lastDispatchTime < this.dispatchThrottleMs)) {
            return;
        }

        this.lastDispatchTime = now;

        const {
            bass = 0,
            mid = 0,
            treble = 0,
            sceneColor = '#00ffff',
            isDrop = false,
            isStrobe = false,
            bpm = 126
        } = audioData;

        let targetBri = 0;
        let targetXY = [0.3127, 0.3290];
        let transitionTime = 1; // 100ms default smooth glide

        const intensity = this.config.intensity ?? 0.85;
        const minBri = Math.round((this.config.minBrightness ?? 0.15) * 254);

        if (isStrobe) {
            targetBri = 254;
            targetXY = [0.3127, 0.3290]; // Pure white flash
            transitionTime = 0; // Instant 0ms snap
        } else if (this.config.mode === 'strobe_only') {
            if (isDrop) {
                targetBri = Math.round(minBri + (254 - minBri) * bass * intensity);
                targetXY = hexToCIE(sceneColor);
                transitionTime = 0;
            } else {
                targetBri = minBri;
                targetXY = hexToCIE(sceneColor);
                transitionTime = 2;
            }
        } else if (this.config.mode === 'bass_flash') {
            const punch = Math.min(1.0, bass * 1.3);
            targetBri = Math.round(minBri + (254 - minBri) * (punch * intensity));
            if (bass > 0.65) {
                targetXY = [0.675, 0.322]; // Vivid saturated red on kick drop
            } else {
                targetXY = [0.15, 0.06]; // Deep moody nightclub blue
            }
            transitionTime = bass > 0.7 ? 0 : 1;
        } else if (this.config.mode === 'rainbow_cycle') {
            this.colorCycleAngle = (this.colorCycleAngle + 0.08 * (bpm / 120)) % (Math.PI * 2);
            const r = Math.round(Math.sin(this.colorCycleAngle) * 127 + 128);
            const g = Math.round(Math.sin(this.colorCycleAngle + 2) * 127 + 128);
            const b = Math.round(Math.sin(this.colorCycleAngle + 4) * 127 + 128);
            targetXY = rgbToCIE(r, g, b);
            targetBri = Math.round(minBri + (254 - minBri) * (bass * intensity));
            transitionTime = 1;
        } else {
            // Default: 'scene_sync' (matches 3D Visualizer Color Palette with bass punch)
            targetXY = hexToCIE(sceneColor);
            targetBri = Math.round(minBri + (254 - minBri) * (bass * intensity));
            if (isDrop) {
                targetBri = 254;
                transitionTime = 0;
            }
        }

        targetBri = Math.max(1, Math.min(254, targetBri));

        // Dispatch HTTP Command to Hue Bridge
        this.sendGroupAction(this.config.targetGroup, {
            on: targetBri > 2,
            bri: targetBri,
            xy: targetXY,
            transitiontime: transitionTime
        }).catch(() => {});
    }

    async sendGroupAction(groupId, body) {
        if (!this.config.bridgeIp || !this.config.username) return;
        const target = (groupId === 'all' || !groupId) ? '0' : groupId;
        const url = `http://${this.config.bridgeIp}/api/${this.config.username}/groups/${target}/action`;

        try {
            await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(1200)
            });
        } catch (e) {
            // Drop late frames
        }
    }
}
