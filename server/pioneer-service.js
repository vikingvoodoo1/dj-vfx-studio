import dgram from 'dgram';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Pioneer DJ / Rekordbox / Pro DJ Link Service
 * Discovers CDJ-2000NXS2, CDJ-3000, XDJ-XZ, XDJ-RX3, and Rekordbox Performance Mode
 */
export class PioneerDJService {
    constructor({ onTrack, onBPM, onBeat, onStatus, onDeckState }) {
        this.onTrack = onTrack;
        this.onBPM = onBPM;
        this.onBeat = onBeat;
        this.onStatus = onStatus;
        this.onDeckState = onDeckState;

        this.udpSocketAnnounce = null;
        this.udpSocketBeat = null;
        this.isConnected = false;
        this.discoveredDevices = new Map();
        this.deckStates = new Map([
            [1, { deck: 1, bpm: 126.0, pitch: 0, play: false, artist: '', title: '', beat: 1 }],
            [2, { deck: 2, bpm: 126.0, pitch: 0, play: false, artist: '', title: '', beat: 1 }],
            [3, { deck: 3, bpm: 126.0, pitch: 0, play: false, artist: '', title: '', beat: 1 }],
            [4, { deck: 4, bpm: 126.0, pitch: 0, play: false, artist: '', title: '', beat: 1 }]
        ]);

        this.historyWatcher = null;
        this.lastTrackSignature = '';
    }

    async init() {
        console.log('[Pioneer Pro DJ Link] Initializing Pro DJ Link & Rekordbox listener...');
        this.startUDPDiscovery();
        this.startRekordboxWatcher();
    }

    startUDPDiscovery() {
        // UDP 50000: Device Announce & Discovery Packets
        try {
            this.udpSocketAnnounce = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            this.udpSocketAnnounce.on('error', (err) => {
                console.warn('[Pioneer Pro DJ Link] Announce socket notice:', err.message);
            });

            this.udpSocketAnnounce.on('message', (msg, rinfo) => {
                this.handleAnnouncePacket(msg, rinfo);
            });

            this.udpSocketAnnounce.bind(50000, '0.0.0.0', () => {
                console.log('[Pioneer Pro DJ Link] 🔍 Listening for CDJs/XDJs on UDP 50000...');
                try {
                    this.udpSocketAnnounce.setBroadcast(true);
                } catch (e) {}
            });
        } catch (err) {
            console.warn('[Pioneer Pro DJ Link] Socket bind error:', err.message);
        }

        // UDP 50002: Beat Grid, BPM & Playback Packets
        try {
            this.udpSocketBeat = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            this.udpSocketBeat.on('error', (err) => {
                console.warn('[Pioneer Pro DJ Link] Beat socket notice:', err.message);
            });

            this.udpSocketBeat.on('message', (msg, rinfo) => {
                this.handleBeatPacket(msg, rinfo);
            });

            this.udpSocketBeat.bind(50002, '0.0.0.0', () => {
                console.log('[Pioneer Pro DJ Link] ⚡ Listening for Pro DJ Link Beat Packets on UDP 50002...');
                try {
                    this.udpSocketBeat.setBroadcast(true);
                } catch (e) {}
            });
        } catch (err) {
            console.warn('[Pioneer Pro DJ Link] Beat socket bind error:', err.message);
        }
    }

    handleAnnouncePacket(msg, rinfo) {
        // Pioneer Pro DJ Link Magic Header: 0x51 0x73 0x70 0x74 0x31 0x01 ('Qspt1\x01')
        if (msg.length < 10) return;
        const header = msg.toString('ascii', 0, 5);
        if (header === 'Qspt1' || header.startsWith('Qsp')) {
            const devType = msg.readUInt8(5);
            const devName = msg.toString('utf8', 10, Math.min(30, msg.length)).replace(/\0/g, '').trim();
            const playerNum = msg.length > 36 ? msg.readUInt8(36) : 1;

            const devKey = `${rinfo.address}:${playerNum}`;
            if (!this.discoveredDevices.has(devKey)) {
                console.log(`[Pioneer Pro DJ Link] 🟢 Pioneer Hardware Discovered: ${devName || 'CDJ/XDJ'} (Player ${playerNum}) @ ${rinfo.address}`);
                this.discoveredDevices.set(devKey, {
                    name: devName || `Pioneer CDJ (Deck ${playerNum})`,
                    address: rinfo.address,
                    player: playerNum,
                    timestamp: Date.now()
                });
                this.isConnected = true;
                this.notifyStatus();
            }
        }
    }

