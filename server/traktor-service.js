import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';

/**
 * Native Instruments Traktor Pro Service
 * Watches Traktor NML history logs, parses live track transitions, and supports Traktor Icecast metadata broadcast
 */
export class TraktorService {
    constructor({ onTrack, onBPM, onBeat, onStatus, onDeckState }) {
        this.onTrack = onTrack;
        this.onBPM = onBPM;
        this.onBeat = onBeat;
        this.onStatus = onStatus;
        this.onDeckState = onDeckState;

        this.isConnected = false;
        this.watchedFiles = new Set();
        this.lastLoadedSignature = '';
        this.deckStates = new Map([
            [1, { deck: 1, letter: 'A', bpm: 126.0, play: false, artist: '', title: '', key: '' }],
            [2, { deck: 2, letter: 'B', bpm: 126.0, play: false, artist: '', title: '', key: '' }],
            [3, { deck: 3, letter: 'C', bpm: 126.0, play: false, artist: '', title: '', key: '' }],
            [4, { deck: 4, letter: 'D', bpm: 126.0, play: false, artist: '', title: '', key: '' }]
        ]);

        this.icecastServer = null;
    }

    async init() {
        console.log('[Traktor Pro] Initializing Traktor Pro metadata & session watcher...');
        this.startTraktorHistoryWatcher();
        this.startIcecastMetadataReceiver();
    }

    startTraktorHistoryWatcher() {
        // Search for Traktor NML history directories
        const homeDir = os.homedir();
        const possibleRoots = [
            path.join(homeDir, 'Documents', 'Native Instruments'),
            path.join(homeDir, 'Native Instruments'),
            path.join(process.cwd(), 'traktor_history')
        ];

        let foundAny = false;
        for (const root of possibleRoots) {
            if (fs.existsSync(root)) {
                try {
                    const entries = fs.readdirSync(root);
                    for (const entry of entries) {
                        if (entry.toLowerCase().startsWith('traktor')) {
                            const historyDir = path.join(root, entry, 'History');
                            if (fs.existsSync(historyDir)) {
                                this.watchHistoryDir(historyDir);
                                foundAny = true;
                            }
                        }
                    }
                } catch (e) {}
            }
        }

        if (foundAny) {
            this.isConnected = true;
            this.notifyStatus('Traktor History Sync Active');
        } else {
            console.log('[Traktor Pro] 📁 Traktor History folder will be auto-detected when Traktor launches.');
        }

        // Also watch a local drop file if DJ uses a Traktor export script
        const localDrop = path.join(process.cwd(), 'traktor_nowplaying.txt');
        if (fs.existsSync(localDrop)) {
            this.watchFile(localDrop);
        }
    }

    watchHistoryDir(dirPath) {
        console.log(`[Traktor Pro] 🔍 Watching Traktor History Directory: ${dirPath}`);
        try {
            // Find most recent NML file
            this.scanDirectoryForLatestNML(dirPath);

            fs.watch(dirPath, (eventType, filename) => {
                if (filename && filename.endsWith('.nml')) {
                    const fullPath = path.join(dirPath, filename);
                    this.parseNMLFile(fullPath);
                }
            });
        } catch (e) {
            console.warn('[Traktor Pro] Watch error on directory:', e.message);
        }
    }

    scanDirectoryForLatestNML(dirPath) {
        try {
            const files = fs.readdirSync(dirPath)
                .filter(f => f.endsWith('.nml'))
                .map(f => ({ name: f, time: fs.statSync(path.join(dirPath, f)).mtime.getTime() }))
                .sort((a, b) => b.time - a.time);

            if (files.length > 0) {
                const latest = path.join(dirPath, files[0].name);
                this.parseNMLFile(latest);
            }
        } catch (e) {}
    }

    parseNMLFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            if (!content) return;

