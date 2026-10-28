import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PhilipsHueService } from './hue-service.js';
import { PioneerDJService } from './pioneer-service.js';
import { TraktorService } from './traktor-service.js';
import { NowPlayingService } from './nowplaying-api.js';
import { WaveformService } from './waveform-service.js';
import { OBSService } from './obs-service.js';
import { BUTTService } from './butt-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.STAGELINQ_PORT || 8080;
const isForceSim = process.argv.includes('--sim');

console.log('='.repeat(65));
console.log('  ⚡ DJ VFX STUDIO — UNIVERSAL MULTI-PLATFORM HARDWARE BRIDGE');
console.log('  🎧 Denon StageLinQ | 💿 Pioneer Pro DJ Link | 🎛️ Traktor Pro | 💡 Hue');
console.log('='.repeat(65));

// Initialize Universal Waveform Service (Denon Engine OS m.db + Pioneer Rekordbox + Fallback)
const waveformService = new WaveformService();

let lastTrackData = null;
let lastBpm = 126.0;
const BRIDGE_STATE_PATH = path.join(__dirname, 'bridge-state.json');
let lastActiveFX = 3; // Default to Scene 04 Hellfire Waveforms
let activeEcosystem = 'auto'; // 'auto', 'stagelinq', 'pioneer', 'traktor', 'link'
const globalSyncState = new Map();
const connectedDevices = new Map();
const deckStatuses = new Map([
    [1, { deck: 1, bpm: 0, play: false, artist: '', title: '', ecosystem: 'none', isHardware: false }],
    [2, { deck: 2, bpm: 0, play: false, artist: '', title: '', ecosystem: 'none', isHardware: false }],
    [3, { deck: 3, bpm: 0, play: false, artist: '', title: '', ecosystem: 'none', isHardware: false }],
    [4, { deck: 4, bpm: 0, play: false, artist: '', title: '', ecosystem: 'none', isHardware: false }]
]);
const lastDeckWaveforms = new Map();
const lastDeckLoadedTracks = new Map();
let lastHardwarePacketTimestamp = 0;
let isHardwareOnline = false;

try {
    if (fs.existsSync(BRIDGE_STATE_PATH)) {
        const rawState = JSON.parse(fs.readFileSync(BRIDGE_STATE_PATH, 'utf-8'));
        if (rawState) {
            if (typeof rawState.lastActiveFX === 'number') lastActiveFX = rawState.lastActiveFX;
            if (typeof rawState.lastBpm === 'number') lastBpm = rawState.lastBpm;
            if (rawState.lastTrackData) lastTrackData = rawState.lastTrackData;
            if (Array.isArray(rawState.deckStatuses)) {
                rawState.deckStatuses.forEach(d => {
                    if (d && d.deck) {
                        deckStatuses.set(d.deck, { ...d, play: false });
                    }
                });
            }
            if (Array.isArray(rawState.deckWaveforms)) {
                rawState.deckWaveforms.forEach(wf => {
                    if (wf && wf.deck) {
                        lastDeckWaveforms.set(wf.deck, wf);
                    }
                });
            }
            if (Array.isArray(rawState.deckStatuses) && rawState.deckStatuses.some(d => d.title)) {
                isHardwareOnline = true;
                connectedDevices.set('denon', 'Denon Prime 4');
            }
        }
    }
} catch (e) {}

function saveBridgeState() {
    try {
        const stateToSave = {
            lastActiveFX,
            lastBpm,
            lastTrackData,
            deckStatuses: Array.from(deckStatuses.values()),
            deckWaveforms: Array.from(lastDeckWaveforms.values())
        };
        fs.writeFileSync(BRIDGE_STATE_PATH, JSON.stringify(stateToSave, null, 2));
    } catch (e) {}
}

// Initialize Philips Hue Lighting Service
const hueService = new PhilipsHueService();
hueService.init().catch(err => console.error('[Philips Hue] Init error:', err));

// Broadcast helper functions
function broadcast(messageObj) {
    const payload = JSON.stringify(messageObj);
    wss.clients.forEach((client) => {
        if (client.readyState === 1 && client.bufferedAmount < 65536) {
            client.send(payload);
        }
    });
}

function relayToOthers(senderWs, messageObj) {
    const payload = JSON.stringify(messageObj);
    wss.clients.forEach((client) => {
        if (client !== senderWs && client.readyState === 1 && client.bufferedAmount < 65536) {
            client.send(payload);
        }
    });
}

function markHardwareActivity(devName = 'Denon Prime') {
    lastHardwarePacketTimestamp = Date.now();
    if (!isHardwareOnline) {
        isHardwareOnline = true;
        connectedDevices.set('denon', devName);
        console.log(`[Universal Bridge] 🟢 Hardware Decks Online: ${devName}`);
        handleIncomingStatus({
            ecosystem: 'stagelinq',
            connected: true,
            deviceCount: connectedDevices.size,
            device: devName,
            isHardware: true,
            message: `Denon Hardware Connected: ${devName}`
        });
    } else if (!connectedDevices.has('denon')) {
        connectedDevices.set('denon', devName);
    }
}

function handleAllDecksOffline() {
    if (!isHardwareOnline && connectedDevices.size === 0 && !lastTrackData && lastDeckWaveforms.size === 0 && globalSyncState.size === 0) return;
    console.log('[Universal Bridge] 🔴 Hardware Decks Offline — Resetting all waveforms, metadata and artwork.');
    isHardwareOnline = false;
    lastHardwarePacketTimestamp = 0;
    connectedDevices.clear();
    lastTrackData = null;
    lastDeckLoadedTracks.clear();
    lastDeckWaveforms.clear();
    globalSyncState.clear();

    // Reset all 4 decks to clean empty standby states
    for (let d = 1; d <= 4; d++) {
        deckStatuses.set(d, {
            deck: d,
            bpm: 0,
            play: false,
            fader: 0,
            artist: '',
            title: '',
            ecosystem: 'none',
            isHardware: false
        });
    }

    broadcast({
        type: 'decks_offline',
        isHardware: false,
        ecosystem: 'stagelinq',
        message: 'Hardware decks went offline'
    });

    broadcast({
        type: 'status',
        ecosystem: 'stagelinq',
        connected: true, // Bridge server itself is running
        deviceCount: 0,
        device: 'Bridge Standby (Awaiting Decks)',
        devices: [],
        isHardware: false,
        message: 'Hardware Decks Offline'
    });
}

// Unified Handlers for Hardware Telemetry
function handleDeckUnloaded(deckNum) {
    const currentDeck = deckStatuses.get(deckNum) || { deck: deckNum };
    currentDeck.artist = '';
    currentDeck.title = '';
    currentDeck.play = false;
    currentDeck.bpm = 0;
    currentDeck.fader = 0;
    currentDeck.isHardware = false;
    deckStatuses.set(deckNum, currentDeck);
    lastDeckWaveforms.delete(deckNum);
    saveBridgeState();
    console.log(`[Universal Bridge] ⏹️ Deck ${deckNum} Unloaded / Disarmed`);
    broadcast({
        type: 'deck_unloaded',
        deck: deckNum,
        unloaded: true,
        isHardware: true
    });
}

