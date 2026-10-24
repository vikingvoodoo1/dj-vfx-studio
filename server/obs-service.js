import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

/**
 * Universal OBS Studio Detection & Telemetry Service
 * Monitors local OBS Studio via obs-websocket (v4 on 4444, v5 on 4455)
 * and tracks incoming OBS Browser Source client connections.
 */
export class OBSService extends EventEmitter {
    constructor(options = {}) {
        super();
        this.ports = options.ports || [4444, 4455];
        this.currentPortIdx = 0;
        this.socket = null;
        this.isSocketOnline = false;
        this.currentPort = null;
        this.obsVersion = '';
        this.currentSceneName = '';
        this.browserClients = new Set();
        this.reconnectTimer = null;
        this.isStarted = false;
    }

    start() {
        if (this.isStarted) return;
        this.isStarted = true;
        this.connect();
    }

    connect() {
        if (!this.isStarted || this.socket) return;

        const port = this.ports[this.currentPortIdx];
        let ws;
        try {
            ws = new WebSocket(`ws://127.0.0.1:${port}`);
        } catch (err) {
            this.scheduleNextAttempt();
            return;
        }

        // Connection timeout safety
        const connTimeout = setTimeout(() => {
            if (this.socket !== ws) {
                try { ws.terminate(); } catch (e) {}
            }
        }, 1800);

        ws.on('open', () => {
            clearTimeout(connTimeout);
            this.socket = ws;
            this.isSocketOnline = true;
            this.currentPort = port;
            console.log(`[OBS Service] 🎥 Connected to OBS Studio via WebSocket on port ${port}`);

            // Send v4 GetVersion and GetCurrentScene requests
            try {
                ws.send(JSON.stringify({ 'request-type': 'GetVersion', 'message-id': 'obs-probe-v4' }));
                ws.send(JSON.stringify({ 'request-type': 'GetCurrentScene', 'message-id': 'obs-get-scene' }));
            } catch (e) {}

            this.emitStatus();
        });

        ws.on('message', (raw) => {
            try {
                const data = JSON.parse(raw.toString());
                // Handle obs-websocket v4 GetVersion response
                if (data['obs-studio-version']) {
                    this.obsVersion = `OBS ${data['obs-studio-version']}`;
                    this.emitStatus();
                } else if (data['obs-websocket-version']) {
                    this.obsVersion = `OBS (ws ${data['obs-websocket-version']})`;
                    this.emitStatus();
                }
                // Handle obs-websocket v5 op:0 Hello
                else if (data.op === 0 && data.d) {
                    const wsVer = data.d.obsWebSocketVersion || '5.x';
                    this.obsVersion = `OBS Studio (v5 ${wsVer})`;
                    this.emitStatus();
                    // Identify in v5
                    try {
                        ws.send(JSON.stringify({
                            op: 1,
                            d: {
                                rpcVersion: 1,
                                eventSubscriptions: 33 // General + Scenes
                            }
                        }));
                        ws.send(JSON.stringify({
                            op: 6,
                            d: {
                                requestType: 'GetCurrentProgramScene',
                                requestId: 'obs-get-scene'
                            }
                        }));
                    } catch (e) {}
                }

                // Handle OBS Scene Switch Events (v4 & v5)
                if (data['update-type'] === 'SwitchScenes' && data['scene-name']) {
                    this.handleSceneSwitch(data['scene-name']);
                } else if (data['message-id'] === 'obs-get-scene' && data['name']) {
                    this.handleSceneSwitch(data['name']);
                } else if (data.op === 5 && data.d && data.d.eventType === 'CurrentProgramSceneChanged' && data.d.eventData?.sceneName) {
                    this.handleSceneSwitch(data.d.eventData.sceneName);
                } else if (data.op === 7 && data.d && data.d.requestId === 'obs-get-scene' && data.d.responseData?.currentProgramSceneName) {
                    this.handleSceneSwitch(data.d.responseData.currentProgramSceneName);
                }
            } catch (e) {}
        });

        const cleanup = () => {
            clearTimeout(connTimeout);
            if (this.socket === ws) {
                this.socket = null;
                const wasOnline = this.isSocketOnline;
                this.isSocketOnline = false;
                this.currentPort = null;
                if (wasOnline) {
                    console.log('[OBS Service] 🔌 OBS Studio disconnected');
                    this.emitStatus();
                }
            }
            this.scheduleNextAttempt();
        };

        ws.on('error', () => {
            cleanup();
        });

        ws.on('close', () => {
            cleanup();
        });
    }

    scheduleNextAttempt() {
        if (!this.isStarted || this.reconnectTimer) return;
        this.currentPortIdx = (this.currentPortIdx + 1) % this.ports.length;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, 3500);
    }

    /**
     * Track an incoming browser source connection from the bridge's main WebSocket server.
     */
    trackBrowserClient(ws, userAgent = '') {
        const ua = String(userAgent);
        const isObs = ua.includes('OBS/') || ua.includes('obs-browser');
        if (!isObs) return false;

        this.browserClients.add(ws);
        console.log(`[OBS Service] 🎬 OBS Browser Source CEF client connected (Active: ${this.browserClients.size})`);
        this.emitStatus();

        ws.on('close', () => {
            this.browserClients.delete(ws);
            console.log(`[OBS Service] 🎬 OBS Browser Source client closed (Remaining: ${this.browserClients.size})`);
            this.emitStatus();
        });

        return true;
    }

    handleSceneSwitch(sceneName) {
        if (!sceneName || this.currentSceneName === sceneName) return;
        this.currentSceneName = sceneName;
        console.log(`[OBS Service] 🎬 Active OBS Program Scene changed to: "${sceneName}"`);
        this.emit('scene_change', sceneName);
        this.emitStatus();
    }

    getStatus() {
        const isOnline = Boolean(this.isSocketOnline || this.browserClients.size > 0);
        let source = 'none';
        if (this.isSocketOnline && this.browserClients.size > 0) {
            source = 'websocket+browser_source';
        } else if (this.isSocketOnline) {
            source = 'websocket';
        } else if (this.browserClients.size > 0) {
            source = 'browser_source';
        }

        return {
            online: isOnline,
            connected: isOnline,
            source,
            version: this.obsVersion || (isOnline ? 'OBS Studio' : 'Offline'),
            currentScene: this.currentSceneName,
            port: this.currentPort,
            browserClientsCount: this.browserClients.size
        };
    }

    emitStatus() {
        const status = this.getStatus();
        this.emit('status', status);
    }

    stop() {
        this.isStarted = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            try { this.socket.close(); } catch (e) {}
            this.socket = null;
        }
        this.isSocketOnline = false;
    }
}