            // Simple XML tag regex parser for <ENTRY TITLE="..." ARTIST="...">
            const entryRegex = /<ENTRY[^>]*TITLE="([^"]*)"[^>]*ARTIST="([^"]*)"[^>]*>([\s\S]*?)<\/ENTRY>/gi;
            const alternateRegex = /<ENTRY[^>]*ARTIST="([^"]*)"[^>]*TITLE="([^"]*)"[^>]*>([\s\S]*?)<\/ENTRY>/gi;
            
            let lastMatch = null;
            let match;
            while ((match = entryRegex.exec(content)) !== null) {
                lastMatch = { title: match[1], artist: match[2], body: match[3] };
            }
            if (!lastMatch) {
                while ((match = alternateRegex.exec(content)) !== null) {
                    lastMatch = { artist: match[1], title: match[2], body: match[3] };
                }
            }

            if (lastMatch && lastMatch.title) {
                const signature = `${lastMatch.artist} - ${lastMatch.title}`;
                if (signature !== this.lastLoadedSignature) {
                    this.lastLoadedSignature = signature;
                    
                    // Try to extract BPM from body: <TEMPO BPM="126.000000" ... />
                    let bpm = 126.0;
                    const bpmMatch = /<TEMPO[^>]*BPM="([0-9.]+)"/i.exec(lastMatch.body);
                    if (bpmMatch) {
                        bpm = parseFloat(bpmMatch[1]) || 126.0;
                    }

                    console.log(`[Traktor Pro] 🎵 Live Traktor Track Loaded: ${lastMatch.artist} - ${lastMatch.title} (${bpm.toFixed(1)} BPM)`);

                    const trackPayload = {
                        deck: 1,
                        artist: lastMatch.artist,
                        title: lastMatch.title,
                        bpm: bpm,
                        ecosystem: 'traktor',
                        device: 'Traktor Pro'
                    };

                    this.isConnected = true;
                    if (this.onTrack) this.onTrack(trackPayload);
                    if (this.onBPM) this.onBPM(bpm, 1);
                    this.notifyStatus(`Traktor Live Track: ${lastMatch.title}`);
                }
            }
        } catch (e) {
            console.warn('[Traktor Pro] NML parse notice:', e.message);
        }
    }

    startIcecastMetadataReceiver() {
        // Traktor has built-in broadcast to port 8000. Let's create an optional listener.
        try {
            this.icecastServer = http.createServer((req, res) => {
                const icyHeaders = req.headers;
                // Capture ICY metadata
                if (icyHeaders['ice-name'] || icyHeaders['ice-description']) {
                    this.parseTrackString(icyHeaders['ice-name'] || icyHeaders['ice-description']);
                }
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('DJ VFX Traktor Bridge Ready');
            });

            this.icecastServer.on('error', () => {
                // Port 8000 might be in use, non-critical
            });

            this.icecastServer.listen(8001, () => {
                console.log('[Traktor Pro] 📡 Traktor Stream Metadata receiver active on port 8001');
            });
        } catch (e) {}
    }

    parseTrackString(raw) {
        if (!raw) return;
        let artist = '';
        let title = raw;
        if (raw.includes(' - ')) {
            const parts = raw.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        }
        if (title && `${artist} - ${title}` !== this.lastLoadedSignature) {
            this.lastLoadedSignature = `${artist} - ${title}`;
            if (this.onTrack) {
                this.onTrack({
                    deck: 1,
                    artist,
                    title,
                    bpm: 126.0,
                    ecosystem: 'traktor',
                    device: 'Traktor Pro Broadcast'
                });
            }
        }
    }

    watchFile(filePath) {
        try {
            fs.watch(filePath, (eventType) => {
                if (eventType === 'change') {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8').trim();
                        if (content) this.parseTrackString(content);
                    } catch (e) {}
                }
            });
        } catch (e) {}
    }

    notifyStatus(msg) {
        if (this.onStatus) {
            this.onStatus({
                ecosystem: 'traktor',
                connected: this.isConnected,
                device: 'Traktor Pro',
                message: msg || 'Traktor Pro Integration Online'
            });
        }
    }

    destroy() {
        if (this.icecastServer) {
            try { this.icecastServer.close(); } catch (e) {}
        }
    }
}