function handleIncomingTrack(trackData) {
    const deckNum = trackData.deck || 1;
    if (trackData.isHardware) {
        markHardwareActivity(trackData.device || 'Denon Prime');
    }
    if (trackData.unloaded || !trackData.title || trackData.title === 'No Track Loaded' || trackData.title === '—') {
        handleDeckUnloaded(deckNum);
        return;
    }
    lastTrackData = trackData;
    if (trackData.bpm && trackData.bpm > 40 && trackData.bpm < 300) {
        lastBpm = trackData.bpm;
    }
    const currentDeck = deckStatuses.get(deckNum) || { deck: deckNum };
    currentDeck.artist = trackData.artist || currentDeck.artist;
    currentDeck.title = trackData.title || currentDeck.title;
    currentDeck.bpm = trackData.bpm || currentDeck.bpm;
    currentDeck.play = true;
    currentDeck.ecosystem = trackData.ecosystem || 'auto';
    currentDeck.isHardware = true;
    deckStatuses.set(deckNum, currentDeck);
    saveBridgeState();

    broadcast({
        type: 'track',
        isHardware: true,
        ...trackData
    });

    // Query on-the-wire / database pre-analyzed 3-band waveform (Denon Engine m.db / Rekordbox)
    waveformService.getWaveform(currentDeck.artist, currentDeck.title, trackData.trackId).then((wf) => {
        if (wf && wf.samples) {
            console.log(`[Universal Bridge] 🌊 Transmitting authentic ${wf.source} 3-band waveform for [Deck ${deckNum}] "${wf.title}" (${wf.samples.length / 3} slices)`);
            const wfPacket = {
                type: 'deck_waveform',
                deck: deckNum,
                title: wf.title,
                artist: wf.artist,
                album: wf.album || trackData.album || '',
                genre: wf.genre || trackData.genre || '',
                key: wf.key || trackData.key || '',
                source: wf.source,
                duration: wf.duration || trackData.duration || 0,
                bpm: wf.bpm || trackData.bpm || 0,
                samples: wf.samples,
                cues: wf.cues || [],
                loops: wf.loops || [],
                isHardware: true
            };
            lastDeckWaveforms.set(deckNum, wfPacket);
            saveBridgeState();
            broadcast(wfPacket);
        }
    }).catch(err => console.warn('[Universal Bridge] Waveform lookup notice:', err.message));
}

function handleIncomingBPM(bpm, deckNum = 1, ecosystem = 'auto') {
    if (ecosystem === 'stagelinq' || ecosystem === 'pioneer') {
        markHardwareActivity();
    }
    if (bpm > 40 && bpm < 300) {
        const currentDeck = deckStatuses.get(deckNum) || { deck: deckNum };
        currentDeck.bpm = bpm;
        currentDeck.isHardware = true;
        deckStatuses.set(deckNum, currentDeck);
        saveBridgeState();

        // Only update master console BPM if this deck is actively playing, or if no other deck is playing
        const otherPlaying = Array.from(deckStatuses.values()).some(d => d.deck !== deckNum && d.play && (d.fader === undefined || d.fader > 0.5));
        const thisDeckIsPlaying = currentDeck.play;

        if (thisDeckIsPlaying || !otherPlaying) {
            lastBpm = bpm;
            broadcast({
                type: 'bpm',
                deck: deckNum,
                bpm,
                isHardware: true,
                ecosystem
            });
        }
    }
}

function handleIncomingBeat(deckNum, count, ecosystem = 'auto') {
    if (ecosystem === 'stagelinq' || ecosystem === 'pioneer') {
        markHardwareActivity();
    }
    broadcast({
        type: 'beat',
        deck: deckNum || 1,
        count: count || 1,
        isHardware: true,
        ecosystem
    });
}

function handleIncomingStatus(statusObj) {
    if (statusObj.device) {
        connectedDevices.set(statusObj.ecosystem || 'general', statusObj.device);
    }
    broadcast({
        type: 'status',
        ...statusObj,
        deviceCount: connectedDevices.size,
        devices: Array.from(connectedDevices.entries()).map(([k, v]) => ({ ecosystem: k, name: v }))
    });
}

// Initialize Pioneer Pro DJ Link & Rekordbox Service
const pioneerService = new PioneerDJService({
    onTrack: handleIncomingTrack,
    onBPM: handleIncomingBPM,
    onBeat: handleIncomingBeat,
    onStatus: handleIncomingStatus
});
pioneerService.init().catch(err => console.warn('[Pioneer Pro DJ Link] Init notice:', err.message));

// Initialize Native Instruments Traktor Pro Service
const traktorService = new TraktorService({
    onTrack: handleIncomingTrack,
    onBPM: handleIncomingBPM,
    onBeat: handleIncomingBeat,
    onStatus: handleIncomingStatus
});
traktorService.init().catch(err => console.warn('[Traktor Pro] Init notice:', err.message));

// Initialize Universal Now Playing REST & File Watcher
const nowPlayingService = new NowPlayingService({
    onTrack: handleIncomingTrack,
    onBPM: handleIncomingBPM,
    onStatus: handleIncomingStatus
});
nowPlayingService.init();

import os from 'os';
import { execSync, exec } from 'child_process';
import { recognizeAudio } from './shazam-service.js';
import { searchAlbumArt } from './artwork-service.js';

