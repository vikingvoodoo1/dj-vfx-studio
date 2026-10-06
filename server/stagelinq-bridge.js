import { WebSocketServer } from 'ws';
import http from 'http';
import { PhilipsHueService } from './hue-service.js';
import { PioneerDJService } from './pioneer-service.js';
import { TraktorService } from './traktor-service.js';
import { NowPlayingService } from './nowplaying-api.js';

// Configuration
const PORT = process.env.STAGELINQ_PORT || 8080;
const isForceSim = process.argv.includes('--sim');

console.log('='.repeat(65));
console.log('  ⚡ DJ VFX STUDIO — UNIVERSAL MULTI-PLATFORM HARDWARE BRIDGE');
console.log('  🎧 Denon StageLinQ | 💿 Pioneer Pro DJ Link | 🎛️ Traktor Pro | 💡 Hue');
console.log('='.repeat(65));

let lastTrackData = null;
let lastBpm = 126.0;
let lastActiveFX = null;
let activeEcosystem = 'auto'; // 'auto', 'stagelinq', 'pioneer', 'traktor', 'link'
const globalSyncState = new Map();
const connectedDevices = new Map();
const deckStatuses = new Map([
    [1, { deck: 1, bpm: 126.0, play: false, artist: 'Eric Prydz', title: 'Opus (Live Intro Mix)', ecosystem: 'none' }],
    [2, { deck: 2, bpm: 126.0, play: false, artist: '', title: '', ecosystem: 'none' }],
    [3, { deck: 3, bpm: 126.0, play: false, artist: '', title: '', ecosystem: 'none' }],
    [4, { deck: 4, bpm: 126.0, play: false, artist: '', title: '', ecosystem: 'none' }]
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
    deckStatuses.set(deckNum, currentDeck);

    broadcast({
        type: 'track',
        ...trackData
    });
}

function handleIncomingBPM(bpm, deckNum = 1) {
    if (bpm > 40 && bpm < 300) {
        lastBpm = bpm;
        const currentDeck = deckStatuses.get(deckNum) || { deck: deckNum };
        currentDeck.bpm = bpm;
        deckStatuses.set(deckNum, currentDeck);

        broadcast({
            type: 'bpm',
            deck: deckNum,
            bpm
        });
    }
}

function handleIncomingBeat(deckNum, count) {
    broadcast({
        type: 'beat',
        deck: deckNum || 1,
        count: count || 1
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

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            dj_logos: Array.from(djMap.values()),
            station_logos: Array.from(stationMap.values())
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

    if (lastTrackData) {
        ws.send(JSON.stringify({
            type: 'track',
            ...lastTrackData
        }));
    }
    if (lastBpm) {
        ws.send(JSON.stringify({
            type: 'bpm',
            bpm: lastBpm
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

    // Replay full active state snapshot to the connecting client
    globalSyncState.forEach((cachedMsg) => {
        try {
            ws.send(JSON.stringify(cachedMsg));
        } catch (e) {}
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
                    try { ws.send(JSON.stringify(cachedMsg)); } catch (e) {}
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
            downloadDbSources: false,
            enableFileTranfer: false
        });

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

        const lastDeckLoadedTracks = new Map();

        stagelinqInstance.on('trackLoaded', (status) => {
            if (!status || !status.title) return;
            const deckKey = String(status.deck || 1);
            const artist = status.artist || '';
            const title = status.title || '';
            const trackSignature = `${artist} - ${title}`;
            
            const prevSignature = lastDeckLoadedTracks.get(deckKey);
            if (prevSignature === trackSignature) return;
            lastDeckLoadedTracks.set(deckKey, trackSignature);

            console.log(`[StageLinq] 🎵 Track Loaded [Deck ${status.deck || 1}]: ${artist} - ${title} (${status.currentBpm || status.masterTempo || '---'} BPM)`);
            
            broadcast({
                type: 'deck_loaded',
                deck: status.deck || 1,
                artist,
                title,
                bpm: status.currentBpm || status.masterTempo || lastBpm,
                key: status.key || '',
                genre: status.genre || '',
                ecosystem: 'stagelinq'
            });
        });

        stagelinqInstance.on('nowPlaying', (status) => {
            if (!status || !status.title) return;
            handleIncomingTrack({
                deck: status.deck || 1,
                artist: status.artist || '',
                title: status.title || '',
                bpm: status.currentBpm || status.masterTempo || lastBpm,
                key: status.key || '',
                play: true,
                master: !!status.masterStatus,
                ecosystem: 'stagelinq',
                device: 'Denon Prime'
            });
        });

        stagelinqInstance.on('stateChanged', (status) => {
            if (status && status.currentBpm) {
                handleIncomingBPM(status.currentBpm, status.deck || 1);
            }
        });

        stagelinqInstance.on('beatMessage', (info, beatData) => {
            if (!beatData || !beatData.decks) return;
            beatData.decks.forEach((deckData, idx) => {
                const deckNum = idx + 1;
                if (deckData.bpm) handleIncomingBPM(deckData.bpm, deckNum);
                if (deckData.beat !== undefined) {
                    handleIncomingBeat(deckNum, Math.floor(deckData.beat % 4) + 1);
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
        runSimulationLoop();
    }
}

// Standby Simulation Loop (Seamless fallback when no live hardware is transmitting)
function runSimulationLoop() {
    let simulatedBPM = 126.0;
    let beatCounter = 0;
    const tracks = [
        { artist: 'Eric Prydz', title: 'Opus (Live Intro Mix)', bpm: 126.0 },
        { artist: 'Bicep', title: 'Glue', bpm: 130.0 },
        { artist: 'Deadmau5', title: 'Strobe (Club Edit)', bpm: 128.0 },
        { artist: 'Tale of Us', title: 'Astral Echoes', bpm: 125.0 }
    ];
    let trackIndex = 0;

    function scheduleNextBeat() {
        if (connectedDevices.size > 0) return;
        const intervalMs = (60.0 / simulatedBPM) * 1000.0;
        setTimeout(() => {
            if (connectedDevices.size === 0) {
                beatCounter = (beatCounter % 4) + 1;
                broadcast({
                    type: 'beat',
                    deck: 1,
                    count: beatCounter
                });
                scheduleNextBeat();
            }
        }, intervalMs);
    }

    scheduleNextBeat();

    setInterval(() => {
        if (connectedDevices.size > 0) return;
        trackIndex = (trackIndex + 1) % tracks.length;
        const currentTrack = tracks[trackIndex];
        simulatedBPM = currentTrack.bpm;
        handleIncomingTrack({
            deck: 1,
            artist: currentTrack.artist,
            title: currentTrack.title,
            bpm: currentTrack.bpm,
            ecosystem: 'simulation',
            device: 'Demo Telemetry'
        });
    }, 45000);
}

server.listen(PORT, () => {
    console.log(`[Universal Bridge Server] 🚀 Active on ws://localhost:${PORT}`);
    console.log(`[Universal Bridge Server] 🌐 REST API available at http://localhost:${PORT}/api/nowplaying`);
    startStageLinq();
});