    handleBeatPacket(msg, rinfo) {
        // Parse Pioneer Beat Grid / Tempo Packet
        if (msg.length < 30) return;
        const header = msg.toString('ascii', 0, 5);
        if (header.startsWith('Qsp')) {
            const playerNum = msg.readUInt8(0x21) || 1;
            const beatNumber = (msg.readUInt8(0x28) % 4) + 1;
            
            // Raw BPM is stored as 16-bit uint multiplied by 100
            let rawBpm = 0;
            if (msg.length >= 0x2e) {
                rawBpm = msg.readUInt16BE(0x2c) / 100.0;
            }

            // Pitch offset
            let pitchPercent = 0;
            if (msg.length >= 0x32) {
                const rawPitch = msg.readInt32BE(0x2e);
                pitchPercent = (rawPitch / 100000.0);
            }

            if (rawBpm > 40 && rawBpm < 300) {
                const currentDeck = this.deckStates.get(playerNum) || { deck: playerNum };
                currentDeck.bpm = rawBpm;
                currentDeck.pitch = pitchPercent;
                currentDeck.beat = beatNumber;
                currentDeck.play = true;
                this.deckStates.set(playerNum, currentDeck);

                if (this.onBPM) this.onBPM(rawBpm, playerNum);
                if (this.onBeat) this.onBeat(playerNum, beatNumber);
                if (this.onDeckState) this.onDeckState(currentDeck);
            }
        }
    }

    startRekordboxWatcher() {
        // Look for Rekordbox session history / local log files
        const possiblePaths = [
            path.join(os.homedir(), 'Library', 'Application Support', 'Pioneer', 'rekordbox'),
            path.join(os.homedir(), 'Documents', 'rekordbox'),
            path.join(process.cwd(), 'rekordbox_nowplaying.txt'),
            path.join(process.cwd(), 'nowplaying.txt')
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                try {
                    const stats = fs.statSync(p);
                    if (stats.isFile()) {
                        this.watchFile(p);
                    }
                } catch (e) {}
            }
        }
    }

    watchFile(filePath) {
        try {
            fs.watch(filePath, (eventType) => {
                if (eventType === 'change') {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8').trim();
                        if (content && content !== this.lastTrackSignature) {
                            this.lastTrackSignature = content;
                            this.parseTrackString(content);
                        }
                    } catch (e) {}
                }
            });
        } catch (e) {}
    }

    parseTrackString(rawText) {
        // Parse "Artist - Title" or JSON
        let artist = '';
        let title = rawText;
        let bpm = 126.0;

        if (rawText.startsWith('{') && rawText.endsWith('}')) {
            try {
                const parsed = JSON.parse(rawText);
                artist = parsed.artist || '';
                title = parsed.title || '';
                bpm = parsed.bpm || 126.0;
            } catch (e) {}
        } else if (rawText.includes(' - ')) {
            const parts = rawText.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        }

        if (title) {
            console.log(`[Rekordbox] 🎵 Track Change: ${artist} - ${title}`);
            const trackPayload = {
                deck: 1,
                artist,
                title,
                bpm,
                ecosystem: 'pioneer',
                device: 'Rekordbox DJ'
            };
            if (this.onTrack) this.onTrack(trackPayload);
        }
    }

    notifyStatus() {
        const deviceNames = Array.from(this.discoveredDevices.values()).map(d => d.name);
        if (this.onStatus) {
            this.onStatus({
                ecosystem: 'pioneer',
                connected: this.isConnected,
                deviceCount: this.discoveredDevices.size,
                device: deviceNames.length > 0 ? deviceNames.join(', ') : 'Pioneer Pro DJ Link Online',
                message: deviceNames.length > 0 ? `Connected to ${deviceNames.join(', ')}` : 'Listening on UDP 50000/50002'
            });
        }
    }

    destroy() {
        if (this.udpSocketAnnounce) {
            try { this.udpSocketAnnounce.close(); } catch (e) {}
        }
        if (this.udpSocketBeat) {
            try { this.udpSocketBeat.close(); } catch (e) {}
        }
    }
}