// Setup HTTP + WebSocket Server
const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // Handle Universal Album Art Lookup Endpoint
    if (reqUrl.pathname === '/api/artwork') {
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end();
            return;
        }
        (async () => {
            try {
                const title = reqUrl.searchParams.get('title') || '';
                const artist = reqUrl.searchParams.get('artist') || '';
                const result = await searchAlbumArt(title, artist);
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify(result));
            } catch (err) {
                console.error('[Artwork API Error]', err);
                res.writeHead(500, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ success: false, message: err.message || 'Internal Server Error' }));
            }
        })();
        return;
    }

    // Handle Shazam Live Audio Recognition Endpoint
    if (reqUrl.pathname === '/api/shazam') {
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end();
            return;
        }
        if (req.method === 'POST') {
            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', async () => {
                try {
                    const bodyBuf = Buffer.concat(chunks);
                    const contentType = req.headers['content-type'] || '';
                    let audioInput = null;

                    if (contentType.includes('application/json')) {
                        const json = JSON.parse(bodyBuf.toString('utf8'));
                        if (json.audioBase64) {
                            audioInput = Buffer.from(json.audioBase64, 'base64');
                        } else if (json.signatureUri) {
                            audioInput = json.signatureUri;
                        } else if (json.samples && Array.isArray(json.samples)) {
                            audioInput = json.samples;
                        }
                    } else {
                        audioInput = bodyBuf;
                    }

                    const result = await recognizeAudio(audioInput);
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify(result));
                } catch (err) {
                    console.error('[Shazam API Error]', err);
                    res.writeHead(500, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify({ success: false, message: err.message || 'Internal Server Error' }));
                }
            });
            return;
        }
    }

    if (reqUrl.pathname === '/api/media-list') {
        const root = process.cwd();
        const validExtensions = ['.mp4', '.webm', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'];
        const excludeFiles = ['.ds_store', 'philipshuelogo.png', 'engine-dj-logo.png'];

        function scanFolder(folderRelPath, urlPrefix) {
            const fullPath = path.resolve(root, folderRelPath);
            const results = [];
            if (fs.existsSync(fullPath)) {
                try {
                    const files = fs.readdirSync(fullPath);
                    for (const file of files) {
                        if (file.startsWith('.') || excludeFiles.includes(file.toLowerCase())) continue;
                        const ext = path.extname(file).toLowerCase();
                        if (!validExtensions.includes(ext)) continue;
                        const isVideo = ext === '.mp4' || ext === '.webm';
                        const title = path.basename(file, ext);
                        results.push({
                            url: `${urlPrefix}/${file}`,
                            title: title,
                            isVideo: isVideo,
                            filename: file,
                            sub: isVideo ? 'Video' : 'Logo'
                        });
                    }
                } catch (e) {
                    console.error('[Media Scanner Error]', e);
                }
            }
            return results;
        }

        const djMap = new Map();
        scanFolder('public/images/logo', '/images/logo').forEach(item => djMap.set(item.url, item));
        scanFolder('images/logo', '/images/logo').forEach(item => {
            if (!djMap.has(item.url)) djMap.set(item.url, item);
        });

        const stationMap = new Map();
        scanFolder('public/images/station_logos', '/images/station_logos').forEach(item => stationMap.set(item.url, item));
        scanFolder('images/station logos', '/images/station_logos').forEach(item => {
            if (!stationMap.has(item.url)) stationMap.set(item.url, item);
        });

        const flyerMap = new Map();
        scanFolder('public/images/flyers', '/images/flyers').forEach(item => flyerMap.set(item.url, item));
        scanFolder('images/flyers', '/images/flyers').forEach(item => {
            if (!flyerMap.has(item.url)) flyerMap.set(item.url, item);
        });

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            dj_logos: Array.from(djMap.values()),
            station_logos: Array.from(stationMap.values()),
            flyers: Array.from(flyerMap.values())
        }));
        return;
    }

    // Handle Video Loop Folder Scanning & Bank Lookup Endpoint
    if (reqUrl.pathname === '/api/videos/scan') {
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end();
            return;
        }

        try {
            let targetFolder = reqUrl.searchParams.get('folder') || 'public/images/videos';
            if (targetFolder.startsWith('~')) {
                targetFolder = path.join(os.homedir(), targetFolder.slice(1));
            }
            if (!path.isAbsolute(targetFolder)) {
                targetFolder = path.resolve(process.cwd(), targetFolder);
            }

            const videoExts = ['.mp4', '.webm', '.mov', '.m4v', '.mkv'];
            const videos = [];

            if (fs.existsSync(targetFolder)) {
                const files = fs.readdirSync(targetFolder);
                for (const file of files) {
                    if (file.startsWith('.')) continue;
                    const ext = path.extname(file).toLowerCase();
                    if (videoExts.includes(ext)) {
                        const fullPath = path.join(targetFolder, file);
                        try {
                            const stat = fs.statSync(fullPath);
                            if (stat.isFile()) {
                                videos.push({
                                    name: file,
                                    title: path.basename(file, ext).replace(/[-_]/g, ' '),
                                    path: fullPath,
                                    url: `/api/videos/stream?file=${encodeURIComponent(fullPath)}`,
                                    size: stat.size,
                                    mtime: stat.mtimeMs,
                                    included: true
                                });
                            }
                        } catch (err) {}
                    }
                }
            }

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                success: true,
                folder: targetFolder,
                count: videos.length,
                videos
            }));
        } catch (err) {
            res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ success: false, message: err.message }));
        }
        return;
    }

    // Handle Native macOS Folder Picker via AppleScript
    if (reqUrl.pathname === '/api/videos/choose-folder') {
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            });
            res.end();
            return;
        }

        let defaultFolder = reqUrl.searchParams.get('defaultPath') || '';
        if (defaultFolder.startsWith('~')) {
            defaultFolder = path.join(os.homedir(), defaultFolder.slice(1));
        }
        const fallback = path.join(os.homedir(), 'Documents', 'OBS jkmclaren', 'VIDEOWALL', 'LOOP VIDS');
        const startLoc = (defaultFolder && fs.existsSync(defaultFolder)) ? defaultFolder : (fs.existsSync(fallback) ? fallback : os.homedir());

        if (process.platform === 'darwin') {
            const safeLoc = startLoc.replace(/"/g, '\\"');
            const appleScript = `try\nreturn POSIX path of (choose folder with prompt "Select Video Loop Folder" default location POSIX file "${safeLoc}")\non error number -128\nreturn ""\nend try`;
            exec(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`, (err, stdout) => {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                if (err) {
                    res.end(JSON.stringify({ success: false, error: err.message }));
                    return;
                }
                const picked = (stdout || '').trim();
                if (picked) {
                    res.end(JSON.stringify({ success: true, folder: picked }));
                } else {
                    res.end(JSON.stringify({ success: false, cancelled: true }));
                }
            });
        } else {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ success: false, message: 'Platform not supported' }));
        }
        return;
    }

    // Handle Reveal Folder in macOS Finder
    if (reqUrl.pathname === '/api/videos/reveal') {
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            });
            res.end();
            return;
        }
        let targetFolder = reqUrl.searchParams.get('folder') || '';
        if (targetFolder.startsWith('~')) {
            targetFolder = path.join(os.homedir(), targetFolder.slice(1));
        }
        if (targetFolder && fs.existsSync(targetFolder)) {
            exec(`open "${targetFolder.replace(/"/g, '\\"')}"`);
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ success: true, folder: targetFolder }));
        } else {
            res.writeHead(404, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ success: false, message: 'Folder not found' }));
        }
        return;
    }

    // Handle High-Performance Video Partial Range Streaming Endpoint
    if (reqUrl.pathname === '/api/videos/stream') {
        const filePath = reqUrl.searchParams.get('file');
        if (!filePath || !fs.existsSync(filePath)) {
            res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
            res.end('Video file not found');
            return;
        }

        try {
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const range = req.headers.range;
            const ext = path.extname(filePath).toLowerCase();
            const contentType = ext === '.webm' ? 'video/webm' : (ext === '.mov' ? 'video/quicktime' : 'video/mp4');

            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(filePath, { start, end });
                const head = {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': contentType,
                    'Access-Control-Allow-Origin': '*'
                };
                res.writeHead(206, head);
                file.pipe(res);
            } else {
                const head = {
                    'Content-Length': fileSize,
                    'Content-Type': contentType,
                    'Access-Control-Allow-Origin': '*'
                };
                res.writeHead(200, head);
                fs.createReadStream(filePath).pipe(res);
            }
        } catch (err) {
            res.writeHead(500, { 'Access-Control-Allow-Origin': '*' });
            res.end('Error streaming video: ' + err.message);
        }
        return;
    }

    // Ultra-Fast Zero-Overhead Ping Endpoint for Live RTT Latency Monitoring
    if (reqUrl.pathname === '/api/ping') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
        });
        res.end('{"pong":true}');
        return;
    }

    // Handle Live macOS Network Routing & Telemetry Endpoint (Cached for 60s to prevent blocking execSync)
    if (reqUrl.pathname === '/api/network-status') {
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end();
            return;
        }

        const nowNetTime = Date.now();
        if (global._cachedNetworkStatus && (nowNetTime - (global._lastNetworkStatusTime || 0) < 60000)) {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(global._cachedNetworkStatus));
            return;
        }

        let isWired = false;
        let activeInterface = 'en13';
        let hardwarePort = 'Wired Ethernet';
        let activeIp = '';
        let gateway = '';
        let wifiSsid = '';
        let wifiIp = '';

        try {
            const routeOut = execSync('route -n get default 2>/dev/null || true').toString();
            const ifaceMatch = routeOut.match(/interface:\s*([^\s]+)/);
            const gwMatch = routeOut.match(/gateway:\s*([^\s]+)/);
            if (ifaceMatch) activeInterface = ifaceMatch[1].trim();
            if (gwMatch) gateway = gwMatch[1].trim();

            const portsOut = execSync('networksetup -listallhardwareports 2>/dev/null || true').toString();
            const portBlocks = portsOut.split('Hardware Port: ');
            for (const block of portBlocks) {
                if (block.includes(`Device: ${activeInterface}`)) {
                    hardwarePort = block.split('\n')[0].trim();
                    break;
                }
            }

            const lowerPort = hardwarePort.toLowerCase();
            isWired = activeInterface.startsWith('en') && !lowerPort.includes('wi-fi') && !lowerPort.includes('wireless') && !lowerPort.includes('bluetooth');
            if (activeInterface) {
                activeIp = execSync(`ipconfig getifaddr ${activeInterface} 2>/dev/null || true`).toString().trim();
            }

            // Wi-Fi SSID and IP from en0
            const wifiSummary = execSync('ipconfig getsummary en0 2>/dev/null || true').toString();
            const ssidMatch = wifiSummary.match(/^\s*SSID\s*:\s*(.+)$/m);
            if (ssidMatch) wifiSsid = ssidMatch[1].trim();
            wifiIp = execSync('ipconfig getifaddr en0 2>/dev/null || true').toString().trim();
        } catch (e) {
            console.warn('[Network Telemetry Error]', e.message);
        }

        global._cachedNetworkStatus = {
            success: true,
            isWired,
            activeInterface,
            hardwarePort,
            activeIp,
            gateway,
            wifiSsid,
            wifiIp
        };
        global._lastNetworkStatusTime = nowNetTime;

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(global._cachedNetworkStatus));
        return;
    }

    // Handle Universal REST API endpoints (/api/track, /api/nowplaying, /api/status)
    if (nowPlayingService.handleHttpRequest(req, res)) {
        return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'ok',
        service: 'DJ VFX Studio Universal Bridge',
        ecosystems: ['denon_stagelinq', 'pioneer_prodjlink', 'rekordbox', 'traktor_pro', 'ableton_link']
    }));
});

