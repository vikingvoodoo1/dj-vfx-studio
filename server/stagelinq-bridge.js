import { WebSocketServer } from 'ws';
import http from 'http';
import { PhilipsHueService } from './hue-service.js';
import { PioneerDJService } from './pioneer-service.js';
import { TraktorService } from './traktor-service.js';
import { NowPlayingService } from './nowplaying-api.js';
import { WaveformService } from './waveform-service.js';

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
let lastActiveFX = null;
let activeEcosystem = 'auto'; // 'auto', 'stagelinq', 'pioneer', 'traktor', 'link'
const globalSyncState = new Map();
const connectedDevices = new Map();
const deckStatuses = new Map([
    [1, { deck: 1, bpm: 0, play: false, artist: '', title: '', ecosystem: 'none', isHardware: false }],
    [2, { deck: 2, bpm: 0, play: false, artist: '', title: '', ecosystem: 'none', isHardware: false }],
    [3, { deck: 3, bpm: 0, play: false, artist: '', title: '', ecosystem: 'none', isHardware: false }],
    [4, { deck: 4, bpm: 0, play: false, artist: '', title: '', ecosystem: 'none', isHardware: false }]
]);

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

const lastDeckWaveforms = new Map();

// Unified Handlers for Hardware Telemetry
function handleIncomingTrack(trackData) {
    lastTrackData = trackData;
    if (trackData.bpm && trackData.bpm > 40 && trackData.bpm < 300) {
        lastBpm = trackData.bpm;
    }
    const deckNum = trackData.deck || 1;
    const currentDeck = deckStatuses.get(deckNum) || { deck: deckNum };
    currentDeck.artist = trackData.artist || currentDeck.artist;
    currentDeck.title = trackData.title || currentDeck.title;
    currentDeck.bpm = trackData.bpm || currentDeck.bpm;
    currentDeck.play = true;
    currentDeck.ecosystem = trackData.ecosystem || 'auto';
    currentDeck.isHardware = true;
    deckStatuses.set(deckNum, currentDeck);

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
                source: wf.source,
                duration: wf.duration,
                bpm: wf.bpm,
                samples: wf.samples,
                cues: wf.cues || [],
                loops: wf.loops || []
            };
            lastDeckWaveforms.set(deckNum, wfPacket);
            broadcast(wfPacket);
        }
    }).catch(err => console.warn('[Universal Bridge] Waveform lookup notice:', err.message));
}

function handleIncomingBPM(bpm, deckNum = 1, ecosystem = 'auto') {
    if (bpm > 40 && bpm < 300) {
        const currentDeck = deckStatuses.get(deckNum) || { deck: deckNum };
        currentDeck.bpm = bpm;
        currentDeck.isHardware = true;
        deckStatuses.set(deckNum, currentDeck);

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

import fs from 'fs';
import path from 'path';
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

    // Handle Live macOS Network Routing & Telemetry Endpoint
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

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            success: true,
            isWired,
            activeInterface,
            hardwarePort,
            activeIp,
            gateway,
            wifiSsid,
            wifiIp
        }));
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

wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected to Universal Bridge (OBS / Browser Studio)');

    // Send immediate initial status
    ws.send(JSON.stringify({
        type: 'status',
        connected: true,
        deviceCount: connectedDevices.size,
        device: connectedDevices.size > 0 ? Array.from(connectedDevices.values()).join(' • ') : 'Bridge Online (Ready for Denon, Pioneer & Traktor)',
        devices: Array.from(connectedDevices.entries()).map(([k, v]) => ({ ecosystem: k, name: v })),
        activeEcosystem
    }));

    // Send immediate Philips Hue Status & Room List
    ws.send(JSON.stringify({
        type: 'hue_status',
        ...hueService.getStatus()
    }));

    if (lastTrackData && (lastTrackData.title || lastTrackData.artist)) {
        ws.send(JSON.stringify({
            type: 'track',
            isHardware: true,
            ...lastTrackData
        }));
    }
    if (lastBpm && connectedDevices.size > 0) {
        ws.send(JSON.stringify({
            type: 'bpm',
            bpm: lastBpm,
            isHardware: true
        }));
    }
    if (lastActiveFX !== null && lastActiveFX !== undefined) {
        ws.send(JSON.stringify({
            type: 'set_fx',
            fx: lastActiveFX
        }));
    }

    // Send 4-deck status snapshot
    ws.send(JSON.stringify({
        type: 'decks_snapshot',
        decks: Array.from(deckStatuses.values())
    }));

    // Replay pre-analyzed deck waveforms so freshly loaded or refreshed clients get immediate waveform rendering
    lastDeckWaveforms.forEach((wfPacket) => {
        try {
            ws.send(JSON.stringify(wfPacket));
        } catch (e) { }
    });

    // Replay full active state snapshot to the connecting client
    globalSyncState.forEach((cachedMsg) => {
        try {
            ws.send(JSON.stringify(cachedMsg));
        } catch (e) { }
    });

    // Handle Client Messages
    ws.on('message', async (raw) => {
        try {
            const msg = JSON.parse(raw);
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
                    hueService.updateConfig(msg.config);
                    broadcast({
                        type: 'hue_status',
                        ...hueService.getStatus()
                    });
                }
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
            }
            // Multi-Window & OBS Studio Real-Time Sync Relay
            else if (msg.type === 'audio_frame') {
                relayToOthers(ws, msg);
            } else if (msg.type === 'set_fx') {
                lastActiveFX = msg.fx;
                relayToOthers(ws, msg);
            } else if (msg.type === 'set_bpm') {
                lastBpm = msg.bpm;
                relayToOthers(ws, msg);
            } else if (msg.type === 'track') {
                lastTrackData = msg;
                relayToOthers(ws, msg);
            } else if (msg.type === 'request_state') {
                if (lastTrackData) ws.send(JSON.stringify({ type: 'track', ...lastTrackData }));
                if (lastBpm) ws.send(JSON.stringify({ type: 'bpm', bpm: lastBpm }));
                if (lastActiveFX !== null && lastActiveFX !== undefined) ws.send(JSON.stringify({ type: 'set_fx', fx: lastActiveFX }));
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
            enableFileTranfer: true
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

            connectedDevices.set('denon', devName);
            handleIncomingStatus({
                ecosystem: 'stagelinq',
                connected: true,
                device: devName,
                message: `Denon Hardware Connected: ${devName}`
            });
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
            return 1;
        }

        const lastDeckLoadedTracks = new Map();

        stagelinqInstance.on('trackLoaded', (status) => {
            if (!status) return;
            const deckNum = parseDeckNumber(status);
            const deckKey = String(deckNum);
            const artist = status.artist || '';
            const title = status.title || '';
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
            const deckNum = parseDeckNumber(status);
            if (status.currentBpm) {
                handleIncomingBPM(status.currentBpm, deckNum, 'stagelinq');
            }

            // In StageLinQ, SongName and ArtistName often stream as individual state changes after songLoaded
            if (status.title || status.artist) {
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
            const name = data.message.name;
            const json = data.message.json;
            if (!name || !json) return;

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
            if (connectedDevices.size > 0 || lastTrackData) {
                broadcast({
                    type: 'decks_snapshot',
                    isHardware: connectedDevices.size > 0,
                    ecosystem: 'stagelinq',
                    decks: Array.from(deckStatuses.values())
                });
            }
        }, 1500);

        stagelinqInstance.on('beatMessage', (info, beatData) => {
            if (!beatData || !beatData.decks) return;
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
