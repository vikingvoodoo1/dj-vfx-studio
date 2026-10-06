import fs from 'fs';
import path from 'path';

/**
 * Universal Now Playing & REST API Service
 * Allows any DJ software, OBS plugin, or companion app to push live tracks via HTTP or file drop
 */
export class NowPlayingService {
    constructor({ onTrack, onBPM, onStatus }) {
        this.onTrack = onTrack;
        this.onBPM = onBPM;
        this.onStatus = onStatus;

        this.watchFilePath = path.join(process.cwd(), 'nowplaying.txt');
        this.lastTrackSignature = '';
    }

    init() {
        console.log('[Universal API] Initializing Universal REST & File Drop watcher...');
        this.ensureWatchFile();
        this.startFileWatcher();
    }

    ensureWatchFile() {
        if (!fs.existsSync(this.watchFilePath)) {
            try {
                fs.writeFileSync(this.watchFilePath, '', 'utf8');
                console.log('[Universal API] 📄 Created nowplaying.txt in workspace root.');
            } catch (e) {}
        }
    }

    startFileWatcher() {
        try {
            fs.watch(this.watchFilePath, (eventType) => {
                if (eventType === 'change' || eventType === 'rename') {
                    try {
                        if (fs.existsSync(this.watchFilePath)) {
                            const content = fs.readFileSync(this.watchFilePath, 'utf8').trim();
                            if (content && content !== this.lastTrackSignature) {
                                this.lastTrackSignature = content;
                                this.handleTextUpdate(content, 'File Drop (nowplaying.txt)');
                            }
                        }
                    } catch (e) {}
                }
            });
        } catch (e) {
            console.warn('[Universal API] File watch notice:', e.message);
        }
    }

    handleTextUpdate(rawText, source = 'REST API') {
        let artist = '';
        let title = rawText;
        let bpm = 126.0;
        let deck = 1;

        if (rawText.startsWith('{') && rawText.endsWith('}')) {
            try {
                const parsed = JSON.parse(rawText);
                artist = parsed.artist || '';
                title = parsed.title || '';
                bpm = parsed.bpm || 126.0;
                deck = parsed.deck || 1;
            } catch (e) {}
        } else if (rawText.includes(' - ')) {
            const parts = rawText.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        }

        if (title) {
            console.log(`[Universal API] 🎵 Live Track Received (${source}): ${artist} - ${title}`);
            const trackPayload = {
                deck,
                artist,
                title,
                bpm,
                ecosystem: 'universal',
                device: source
            };
            if (this.onTrack) this.onTrack(trackPayload);
            if (this.onBPM) this.onBPM(bpm, deck);
            if (this.onStatus) {
                this.onStatus({
                    ecosystem: 'universal',
                    connected: true,
                    device: source,
                    message: `Live Track from ${source}`
                });
            }
        }
    }

    handleHttpRequest(req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        
        if (req.method === 'GET' && url.pathname === '/api/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', service: 'DJ VFX Studio Universal Bridge' }));
            return true;
        }

        if (req.method === 'GET' && (url.pathname === '/api/track' || url.pathname === '/api/nowplaying')) {
            const artist = url.searchParams.get('artist') || '';
            const title = url.searchParams.get('title') || '';
            const bpm = parseFloat(url.searchParams.get('bpm')) || 126.0;
            const deck = parseInt(url.searchParams.get('deck'), 10) || 1;

            if (title) {
                this.handleTextUpdate(artist ? `${artist} - ${title}` : title, 'HTTP GET');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, artist, title, bpm, deck }));
                return true;
            }
        }

        if (req.method === 'POST' && (url.pathname === '/api/track' || url.pathname === '/api/nowplaying')) {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                this.handleTextUpdate(body, 'HTTP POST');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, received: body }));
            });
            return true;
        }

        return false;
    }
}