const wss = new WebSocketServer({ server });

// Helper to match OBS scene names to VFX Studio scene indices
function matchVFXScene(sceneName) {
    if (!sceneName || typeof sceneName !== 'string') return null;
    const s = sceneName.trim().toLowerCase();

    // Check direct scene number patterns: "scene 4", "scene 04", "scene_4", "fx 4", "fx04", "fx-4", "vfx 4", "04: hellfire"
    const numMatch = s.match(/(?:scene|fx|vfx)[\s_-]*0?(\d+)/i) || s.match(/^0?(\d+)[:\s_-]/);
    if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (num >= 1 && num <= 24) return num - 1;
        if (num === 0) return 0;
    }

    const keywords = [
        { idx: 0, keys: ['neon', 'grid', 'synthwave'] },
        { idx: 1, keys: ['radial', 'particle', 'ring'] },
        { idx: 2, keys: ['fluid', 'wave matrix', 'water'] },
        { idx: 3, keys: ['hellfire', 'inferno', 'deck wave', 'fire wave', 'flame wave'] },
        { idx: 4, keys: ['disco', 'ball', 'mirror'] },
        { idx: 5, keys: ['laser', 'dual bank'] },
        { idx: 6, keys: ['saber', 'multi-beam', 'beam'] },
        { idx: 7, keys: ['tunnel', 'portal', 'infinite'] },
        { idx: 8, keys: ['kaleidoscope', 'crystal'] },
        { idx: 9, keys: ['equalizer', 'vertical bar', 'eq bar'] },
        { idx: 10, keys: ['cosmic', 'nebula', 'galaxy'] },
        { idx: 11, keys: ['strobe', 'lightning', 'thunder'] },
        { idx: 12, keys: ['matrix', 'digital rain', 'code'] },
        { idx: 13, keys: ['solar', 'flare', 'sun'] },
        { idx: 14, keys: ['hyperspace', 'warp', 'starfield'] },
        { idx: 15, keys: ['waveform ribbon', 'ribbon'] },
        { idx: 16, keys: ['frequency field', 'freq'] },
        { idx: 17, keys: ['aurora', 'borealis'] },
        { idx: 18, keys: ['plasma', 'vortex'] },
        { idx: 19, keys: ['cyber', 'city', 'cyberpunk'] },
        { idx: 20, keys: ['quantum', 'string'] },
        { idx: 21, keys: ['haunted', 'manor', 'spooky', 'halloween'] },
        { idx: 22, keys: ['cinema', 'video', 'video cinema'] },
        { idx: 23, keys: ['retro', 'cassette', 'tape'] }
    ];
    for (const item of keywords) {
        if (item.keys.some(k => s.includes(k))) {
            return item.idx;
        }
    }
    return null;
}

// Initialize OBS Studio Detection & Telemetry Service
const obsService = new OBSService();
obsService.on('status', (obsStatus) => {
    broadcast({
        type: 'obs_status',
        ...obsStatus
    });
});
obsService.on('scene_change', (sceneName) => {
    const matchedFX = matchVFXScene(sceneName);
    if (matchedFX !== null) {
        console.log(`[OBS Service] 🔄 OBS Scene "${sceneName}" mapped to VFX FX Index ${matchedFX}`);
        lastActiveFX = matchedFX;
        saveBridgeState();
        globalSyncState.set('set_fx', { type: 'set_fx', fx: matchedFX, source: 'obs', sceneName });
        broadcast({
            type: 'set_fx',
            fx: matchedFX,
            source: 'obs',
            sceneName
        });
    }
});
obsService.start();

// Initialize BUTT Broadcast Tool Detection Service
const buttService = new BUTTService();
buttService.on('status', (buttStatus) => {
    broadcast({
        type: 'butt_status',
        ...buttStatus
    });
});
buttService.start();

wss.on('connection', (ws, req) => {
    console.log('[WebSocket] Client connected to Universal Bridge (OBS / Browser Studio)');
    const userAgent = (req && req.headers && req.headers['user-agent']) || '';
    obsService.trackBrowserClient(ws, userAgent);

    // Send immediate initial status
    ws.send(JSON.stringify({
        type: 'status',
        connected: true,
        deviceCount: connectedDevices.size,
        device: connectedDevices.size > 0 ? Array.from(connectedDevices.values()).join(' • ') : 'Bridge Online (Ready for Denon, Pioneer & Traktor)',
        devices: Array.from(connectedDevices.entries()).map(([k, v]) => ({ ecosystem: k, name: v })),
        activeEcosystem,
        obs: obsService.getStatus(),
        butt: buttService.getStatus()
    }));

    // Send immediate Philips Hue Status & Room List
    ws.send(JSON.stringify({
        type: 'hue_status',
        ...hueService.getStatus()
    }));

    // Send immediate OBS Studio Status
    ws.send(JSON.stringify({
        type: 'obs_status',
        ...obsService.getStatus()
    }));

    // Send immediate BUTT Broadcast Tool Status
    ws.send(JSON.stringify({
        type: 'butt_status',
        ...buttService.getStatus()
    }));

    // Send active scene and global parameters to connecting client immediately (OBS Browser Source / 2nd screen / popout)
    if (lastActiveFX !== null && lastActiveFX !== undefined) {
        ws.send(JSON.stringify({
            type: 'set_fx',
            fx: lastActiveFX
        }));
    }

    // Replay full active state snapshot to the connecting client
    globalSyncState.forEach((cachedMsg) => {
        try {
            ws.send(JSON.stringify(cachedMsg));
        } catch (e) { }
    });

    const hasLiveDecks = Boolean((connectedDevices.size > 0 && isHardwareOnline) || lastTrackData || lastDeckWaveforms.size > 0);

    if (hasLiveDecks) {
        if (lastTrackData && (lastTrackData.title || lastTrackData.artist)) {
            ws.send(JSON.stringify({
                type: 'track',
                isHardware: true,
                ...lastTrackData
            }));
        }
        if (lastBpm) {
            ws.send(JSON.stringify({
                type: 'bpm',
                bpm: lastBpm,
                isHardware: true
            }));
        }

        // Send 4-deck status snapshot
        ws.send(JSON.stringify({
            type: 'decks_snapshot',
            isHardware: true,
            decks: Array.from(deckStatuses.values())
        }));

        // Replay pre-analyzed deck waveforms so freshly loaded or refreshed clients get immediate waveform rendering
        lastDeckWaveforms.forEach((wfPacket) => {
            try {
                ws.send(JSON.stringify(wfPacket));
            } catch (e) { }
        });
    } else {
        if (connectedDevices.size === 0 && !lastTrackData && lastDeckWaveforms.size === 0) {
            // Send clean offline notification only if there truly are no hardware decks or cached data
            ws.send(JSON.stringify({
                type: 'decks_offline',
                isHardware: false,
                deviceCount: 0,
                message: 'No hardware decks connected'
            }));
        }
    }

    // Handle Client Messages
    ws.on('message', async (raw) => {
        try {
            const msg = JSON.parse(raw);
            if ((msg.type?.includes('hue') && msg.type !== 'hue_beat') || msg.type === 'set_hue_enabled') {
                console.log(`[Bridge WS Debug] Received Hue message: type="${msg.type}", payload=`, JSON.stringify(msg));
            }
            if (msg.type === 'set_ecosystem') {
                activeEcosystem = msg.ecosystem || 'auto';
                console.log(`[Bridge] 🎛️ Active DJ Ecosystem set to: ${activeEcosystem.toUpperCase()}`);
                broadcast({
                    type: 'ecosystem_changed',
                    ecosystem: activeEcosystem
                });
            } else if (msg.type === 'hue_discover') {
                const res = await hueService.discoverBridge();
                broadcast({
                    type: 'hue_status',
                    ...hueService.getStatus(),
                    discoveryMessage: res.success ? `Discovered Bridge @ ${res.ip}` : 'No bridge discovered'
                });
            } else if (msg.type === 'hue_pair') {
                const pairRes = await hueService.pairBridge(msg.ip);
                ws.send(JSON.stringify({
                    type: 'hue_pairing_status',
                    ...pairRes
                }));
                broadcast({
                    type: 'hue_status',
                    ...hueService.getStatus()
                });
            } else if (msg.type === 'hue_get_rooms') {
                await hueService.fetchRooms();
                broadcast({
                    type: 'hue_status',
                    ...hueService.getStatus()
                });
            } else if (msg.type === 'hue_set_config') {
                if (msg.config) {
                    const cfg = { ...msg.config };
                    delete cfg.enabled; // Master power state is controlled only via explicit power toggle
                    const changed = hueService.updateConfig(cfg);
                    if (changed) {
                        broadcast({
                            type: 'hue_status',
                            ...hueService.getStatus()
                        });
                    }
                }
            } else if (msg.type === 'set_hue_enabled') {
                hueService.updateConfig({ enabled: !!msg.enabled });
                if (msg.enabled) {
                    await hueService.turnOnLights(hueService.config.targetGroup || '3');
                } else {
                    await hueService.turnOffLights(hueService.config.targetGroup || '3');
                }
                broadcast({
                    type: 'hue_status',
                    ...hueService.getStatus()
                });
            } else if (msg.type === 'set_hue_room') {
                if (msg.room) {
                    hueService.updateConfig({ targetGroup: String(msg.room) });
                    broadcast({
                        type: 'hue_status',
                        ...hueService.getStatus()
                    });
                }
            } else if (msg.type === 'set_hue_mode') {
                if (msg.mode) {
                    hueService.updateConfig({ mode: msg.mode });
                    broadcast({
                        type: 'hue_status',
                        ...hueService.getStatus()
                    });
                }
            } else if (msg.type === 'set_hue_kick_strobe') {
                hueService.updateConfig({ kickStrobeEnabled: !!msg.active, kickStrobe: !!msg.active });
                broadcast({
                    type: 'hue_status',
                    ...hueService.getStatus()
                });
            } else if (msg.type === 'hue_turn_off') {
                await hueService.turnOffLights(msg.groupId);
                hueService.updateConfig({ enabled: false });
                broadcast({
                    type: 'hue_status',
                    ...hueService.getStatus()
                });
            } else if (msg.type === 'hue_turn_on') {
                await hueService.turnOnLights(msg.groupId);
                hueService.updateConfig({ enabled: true });
                broadcast({
                    type: 'hue_status',
                    ...hueService.getStatus()
                });
            } else if (msg.type === 'hue_reset_white') {
                await hueService.resetWarmWhite70(msg.groupId);
                broadcast({
                    type: 'hue_status',
                    ...hueService.getStatus()
                });
            } else if (msg.type === 'hue_beat') {
                if (msg.data) {
                    hueService.processAudioBeat(msg.data);
                }
            } else if (msg.type === 'get_obs_status') {
                ws.send(JSON.stringify({
                    type: 'obs_status',
                    ...obsService.getStatus()
                }));
            } else if (msg.type === 'get_butt_status') {
                ws.send(JSON.stringify({
                    type: 'butt_status',
                    ...buttService.getStatus()
                }));
            }
            // Multi-Window & OBS Studio Real-Time Sync Relay
            else if (msg.type === 'audio_frame') {
                relayToOthers(ws, msg);
            } else if (msg.type === 'set_fx') {
                lastActiveFX = msg.fx;
                saveBridgeState();
                globalSyncState.set('set_fx', msg);
                relayToOthers(ws, msg);
            } else if (msg.type === 'set_bpm') {
                lastBpm = msg.bpm;
                relayToOthers(ws, msg);
            } else if (msg.type === 'track') {
                lastTrackData = msg;
                relayToOthers(ws, msg);
            } else if (msg.type === 'request_state') {
                const now = Date.now();
                if (ws._lastRequestState && (now - ws._lastRequestState < 1000)) {
                    // Throttle client re-requests to at most 1 per second
                    return;
                }
                ws._lastRequestState = now;

                const isHw = Boolean(connectedDevices.size > 0 || isHardwareOnline || Array.from(deckStatuses.values()).some(d => d.title && d.isHardware));
                const devName = connectedDevices.get('denon') || connectedDevices.values().next().value || (isHw ? 'Denon Prime 4' : 'Awaiting Decks');
                
                // 1. Send status message with connected devices
                ws.send(JSON.stringify({
                    type: 'status',
                    ecosystem: 'stagelinq',
                    connected: true,
                    deviceCount: isHw ? Math.max(1, connectedDevices.size) : 0,
                    device: devName,
                    devices: Array.from(connectedDevices.entries()).map(([k, v]) => ({ ecosystem: k, name: v })),
                    isHardware: isHw,
                    message: isHw ? `Connected: ${devName}` : 'Bridge Standby (Awaiting Decks)'
                }));

                // 2. Replay deck_loaded for each loaded deck
                deckStatuses.forEach((d) => {
                    if (d.title) {
                        ws.send(JSON.stringify({
                            type: 'deck_loaded',
                            deck: d.deck,
                            title: d.title,
                            artist: d.artist || '',
                            bpm: d.bpm || lastBpm || 126.0,
                            play: Boolean(d.play),
                            fader: d.fader !== undefined ? d.fader : 1.0,
                            isHardware: isHw || Boolean(d.isHardware),
                            ecosystem: d.ecosystem || 'stagelinq'
                        }));
                    }
                });

                if (lastTrackData) ws.send(JSON.stringify({ type: 'track', isHardware: isHw, ...lastTrackData }));
                if (lastBpm) ws.send(JSON.stringify({ type: 'bpm', bpm: lastBpm, isHardware: isHw }));
                if (lastActiveFX !== null && lastActiveFX !== undefined) ws.send(JSON.stringify({ type: 'set_fx', fx: lastActiveFX }));
                ws.send(JSON.stringify({
                    type: 'decks_snapshot',
                    isHardware: isHw,
                    ecosystem: 'stagelinq',
                    decks: Array.from(deckStatuses.values()).map(d => ({
                        ...d,
                        isHardware: isHw || Boolean(d.isHardware)
                    }))
                }));
                lastDeckWaveforms.forEach((wfPacket) => {
                    try {
                        ws.send(JSON.stringify({
                            ...wfPacket,
                            isHardware: isHw || Boolean(wfPacket.isHardware)
                        }));
                    } catch (e) { }
                });
                globalSyncState.forEach((cachedMsg) => {
                    try { ws.send(JSON.stringify(cachedMsg)); } catch (e) { }
                });
            } else if (msg.type === 'sync_relay' && msg.payload) {
                if (msg.payload.type?.startsWith('set_')) {
                    globalSyncState.set(msg.payload.type, msg.payload);
                }
                relayToOthers(ws, msg.payload);
            } else if (
                msg.type === 'beat_pulse' ||
                msg.type === 'flash' ||
                msg.type === 'reset_all' ||
                msg.type?.startsWith('set_') ||
                msg.type?.startsWith('pop_') ||
                msg.type?.startsWith('hide_') ||
                msg.type?.startsWith('trigger_')
            ) {
                if (msg.type?.startsWith('set_')) {
                    globalSyncState.set(msg.type, msg);
                }
                relayToOthers(ws, msg);
            }
        } catch (e) {
            console.error('[WebSocket] Error processing client message:', e);
        }
    });
});

let stagelinqInstance = null;

async function startStageLinq() {
    if (isForceSim) {
        console.log('[StageLinq] Starting in FORCED SIMULATION mode (--sim)...');
        runSimulationLoop();
        return;
    }

    try {
        console.log('[StageLinq] Initializing Denon StageLinq protocol engine...');
        const { StageLinqInstance, ActingAsDevice } = await import('stagelinq');

        stagelinqInstance = new StageLinqInstance({
            actingAs: ActingAsDevice?.NowPlaying || 'NowPlaying',
            downloadDbSources: true,
            enableFileTranfer: true,
            networkTap: (packet) => {
                if (packet && packet.direction === 'discovery' && packet.address && packet.address !== '127.0.0.1') {
                    markHardwareActivity('Denon Prime');
                }
            }
        });

        // When StageLinQ transfers the m.db SQLite database from the USB inserted in the deck, index it immediately
        if (stagelinqInstance.databases) {
            stagelinqInstance.databases.on('dbDownloaded', (sourceId, dbPath) => {
                console.log(`[StageLinq] 💾 Wire Database Transferred from Deck [${sourceId}]: ${dbPath}`);
                waveformService.addEngineDb(dbPath);
            });
        }

        console.log('[StageLinq] 🔍 Scanning local network for Denon Prime players/mixers (UDP 50010)...');

        stagelinqInstance.on('connected', (info) => {
            const devName = info.source || info.software?.name || 'Denon Prime Player';
            console.log(`[StageLinq] 🟢 Hardware Discovered: ${devName}`);
            markHardwareActivity(devName);
        });

        stagelinqInstance.on('disconnected', () => {
            console.log('[StageLinq] 🔴 Hardware Disconnected (StageLinQ event)');
            handleAllDecksOffline();
        });

        function parseDeckNumber(status) {
            if (!status) return 1;
            if (status.layer === 'A') return 1;
            if (status.layer === 'B') return 2;
            if (status.layer === 'C') return 3;
            if (status.layer === 'D') return 4;
            if (typeof status.deck === 'number') return status.deck;
            if (typeof status.deck === 'string') {
                const m = status.deck.match(/\d+/);
                if (m) return parseInt(m[0], 10);
            }
            if (typeof status.deckId === 'number') return status.deckId;
            if (typeof status.deckIndex === 'number') return status.deckIndex + 1;
            // Also inspect name, path, key, topic, id if present (e.g. /Engine/Deck2/Track/SongName)
            const strToCheck = status.name || status.path || status.key || status.topic || status.id || '';
            if (typeof strToCheck === 'string' && strToCheck.length > 0) {
                const m = strToCheck.match(/(?:Deck|CH|Channel)(\d+)/i);
                if (m) return parseInt(m[1], 10);
                if (strToCheck.includes('Deck2') || strToCheck.includes('Deck 2')) return 2;
                if (strToCheck.includes('Deck1') || strToCheck.includes('Deck 1')) return 1;
                if (strToCheck.includes('Deck3') || strToCheck.includes('Deck 3')) return 3;
                if (strToCheck.includes('Deck4') || strToCheck.includes('Deck 4')) return 4;
            }
            return 1;
        }

        stagelinqInstance.on('trackLoaded', (status) => {
            if (!status) return;
            markHardwareActivity();
            const deckNum = parseDeckNumber(status);
            const deckKey = String(deckNum);
            const artist = status.artist || '';
            const title = status.title || '';

            if (!title || title === 'No Track Loaded' || title === '—') {
                lastDeckLoadedTracks.delete(deckKey);
                handleDeckUnloaded(deckNum);
                return;
            }

            const trackSignature = `${artist} - ${title}`;

            const prevSignature = lastDeckLoadedTracks.get(deckKey);
            if (prevSignature === trackSignature) return;
            lastDeckLoadedTracks.set(deckKey, trackSignature);

            const effectiveBpm = status.currentBpm || status.masterTempo || lastBpm || 126.0;
            console.log(`[StageLinq] 🎵 Track Loaded [Deck ${deckNum}]: ${artist} - ${title} (${effectiveBpm} BPM)`);

            broadcast({
                type: 'deck_loaded',
                deck: deckNum,
                artist,
                title,
                bpm: effectiveBpm,
                key: status.key || '',
                genre: status.genre || '',
                isHardware: true,
                ecosystem: 'stagelinq'
            });

            // Immediately process track metadata and query pre-analyzed waveform across Engine OS m.db
            handleIncomingTrack({
                deck: deckNum,
                artist,
                title,
                bpm: effectiveBpm,
                key: status.key || '',
                genre: status.genre || '',
                play: true,
                ecosystem: 'stagelinq',
                device: 'Denon Prime',
                isHardware: true
            });
        });

        stagelinqInstance.on('nowPlaying', (status) => {
            if (!status) return;
            markHardwareActivity();
            const deckNum = parseDeckNumber(status);
            const effectiveBpm = status.currentBpm || status.masterTempo || lastBpm || 126.0;
            handleIncomingTrack({
                deck: deckNum,
                artist: status.artist || '',
                title: status.title || '',
                bpm: effectiveBpm,
                key: status.key || '',
                play: true,
                master: !!status.masterStatus,
                ecosystem: 'stagelinq',
                device: 'Denon Prime',
                isHardware: true
            });
        });

        stagelinqInstance.on('stateChanged', (status) => {
            if (!status) return;
            markHardwareActivity();
            const deckNum = parseDeckNumber(status);
            if (status.currentBpm) {
                handleIncomingBPM(status.currentBpm, deckNum, 'stagelinq');
            }

            // In StageLinQ, SongName and ArtistName often stream as individual state changes after songLoaded
            if (status.songLoaded === false) {
                const deckKey = String(deckNum);
                lastDeckLoadedTracks.delete(deckKey);
                handleDeckUnloaded(deckNum);
            } else if (status.title || status.artist) {
                const deckKey = String(deckNum);
                const trackSignature = `${status.artist || ''} - ${status.title || ''}`;
                if (trackSignature !== ' - ' && trackSignature !== lastDeckLoadedTracks.get(deckKey)) {
                    lastDeckLoadedTracks.set(deckKey, trackSignature);
                    const effectiveBpm = status.currentBpm || status.masterTempo || lastBpm || 126.0;
                    console.log(`[StageLinq] 🔄 Deck ${deckNum} Track Metadata Streamed: ${trackSignature} (${effectiveBpm} BPM)`);
                    handleIncomingTrack({
                        deck: deckNum,
                        artist: status.artist || '',
                        title: status.title || '',
                        bpm: effectiveBpm,
                        key: status.key || '',
                        play: status.playState ?? true,
                        master: !!status.masterStatus,
                        ecosystem: 'stagelinq',
                        device: 'Denon Prime',
                        isHardware: true
                    });
                }
            }
        });

        const deckLoopStates = new Map();
        const deckLastBeatInt = new Map();
        const deckLastTelemetryTime = new Map();

        // Listen for direct StateMap changes (Channel Faders, Crossfader, Deck Play states, Loop states)
        stagelinqInstance.on('message', (info, data) => {
            if (!data || !data.message) return;
            markHardwareActivity();
            const name = data.message.name;
            const json = data.message.json;
            if (!name || !json) return;

            // Deck Track Loaded status: /Engine/Deck1/SongLoaded or /Engine/Deck2/SongLoaded
            const songLoadedMatch = name.match(/Engine\/Deck(\d+)\/SongLoaded/i);
            if (songLoadedMatch) {
                const d = parseInt(songLoadedMatch[1], 10);
                const isLoaded = Boolean(json.state ?? json.value);
                if (!isLoaded) {
                    const deckKey = String(d);
                    lastDeckLoadedTracks.delete(deckKey);
                    handleDeckUnloaded(d);
                }
            }

            // Direct StateMap Track Title: /Engine/Deck1/Track/SongName or /Engine/Deck2/Track/SongName
            const songNameMatch = name.match(/Engine\/Deck(\d+)\/Track\/SongName/i);
            if (songNameMatch) {
                const d = parseInt(songNameMatch[1], 10);
                const title = String(json.string || json.value || json.state || '').trim();
                if (title && title !== '—' && title !== 'No Track Loaded') {
                    const currentDeck = deckStatuses.get(d) || { deck: d };
                    if (currentDeck.title !== title) {
                        currentDeck.title = title;
                        currentDeck.artist = ''; // Clear previous track's artist so waveform search doesn't mismatch
                        const deckKey = String(d);
                        const trackSignature = `${title}`;
                        lastDeckLoadedTracks.set(deckKey, trackSignature);
                        console.log(`[StageLinq] 🎵 Direct StateMap Deck ${d} Title: ${title}`);
                        handleIncomingTrack({
                            deck: d,
                            title: title,
                            artist: '',
                            bpm: currentDeck.bpm || lastBpm || 126.0,
                            play: true,
                            ecosystem: 'stagelinq',
                            device: 'Denon Prime',
                            isHardware: true
                        });
                    }
                }
            }

            // Direct StateMap Track Artist: /Engine/Deck1/Track/ArtistName or /Engine/Deck2/Track/ArtistName
            const artistNameMatch = name.match(/Engine\/Deck(\d+)\/Track\/ArtistName/i);
            if (artistNameMatch) {
                const d = parseInt(artistNameMatch[1], 10);
                const artist = String(json.string || json.value || json.state || '').trim();
                if (artist) {
                    const currentDeck = deckStatuses.get(d) || { deck: d };
                    if (currentDeck.artist !== artist) {
                        currentDeck.artist = artist;
                        const deckKey = String(d);
                        const trackSignature = `${artist} - ${currentDeck.title || ''}`;
                        lastDeckLoadedTracks.set(deckKey, trackSignature);
                        console.log(`[StageLinq] 🎤 Direct StateMap Deck ${d} Artist: ${artist}`);
                        handleIncomingTrack({
                            deck: d,
                            title: currentDeck.title || '',
                            artist: artist,
                            bpm: currentDeck.bpm || lastBpm || 126.0,
                            play: true,
                            ecosystem: 'stagelinq',
                            device: 'Denon Prime',
                            isHardware: true
                        });
                    }
                }
            }

            // Mixer channel faders: /Mixer/CH1faderPosition, /Mixer/CH2faderPosition, etc.
            const chMatch = name.match(/Mixer\/CH(\d+)faderPosition/i);
            if (chMatch) {
                const ch = parseInt(chMatch[1], 10);
                const faderVal = (json.value !== undefined) ? Number(json.value) : (json.state ? 1.0 : 0.0);
                const currentDeck = deckStatuses.get(ch) || { deck: ch };
                currentDeck.fader = faderVal;
                currentDeck.isHardware = true;
                deckStatuses.set(ch, currentDeck);

                broadcast({
                    type: 'deck_telemetry',
                    deck: ch,
                    fader: faderVal,
                    isHardware: true,
                    ecosystem: 'stagelinq'
                });
            }

            // Mixer Crossfader: /Mixer/CrossfaderPosition, /Mixer/crossfaderPosition, /Mixer/XFader
            const xfMatch = name.match(/Mixer\/(?:Crossfader|XFader|crossfader)Position/i);
            if (xfMatch) {
                const xfVal = (json.value !== undefined) ? Number(json.value) : 0.5;
                broadcast({
                    type: 'crossfader',
                    value: xfVal,
                    isHardware: true,
                    ecosystem: 'stagelinq'
                });
            }

            // Deck Play status: /Engine/Deck1/Play or /Engine/Deck2/Play
            const deckPlayMatch = name.match(/Engine\/Deck(\d+)\/Play(?:State)?/i);
            if (deckPlayMatch) {
                const d = parseInt(deckPlayMatch[1], 10);
                const isPlaying = Boolean(json.state ?? json.value);
                const currentDeck = deckStatuses.get(d) || { deck: d };
                currentDeck.play = isPlaying;
                currentDeck.isHardware = true;
                deckStatuses.set(d, currentDeck);

                broadcast({
                    type: 'deck_telemetry',
                    deck: d,
                    play: isPlaying,
                    isHardware: true,
                    ecosystem: 'stagelinq'
                });
            }

            // Deck Loop status: /Engine/Deck1/Loop/Enable or /Engine/Deck1/Loop/State
            const deckLoopMatch = name.match(/Engine\/Deck(\d+)\/Loop\/(Enable|State|Active|QuickLoop)/i);
            if (deckLoopMatch) {
                const d = parseInt(deckLoopMatch[1], 10);
                const isLooping = Boolean(json.state ?? json.value);
                const currentDeck = deckStatuses.get(d) || { deck: d };
                currentDeck.loopActive = isLooping;
                currentDeck.isHardware = true;
                deckStatuses.set(d, currentDeck);

                let loopInfo = deckLoopStates.get(d);
                if (loopInfo) {
                    loopInfo.loopActive = isLooping;
                }

                broadcast({
                    type: 'deck_telemetry',
                    deck: d,
                    loopActive: isLooping,
                    isHardware: true,
                    ecosystem: 'stagelinq'
                });
            }
        });

        // Periodic hardware deck heartbeat (every 1.5s) to ensure continuous streaming lock
        setInterval(() => {
            const isHw = Boolean(connectedDevices.size > 0 || isHardwareOnline || Array.from(deckStatuses.values()).some(d => d.title && d.isHardware));
            if (isHw || lastTrackData || Array.from(deckStatuses.values()).some(d => d.title)) {
                broadcast({
                    type: 'decks_snapshot',
                    isHardware: isHw,
                    ecosystem: 'stagelinq',
                    decks: Array.from(deckStatuses.values()).map(d => ({
                        ...d,
                        isHardware: isHw || Boolean(d.isHardware)
                    }))
                });
            }
        }, 1500);

        stagelinqInstance.on('beatMessage', (info, beatData) => {
            if (!beatData || !beatData.decks) return;
            markHardwareActivity();
            const nowMs = Date.now();
            beatData.decks.forEach((deckData, idx) => {
                const deckNum = idx + 1;
                if (deckData.bpm) handleIncomingBPM(deckData.bpm, deckNum, 'stagelinq');
                if (deckData.beat !== undefined) {
                    const currentBeatInt = Math.floor(deckData.beat);
                    const prevBeatInt = deckLastBeatInt.get(deckNum);
                    if (prevBeatInt === undefined || currentBeatInt !== prevBeatInt) {
                        deckLastBeatInt.set(deckNum, currentBeatInt);
                        const beatInBar = ((currentBeatInt % 4) + 4) % 4 + 1;
                        handleIncomingBeat(deckNum, beatInBar, 'stagelinq');
                    }
                }
                if (deckData.totalBeats && deckData.totalBeats > 0 && deckData.beat !== undefined) {
                    const progress = Math.max(0, Math.min(1.0, deckData.beat / deckData.totalBeats));
                    let loopInfo = deckLoopStates.get(deckNum);
                    if (!loopInfo) {
                        loopInfo = { lastBeat: deckData.beat, loopActive: false, loopStartBeat: 0, loopEndBeat: 0 };
                        deckLoopStates.set(deckNum, loopInfo);
                    }

                    // Loop repeat detection: ONLY track loop wrap if loop is already active from hardware StateMap
                    let loopStatusChanged = false;
                    if (loopInfo.loopActive && loopInfo.lastBeat !== undefined && deckData.beat < loopInfo.lastBeat - 1.5) {
                        // Track wrapped around inside active hardware loop
                        if (!loopInfo.loopStartBeat) loopInfo.loopStartBeat = deckData.beat;
                        if (!loopInfo.loopEndBeat) loopInfo.loopEndBeat = loopInfo.lastBeat;
                    }
                    loopInfo.lastBeat = deckData.beat;

                    const loopStartProg = loopInfo.loopActive ? Math.max(0, loopInfo.loopStartBeat / deckData.totalBeats) : 0.0;
                    const loopEndProg = loopInfo.loopActive ? Math.min(1.0, loopInfo.loopEndBeat / deckData.totalBeats) : 0.0;

                    // Throttle telemetry to ~40 FPS (every 25ms) unless loop status changed
                    const lastSent = deckLastTelemetryTime.get(deckNum) || 0;
                    if (loopStatusChanged || (nowMs - lastSent >= 25)) {
                        deckLastTelemetryTime.set(deckNum, nowMs);
                        const currentStatus = deckStatuses.get(deckNum);
                        const telemPacket = {
                            type: 'deck_telemetry',
                            deck: deckNum,
                            progress,
                            beat: deckData.beat,
                            totalBeats: deckData.totalBeats,
                            bpm: deckData.bpm || lastBpm,
                            play: currentStatus ? currentStatus.play : undefined,
                            fader: currentStatus ? currentStatus.fader : undefined,
                            isHardware: true,
                            ecosystem: 'stagelinq'
                        };
                        if (loopInfo.loopActive && loopStartProg > 0 && loopEndProg > loopStartProg) {
                            telemPacket.loopActive = true;
                            telemPacket.loopStart = loopStartProg;
                            telemPacket.loopEnd = loopEndProg;
                        }
                        broadcast(telemPacket);
                    }
                }
            });
        });

        stagelinqInstance.on('error', (err) => {
            console.warn('[StageLinq] Network notice:', err?.message || err);
        });

        await stagelinqInstance.connect();
        console.log('[StageLinq] ✅ Bound to UDP socket. Listening for Prime decks.');
    } catch (err) {
        console.warn('[StageLinq] Hardware discovery note:', err.message);
        console.log('[StageLinq] Standby mode active while awaiting hardware connections.');
        if (isForceSim) {
            console.log('[StageLinq] 🧪 Simulation mode active (--sim flag provided)');
            runSimulationLoop();
        }
    }
}

// Standby Simulation Loop (Only simulates tempo pulse if explicitly requested via --sim; never broadcasts fake tracks)
function runSimulationLoop() {
    let simulatedBPM = 126.0;
    let beatCounter = 0;

    function scheduleNextBeat() {
        if (connectedDevices.size > 0) return;
        const intervalMs = (60.0 / simulatedBPM) * 1000.0;
        setTimeout(() => {
            if (connectedDevices.size === 0) {
                beatCounter = (beatCounter % 4) + 1;
                broadcast({
                    type: 'beat',
                    deck: 1,
                    count: beatCounter,
                    isHardware: false
                });
                scheduleNextBeat();
            }
        }, intervalMs);
    }

    scheduleNextBeat();
}

server.listen(PORT, () => {
    console.log(`[Universal Bridge Server] 🚀 Active on ws://localhost:${PORT}`);
    console.log(`[Universal Bridge Server] 🌐 REST API available at http://localhost:${PORT}/api/nowplaying`);
    startStageLinq();
});
